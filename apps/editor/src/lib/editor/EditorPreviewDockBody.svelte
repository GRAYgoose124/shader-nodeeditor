<script lang="ts">
	import type { CompileResult } from '@shadertoy/compiler';
	import type { ShadertoyRunner } from '@shadertoy/runner';
	import ShaderPreview from '$lib/ShaderPreview.svelte';
	import { previewGpuErrorStore } from '$lib/editor/graphSync';

	let {
		previewCompileResult,
		compileResult,
		reloadKey,
		previewPaused,
		onTogglePreviewPause,
		previewTimeRestartKey,
		onPreviewRestartTime,
		lookatOrbitNodeId = null,
		onUniformTweak,
		onRunnerReady,
		onCanvasReady,
		onSnapshotPng,
		onToggleWebmRecord,
		recordingWebm,
		beforeFrame,
	}: {
		previewCompileResult: CompileResult | null;
		compileResult: CompileResult;
		reloadKey: number;
		previewPaused: boolean;
		onTogglePreviewPause: () => void;
		previewTimeRestartKey: number;
		onPreviewRestartTime: () => void;
		lookatOrbitNodeId?: string | null;
		onUniformTweak?: () => void;
		onRunnerReady: (r: ShadertoyRunner | null) => void;
		onCanvasReady?: (c: HTMLCanvasElement | null) => void;
		onSnapshotPng: () => void;
		onToggleWebmRecord: () => void;
		recordingWebm: boolean;
		beforeFrame?: (r: ShadertoyRunner) => void;
	} = $props();

	let gpuError = $state<string | null>(null);

	$effect(() => {
		gpuError = $previewGpuErrorStore;
	});

	$effect(() => {
		previewGpuErrorStore.set(gpuError);
	});

	const nErr = $derived(compileResult.errors.length + (gpuError ? 1 : 0));
	const orbitHint = $derived(
		Boolean(lookatOrbitNodeId) && compileResult.errors.length === 0 && previewCompileResult,
	);
</script>

<div class="preview-dock">
	<div class="toolbar">
		<span class="title">
			Preview {#if nErr > 0}<span class="badge" title="Compile errors">{nErr}</span>{/if}
			{#if orbitHint}<span class="orbit-hint" title="Look-at camera + raymarch scene">Drag to orbit</span>{/if}
		</span>
		<div class="actions">
			<button
				type="button"
				class="btn"
				class:pause={true}
				class:on={previewPaused}
				onclick={onTogglePreviewPause}
				title={previewPaused ? 'Resume animation (iTime advances)' : 'Pause animation (freeze iTime)'}
			>
				{previewPaused ? 'Resume' : 'Pause'}
			</button>
			<button
				type="button"
				class="btn"
				onclick={onPreviewRestartTime}
				disabled={compileResult.errors.length > 0}
				title="Reset iTime to 0 and redraw (works while paused)"
			>
				Restart
			</button>
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
		</div>
	</div>
	<div class="body">
		<ShaderPreview
			bind:gpuError
			compileResult={previewCompileResult}
			{reloadKey}
			paused={previewPaused}
			timeRestartKey={previewTimeRestartKey}
			lookatOrbitNodeId={lookatOrbitNodeId ?? null}
			{onUniformTweak}
			{onRunnerReady}
			{onCanvasReady}
			{beforeFrame}
		/>
	</div>
</div>

<style>
	.preview-dock {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		background: #12151c;
	}
	.toolbar {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 6px 8px;
		background: #1a1f28;
		border-bottom: 1px solid #2a3140;
	}
	.title {
		font-size: 11px;
		font-weight: 600;
		color: #e4e7ec;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.orbit-hint {
		font-size: 10px;
		font-weight: 500;
		color: #8b93a5;
		opacity: 0.9;
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
	.actions {
		display: flex;
		/* Prevent toolbar reflow changing preview canvas height (which triggers a resize + iFrame reset). */
		flex-wrap: nowrap;
		gap: 6px;
		overflow-x: auto;
		overflow-y: hidden;
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
	/* Stabilize button width so Pause/Resume doesn't cause layout jumps. */
	.btn.pause {
		min-width: 70px;
	}
	.btn:hover {
		background: #2e3440;
	}
	.btn.rec {
		border-color: #a04444;
		background: rgba(120, 40, 40, 0.35);
	}
	.btn.on {
		border-color: #4a6a9a;
		background: rgba(50, 80, 130, 0.35);
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
