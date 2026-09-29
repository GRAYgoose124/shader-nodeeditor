<script lang="ts">
	import EditorButtonPalettePanel from './EditorButtonPalettePanel.svelte';
	import { toolbarDockStore } from './editorDockStores';

	const p = $derived($toolbarDockStore);
</script>

{#if p}
	<div class="host">
		<EditorButtonPalettePanel {...p} />
	</div>
{/if}

<style>
	.host {
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
</style>
