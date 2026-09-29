import type { Edge, Node } from '@xyflow/svelte';
import { collapsedFrameChromeHeightFromInside } from './frameCollapse.js';
import type {
	BufferId,
	GraphDocument,
	GraphEdge,
	GraphEditorBoundaryPort,
	GraphEditorFrame,
	GraphNode,
} from '@shadertoy/compiler';

/** XYFlow data for `type: 'group'` frame nodes (editor-only). */
export type FrameNodeData = {
	label: string;
	collapsed: boolean;
	width: number;
	height: number;
	/** Mirrors `GraphEditorFrame.boundaryPorts` when collapsed; see `subgraphContract` in compiler. */
	boundaryPorts?: GraphEditorBoundaryPort[];
	/** When set, compiler emits `vec3 <name>(vec3 p)` for this frame’s interior (see `GraphEditorFrame.exportVec3Fn`). */
	exportVec3Fn?: string;
	/** When set, compiler emits `float <name>(vec3 p)` for SDF reuse (see `GraphEditorFrame.exportSdfFn`). */
	exportSdfFn?: string;
};

export type FlowNodeAny = Node<ShaderNodeData, 'shader'> | Node<FrameNodeData, 'group'>;

/**
 * XYFlow requires parent `group` nodes before their children in `nodes[]` or child
 * `positionAbsolute` / drag behavior breaks.
 */
export function sortFlowNodesParentsBeforeChildren(nodes: FlowNodeAny[]): FlowNodeAny[] {
	const groups = nodes.filter((n) => n.type === 'group');
	const rest = nodes.filter((n) => n.type !== 'group');
	return [...groups, ...rest];
}

/** Subgraph bundle for export/import (new node ids on merge). */
export type SubgraphBundle = {
	kind: 'shadertoy-subgraph';
	version: 1;
	nodes: GraphNode[];
	edges: GraphEdge[];
};

export function mergeSubgraphIntoDoc(
	doc: GraphDocument,
	subNodes: GraphNode[],
	subEdges: GraphEdge[],
): GraphDocument {
	const idMap = new Map<string, string>();
	for (const n of subNodes) {
		idMap.set(n.id, crypto.randomUUID());
	}
	const newNodes: GraphNode[] = subNodes.map((n) => ({
		...n,
		id: idMap.get(n.id)!,
		position: { x: n.position.x + 48, y: n.position.y + 48 },
		data: structuredClone(n.data),
		parentId: undefined,
	}));
	const newEdges: GraphEdge[] = subEdges
		.filter((e) => idMap.has(e.source) && idMap.has(e.target))
		.map((e) => ({
			id: crypto.randomUUID(),
			source: idMap.get(e.source)!,
			target: idMap.get(e.target)!,
			sourceHandle: e.sourceHandle,
			targetHandle: e.targetHandle,
		}));
	return {
		version: doc.version,
		meta: { ...doc.meta },
		nodes: [...doc.nodes, ...newNodes],
		edges: [...doc.edges, ...newEdges],
		customNodeTypes: doc.customNodeTypes ? [...doc.customNodeTypes] : undefined,
	};
}

export type ShaderNodeData = {
	graphNode: GraphNode;
};

function framesFromFlowGroups(groups: Node<FrameNodeData, 'group'>[]): GraphEditorFrame[] {
	return groups.map((n) => {
		const d = n.data;
		const collapsed = d.collapsed ?? false;
		const w = d.width ?? 400;
		const fullH = d.height ?? 280;
		return {
			id: n.id,
			x: n.position.x,
			y: n.position.y,
			width: w,
			height: fullH,
			label: d.label,
			collapsed,
			boundaryPorts: d.boundaryPorts,
			...(d.exportVec3Fn?.trim() ? { exportVec3Fn: d.exportVec3Fn.trim() } : {}),
			...(d.exportSdfFn?.trim() ? { exportSdfFn: d.exportSdfFn.trim() } : {}),
		};
	});
}

export function flowToDoc(
	nodes: FlowNodeAny[],
	edges: Edge[],
	meta: GraphDocument['meta'],
	customNodeTypes: GraphDocument['customNodeTypes'],
): GraphDocument {
	const shaderFlow = nodes.filter((n): n is Node<ShaderNodeData, 'shader'> => n.type === 'shader');
	const groupFlow = nodes.filter((n): n is Node<FrameNodeData, 'group'> => n.type === 'group');

	const gn: GraphNode[] = shaderFlow.map((n) => {
		const { parentId: _stale, ...rest } = n.data.graphNode;
		const g: GraphNode = {
			...rest,
			pass: rest.pass ?? 'image',
			position: { x: n.position.x, y: n.position.y },
		};
		const pid = n.parentId;
		if (pid) g.parentId = pid;
		return g;
	});

	const ge: GraphEdge[] = edges.map((e) => ({
		id: e.id,
		source: e.source,
		target: e.target,
		sourceHandle: e.sourceHandle ?? '',
		targetHandle: e.targetHandle ?? '',
	}));

	const frames = framesFromFlowGroups(groupFlow);
	const nextMeta: GraphDocument['meta'] = {
		...meta,
		editor: { ...(meta.editor ?? {}), frames },
	};

	return {
		version: 1,
		meta: nextMeta,
		nodes: gn,
		edges: ge,
		customNodeTypes: customNodeTypes ? [...customNodeTypes] : undefined,
	};
}


export function docToFlowNodesAndEdges(doc: GraphDocument): {
	nodes: FlowNodeAny[];
	edges: Edge[];
} {
	const frames = doc.meta.editor?.frames ?? [];
	const groups: FlowNodeAny[] = frames.map((fr) => {
		const collapsed = fr.collapsed ?? false;
		const inside = new Set(doc.nodes.filter((n) => n.parentId === fr.id).map((n) => n.id));
		const h = collapsed
			? collapsedFrameChromeHeightFromInside(inside, doc.edges)
			: fr.height;
		return {
			id: fr.id,
			type: 'group',
			position: { x: fr.x, y: fr.y },
			draggable: true,
			dragHandle: '.frame-drag-handle',
			data: {
				label: fr.label ?? 'Frame',
				collapsed,
				width: fr.width,
				height: fr.height,
				boundaryPorts: fr.boundaryPorts,
				...(fr.exportVec3Fn?.trim() ? { exportVec3Fn: fr.exportVec3Fn.trim() } : {}),
				...(fr.exportSdfFn?.trim() ? { exportSdfFn: fr.exportSdfFn.trim() } : {}),
			},
			style: `width: ${fr.width}px; height: ${h}px`,
		} as Node<FrameNodeData, 'group'>;
	});

	const shaderNodes: FlowNodeAny[] = doc.nodes.map((gn) => {
		const gnNorm: GraphNode = { ...gn, pass: gn.pass ?? 'image' };
		const fn = toFlowNode(gnNorm);
		const sfn = fn as Node<ShaderNodeData, 'shader'>;
		if (gn.parentId) {
			sfn.parentId = gn.parentId;
			const fr = frames.find((f) => f.id === gn.parentId);
			sfn.hidden = !!fr?.collapsed;
		} else {
			sfn.hidden = false;
		}
		return fn;
	});

	const edges: Edge[] = doc.edges.map((e) => ({
		id: e.id,
		source: e.source,
		target: e.target,
		sourceHandle: e.sourceHandle,
		targetHandle: e.targetHandle,
		type: 'shaderWire',
	}));

	return {
		nodes: sortFlowNodesParentsBeforeChildren([...groups, ...shaderNodes]),
		edges,
	};
}

export function createGraphNode(
	typeId: string,
	pass: BufferId,
	position: { x: number; y: number },
	data: Record<string, unknown> = {},
): GraphNode {
	return {
		id: crypto.randomUUID(),
		typeId,
		pass,
		position: { ...position },
		data: { ...data },
	};
}

/** Width for fitView / overlap packing; height omitted so the node grows with handles + pinned params. */
const SHADER_NODE_LAYOUT = { width: 200 };

export function toFlowNode(gn: GraphNode): Node<ShaderNodeData, 'shader'> {
	const graphNode: GraphNode = { ...gn, pass: gn.pass ?? 'image', position: { ...gn.position } };
	const flow: Node<ShaderNodeData, 'shader'> = {
		id: gn.id,
		type: 'shader',
		position: gn.position,
		width: SHADER_NODE_LAYOUT.width,
		data: { graphNode },
	};
	if (gn.parentId) flow.parentId = gn.parentId;
	return flow;
}
