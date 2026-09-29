<script lang="ts">
	import type { BufferId } from '@shadertoy/compiler';
	import type { PassReadiness } from '$lib/page/passReadiness.js';

	let {
		previewDockPanelPresent,
		onOpenPreview,
		activePass,
		readiness,
	}: {
		previewDockPanelPresent: boolean;
		onOpenPreview: () => void;
		activePass: BufferId;
		readiness: PassReadiness;
	} = $props();
</script>

{#if !previewDockPanelPresent}
	<div class="preview-closed-hint">
		<span>Preview panel was removed from the layout.</span>
		<button type="button" class="cap-btn" onclick={onOpenPreview}>Restore preview</button>
	</div>
{/if}

<h2>Scene checks ({activePass})</h2>
<ul class="readiness">
	<li class:ok={readiness.fragOut} class:bad={!readiness.fragOut}>
		Fragment output node{readiness.fragWired ? '' : ' (wire `color`)'}
	</li>
	{#if readiness.hasRaymarch}
		<li class:ok={readiness.raymarchOk} class:bad={!readiness.raymarchOk}>
			Raymarch + scene SDF sink
		</li>
	{/if}
	<li class:ok={readiness.compileOk} class:bad={!readiness.compileOk}>No compile errors</li>
</ul>

<style>
	.preview-closed-hint {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		margin-bottom: 12px;
		border-radius: 8px;
		border: 1px solid #3a4a6a;
		background: rgba(40, 70, 120, 0.2);
		font-size: 11px;
	}
	.cap-btn {
		background: #252a33;
		border: 1px solid #3a4150;
		color: #e8eaed;
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 11px;
		cursor: pointer;
	}
	.cap-btn:hover {
		background: #2e3440;
	}
	.readiness {
		list-style: none;
		padding: 0;
		margin: 0 0 12px;
		font-size: 11px;
	}
	.readiness li {
		padding: 4px 8px;
		margin-bottom: 4px;
		border-radius: 6px;
		border: 1px solid #333842;
		background: #1a1d24;
	}
	.readiness li.ok {
		border-color: #2d4a3a;
		background: rgba(40, 80, 60, 0.25);
	}
	.readiness li.bad {
		border-color: #5a3535;
		background: rgba(80, 40, 40, 0.2);
	}
</style>
