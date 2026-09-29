<script lang="ts">
	import type { Edge } from '@xyflow/svelte';
	import type { FlowNodeAny } from '$lib/flowDoc.js';
	import EditorFlowCanvas from './EditorFlowCanvas.svelte';
	import { flowDockStore } from './editorDockStores';
	import { graphEdgesStore, graphNodesStore } from './graphSync';

	const f = $derived($flowDockStore);

	let nodes = $state.raw<FlowNodeAny[]>([]);
	let edges = $state.raw<Edge[]>([]);

	// Pull from the shared store *before* pushing local XYFlow state back. Otherwise, when +page
	// `loadPreset` updates the store, the push effect can run first with stale `nodes` and
	// overwrite the preset (e.g. restoring torus/raymarch while the user chose Suesque field).
	$effect.pre(() => {
		nodes = $graphNodesStore;
		edges = $graphEdgesStore;
	});

	$effect(() => {
		if (graphNodesStore.peek() !== nodes) graphNodesStore.set(nodes);
		if (graphEdgesStore.peek() !== edges) graphEdgesStore.set(edges);
	});
</script>

{#if f}
	<div class="host">
		<EditorFlowCanvas
			bind:nodes
			bind:edges
			nodeTypes={f.nodeTypes}
			edgeTypes={f.edgeTypes}
			defaultEdgeOptions={f.defaultEdgeOptions}
			snapGridOn={f.snapGridOn}
			isValidConnection={f.isValidConnection}
			patchShaderParam={f.patchShaderParam}
			patchShaderParamGraphBypass={f.patchShaderParamGraphBypass}
			onConnect={f.onConnect}
			onFlowDelete={f.onFlowDelete}
			onSelectionChange={f.onSelectionChange}
			onBeforeReconnect={f.onBeforeReconnect}
			onReconnect={f.onReconnect}
			onNodeDragStop={f.onNodeDragStop}
			errorNodeIds={f.errorNodeIds}
			errorEdgeIds={f.errorEdgeIds}
			errorPortsByNode={f.errorPortsByNode}
			focusTick={f.focusTick}
			focusNodeId={f.focusNodeId}
			focusEdgeTick={f.focusEdgeTick}
			focusEdgeId={f.focusEdgeId}
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
	.host :global(.flow-wrap) {
		flex: 1;
		min-height: 0;
	}
</style>
