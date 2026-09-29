import type { Edge, Node } from '@xyflow/svelte';
import type { GraphDocument, GraphEdge, GraphNode, NodeTypeDef } from '@shadertoy/compiler';
import {
	docToFlowNodesAndEdges,
	flowToDoc,
	mergeSubgraphIntoDoc,
	sortFlowNodesParentsBeforeChildren,
	type FlowNodeAny,
	type ShaderNodeData,
} from '$lib/flowDoc.js';
import { packShaderNodesResolveOverlap } from '$lib/shaderNodeLayout.js';

export const SUBGRAPH_CLIPBOARD_KIND = 'shadertoy-subgraph' as const;
export const SUBGRAPH_CLIPBOARD_VERSION = 1 as const;

export type SubgraphClipboardV1 = {
	kind: typeof SUBGRAPH_CLIPBOARD_KIND;
	version: typeof SUBGRAPH_CLIPBOARD_VERSION;
	nodes: GraphNode[];
	edges: Pick<GraphEdge, 'id' | 'source' | 'target' | 'sourceHandle' | 'targetHandle'>[];
};

export function buildSubgraphClipboardV1(
	nodes: FlowNodeAny[],
	edges: Edge[],
	selectedNodeIds: string[],
): SubgraphClipboardV1 | null {
	const ids = new Set(
		selectedNodeIds.filter((sid) => {
			const n = nodes.find((x) => x.id === sid);
			return n?.type === 'shader';
		}),
	);
	if (ids.size === 0) return null;
	const subNodes = nodes
		.filter((n): n is Node<ShaderNodeData, 'shader'> => n.type === 'shader' && ids.has(n.id))
		.map((n) => ({
			...n.data.graphNode,
			position: { x: n.position.x, y: n.position.y },
			parentId: n.parentId,
		}));
	const subEdges = edges
		.filter((e) => ids.has(e.source) && ids.has(e.target))
		.map((e) => ({
			id: e.id,
			source: e.source,
			target: e.target,
			sourceHandle: e.sourceHandle ?? '',
			targetHandle: e.targetHandle ?? '',
		}));
	return {
		kind: SUBGRAPH_CLIPBOARD_KIND,
		version: SUBGRAPH_CLIPBOARD_VERSION,
		nodes: subNodes,
		edges: subEdges,
	};
}

export async function writeSubgraphToClipboard(bundle: SubgraphClipboardV1): Promise<void> {
	try {
		await navigator.clipboard.writeText(JSON.stringify(bundle));
	} catch {
		/* ignore */
	}
}

export function parseSubgraphClipboardV1(raw: unknown): SubgraphClipboardV1 | null {
	if (raw === null || typeof raw !== 'object') return null;
	const o = raw as { kind?: string; version?: number; nodes?: GraphNode[]; edges?: GraphEdge[] };
	if (
		o.kind !== SUBGRAPH_CLIPBOARD_KIND ||
		o.version !== SUBGRAPH_CLIPBOARD_VERSION ||
		!Array.isArray(o.nodes)
	) {
		return null;
	}
	return {
		kind: SUBGRAPH_CLIPBOARD_KIND,
		version: SUBGRAPH_CLIPBOARD_VERSION,
		nodes: o.nodes,
		edges: (o.edges ?? []) as SubgraphClipboardV1['edges'],
	};
}

export type FlowDocSnapshot = {
	nodes: FlowNodeAny[];
	edges: Edge[];
	graphMeta: GraphDocument['meta'];
	customNodeTypes: NodeTypeDef[];
};

export function mergeSubgraphV1IntoFlow(
	ctx: FlowDocSnapshot,
	payload: SubgraphClipboardV1,
	opts?: { packOverlap?: boolean },
): FlowDocSnapshot {
	const packOverlap = opts?.packOverlap ?? true;
	const doc = flowToDoc(ctx.nodes, ctx.edges, ctx.graphMeta, ctx.customNodeTypes);
	const merged = mergeSubgraphIntoDoc(doc, payload.nodes, payload.edges as GraphDocument['edges']);
	const customNodeTypes = merged.customNodeTypes ?? ctx.customNodeTypes;
	const graphMeta = merged.meta ?? ctx.graphMeta;
	const { nodes: fn, edges: fe } = docToFlowNodesAndEdges(merged);
	const nodes = packOverlap
		? sortFlowNodesParentsBeforeChildren(packShaderNodesResolveOverlap(fn, customNodeTypes))
		: fn;
	return { nodes, edges: fe, graphMeta, customNodeTypes };
}
