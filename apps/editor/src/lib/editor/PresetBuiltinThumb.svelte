<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { CompileResult } from '@shadertoy/compiler';
	import type { PresetCatalogEntry } from '$lib/presetCatalog.js';
	import type { PresetId } from '$lib/presetIds.js';
	import {
		builtinPresetThumbUrl,
		builtinPresetThumbUrlPng,
		presetCardGradient,
	} from '$lib/editor/presetThumb.js';
	import {
		bumpBuiltinGalleryThumbTick,
		getCachedPresetStillFromMemory,
		getCachedPresetStillPersistent,
		setCachedPresetStillPersistent,
	} from './presetGalleryRender.js';
	import { captureCompileResultStill } from './presetGalleryRender.js';

	let {
		entry,
		cacheKey = undefined as string | undefined,
		thumbRefreshTick = 0,
		compileResult = undefined as CompileResult | null | undefined,
		ensureCompiled,
	}: {
		entry: PresetCatalogEntry;
		cacheKey?: string;
		thumbRefreshTick?: number;
		compileResult?: CompileResult | null;
		ensureCompiled?: (presetId: PresetId) => Promise<CompileResult | null>;
	} = $props();

	let wrap: HTMLDivElement | undefined = $state();
	let resolvedStill = $state<string | undefined>(undefined);
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
	let gen = 0;
	/** Delay heavy gallery compile until hover settles (avoids compiling every card on a fast sweep). */
	let compileHoverDebounce: ReturnType<typeof setTimeout> | undefined;
	const COMPILE_HOVER_MS = 200;
	/** Delay GPU still-capture until hover settles (shared WebGL runner, can be heavy). */
	let captureHoverDebounce: ReturnType<typeof setTimeout> | undefined;
	const CAPTURE_HOVER_MS = 140;
	/** One capture at a time (shared runner); prevents overlapping GL loads. */
	let captureChain: Promise<void> = Promise.resolve();

	function setStillUrl(next: string | undefined) {
		if (resolvedStillObjUrl && resolvedStillObjUrl !== next) {
			URL.revokeObjectURL(resolvedStillObjUrl);
			resolvedStillObjUrl = null;
		}
		if (next?.startsWith('blob:')) resolvedStillObjUrl = next;
		resolvedStill = next;
	}

	$effect(() => {
		if (!hoverWanted) return;
		const c = compileResult;
		const key = cacheKey;
		if (!c || !key || c.errors.length > 0) return;
		const myGen = gen;
		if (captureHoverDebounce) clearTimeout(captureHoverDebounce);
		captureHoverDebounce = setTimeout(() => {
			captureHoverDebounce = undefined;
			captureChain = captureChain.then(async () => {
				if (myGen !== gen || !hoverWanted) return;
				const url = captureCompileResultStill(c, { warmFrames: 2 });
				if (!url) return;
				if (myGen !== gen || !hoverWanted) return;
				await setCachedPresetStillPersistent(key, url);
				bumpBuiltinGalleryThumbTick();
				setStillUrl(url);
			});
		}, CAPTURE_HOVER_MS);
	});

	function applyStillFromCache(key: string) {
		const fromMem = getCachedPresetStillFromMemory(key);
		if (fromMem === undefined) return false;
		setStillUrl(fromMem ?? undefined);
		return true;
	}

	onDestroy(() => {
		if (resolvedStillObjUrl) URL.revokeObjectURL(resolvedStillObjUrl);
		if (compileHoverDebounce) {
			clearTimeout(compileHoverDebounce);
			compileHoverDebounce = undefined;
		}
		if (captureHoverDebounce) {
			clearTimeout(captureHoverDebounce);
			captureHoverDebounce = undefined;
		}
	});

	$effect(() => {
		const key = cacheKey;
		if (!key) return;
		void thumbRefreshTick;
		applyStillFromCache(key);
	});

	$effect(() => {
		const key = cacheKey;
		if (!key) return;
		if (applyStillFromCache(key)) return;
		let dead = false;
		(async () => {
			const v = await getCachedPresetStillPersistent(key);
			if (dead) return;
			if (typeof v === 'string' && v.length > 0) {
				setStillUrl(v);
			}
		})();
		return () => {
			dead = true;
		};
	});

	function onStaticError() {
		if (staticTier < 1) staticTier = 1;
		else staticTier = 2;
	}

	function onEnter() {
		hoverWanted = true;
		if (compileResult === undefined && ensureCompiled) {
			if (compileHoverDebounce) clearTimeout(compileHoverDebounce);
			compileHoverDebounce = setTimeout(() => {
				compileHoverDebounce = undefined;
				void ensureCompiled(entry.id);
			}, COMPILE_HOVER_MS);
		}
	}

	function onLeave() {
		if (compileHoverDebounce) {
			clearTimeout(compileHoverDebounce);
			compileHoverDebounce = undefined;
		}
		if (captureHoverDebounce) {
			clearTimeout(captureHoverDebounce);
			captureHoverDebounce = undefined;
		}
		gen++;
		hoverWanted = false;
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
</style>
