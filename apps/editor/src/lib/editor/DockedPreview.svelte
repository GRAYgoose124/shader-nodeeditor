<script lang="ts">
	import EditorPreviewDockBody from './EditorPreviewDockBody.svelte';
	import { previewDockStore } from './editorDockStores';

	const p = $derived($previewDockStore);
</script>

{#if p}
	<div class="host">
		<EditorPreviewDockBody {...p} />
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
