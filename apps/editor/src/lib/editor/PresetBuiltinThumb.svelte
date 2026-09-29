<script lang="ts">
	import type { CompileResult } from '@shadertoy/compiler';
	import { ShadertoyRunner } from '@shadertoy/runner';
	import type { PresetCatalogEntry } from '$lib/presetCatalog.js';
	import {
		builtinPresetThumbUrl,
		builtinPresetThumbUrlPng,
		presetCardGradient,
	} from '$lib/editor/presetThumb.js';
	import { getCachedPresetStillPersistent } from './presetGalleryRender.js';

	let {
		entry,
		stillDataUrl = undefined as string | undefined,
		cacheKey = undefined as string | undefined,
		compileResult = undefined as CompileResult | null | undefined,
		ensureCompiled,
		ensureStill,
	}: {
		entry: PresetCatalogEntry;
		stillDataUrl?: string;
		/** Optional preset gallery cache key to lazy-load the still. */
		cacheKey?: string;
		/** `undefined` = compile not finished yet for this preset. */
		compileResult?: CompileResult | null;
		ensureCompiled?: (presetId: string) => Promise<CompileResult | null>;
		ensureStill?: (presetId: string) => Promise<void>;
	} = $props();

	let wrap: HTMLDivElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	let resolvedStill = $state<string | undefined>(stillDataUrl);
	let resolvedStillObjUrl = $state<string | null>(null);

	/** 0 = webp, 1 = png, 2 = hide static (gradient only). */
	let staticTier = $state(0);
	const staticUrl = $derived(
		staticTier === 0
			? builtinPresetThumbUrl(entry.id)
			: staticTier === 1
				? builtinPresetThumbUrlPng(entry.id)
				: null,
	);

	let hoverWanted = $state(false);
	let liveReady = $state(false);
	let gen = 0;
	let raf = 0;
	let runner: ShadertoyRunner | null = null;

	function syncCanvasSize() {
		const c = canvas;
		const el = wrap;
		if (!c || !el) return;
		const r = el.getBoundingClientRect();
		const dpr = Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
		const w = Math.max(2, Math.floor(r.width * dpr));
		const h = Math.max(2, Math.floor(r.height * dpr));
		if (c.width !== w || c.height !== h) {
			c.width = w;
			c.height = h;
		}
	}

	function stopLive() {
		hoverWanted = false;
		liveReady = false;
		cancelAnimationFrame(raf);
		raf = 0;
		runner?.dispose();
		runner = null;
	}

	function tryStartLive() {
		if (!hoverWanted || !compileResult || compileResult.errors.length > 0 || !canvas || !wrap) {
			return;
		}
		const c = canvas;
		const myGen = gen;
		syncCanvasSize();
		try {
			runner?.dispose();
			runner = null;
			const r = new ShadertoyRunner(c);
			const err = r.load(compileResult);
			if (err || myGen !== gen || !hoverWanted) {
				r.dispose();
				runner = null;
				return;
			}
			runner = r;
			liveReady = true;
			const mouse = { x: c.width * 0.5, y: c.height * 0.5, click: false };
			const loop = () => {
				if (myGen !== gen || !hoverWanted || !runner) return;
				runner.renderFrame(mouse);
				raf = requestAnimationFrame(loop);
			};
			raf = requestAnimationFrame(loop);
		} catch {
			if (myGen === gen) {
				liveReady = false;
			}
			runner?.dispose();
			runner = null;
		}
	}

	$effect(() => {
		if (hoverWanted && compileResult && !compileResult.errors.length) {
			queueMicrotask(() => tryStartLive());
		}
	});

	$effect(() => {
		// Keep in sync when parent provides a still.
		resolvedStill = stillDataUrl ?? resolvedStill;
	});

	$effect(() => {
		const key = cacheKey;
		if (!key) return;
		if (resolvedStill) return;
		let dead = false;
		(async () => {
			const v = await getCachedPresetStillPersistent(key);
			if (dead) return;
			if (typeof v === 'string' && v.length > 0) {
				// If we get a blob object URL, remember so we can revoke later.
				if (v.startsWith('blob:')) resolvedStillObjUrl = v;
				resolvedStill = v;
			}
		})();
		return () => {
			// Prevent leaks from CacheStorage blob URLs.
			if (resolvedStillObjUrl) URL.revokeObjectURL(resolvedStillObjUrl);
			resolvedStillObjUrl = null;
			dead = true;
		};
	});

	function onStaticError() {
		if (staticTier < 1) staticTier = 1;
		else staticTier = 2;
	}

	function onEnter() {
		hoverWanted = true;
		// Do heavy work only on demand (avoids modal-open hitch and WebGL context churn).
		if (compileResult === undefined && ensureCompiled) {
			void ensureCompiled(entry.id);
		}
		if (!resolvedStill && ensureStill) {
			void ensureStill(entry.id);
		}
		queueMicrotask(() => tryStartLive());
	}

	function onLeave() {
		gen++;
		stopLive();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="thumb"
	bind:this={wrap}
	style:background={presetCardGradient(entry.id)}
	onmouseenter={onEnter}
	onmouseleave={onLeave}
>
	{#if resolvedStill}
		<img class="thumb-still" src={resolvedStill} alt="" draggable="false" />
	{:else if staticUrl}
		<img class="thumb-still" src={staticUrl} alt="" draggable="false" onerror={onStaticError} />
	{/if}
	<canvas
		bind:this={canvas}
		class="thumb-live"
		class:show={hoverWanted && liveReady && !!compileResult}
		aria-hidden="true"
	></canvas>
	{#if hoverWanted && liveReady && compileResult}
		<span class="live-badge" aria-hidden="true">Live</span>
	{/if}
</div>

<style>
	.thumb {
		position: relative;
		height: 112px;
		overflow: hidden;
	}
	.thumb-still {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}
	.thumb-live {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.12s ease-out;
	}
	.thumb-live.show {
		opacity: 1;
	}
	.live-badge {
		position: absolute;
		right: 6px;
		top: 6px;
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 2px 6px;
		border-radius: 4px;
		background: rgba(20, 24, 32, 0.85);
		border: 1px solid #3a4a60;
		color: #8fd8ff;
		pointer-events: none;
		z-index: 2;
	}
</style>
