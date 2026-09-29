<script lang="ts">
	import type { CompileResult, NodeTypeDef } from '@shadertoy/compiler';
	import type { PresetCatalogEntry } from '$lib/presetCatalog.js';
	import type { PresetId } from '$lib/presetIds.js';
	import PresetBuiltinThumb from './PresetBuiltinThumb.svelte';
	import { presetGalleryCacheKey } from './presetGalleryRender.js';

	let {
		entries,
		customNodeTypes,
		presetCompile,
		builtinThumbTick = 0,
		ensureCompiled,
		onLoadBuiltin,
	}: {
		entries: readonly PresetCatalogEntry[];
		customNodeTypes: NodeTypeDef[];
		presetCompile: Partial<Record<PresetId, CompileResult | null | undefined>>;
		/** Bumps when a still is saved from the main preview or a hover capture; cards resync from cache. */
		builtinThumbTick?: number;
		ensureCompiled: (presetId: PresetId) => Promise<CompileResult | null>;
		onLoadBuiltin: (id: PresetId) => void;
	} = $props();
</script>

<section class="section">
	<h3>Built-in presets</h3>
	<p class="hint">
		Thumbnails use the last frame from the main preview after you load or edit that preset (or a hover still
		capture). Optional fallbacks: <code>static/presets/&lt;id&gt;.webp</code> or <code>.png</code>. Hover a card to
		generate a still.
	</p>
	<div class="grid">
		{#each entries as entry (entry.id)}
			<article class="card">
				<PresetBuiltinThumb
					{entry}
					cacheKey={presetGalleryCacheKey(entry.id, customNodeTypes)}
					thumbRefreshTick={builtinThumbTick}
					compileResult={presetCompile[entry.id]}
					{ensureCompiled}
				/>
				<div class="body">
					<span class="chip">{entry.groupLabel}</span>
					<h4 class="title">{entry.uiLabel}</h4>
					<code class="id">{entry.id}</code>
					<button type="button" class="btn load" onclick={() => onLoadBuiltin(entry.id)}>Load</button>
				</div>
			</article>
		{/each}
	</div>
</section>

<style>
	.section {
		margin-bottom: 28px;
	}
	.section h3 {
		margin: 0 0 8px;
		font-size: 0.85rem;
		font-weight: 600;
		color: #c5cad6;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.hint {
		font-size: 11px;
		color: #7a8498;
		line-height: 1.45;
		margin: 0 0 12px;
		max-width: 52rem;
	}
	.hint code {
		font-size: 10px;
		background: #0e1014;
		padding: 1px 5px;
		border-radius: 4px;
		border: 1px solid #2c3340;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 12px;
	}
	.card {
		display: flex;
		flex-direction: column;
		background: #1a1f28;
		border: 1px solid #2c3340;
		border-radius: 10px;
		overflow: hidden;
	}
	.body {
		padding: 10px 12px 12px;
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}
	.chip {
		font-size: 10px;
		font-weight: 600;
		color: #8b93a5;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 4px;
	}
	.title {
		margin: 0 0 6px;
		font-size: 13px;
		font-weight: 600;
		line-height: 1.35;
		color: #e8eaed;
	}
	.id {
		font-size: 10px;
		color: #6b7385;
		margin-bottom: 8px;
		display: block;
		word-break: break-all;
	}
	.btn {
		background: #252a33;
		border: 1px solid #3a4150;
		color: #e8eaed;
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 12px;
		cursor: pointer;
	}
	.btn:hover {
		background: #2e3440;
	}
	.btn.load {
		width: 100%;
		margin-top: 8px;
	}
</style>
