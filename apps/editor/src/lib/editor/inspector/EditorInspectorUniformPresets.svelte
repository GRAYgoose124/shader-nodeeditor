<script lang="ts">
	import type { GraphUniformPreset } from '@shadertoy/compiler';

	let {
		compileErrorsCount,
		uniformPresets,
		onSaveUniformPreset,
		onApplyUniformPreset,
		onDeleteUniformPreset,
	}: {
		compileErrorsCount: number;
		uniformPresets: GraphUniformPreset[];
		onSaveUniformPreset: (name: string) => void;
		onApplyUniformPreset: (index: number) => void;
		onDeleteUniformPreset: (index: number) => void;
	} = $props();

	let presetNameInput = $state('');
</script>

<h2>Uniform presets</h2>
<p class="muted small">Saved in graph JSON (scalar uniforms only). Requires clean compile.</p>
<div class="preset-row">
	<input
		class="preset-in"
		type="text"
		placeholder="Preset name"
		bind:value={presetNameInput}
	/>
	<button
		type="button"
		class="cap-btn"
		disabled={compileErrorsCount > 0}
		onclick={() => {
			onSaveUniformPreset(presetNameInput);
			presetNameInput = '';
		}}
	>
		Save
	</button>
</div>
{#if uniformPresets.length > 0}
	<ul class="preset-list">
		{#each uniformPresets as p, i (p.name + i)}
			<li class="preset-item">
				<span class="preset-name">{p.name}</span>
				<button type="button" class="cap-btn sm" onclick={() => onApplyUniformPreset(i)}>Apply</button>
				<button type="button" class="cap-btn sm danger" onclick={() => onDeleteUniformPreset(i)}>×</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
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
	.cap-btn.sm {
		padding: 2px 8px;
		font-size: 10px;
	}
	.cap-btn.danger {
		color: #ffb4b4;
	}
	.preset-row {
		display: flex;
		gap: 6px;
		margin-bottom: 8px;
		align-items: center;
	}
	.preset-in {
		flex: 1;
		min-width: 0;
		padding: 6px 8px;
		border-radius: 6px;
		border: 1px solid #333842;
		background: #1a1d24;
		color: #e8eaed;
		font-size: 12px;
	}
	.preset-list {
		list-style: none;
		padding: 0;
		margin: 0 0 12px;
	}
	.preset-item {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
		font-size: 11px;
	}
	.preset-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
