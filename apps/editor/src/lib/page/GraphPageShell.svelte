<script lang="ts">
	import type { NodeTypeDef } from '@shadertoy/compiler';
	import NodeQuickAddModal from '$lib/editor/NodeQuickAddModal.svelte';
	import EditorDockShell from '$lib/editor/EditorDockShell.svelte';
	import { handleGraphPageKeydown } from '$lib/page/graphShortcuts.js';
	import type { GraphPageActions } from '$lib/page/graphPageActions.js';

	let {
		quickAddOpen = $bindable(false),
		allTypesFlat,
		actions,
	}: {
		quickAddOpen: boolean;
		allTypesFlat: NodeTypeDef[];
		actions: GraphPageActions;
	} = $props();
</script>

<svelte:window
	onkeydown={(e) =>
		handleGraphPageKeydown(e, {
			openQuickAdd: () => {
				quickAddOpen = true;
			},
			duplicateSelectedNodes: actions.duplicateSelectedNodes,
			copySelectionToClipboard: actions.copySelectionToClipboard,
			pasteFromClipboard: actions.pasteFromClipboard,
			groupSelectedShaderNodes: actions.groupSelectedShaderNodes,
		})}
/>

<NodeQuickAddModal bind:open={quickAddOpen} allTypes={allTypesFlat} onPick={(typeId) => actions.addNodeType(typeId)} />

<div class="shell">
	<EditorDockShell />
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
	.shell > :global(.editor-dock-shell) {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.shell :global(aside.palette),
	.shell :global(aside.right) {
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.shell :global(.flow-wrap) {
		min-height: 0;
		height: 100%;
		overflow: hidden;
		align-self: stretch;
	}
</style>
