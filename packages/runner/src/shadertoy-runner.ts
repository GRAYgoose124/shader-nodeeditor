import type { BufferId, ChannelBindingResolved, CompileResult, GlslType, PassManifest } from '@shadertoy/compiler';
import {
	createFboWithColor,
	createTextureRGBA,
	ensureFloatColorBufferExtensions,
	tryCreatePingPongHdrRgba,
	tryCreateProgram,
} from './webgl.js';

type BufferTarget =
	| {
			kind: 'single';
			texture: WebGLTexture;
			fbo: WebGLFramebuffer;
	  }
	| {
			kind: 'pingpong';
			textures: [WebGLTexture, WebGLTexture];
			fbos: [WebGLFramebuffer, WebGLFramebuffer];
			writeIndex: 0 | 1;
	  };

export interface RunnerOptions {
	onUniformsChanged?: () => void;
	/**
	 * When {@link ShadertoyRunner.renderFrame} is called with `sampleCenterPixel: true`, invoked with
	 * linearized 0–1 RGBA from `readPixels` at the canvas center (default framebuffer, 8-bit).
	 */
	onDebugCenterPixel?: (rgba: [number, number, number, number]) => void;
}

export class ShadertoyRunner {
	readonly gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private compileResult: CompileResult | null = null;
	/**
	 * While false, {@link renderFrame} is a no-op. Prevents the preview RAF loop from drawing during
	 * {@link load}: `clearGpu` leaves buffer FBOs and `blackTex` unset until linking finishes, and
	 * partial `programs` would otherwise render buffer passes to the default framebuffer (garbage /
	 * stale preset pixels) and stress the GL driver.
	 */
	private allowFramebufferDraw = true;
	private programs = new Map<BufferId, WebGLProgram>();
	private uniformLocs = new Map<BufferId, Map<string, WebGLUniformLocation | null>>();
	private bufferTargets = new Map<BufferId, BufferTarget>();
	private blackTex: WebGLTexture | null = null;
	/** User-uploaded textures keyed by `GraphMediaInput.id` */
	private mediaTextures = new Map<string, WebGLTexture>();
	private mediaVideos = new Map<string, HTMLVideoElement>();
	private audioCtx: AudioContext | null = null;
	private audioAnalyser: AnalyserNode | null = null;
	private audioFft: Uint8Array<ArrayBuffer> | null = null;
	private audioGain = 0;
	private audioBandLow = 0;
	private audioBandMid = 0;
	private audioBandHigh = 0;
	private w = 0;
	private h = 0;
	private frame = 0;
	private timeStart = performance.now();
	/** When true, `iTime` stays at `frozenTimeSec` until {@link resumeClock}. */
	private clockFrozen = false;
	private frozenTimeSec = 0;
	private userUniformValues = new Map<string, number | number[]>();
	/** Snapshot of manifest `default` per uniform after last successful `seedUniformDefaults` — used to sync GPU when graph authorship changes. */
	private lastManifestDefaults: Map<string, number | number[]> | null = null;
	private opts: RunnerOptions;
	private vao: WebGLVertexArrayObject | null = null;

	constructor(canvas: HTMLCanvasElement, opts: RunnerOptions = {}) {
		this.canvas = canvas;
		const gl = canvas.getContext('webgl2', {
			alpha: false,
			antialias: false,
			premultipliedAlpha: false,
			// Needed so PNG / readPixels / toDataURL after presentation still see the image pass (default FB).
			preserveDrawingBuffer: true,
		});
		if (!gl) throw new Error('WebGL2 not available');
		this.gl = gl;
		// Enable before any FBO probes (idempotent per context).
		ensureFloatColorBufferExtensions(gl);
		this.opts = opts;
	}

	private wipeDefaultFramebufferBlack(): void {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		const vw = Math.max(1, Math.floor(this.canvas.width || 300));
		const vh = Math.max(1, Math.floor(this.canvas.height || 150));
		gl.viewport(0, 0, vw, vh);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	private clearGpu(): void {
		const gl = this.gl;
		for (const p of this.programs.values()) gl.deleteProgram(p);
		this.programs.clear();
		this.uniformLocs.clear();
		for (const bt of this.bufferTargets.values()) {
			if (bt.kind === 'single') {
				gl.deleteTexture(bt.texture);
				gl.deleteFramebuffer(bt.fbo);
			} else {
				gl.deleteTexture(bt.textures[0]);
				gl.deleteTexture(bt.textures[1]);
				gl.deleteFramebuffer(bt.fbos[0]);
				gl.deleteFramebuffer(bt.fbos[1]);
			}
		}
		this.bufferTargets.clear();
		if (this.blackTex) {
			gl.deleteTexture(this.blackTex);
			this.blackTex = null;
		}
		for (const t of this.mediaTextures.values()) gl.deleteTexture(t);
		this.mediaTextures.clear();
		for (const v of this.mediaVideos.values()) {
			v.pause();
			v.removeAttribute('src');
			v.load();
		}
		this.mediaVideos.clear();
		this.teardownAudio();
		if (this.vao) {
			gl.deleteVertexArray(this.vao);
			this.vao = null;
		}
	}

	private teardownAudio(): void {
		try {
			this.audioAnalyser?.disconnect();
		} catch {
			/* noop */
		}
		this.audioAnalyser = null;
		this.audioFft = null;
		if (this.audioCtx && this.audioCtx.state !== 'closed') {
			void this.audioCtx.close();
		}
		this.audioCtx = null;
		this.audioGain = 0;
		this.audioBandLow = 0;
		this.audioBandMid = 0;
		this.audioBandHigh = 0;
	}

	private updateAudioBands(): void {
		if (!this.audioAnalyser || !this.audioFft) return;
		this.audioAnalyser.getByteFrequencyData(this.audioFft);
		const n = this.audioFft.length;
		let sum = 0;
		for (let i = 0; i < n; i++) sum += this.audioFft[i]!;
		this.audioGain = sum / (n * 255);
		const third = Math.max(1, Math.floor(n / 3));
		let s0 = 0,
			s1 = 0,
			s2 = 0;
		for (let i = 0; i < third; i++) s0 += this.audioFft[i]!;
		for (let i = third; i < 2 * third; i++) s1 += this.audioFft[i]!;
		for (let i = 2 * third; i < n; i++) s2 += this.audioFft[i]!;
		this.audioBandLow = s0 / (third * 255);
		this.audioBandMid = s1 / (third * 255);
		this.audioBandHigh = s2 / ((n - 2 * third) * 255 || 1);
	}

	private syncVideoTextures(): void {
		const gl = this.gl;
		for (const [id, video] of this.mediaVideos) {
			const tex = this.mediaTextures.get(id);
			if (!tex || video.readyState < 2) continue;
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
	}

	/**
	 * Bind a user file to a media catalog id (image / video texture or audio analysis).
	 * Call after `load()` when the graph references this id in `meta.iChannels`.
	 */
	async setMediaFromFile(mediaId: string, file: File): Promise<void> {
		const gl = this.gl;
		const t = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		if (file.type.startsWith('audio/')) {
			gl.deleteTexture(t);
			gl.bindTexture(gl.TEXTURE_2D, null);
			await this.setupAudioFromFile(file);
			return;
		}

		const prev = this.mediaTextures.get(mediaId);
		if (prev) gl.deleteTexture(prev);
		this.mediaTextures.set(mediaId, t);

		const vPrev = this.mediaVideos.get(mediaId);
		if (vPrev) {
			vPrev.pause();
			vPrev.removeAttribute('src');
			vPrev.load();
		}
		this.mediaVideos.delete(mediaId);

		if (file.type.startsWith('video/')) {
			const video = document.createElement('video');
			video.muted = true;
			video.playsInline = true;
			video.loop = true;
			video.src = URL.createObjectURL(file);
			this.mediaVideos.set(mediaId, video);
			try {
				await video.play();
			} catch {
				/* autoplay policies — still try texture upload when data loads */
			}
			video.addEventListener(
				'loadeddata',
				() => {
					gl.bindTexture(gl.TEXTURE_2D, t);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					gl.bindTexture(gl.TEXTURE_2D, null);
				},
				{ once: true },
			);
			return;
		}

		const bmp = await createImageBitmap(file);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	private async setupAudioFromFile(file: File): Promise<void> {
		this.teardownAudio();
		const ctx = new AudioContext();
		const arrayBuf = await file.arrayBuffer();
		const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
		const src = ctx.createBufferSource();
		src.buffer = audioBuf;
		src.loop = true;
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 512;
		analyser.smoothingTimeConstant = 0.65;
		src.connect(analyser);
		analyser.connect(ctx.destination);
		src.start(0);
		this.audioCtx = ctx;
		this.audioAnalyser = analyser;
		this.audioFft = new Uint8Array(analyser.frequencyBinCount);
	}

	dispose(): void {
		this.clearGpu();
		this.compileResult = null;
		this.lastManifestDefaults = null;
		this.userUniformValues.clear();
	}

	private linkPassProgram(passId: BufferId, vertexSource: string, fragmentSource: string): string | null {
		const gl = this.gl;
		const built = tryCreateProgram(gl, vertexSource, fragmentSource);
		if (!built.ok) return `Pass ${passId}: ${built.log}`;
		const program = built.program;
		this.programs.set(passId, program);
		const ul = new Map<string, WebGLUniformLocation | null>();
		const numU = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
		for (let i = 0; i < numU; i++) {
			const inf = gl.getActiveUniform(program, i);
			if (!inf) continue;
			const baseName = inf.name.replace(/\[0\]$/, '');
			ul.set(baseName, gl.getUniformLocation(program, baseName));
		}
		this.uniformLocs.set(passId, ul);
		return null;
	}

	private finalizeShaderLoad(): void {
		this.resize(this.canvas.width || 300, this.canvas.height || 150);
		this.seedUniformDefaults();
		this.frame = 0;
	}

	/** Load compiled shaders */
	load(result: CompileResult): string | null {
		this.allowFramebufferDraw = false;
		try {
			this.wipeDefaultFramebufferBlack();
			this.clearGpu();
			this.compileResult = result;
			if (result.errors.length > 0) return result.errors.join('\n');

			const gl = this.gl;
			this.vao = gl.createVertexArray();
			gl.bindVertexArray(this.vao);

			for (const pass of result.manifest.passes) {
				const src = result.passes[pass.id];
				if (!src) continue;
				const err = this.linkPassProgram(pass.id, src.vertexSource, src.fragmentSource);
				if (err) return err;
			}

			this.finalizeShaderLoad();
			return null;
		} finally {
			this.allowFramebufferDraw = true;
		}
	}

	/**
	 * Ensures every manifest uniform has a value. Removes orphan keys; when a uniform's
	 * manifest **default** changed (e.g. inspector edited the graph), overwrites the GPU value
	 * so sliders apply without needing a separate Live Uniforms tweak. If the default is
	 * unchanged, keeps the current map value (live-panel overrides across incidental recompiles).
	 */
	private seedUniformDefaults(): void {
		const r = this.compileResult;
		if (!r) {
			this.userUniformValues.clear();
			this.lastManifestDefaults = null;
			return;
		}
		const valid = new Set<string>();
		for (const p of r.manifest.passes) {
			for (const u of p.uniforms) {
				valid.add(u.name);
			}
		}
		for (const name of [...this.userUniformValues.keys()]) {
			if (!valid.has(name)) this.userUniformValues.delete(name);
		}

		const prev = this.lastManifestDefaults;
		const isFirstSeed = prev === null;
		let wrote = false;

		for (const p of r.manifest.passes) {
			for (const u of p.uniforms) {
				const d = u.default;
				const nextVal: number | number[] = Array.isArray(d) ? [...d] : d;
				const oldDef = prev?.get(u.name);
				const defaultUnchanged =
					!isFirstSeed &&
					oldDef !== undefined &&
					ShadertoyRunner.manifestDefaultsEqual(oldDef, nextVal);

				if (defaultUnchanged && this.userUniformValues.has(u.name)) {
					continue;
				}
				this.userUniformValues.set(u.name, nextVal);
				wrote = true;
			}
		}

		this.lastManifestDefaults = ShadertoyRunner.snapshotManifestDefaults(r);
		if (wrote) this.opts.onUniformsChanged?.();
	}

	private static snapshotManifestDefaults(r: CompileResult): Map<string, number | number[]> {
		const m = new Map<string, number | number[]>();
		for (const p of r.manifest.passes) {
			for (const u of p.uniforms) {
				const d = u.default;
				m.set(u.name, Array.isArray(d) ? [...d] : d);
			}
		}
		return m;
	}

	private static manifestDefaultsEqual(a: number | number[], b: number | number[]): boolean {
		if (typeof a === 'number' && typeof b === 'number') return a === b;
		if (Array.isArray(a) && Array.isArray(b)) {
			if (a.length !== b.length) return false;
			return a.every((x, i) => x === b[i]!);
		}
		return false;
	}

	resize(w: number, h: number): void {
		const gl = this.gl;
		const ow = this.w;
		const oh = this.h;
		this.w = Math.max(1, Math.floor(w));
		this.h = Math.max(1, Math.floor(h));
		this.canvas.width = this.w;
		this.canvas.height = this.h;
		gl.viewport(0, 0, this.w, this.h);

		for (const bt of this.bufferTargets.values()) {
			if (bt.kind === 'single') {
				gl.deleteTexture(bt.texture);
				gl.deleteFramebuffer(bt.fbo);
			} else {
				gl.deleteTexture(bt.textures[0]);
				gl.deleteTexture(bt.textures[1]);
				gl.deleteFramebuffer(bt.fbos[0]);
				gl.deleteFramebuffer(bt.fbos[1]);
			}
		}
		this.bufferTargets.clear();

		if (this.blackTex) gl.deleteTexture(this.blackTex);
		this.blackTex = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, this.blackTex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		const pixel = new Uint8Array([0, 0, 0, 255]);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
		gl.bindTexture(gl.TEXTURE_2D, null);

		const r = this.compileResult;
		if (!r) return;

		for (const pass of r.manifest.passes) {
			if (pass.id === 'image') continue;
			const ping = pass.pingPong;
			if (ping) {
				const hdr = tryCreatePingPongHdrRgba(gl, this.w, this.h);
				let t0: WebGLTexture;
				let t1: WebGLTexture;
				let f0: WebGLFramebuffer;
				let f1: WebGLFramebuffer;
				if (hdr) {
					t0 = hdr.textures[0];
					t1 = hdr.textures[1];
					f0 = hdr.fbos[0];
					f1 = hdr.fbos[1];
				} else {
					t0 = createTextureRGBA(gl, this.w, this.h);
					t1 = createTextureRGBA(gl, this.w, this.h);
					f0 = createFboWithColor(gl, t0);
					f1 = createFboWithColor(gl, t1);
				}
				this.bufferTargets.set(pass.id, {
					kind: 'pingpong',
					textures: [t0, t1],
					fbos: [f0, f1],
					writeIndex: 0,
				});
				// Match `old.glsl` seeds `vec4(rgb,0)`: clearing alpha to 1 couples vec4 Laplacian diffusion on `.w` and washes RGB in 8-bit buffers.
				gl.clearColor(0, 0, 0, 0);
				gl.bindFramebuffer(gl.FRAMEBUFFER, f0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.bindFramebuffer(gl.FRAMEBUFFER, f1);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			} else {
				const t = createTextureRGBA(gl, this.w, this.h);
				const f = createFboWithColor(gl, t);
				this.bufferTargets.set(pass.id, { kind: 'single', texture: t, fbo: f });
				gl.clearColor(0, 0, 0, 1);
				gl.bindFramebuffer(gl.FRAMEBUFFER, f);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			}
		}

		// New buffer storage: restart iFrame so presets that gate seeds on frame (e.g. Suesque) work after resize/rebuild.
		if (this.compileResult && (ow !== this.w || oh !== this.h)) {
			this.frame = 0;
		}
	}

	getTextureForBuffer(buf: BufferId): WebGLTexture {
		const bt = this.bufferTargets.get(buf);
		if (!bt) return this.blackTex!;
		if (bt.kind === 'single') return bt.texture;
		return bt.textures[bt.writeIndex ^ 1]!;
	}

	private getWriteFbo(buf: BufferId): WebGLFramebuffer | null {
		if (buf === 'image') return null;
		const bt = this.bufferTargets.get(buf);
		if (!bt) return null;
		if (bt.kind === 'single') return bt.fbo;
		return bt.fbos[bt.writeIndex];
	}

	private flipBuffer(buf: BufferId): void {
		const bt = this.bufferTargets.get(buf);
		if (bt?.kind === 'pingpong') bt.writeIndex = (bt.writeIndex ^ 1) as 0 | 1;
	}

	setUniform(name: string, value: number | number[], opts?: { notify?: boolean }): void {
		this.userUniformValues.set(name, value);
		if (opts?.notify === false) return;
		this.opts.onUniformsChanged?.();
	}

	/** Sets scene SDF debug uniforms when compiled into any pass (missing uniforms are ignored at draw time). */
	setDebugSceneProbe(
		on: boolean,
		probeP?: [number, number, number],
		scale?: number,
		eps?: number,
		slice?: number,
	): void {
		// Debug probe uniforms can be driven by reactive UI effects; avoid feeding back into
		// uniform-change listeners (which can cause Svelte update-depth loops).
		const silent = { notify: false } as const;
		this.setUniform('u_dbg_scene_on', on ? 1 : 0, silent);
		if (probeP) this.setUniform('u_dbg_scene_p', probeP, silent);
		if (scale !== undefined) this.setUniform('u_dbg_scene_scale', scale, silent);
		if (eps !== undefined) this.setUniform('u_dbg_scene_eps', eps, silent);
		if (slice !== undefined) this.setUniform('u_dbg_scene_slice', slice, silent);
	}

	/** Sets wire debug uniform when compiled (ignored at draw if absent). */
	setDebugWireProbe(on: boolean): void {
		this.setUniform('u_dbg_wire_on', on ? 1 : 0, { notify: false });
	}

	getUniform(name: string): number | number[] | undefined {
		return this.userUniformValues.get(name);
	}

	/** Reset one user uniform to the manifest default (after load). */
	resetUniformToDefault(name: string): void {
		const r = this.compileResult;
		if (!r) return;
		for (const p of r.manifest.passes) {
			const u = p.uniforms.find((x) => x.name === name);
			if (!u) continue;
			const d = u.default;
			if (Array.isArray(d)) this.userUniformValues.set(name, [...d]);
			else this.userUniformValues.set(name, d);
			this.opts.onUniformsChanged?.();
			return;
		}
	}

	/** All manifest user uniforms (for sliders) */
	getUserUniformList(): { pass: BufferId; name: string; label?: string; min?: number; max?: number; step?: number; type: string }[] {
		const r = this.compileResult;
		if (!r) return [];
		const out: { pass: BufferId; name: string; label?: string; min?: number; max?: number; step?: number; type: string }[] = [];
		for (const p of r.manifest.passes) {
			for (const u of p.uniforms) {
				out.push({
					pass: p.id,
					name: u.name,
					label: u.label,
					min: u.min,
					max: u.max,
					step: u.step,
					type: u.type,
				});
			}
		}
		return out;
	}

	private uniformTypeFor(passId: BufferId, name: string): GlslType | undefined {
		const r = this.compileResult;
		if (!r) return undefined;
		const pass = r.manifest.passes.find((p) => p.id === passId);
		return pass?.uniforms.find((u) => u.name === name)?.type;
	}

	private applyUniforms(passId: BufferId, mouse: { x: number; y: number; click: boolean }): void {
		const gl = this.gl;
		const prog = this.programs.get(passId);
		const locs = this.uniformLocs.get(passId);
		if (!prog || !locs) return;

		gl.useProgram(prog);

		const setF = (n: string, v: number) => {
			const L = locs.get(n);
			if (L) gl.uniform1f(L, v);
		};
		const setI = (n: string, v: number) => {
			const L = locs.get(n);
			if (L) gl.uniform1i(L, v);
		};
		const setV3 = (n: string, x: number, y: number, z: number) => {
			const L = locs.get(n);
			if (L) gl.uniform3f(L, x, y, z);
		};
		const setV4 = (n: string, x: number, y: number, z: number, w: number) => {
			const L = locs.get(n);
			if (L) gl.uniform4f(L, x, y, z, w);
		};

		setV3('iResolution', this.w, this.h, 1);
		const tSec = this.clockFrozen
			? this.frozenTimeSec
			: (performance.now() - this.timeStart) * 0.001;
		setF('iTime', tSec);
		setI('iFrame', this.frame);
		const mx = mouse.x;
		const my = this.h - mouse.y;
		setV4('iMouse', mx, my, mouse.click ? mx : -mx, mouse.click ? my : -my);

		this.updateAudioBands();
		setF('u_audioLevel', this.audioGain);
		setF('u_audioBandLow', this.audioBandLow);
		setF('u_audioBandMid', this.audioBandMid);
		setF('u_audioBandHigh', this.audioBandHigh);

		for (const [name, val] of this.userUniformValues) {
			const L = locs.get(name);
			if (!L) continue;
			const ut = this.uniformTypeFor(passId, name);
			if (typeof val === 'number') {
				if (ut === 'int') gl.uniform1i(L, Math.round(val));
				else gl.uniform1f(L, val);
			} else if (Array.isArray(val)) {
				if (val.length === 2) gl.uniform2f(L, val[0]!, val[1]!);
				else if (val.length === 3) gl.uniform3f(L, val[0]!, val[1]!, val[2]!);
				else if (val.length === 4) gl.uniform4f(L, val[0]!, val[1]!, val[2]!, val[3]!);
			}
		}
	}

	private bindChannels(pass: PassManifest): void {
		const gl = this.gl;
		const prog = this.programs.get(pass.id);
		const locs = this.uniformLocs.get(pass.id);
		if (!prog || !locs) return;

		const chNames = ['iChannel0', 'iChannel1', 'iChannel2', 'iChannel3'] as const;
		for (let i = 0; i < 4; i++) {
			const uname = chNames[i]!;
			const L = locs.get(uname);
			const src = pass.channels[uname] as ChannelBindingResolved | undefined;
			let tex: WebGLTexture;
			if (!src) {
				tex = this.blackTex!;
			} else if (src.kind === 'buffer') {
				tex = this.getTextureForBuffer(src.bufferId);
			} else {
				tex = this.mediaTextures.get(src.mediaId) ?? this.blackTex!;
			}
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, tex);
			if (L) gl.uniform1i(L, i);
		}
	}

	renderFrame(
		mouse: { x: number; y: number; click: boolean },
		opts?: { sampleCenterPixel?: boolean },
	): void {
		if (!this.allowFramebufferDraw) return;
		const gl = this.gl;
		const r = this.compileResult;
		if (!r || this.programs.size === 0) return;

		if (!this.vao) return;
		gl.bindVertexArray(this.vao);

		this.syncVideoTextures();

		for (const pass of r.manifest.passes) {
			const prog = this.programs.get(pass.id);
			if (!prog) continue;

			const sub = Math.max(1, Math.min(32, Math.floor(pass.substeps ?? 1)));

			for (let s = 0; s < sub; s++) {
				const fbo = this.getWriteFbo(pass.id);
				gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
				if (fbo) gl.viewport(0, 0, this.w, this.h);
				else gl.viewport(0, 0, this.w, this.h);

				gl.useProgram(prog);
				this.applyUniforms(pass.id, mouse);
				this.bindChannels(pass);

				gl.disable(gl.DEPTH_TEST);
				gl.disable(gl.BLEND);
				gl.drawArrays(gl.TRIANGLES, 0, 3);

				if (pass.id !== 'image') {
					gl.bindFramebuffer(gl.FRAMEBUFFER, null);
					this.flipBuffer(pass.id);
				}
			}
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		this.frame++;

		if (opts?.sampleCenterPixel && this.opts.onDebugCenterPixel) {
			const x = Math.max(0, Math.floor(this.w / 2));
			const y = Math.max(0, Math.floor(this.h / 2));
			const px = new Uint8Array(4);
			gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
			this.opts.onDebugCenterPixel([
				px[0]! / 255,
				px[1]! / 255,
				px[2]! / 255,
				px[3]! / 255,
			]);
		}
	}

	/**
	 * Time in seconds for the next `iTime` (same as {@link renderFrame} uses, including when the clock is paused).
	 */
	getEffectiveTimeSec(): number {
		return this.clockFrozen ? this.frozenTimeSec : (performance.now() - this.timeStart) * 0.001;
	}

	/** Freeze `iTime` at the current value (no-op if already frozen). */
	pauseClock(): void {
		if (this.clockFrozen) return;
		this.frozenTimeSec = (performance.now() - this.timeStart) * 0.001;
		this.clockFrozen = true;
	}

	/** Continue `iTime` from the frozen value (no-op if not frozen). */
	resumeClock(): void {
		if (!this.clockFrozen) return;
		this.timeStart = performance.now() - this.frozenTimeSec * 1000;
		this.clockFrozen = false;
	}

	/**
	 * Reset `iTime` to 0 and `iFrame` to 0. If the clock is frozen, time stays frozen at 0 until resume.
	 */
	resetTime(): void {
		this.frame = 0;
		if (this.clockFrozen) {
			this.frozenTimeSec = 0;
			return;
		}
		this.timeStart = performance.now();
		this.frozenTimeSec = 0;
	}
}
