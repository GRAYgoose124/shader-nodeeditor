<script lang="ts">
	import type { NodeTypeDef } from '@shadertoy/compiler';

	let {
		filteredPalette,
		paletteQuery = $bindable(''),
		onAddType,
		onPaletteQueryChange,
	}: {
		filteredPalette: [string, NodeTypeDef[]][];
		paletteQuery?: string;
		onAddType: (typeId: string) => void;
		onPaletteQueryChange?: (q: string) => void;
	} = $props();

	function onSearchInput(ev: Event) {
		const t = ev.currentTarget as HTMLInputElement;
		paletteQuery = t.value;
		onPaletteQueryChange?.(paletteQuery);
	}
</script>

<aside class="palette nowheel">
	<h2>Nodes</h2>
	<input
		class="palette-search"
		type="search"
		placeholder="Search nodes…"
		value={paletteQuery}
		oninput={onSearchInput}
		aria-label="Filter node palette"
	/>
	{#if filteredPalette.length === 0}
		<p class="palette-empty">No nodes match.</p>
	{:else}
		{#each filteredPalette as [cat, types] (cat)}
			<h3>{cat}</h3>
			<ul>
				{#each types as t (t.id)}
					<li>
						<button type="button" onclick={() => onAddType(t.id)}>{t.label}</button>
					</li>
				{/each}
			</ul>
		{/each}
	{/if}
</aside>

<style>
	.palette {
		border-right: 1px solid #252a33;
		overflow: auto;
		overscroll-behavior: contain;
		padding: 10px;
		font-size: 12px;
	}
	.palette-search {
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 10px;
		padding: 6px 8px;
		font-size: 12px;
		border-radius: 6px;
		border: 1px solid #333842;
		background: #1a1d24;
		color: #e8eaed;
	}
	.palette-empty {
		margin: 8px 0 0;
		opacity: 0.55;
		font-size: 11px;
	}
	.palette h2 {
		margin: 0 0 8px;
		font-size: 13px;
	}
	.palette h3 {
		margin: 12px 0 4px;
		font-size: 11px;
		text-transform: uppercase;
		opacity: 0.6;
	}
	.palette ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.palette li button {
		width: 100%;
		text-align: left;
		background: transparent;
		border: none;
		color: #9ab4ff;
		padding: 4px 0;
		cursor: pointer;
		font-size: 12px;
	}
</style>
