<script lang="ts">
	import EditorPalette from './EditorPalette.svelte';
	import { paletteDockStore } from './editorDockStores';

	const p = $derived($paletteDockStore);
</script>

{#if p}
	<div class="host">
		<EditorPalette
			filteredPalette={p.filteredPalette}
			paletteQuery={p.paletteQuery}
			onAddType={p.onAddType}
			onPaletteQueryChange={p.onPaletteQueryChange}
		/>
	</div>
{/if}

<style>
	.host {
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.host :global(aside.palette) {
		flex: 1;
		min-height: 0;
	}
</style>
