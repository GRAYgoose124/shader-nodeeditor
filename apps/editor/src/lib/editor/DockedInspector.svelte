<script lang="ts">
	import EditorInspectorPanel from './EditorInspectorPanel.svelte';
	import { inspectorDockStore } from './editorDockStores';

	const p = $derived($inspectorDockStore);
</script>

{#if p}
	<div class="host">
		<EditorInspectorPanel {...p} />
	</div>
{/if}

<style>
	.host {
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.host :global(aside.right) {
		flex: 1;
		min-height: 0;
	}
</style>
