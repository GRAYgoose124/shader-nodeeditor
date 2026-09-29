<script lang="ts">
	import { onMount } from 'svelte';
	import type { CompileResult, GraphMeta } from '@shadertoy/compiler';
	import type { ShadertoyRunner } from '@shadertoy/runner';
	import ShaderPreview from '$lib/ShaderPreview.svelte';

	const STORAGE_KEY = 'st-editor-preview-dock';

	let {
		open = $bindable(true),
		gpuError = $bindable(null as string | null),
		graphMeta = null as GraphMeta | null,
		previewCompileResult,
		compileResult,
		reloadKey,
		onRunnerReady,
		onCanvasReady,
		onSnapshotPng,
		onToggleWebmRecord,
		recordingWebm,
	}: {
		open?: boolean;
		gpuError?: string | null;
		graphMeta?: GraphMeta | null;
		previewCompileResult: CompileResult | null;
		compileResult: CompileResult;
		reloadKey: number;
		onRunnerReady: (r: ShadertoyRunner | null) => void;
		onCanvasReady?: (c: HTMLCanvasElement | null) => void;
		onSnapshotPng: () => void;
		onToggleWebmRecord: () => void;
		recordingWebm: boolean;
	} = $props();

	let rootEl: HTMLDivElement | null = $state(null);
	let x = $state(80);
	let y = $state(96);
	let w = $state(480);
	let h = $state(340);
	let drag = $state(false);
	let dragPx = 0;
	let dragPy = 0;
	let startX = 0;
	let startY = 0;

	const nErr = $derived(compileResult.errors.length + (gpuError ? 1 : 0));

	let saveT: ReturnType<typeof setTimeout> | undefined;

	function saveStored() {
		if (typeof sessionStorage === 'undefined') return;
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y, w, h, open }));
		} catch {
			/* ignore quota */
		}
	}

	function scheduleSave() {
		if (saveT) clearTimeout(saveT);
		saveT = setTimeout(() => {
			saveT = undefined;
			saveStored();
		}, 200);
	}

	function loadStored(): boolean {
		if (typeof sessionStorage === 'undefined') return false;
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			if (!raw) return false;
			const o = JSON.parse(raw) as { x?: number; y?: number; w?: number; h?: number; open?: boolean };
			if (typeof o.w === 'number' && o.w >= 280) w = o.w;
			if (typeof o.h === 'number' && o.h >= 200) h = o.h;
			if (typeof o.x === 'number') x = o.x;
			if (typeof o.y === 'number') y = o.y;
			if (typeof o.open === 'boolean') open = o.open;
			return true;
		} catch {
			return false;
		}
	}

	function defaultPlacement() {
		w = 480;
		h = 340;
		x = Math.max(16, window.innerWidth - w - 24);
		y = 96;
	}

	onMount(() => {
		if (!loadStored()) defaultPlacement();
	});

	function onHeadPointerDown(e: PointerEvent) {
		if ((e.target as HTMLElement).closest('button')) return;
		drag = true;
		dragPx = e.clientX;
		dragPy = e.clientY;
		startX = x;
		startY = y;
		window.addEventListener('pointermove', onDragMove);
		window.addEventListener('pointerup', onDragUp);
		e.preventDefault();
	}

	function onDragMove(e: PointerEvent) {
		if (!drag) return;
		x = startX + (e.clientX - dragPx);
		y = startY + (e.clientY - dragPy);
	}

	function onDragUp() {
		if (drag) scheduleSave();
		drag = false;
		window.removeEventListener('pointermove', onDragMove);
		window.removeEventListener('pointerup', onDragUp);
	}

	function resetPlacement() {
		defaultPlacement();
		scheduleSave();
	}

	function closePanel() {
		open = false;
		saveStored();
	}

	function onGlobalKeydown(e: KeyboardEvent) {
		if (!open || e.key !== 'Escape') return;
		const t = e.target as HTMLElement;
		if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
			return;
		closePanel();
	}

	$effect(() => {
		if (!rootEl || !open) return;
		const ro = new ResizeObserver(() => {
			if (!rootEl) return;
			const r = rootEl.getBoundingClientRect();
			const nw = Math.round(r.width);
			const nh = Math.round(r.height);
			if (nw >= 280 && nh >= 200 && (nw !== w || nh !== h)) {
				w = nw;
				h = nh;
				scheduleSave();
			}
		});
		ro.observe(rootEl);
		return () => ro.disconnect();
	});
</script>

<svelte:window onkeydown={onGlobalKeydown} />

{#if open}
	<div
		bind:this={rootEl}
		class="preview-float"
		role="dialog"
		aria-label="Shader preview"
		style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;"
	>
		<header class="head">
			<div class="drag-strip" onpointerdown={onHeadPointerDown} role="button" tabindex="-1" aria-label="Drag preview">
				<span class="title"
					>Preview {#if nErr > 0}<span class="badge" title="Compile errors">{nErr}</span>{/if}</span
				>
			</div>
			<div class="head-actions">
				<button type="button" class="btn" onclick={onSnapshotPng} title="PNG snapshot">PNG</button>
				<button
					type="button"
					class="btn"
					class:rec={recordingWebm}
					onclick={onToggleWebmRecord}
					title="WebM record"
				>
					{recordingWebm ? 'Stop' : 'WebM'}
				</button>
				<button type="button" class="btn" onclick={resetPlacement} title="Reset size and position"
					>Reset</button
				>
				<button type="button" class="btn close" onclick={closePanel} title="Close (Esc)">×</button>
			</div>
		</header>
		<div class="body">
			<ShaderPreview
				bind:gpuError
				{graphMeta}
				compileResult={previewCompileResult}
				{reloadKey}
				{onRunnerReady}
				{onCanvasReady}
			/>
		</div>
	</div>
{/if}

<style>
	.preview-float {
		/* Inline width/height must match getBoundingClientRect() (border box); otherwise
		   ResizeObserver feedback slowly grows the panel until max-width/max-height. */
		box-sizing: border-box;
		position: fixed;
		z-index: 60;
		display: flex;
		flex-direction: column;
		min-width: 280px;
		min-height: 200px;
		max-width: 96vw;
		max-height: 90vh;
		resize: both;
		overflow: hidden;
		background: #12151c;
		border: 1px solid #353d4d;
		border-radius: 10px;
		box-shadow:
			0 12px 40px rgba(0, 0, 0, 0.45),
			0 0 0 1px rgba(255, 255, 255, 0.04);
	}
	.head {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 10px;
		background: #1a1f28;
		border-bottom: 1px solid #2a3140;
	}
	.drag-strip {
		flex: 1;
		min-width: 0;
		cursor: grab;
		user-select: none;
		touch-action: none;
		padding: 2px 0;
	}
	.drag-strip:active {
		cursor: grabbing;
	}
	.title {
		font-size: 12px;
		font-weight: 600;
		color: #e4e7ec;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		padding: 0 6px;
		font-size: 10px;
		font-weight: 700;
		color: #ffb4b4;
		background: rgba(120, 40, 40, 0.45);
		border-radius: 999px;
	}
	.head-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		flex-shrink: 0;
		cursor: default;
	}
	.btn {
		background: #252a33;
		border: 1px solid #3a4150;
		color: #e8eaed;
		border-radius: 6px;
		padding: 4px 8px;
		font-size: 11px;
		cursor: pointer;
	}
	.btn:hover {
		background: #2e3440;
	}
	.btn.rec {
		border-color: #a04444;
		background: rgba(120, 40, 40, 0.35);
	}
	.btn.close {
		font-size: 16px;
		line-height: 1;
		padding: 2px 8px;
	}
	.body {
		flex: 1;
		min-height: 0;
		padding: 8px;
		display: flex;
		flex-direction: column;
	}
	.body :global(.wrap) {
		min-height: 0;
		flex: 1;
	}
</style>
