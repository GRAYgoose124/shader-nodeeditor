<script lang="ts">
	import EditorProblemsPanel from './EditorProblemsPanel.svelte';
	import { problemsDockStore } from './editorDockStores';

	const p = $derived($problemsDockStore);
</script>

{#if p}
	<div class="host">
		<EditorProblemsPanel {...p} />
	</div>
{/if}

<style>
	.host {
		height: 100%;
		min-height: 0;
		overflow: auto;
	}
</style>
