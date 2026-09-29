<script lang="ts">
	import PresetLibraryPanel from './PresetLibraryPanel.svelte';
	import { presetLibraryDockStore } from './editorDockStores';

	const p = $derived($presetLibraryDockStore);
</script>

{#if p}
	<div class="host">
		<PresetLibraryPanel {...p} />
	</div>
{/if}

<style>
	.host {
		height: 100%;
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
</style>
