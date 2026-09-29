import {
	buildBakedSceneSdfCustomType,
	PARAM_GRAPH_BYPASS_DATA_KEY,
	type GraphNode,
} from '@shadertoy/compiler';
import type { Connection, Edge, Node } from '@xyflow/svelte';
import {
	createGraphNode,
	toFlowNode,
	type FlowNodeAny,
	type FrameNodeData,
} from '$lib/flowDoc.js';
import {
	addFrameNode,
	connectShaderWireSinglePort,
	isValidConnectionForGraphPage,
	onBeforeReconnectValidate,
	persistShaderNodePositionsAfterDrag,
	selectionChangeToIds,
	toggleFrameCollapseInGraphPage,
} from '$lib/features/graphPage/flowHandlers.js';
import {
	alignSelectedShaderNodes,
	duplicateSelectedShaderNodes,
	groupSelectedShaderNodes as groupSelectedShaderNodesFlow,
	snapSelectionPositionsToGrid as snapShaderSelectionToGrid,
} from '$lib/page/flowOps.js';
import {
	copySelectionToClipboard as copySelectionToClipboardOp,
	pasteFromClipboard as pasteFromClipboardOp,
} from '$lib/features/graphPage/clipboardOps.js';
import { get } from 'svelte/store';
import { getFlowCenterForNewNode } from '$lib/editor/flowPlacement.js';
import { tryBakeSelectionToCustomNode } from './bakeSelectionToCustomNode.js';
import type { GraphPageActionApi, GraphPageActions } from './graphPageActionTypes.js';

export function createGraphPageActionsFlow(
	api: GraphPageActionApi,
): Pick<
	GraphPageActions,
	| 'isValidConnection'
	| 'onConnect'
	| 'onBeforeReconnect'
	| 'onReconnect'
	| 'onFlowDelete'
	| 'onSelectionChange'
	| 'duplicateSelectedNodes'
	| 'groupSelectedShaderNodes'
	| 'snapSelectionPositionsToGrid'
	| 'alignSelectionNodes'
	| 'bakeSceneSdfToCustomNode'
	| 'bakeSelectionToCustomNode'
	| 'addFrame'
	| 'toggleFrameCollapse'
	| 'onShaderNodeDragStop'
	| 'copySelectionToClipboard'
	| 'pasteFromClipboard'
	| 'setSelectedShaderParentFrame'
	| 'addNodeType'
	| 'patchSelectedGraphNode'
	| 'patchShaderNodeParam'
	| 'patchShaderNodeParamGraphBypass'
> {
	function isValidConnection(c: Connection | Edge): boolean {
		return isValidConnectionForGraphPage(c, api.getNodes(), api.getRegistry());
	}

	function onConnect(c: Connection) {
		api.setEdges(connectShaderWireSinglePort(api.getEdges(), c));
		api.bumpGraphEpoch();
	}

	function onBeforeReconnect(newEdge: Edge, _oldEdge: Edge): Edge | false {
		return onBeforeReconnectValidate(newEdge, isValidConnection);
	}

	function onReconnect(_oldEdge: Edge, _newConnection: Connection) {
		api.bumpGraphEpoch();
	}

	function onFlowDelete(_p: { nodes: Node[]; edges: Edge[] }) {
		api.bumpGraphEpoch();
	}

	function onSelectionChange({ nodes: sn }: { nodes: Node[] }) {
		const r = selectionChangeToIds(sn);
		api.setSelectedNodeIds(r.selectedNodeIds);
		api.setSelectedNodeId(r.selectedNodeId);
	}

	function duplicateSelectedNodes() {
		api.setNodes(duplicateSelectedShaderNodes(api.getNodes(), api.getSelectedNodeIds()));
		api.bumpGraphEpoch();
	}

	function groupSelectedShaderNodes() {
		const nodes = api.getNodes();
		const next = groupSelectedShaderNodesFlow(nodes, api.getSelectedNodeIds());
		if (next !== nodes) {
			api.setNodes(next);
			api.bumpGraphEpoch();
		}
	}

	function snapSelectionPositionsToGrid() {
		api.setNodes(snapShaderSelectionToGrid(api.getNodes(), api.getSelectedNodeIds()));
		api.bumpGraphEpoch();
	}

	function alignSelectionNodes() {
		api.setNodes(
			alignSelectedShaderNodes(
				api.getNodes(),
				api.getEdges(),
				api.getSelectedNodeIds(),
				api.getCustomNodeTypes(),
			),
		);
		api.bumpGraphEpoch();
	}

	function bakeSceneSdfToCustomNode() {
		const compileResult = api.getCompileResult();
		if (compileResult.errors.length > 0) {
			alert('Fix compile errors first.');
			return;
		}
		const frag = compileResult.passes[api.getActivePass()]?.fragmentSource;
		if (!frag) {
			alert('No compiled shader for this pass.');
			return;
		}
		const def = buildBakedSceneSdfCustomType(frag, api.getActivePass(), api.getGraphMeta().name ?? 'Baked');
		if (!def) {
			alert('No scene SDF in this pass (need scene_sdf_* from raymarch setup).');
			return;
		}
		api.setCustomNodeTypes([...api.getCustomNodeTypes(), def]);
		api.bumpGraphEpoch();
		alert('Added custom node ' + def.label + ' (' + def.id + '). Find it under Custom in the palette.');
	}

	function bakeSelectionToCustomNode() {
		const r = tryBakeSelectionToCustomNode({
			nodes: api.getNodes(),
			edges: api.getEdges(),
			selectedNodeIds: api.getSelectedNodeIds(),
			activePass: api.getActivePass(),
			compileResult: api.getCompileResult(),
			registry: api.getRegistry(),
			graphMetaName: api.getGraphMeta().name,
		});
		if (!r.ok) {
			alert(r.error);
			return;
		}
		api.setCustomNodeTypes([...api.getCustomNodeTypes(), r.def]);
		api.setNodes(r.nodes);
		api.setEdges(r.edges);
		api.setSelectedNodeIds([r.bakedNodeId]);
		api.setSelectedNodeId(r.bakedNodeId);
		api.bumpGraphEpoch();
		alert(
			'Replaced selection with custom node ' +
				r.def.label +
				' (' +
				r.def.id +
				'). Uniforms in the baked GLSL still reference original node ids. Find it under Custom in the palette.',
		);
	}

	function addFrame() {
		api.setNodes(
			addFrameNode({
				nodes: api.getNodes(),
				createId: () => crypto.randomUUID(),
				random: () => Math.random(),
			}),
		);
		api.bumpGraphEpoch();
	}

	function toggleFrameCollapse(frameId: string) {
		api.setNodes(
			toggleFrameCollapseInGraphPage({ nodes: api.getNodes(), edges: api.getEdges(), frameId }),
		);
		api.bumpGraphEpoch();
	}

	function onShaderNodeDragStop() {
		api.setNodes(persistShaderNodePositionsAfterDrag(api.getNodes()));
	}

	async function copySelectionToClipboard() {
		await copySelectionToClipboardOp({
			nodes: api.getNodes(),
			edges: api.getEdges(),
			selectedNodeIds: api.getSelectedNodeIds(),
		});
	}

	async function pasteFromClipboard() {
		const next = await pasteFromClipboardOp({
			readClipboardText: () => navigator.clipboard.readText(),
			state: {
				nodes: api.getNodes(),
				edges: api.getEdges(),
				graphMeta: api.getGraphMeta(),
				customNodeTypes: api.getCustomNodeTypes(),
			},
		});
		if (!next) return;
		api.setNodes(next.nodes);
		api.setEdges(next.edges);
		api.setGraphMeta(next.graphMeta);
		api.setCustomNodeTypes(next.customNodeTypes);
		api.bumpGraphEpoch();
	}

	function setSelectedShaderParentFrame(parentId: string) {
		const id = api.getSelectedNodeId();
		if (!id) return;
		const pid = parentId || undefined;
		const nodes = api.getNodes();
		api.setNodes(
			nodes.map((n) => {
				if (n.id !== id || n.type !== 'shader') return n;
				const frame = pid
					? (nodes.find((x) => x.id === pid && x.type === 'group') as Node<FrameNodeData, 'group'> | undefined)
					: undefined;
				const hidden = frame?.data.collapsed === true;
				const gn = n.data.graphNode;
				return {
					...n,
					parentId: pid,
					hidden,
					data: {
						graphNode: {
							...gn,
							parentId: pid,
							position: { ...gn.position },
						},
					},
				};
			}),
		);
		api.bumpGraphEpoch();
	}

	function addNodeType(typeId: string) {
		const placeFn = get(getFlowCenterForNewNode);
		const pos = placeFn
			? placeFn()
			: { x: 120 + Math.random() * 80, y: 120 + Math.random() * 80 };
		const gn = createGraphNode(typeId, api.getActivePass(), pos);
		api.setNodes([...api.getNodes(), toFlowNode(gn)]);
		api.bumpGraphEpoch();
	}

	function patchSelectedGraphNode(fn: (g: GraphNode) => void) {
		const id = api.getSelectedNodeId();
		if (!id) return;
		const flow = api.getNodes().find((n) => n.id === id);
		if (!flow || flow.type !== 'shader') return;
		const gn = JSON.parse(JSON.stringify(flow.data.graphNode)) as GraphNode;
		fn(gn);
		api.setNodes(
			api.getNodes().map((n) =>
				n.id === id
					? ({ ...n, data: { graphNode: gn }, position: { ...n.position } } as FlowNodeAny)
					: n,
			),
		);
		api.bumpGraphEpoch();
	}

	function patchShaderNodeParam(nodeId: string, paramId: string, value: number) {
		const flow = api.getNodes().find((n) => n.id === nodeId);
		if (!flow || flow.type !== 'shader') return;
		const gn = JSON.parse(JSON.stringify(flow.data.graphNode)) as GraphNode;
		gn.data[paramId] = value;
		api.setNodes(
			api.getNodes().map((n) =>
				n.id === nodeId
					? ({ ...n, data: { graphNode: gn }, position: { ...n.position } } as FlowNodeAny)
					: n,
			),
		);
		api.bumpGraphEpoch();
	}

	function patchShaderNodeParamGraphBypass(nodeId: string, paramId: string, bypassed: boolean) {
		const flow = api.getNodes().find((n) => n.id === nodeId);
		if (!flow || flow.type !== 'shader') return;
		const gn = JSON.parse(JSON.stringify(flow.data.graphNode)) as GraphNode;
		const prev = gn.data[PARAM_GRAPH_BYPASS_DATA_KEY];
		const next: Record<string, boolean> =
			prev && typeof prev === 'object' ? { ...(prev as Record<string, boolean>) } : {};
		if (bypassed) next[paramId] = true;
		else delete next[paramId];
		if (Object.keys(next).length === 0) {
			const { [PARAM_GRAPH_BYPASS_DATA_KEY]: _b, ...rest } = gn.data as Record<string, unknown>;
			gn.data = rest as GraphNode['data'];
		} else {
			gn.data = { ...gn.data, [PARAM_GRAPH_BYPASS_DATA_KEY]: next };
		}
		api.setNodes(
			api.getNodes().map((n) =>
				n.id === nodeId
					? ({ ...n, data: { graphNode: gn }, position: { ...n.position } } as FlowNodeAny)
					: n,
			),
		);
		api.bumpGraphEpoch();
	}

	return {
		isValidConnection,
		onConnect,
		onBeforeReconnect,
		onReconnect,
		onFlowDelete,
		onSelectionChange,
		duplicateSelectedNodes,
		groupSelectedShaderNodes,
		snapSelectionPositionsToGrid,
		alignSelectionNodes,
		bakeSceneSdfToCustomNode,
		bakeSelectionToCustomNode,
		addFrame,
		toggleFrameCollapse,
		onShaderNodeDragStop,
		copySelectionToClipboard,
		pasteFromClipboard,
		setSelectedShaderParentFrame,
		addNodeType,
		patchSelectedGraphNode,
		patchShaderNodeParam,
		patchShaderNodeParamGraphBypass,
	};
}
