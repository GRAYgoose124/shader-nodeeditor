<script lang="ts">
	import { setContext } from 'svelte';
	import {
		SvelteFlow,
		Background,
		Controls,
		MiniMap,
		type Connection,
		type Edge,
		type EdgeTypes,
		type Node,
		type NodeTypes,
	} from '@xyflow/svelte';
	import { SelectionMode } from '@xyflow/system';
	import {
		SHADER_NODE_PARAM_BYPASS_KEY,
		SHADER_NODE_PATCH_KEY,
		type ShaderNodeParamBypassPatchFn,
		type ShaderNodePatchFn,
	} from '$lib/editor/shaderNodeContext.js';
	import { errorChromeStore } from '$lib/editor/errorChromeStore.js';
	import EditorFlowFocus from '$lib/editor/EditorFlowFocus.svelte';
	import EditorFlowViewportBridge from '$lib/editor/EditorFlowViewportBridge.svelte';

	let {
		nodes = $bindable(),
		edges = $bindable(),
		nodeTypes,
		edgeTypes,
		defaultEdgeOptions,
		snapGridOn,
		isValidConnection,
		patchShaderParam,
		patchShaderParamGraphBypass,
		onConnect,
		onFlowDelete,
		onSelectionChange,
		onBeforeReconnect,
		onReconnect,
		onNodeDragStop,
		errorNodeIds = new Set<string>(),
		errorEdgeIds = new Set<string>(),
		errorPortsByNode = new Map<string, { inputs: Set<string>; outputs: Set<string> }>(),
		focusTick = 0,
		focusNodeId = null as string | null,
		focusEdgeTick = 0,
		focusEdgeId = null as string | null,
	}: {
		nodes: Node[];
		edges: Edge[];
		nodeTypes: NodeTypes;
		edgeTypes: EdgeTypes;
		defaultEdgeOptions: Record<string, unknown>;
		snapGridOn: boolean;
		isValidConnection: (c: Connection | Edge) => boolean;
		patchShaderParam: ShaderNodePatchFn;
		patchShaderParamGraphBypass: ShaderNodeParamBypassPatchFn;
		onConnect: (c: Connection) => void;
		onFlowDelete: (p: { nodes: Node[]; edges: Edge[] }) => void;
		onSelectionChange: (p: { nodes: Node[] }) => void;
		onBeforeReconnect: (newEdge: Edge, oldEdge: Edge) => Edge | false;
		onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
		onNodeDragStop: () => void;
		errorNodeIds?: Set<string>;
		errorEdgeIds?: Set<string>;
		errorPortsByNode?: Map<string, { inputs: Set<string>; outputs: Set<string> }>;
		focusTick?: number;
		focusNodeId?: string | null;
		focusEdgeTick?: number;
		focusEdgeId?: string | null;
	} = $props();

	$effect(() => {
		errorChromeStore.set({
			errorNodeIds: new Set(errorNodeIds),
			errorEdgeIds: new Set(errorEdgeIds),
			errorPortsByNode: new Map(
				[...errorPortsByNode.entries()].map(([k, v]) => [
					k,
					{ inputs: new Set(v.inputs), outputs: new Set(v.outputs) },
				]),
			),
		});
	});

	setContext(
		SHADER_NODE_PATCH_KEY,
		(nodeId: string, paramId: string, value: number) => patchShaderParam(nodeId, paramId, value),
	);
	setContext(
		SHADER_NODE_PARAM_BYPASS_KEY,
		(nodeId: string, paramId: string, bypassed: boolean) =>
			patchShaderParamGraphBypass(nodeId, paramId, bypassed),
	);
</script>

<section class="flow-wrap">
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		{edgeTypes}
		{defaultEdgeOptions}
		nodeDragThreshold={1}
		minZoom={0.2}
		maxZoom={1.8}
		selectionMode={SelectionMode.Partial}
		selectionOnDrag={true}
		panOnDrag={[1, 2]}
		snapGrid={snapGridOn ? [16, 16] : undefined}
		{isValidConnection}
		deleteKey={['Backspace', 'Delete']}
		onconnect={onConnect}
		ondelete={onFlowDelete}
		onselectionchange={onSelectionChange}
		onbeforereconnect={onBeforeReconnect}
		onreconnect={onReconnect}
		onnodedragstop={onNodeDragStop}
	>
		<EditorFlowViewportBridge />
		<EditorFlowFocus
			focusTick={focusTick}
			focusNodeId={focusNodeId}
			focusEdgeTick={focusEdgeTick}
			focusEdgeId={focusEdgeId}
		/>
		<Background gap={[16, 16]} bgColor="#080a0d" patternColor="#1c2433" />
		<Controls />
		<MiniMap
			bgColor="#0f1218"
			nodeColor="#343f52"
			nodeStrokeColor="#4a5870"
			maskColor="rgba(8, 10, 13, 0.55)"
		/>
	</SvelteFlow>
</section>

<style>
	.flow-wrap {
		height: 100%;
		min-height: 0;
		background: #080a0d;
	}
	.flow-wrap :global(.svelte-flow__renderer),
	.flow-wrap :global(.svelte-flow__pane) {
		background: #080a0d !important;
	}
	.flow-wrap :global(.svelte-flow__minimap) {
		background: #0f1218 !important;
	}
	.flow-wrap :global(.svelte-flow__controls) {
		background: #141820;
		border: 1px solid #252b38;
		border-radius: 8px;
	}
	.flow-wrap :global(.svelte-flow__controls-button) {
		background: #1a1f28;
		border-bottom-color: #252b38;
		fill: #c5cad6;
	}
	.flow-wrap :global(.svelte-flow__controls-button:hover) {
		background: #222833;
	}
	.flow-wrap :global(.edge-error path) {
		stroke: #ff5555 !important;
		stroke-width: 3.5px;
		stroke-linecap: round;
		stroke-linejoin: round;
		animation: flow-edge-error-pulse 1.15s ease-in-out infinite;
	}
	@keyframes flow-edge-error-pulse {
		0%,
		100% {
			stroke-opacity: 1;
		}
		50% {
			stroke-opacity: 0.78;
		}
	}
</style>
