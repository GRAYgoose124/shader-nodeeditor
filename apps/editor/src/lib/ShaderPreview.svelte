<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import type { CompileResult, GraphMeta } from '@shadertoy/compiler';
	import { mediaFileById } from '$lib/editor/mediaFileById.js';
	import { uniformName } from '@shadertoy/compiler';
	import { ShadertoyRunner } from '@shadertoy/runner';

	let {
		graphMeta = null as GraphMeta | null,
		compileResult = null,
		/** Increment when graph mutates so we reload GL programs even if sources match a cached string. */
		reloadKey = 0,
		/** When true, stops advancing `iTime` and skips per-frame draws (last frame stays visible). */
		paused = false,
		/** Increment (e.g. from parent) to reset shader time to 0 and repaint once. */
		timeRestartKey = 0,
		gpuError = $bindable<string | null>(null),
		/** When set, primary-drag orbits eye (ex,ey,ez) around target for `ray_lookat_from_uv`. */
		lookatOrbitNodeId = null as string | null,
		/** Bumps UI that reads `getUniform` (e.g. inspector sliders) after orbit writes. */
		onUniformTweak,
		onRunnerReady,
		onCanvasReady,
		/** Called each frame before `renderFrame` while not paused (e.g. time-driven uniforms). */
		beforeFrame = undefined as ((r: ShadertoyRunner) => void) | undefined,
		/** Called after `renderFrame` (still image is on the default framebuffer). */
		afterFrame = undefined as ((r: ShadertoyRunner) => void) | undefined,
		/** When true, `readPixels` at canvas center after the image pass (8-bit RGBA, linearized 0–1 in callback). */
		sampleDebugCenterPixel = false,
		onDebugCenterPixel = undefined as
			| ((rgba: [number, number, number, number]) => void)
			| undefined,
		/** Applied synchronously after a successful `load()` so debug toggles affect the first redraw. */
		applyGpuDebugAfterLoad = undefined as ((r: ShadertoyRunner) => void) | undefined,
	}: {
		graphMeta?: GraphMeta | null;
		compileResult: CompileResult | null;
		reloadKey?: number;
		paused?: boolean;
		timeRestartKey?: number;
		gpuError?: string | null;
		lookatOrbitNodeId?: string | null;
		onUniformTweak?: () => void;
		onRunnerReady?: (runner: ShadertoyRunner | null) => void;
		onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
		beforeFrame?: (r: ShadertoyRunner) => void;
		afterFrame?: (r: ShadertoyRunner) => void;
		sampleDebugCenterPixel?: boolean;
		onDebugCenterPixel?: (rgba: [number, number, number, number]) => void;
		applyGpuDebugAfterLoad?: (r: ShadertoyRunner) => void;
	} = $props();

	const dbgPix = { sample: false, cb: undefined as typeof onDebugCenterPixel };
	$effect(() => {
		dbgPix.sample = !!sampleDebugCenterPixel;
		dbgPix.cb = onDebugCenterPixel;
	});

	let canvas: HTMLCanvasElement;
	let runner = $state<ShadertoyRunner | null>(null);
	let mouse = $state({ x: 0, y: 0, click: false });
	let raf = 0;
	const loopFlags = { paused: false };

	let orbitTargetId = $state<string | null>(null);
	let uniformTweak: (() => void) | undefined = undefined;
	let beforeFrameCb: ((r: ShadertoyRunner) => void) | undefined = undefined;
	let afterFrameCb: ((r: ShadertoyRunner) => void) | undefined = undefined;
	let lastAppliedTimeRestartKey = 0;
	/** Bumps whenever the load effect runs so a stale `load` does not commit GPU errors after a newer compile. */
	let previewLoadGen = 0;

	function syncRunnerMedia(r: ShadertoyRunner | null) {
		if (!r) return;
		const meta = graphMeta;
		if (!meta?.mediaInputs?.length) return;
		const files = get(mediaFileById);
		for (const m of meta.mediaInputs) {
			const f = files.get(m.id);
			if (f) void r.setMediaFromFile(m.id, f);
		}
	}

	$effect(() => {
		orbitTargetId = lookatOrbitNodeId ?? null;
	});
	$effect(() => {
		uniformTweak = onUniformTweak;
	});
	$effect(() => {
		beforeFrameCb = beforeFrame;
	});
	$effect(() => {
		afterFrameCb = afterFrame;
	});

	$effect(() => {
		loopFlags.paused = paused;
	});

	$effect(() => {
		const r = runner;
		if (!r) return;
		if (paused) {
			r.pauseClock();
			beforeFrameCb?.(r);
			r.renderFrame(mouse, {
				sampleCenterPixel: !!(dbgPix.sample && dbgPix.cb),
			});
			afterFrameCb?.(r);
		} else {
			r.resumeClock();
		}
	});

	$effect(() => {
		const k = timeRestartKey;
		const r = runner;
		if (!r || k === 0) return;
		if (k === lastAppliedTimeRestartKey) return;
		lastAppliedTimeRestartKey = k;
		untrack(() => {
			r.resetTime();
			beforeFrameCb?.(r);
			r.renderFrame(mouse, {
				sampleCenterPixel: !!(dbgPix.sample && dbgPix.cb),
			});
			afterFrameCb?.(r);
		});
	});

	const ORBIT_SENS = 0.004;
	const PITCH_LIM = Math.PI / 2 - 0.02;

	let orbitPointerDown = false;
	let orbitDragging = $state(false);
	let orbitDownX = 0;
	let orbitDownY = 0;
	let orbitLastX = 0;
	let orbitLastY = 0;
	let orbitYaw = 0;
	let orbitPitch = 0;
	let orbitR = 3.2;
	const ORBIT_DRAG_PX = 2.5;

	function clampLoHi(x: number, lo: number, hi: number): number {
		return Math.max(lo, Math.min(hi, x));
	}

	function readUFallback(r: ShadertoyRunner, nodeId: string, pid: string, fallback: number): number {
		const v = r.getUniform(uniformName(nodeId, pid));
		return typeof v === 'number' ? v : fallback;
	}

	function applyEyeFromSpherical(r: ShadertoyRunner, nodeId: string, tx: number, ty: number, tz: number) {
		const cp = Math.cos(orbitPitch);
		const ex = tx + orbitR * cp * Math.sin(orbitYaw);
		const ey = ty + orbitR * Math.sin(orbitPitch);
		const ez = tz + orbitR * cp * Math.cos(orbitYaw);
		r.setUniform(uniformName(nodeId, 'ex'), ex);
		r.setUniform(uniformName(nodeId, 'ey'), ey);
		r.setUniform(uniformName(nodeId, 'ez'), ez);
		uniformTweak?.();
	}

	onMount(() => {
		const unsubMedia = mediaFileById.subscribe(() => {
			syncRunnerMedia(runner);
		});
		onCanvasReady?.(canvas);
		try {
			runner = new ShadertoyRunner(canvas, {
				onDebugCenterPixel: (c) => dbgPix.cb?.(c),
				/** Sync Live Uniforms / other readers when `load()` re-seeds after graph edits. */
				onUniformsChanged: () => uniformTweak?.(),
			});
			onRunnerReady?.(runner);
		} catch (e) {
			gpuError = e instanceof Error ? e.message : String(e);
			return () => {};
		}

		const onMove = (e: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			mouse = { ...mouse, x: e.clientX - rect.left, y: e.clientY - rect.top };
			const oid = orbitTargetId;
			const rn = runner;
			if (!oid || !rn || !orbitPointerDown || !(e.buttons & 1)) return;

			const dx0 = e.clientX - orbitDownX;
			const dy0 = e.clientY - orbitDownY;
			if (!orbitDragging) {
				if (dx0 * dx0 + dy0 * dy0 < ORBIT_DRAG_PX * ORBIT_DRAG_PX) return;
				const ex = readUFallback(rn, oid, 'ex', 0);
				const ey = readUFallback(rn, oid, 'ey', 0);
				const ez = readUFallback(rn, oid, 'ez', 3.2);
				const tx = readUFallback(rn, oid, 'tx', 0);
				const ty = readUFallback(rn, oid, 'ty', 0);
				const tz = readUFallback(rn, oid, 'tz', 0);
				const dx = ex - tx;
				const dy = ey - ty;
				const dz = ez - tz;
				orbitR = Math.sqrt(dx * dx + dy * dy + dz * dz);
				if (orbitR < 1e-4) orbitR = 3.2;
				orbitPitch = Math.asin(clampLoHi(dy / orbitR, -1, 1));
				orbitYaw = Math.atan2(dx, dz);
				orbitDragging = true;
				orbitLastX = e.clientX;
				orbitLastY = e.clientY;
				canvas.setPointerCapture(e.pointerId);
				return;
			}

			const tx = readUFallback(rn, oid, 'tx', 0);
			const ty = readUFallback(rn, oid, 'ty', 0);
			const tz = readUFallback(rn, oid, 'tz', 0);
			const ddx = e.clientX - orbitLastX;
			const ddy = e.clientY - orbitLastY;
			orbitLastX = e.clientX;
			orbitLastY = e.clientY;
			orbitYaw += ddx * ORBIT_SENS;
			orbitPitch += -ddy * ORBIT_SENS;
			orbitPitch = clampLoHi(orbitPitch, -PITCH_LIM, PITCH_LIM);
			applyEyeFromSpherical(rn, oid, tx, ty, tz);
		};

		const onDown = (e: PointerEvent) => {
			mouse = { ...mouse, click: true };
			const oid = orbitTargetId;
			const rn = runner;
			if (!oid || !rn || e.button !== 0) return;
			orbitPointerDown = true;
			orbitDragging = false;
			orbitDownX = e.clientX;
			orbitDownY = e.clientY;
		};

		const onUp = (e: PointerEvent) => {
			mouse = { ...mouse, click: false };
			orbitPointerDown = false;
			if (orbitDragging) {
				orbitDragging = false;
				try {
					canvas.releasePointerCapture(e.pointerId);
				} catch {
					/* released */
				}
			}
		};

		canvas.addEventListener('pointermove', onMove);
		canvas.addEventListener('pointerdown', onDown);
		window.addEventListener('pointerup', onUp);

		const ro = new ResizeObserver(() => {
			const r = canvas.getBoundingClientRect();
			const w = Math.max(2, Math.floor(r.width));
			const h = Math.max(2, Math.floor(r.height));
			runner?.resize(w, h);
		});
		ro.observe(canvas);

		const loop = () => {
			const rn = runner;
			if (rn && !loopFlags.paused) {
				beforeFrameCb?.(rn);
				rn.renderFrame(mouse, {
					sampleCenterPixel: !!(dbgPix.sample && dbgPix.cb),
				});
				afterFrameCb?.(rn);
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);

		return () => {
			unsubMedia();
			cancelAnimationFrame(raf);
			ro.disconnect();
			canvas.removeEventListener('pointermove', onMove);
			canvas.removeEventListener('pointerdown', onDown);
			window.removeEventListener('pointerup', onUp);
			onRunnerReady?.(null);
			onCanvasReady?.(null);
			runner?.dispose();
			runner = null;
		};
	});

	$effect(() => {
		const r = runner;
		const c = compileResult;
		const myGen = ++previewLoadGen;
		if (!r || !c) {
			gpuError = null;
			return;
		}
		void reloadKey;
		void Object.values(c.passes)
			.map((p) => p.fragmentSource)
			.join('\n//--pass--\n');
		const err = r.load(c);
		if (myGen !== previewLoadGen) return;
		gpuError = c.errors.length > 0 ? null : err;
		// After a successful shader load, force one draw after applying `beforeFrame`.
		// This ensures baked param animations become visible immediately, even if the first RAF tick
		// happens before `beforeFrameCb` is set or when the preview was previously paused.
		if (!c.errors.length && !err) {
			// `paused` is handled by the dedicated pause/resume effect; do not reference it here
			// or we will reload shaders (and reset time) when toggling pause.
			// Also: do not *track* `beforeFrameCb` or `mouse` here, otherwise this effect
			// would rerun (and call `r.load`) on pointer movement / callback wiring.
			untrack(() => {
				beforeFrameCb?.(r);
				applyGpuDebugAfterLoad?.(r);
				syncRunnerMedia(r);
				r.renderFrame(mouse, {
					sampleCenterPixel: !!(dbgPix.sample && dbgPix.cb),
				});
				afterFrameCb?.(r);
			});
		}
	});

	const orbitUi = $derived(Boolean(lookatOrbitNodeId) && !compileResult?.errors.length && compileResult);
</script>

<div class="wrap">
	{#if gpuError}
		<div class="err-badge" title={gpuError}>GPU error — see Problems panel</div>
	{/if}
	<canvas
		bind:this={canvas}
		class="cv"
		class:orbit-cursor={orbitUi}
		class:grabbing={orbitDragging}
	></canvas>
</div>

<style>
	.wrap {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 220px;
		background: #0b0c0f;
		border-radius: 8px;
		overflow: hidden;
	}
	.cv {
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
	}
	.cv.orbit-cursor {
		cursor: grab;
	}
	.cv.orbit-cursor.grabbing {
		cursor: grabbing;
	}
	.err-badge {
		position: absolute;
		top: 8px;
		left: 8px;
		right: 8px;
		z-index: 2;
		padding: 6px 10px;
		border-radius: 6px;
		background: rgba(60, 20, 20, 0.92);
		border: 1px solid #a04444;
		color: #ffb4b4;
		font-size: 11px;
		pointer-events: none;
	}
</style>
