import type { BufferId, CompileResult, GlslType, PassManifest } from '@shadertoy/compiler';
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
}

export class ShadertoyRunner {
	readonly gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private compileResult: CompileResult | null = null;
	private programs = new Map<BufferId, WebGLProgram>();
	private uniformLocs = new Map<BufferId, Map<string, WebGLUniformLocation | null>>();
	private bufferTargets = new Map<BufferId, BufferTarget>();
	private blackTex: WebGLTexture | null = null;
	private w = 0;
	private h = 0;
	private frame = 0;
	private timeStart = performance.now();
	/** When true, `iTime` stays at `frozenTimeSec` until {@link resumeClock}. */
	private clockFrozen = false;
	private frozenTimeSec = 0;
	private userUniformValues = new Map<string, number | number[]>();
	private opts: RunnerOptions;
	private vao: WebGLVertexArrayObject | null = null;

	constructor(canvas: HTMLCanvasElement, opts: RunnerOptions = {}) {
		this.canvas = canvas;
		const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false });
		if (!gl) throw new Error('WebGL2 not available');
		this.gl = gl;
		// Enable before any FBO probes (idempotent per context).
		ensureFloatColorBufferExtensions(gl);
		this.opts = opts;
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
		if (this.vao) {
			gl.deleteVertexArray(this.vao);
			this.vao = null;
		}
	}

	dispose(): void {
		this.clearGpu();
		this.compileResult = null;
	}

	/** Load compiled shaders */
	load(result: CompileResult): string | null {
		this.clearGpu();
		this.compileResult = result;
		if (result.errors.length > 0) return result.errors.join('\n');

		const gl = this.gl;
		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);

		for (const pass of result.manifest.passes) {
			const src = result.passes[pass.id];
			if (!src) continue;
			const built = tryCreateProgram(gl, src.vertexSource, src.fragmentSource);
			if (!built.ok) return `Pass ${pass.id}: ${built.log}`;
			const program = built.program;
			this.programs.set(pass.id, program);
			const ul = new Map<string, WebGLUniformLocation | null>();
			const numU = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
			for (let i = 0; i < numU; i++) {
				const inf = gl.getActiveUniform(program, i);
				if (!inf) continue;
				const baseName = inf.name.replace(/\[0\]$/, '');
				ul.set(baseName, gl.getUniformLocation(program, baseName));
			}
			this.uniformLocs.set(pass.id, ul);
		}

		this.resize(this.canvas.width || 300, this.canvas.height || 150);
		this.seedUniformDefaults();
		this.frame = 0;
		return null;
	}

	private seedUniformDefaults(): void {
		this.userUniformValues.clear();
		const r = this.compileResult;
		if (!r) return;
		for (const p of r.manifest.passes) {
			for (const u of p.uniforms) {
				if (this.userUniformValues.has(u.name)) continue;
				const d = u.default;
				if (Array.isArray(d)) this.userUniformValues.set(u.name, [...d]);
				else this.userUniformValues.set(u.name, d);
			}
		}
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

	setUniform(name: string, value: number | number[]): void {
		this.userUniformValues.set(name, value);
		this.opts.onUniformsChanged?.();
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
			const srcBuf = pass.channels[uname];
			const tex = srcBuf ? this.getTextureForBuffer(srcBuf) : this.blackTex!;
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, tex);
			if (L) gl.uniform1i(L, i);
		}
	}

	renderFrame(mouse: { x: number; y: number; click: boolean }): void {
		const gl = this.gl;
		const r = this.compileResult;
		if (!r || this.programs.size === 0) return;

		if (!this.vao) return;
		gl.bindVertexArray(this.vao);

		for (const pass of r.manifest.passes) {
			const prog = this.programs.get(pass.id);
			if (!prog) continue;

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

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		this.frame++;
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
