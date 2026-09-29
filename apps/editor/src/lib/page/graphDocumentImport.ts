import type { Edge } from '@xyflow/svelte';
import type { GraphDocument, NodeTypeDef } from '@shadertoy/compiler';
import { docToFlowNodesAndEdges, type FlowNodeAny } from '$lib/flowDoc.js';
import { packShaderNodesResolveOverlap } from '$lib/shaderNodeLayout.js';
import { sortFlowNodesParentsBeforeChildren } from '$lib/flowDoc.js';

export function flowStateFromGraphDocument(doc: GraphDocument): {
	nodes: FlowNodeAny[];
	edges: Edge[];
	customNodeTypes: NodeTypeDef[];
	graphMeta: GraphDocument['meta'];
} {
	const customNodeTypes = doc.customNodeTypes ?? [];
	const graphMeta = doc.meta ?? {};
	const rebuilt = docToFlowNodesAndEdges(doc);
	const nodes = sortFlowNodesParentsBeforeChildren(
		packShaderNodesResolveOverlap(rebuilt.nodes, customNodeTypes),
	);
	return { nodes, edges: rebuilt.edges, customNodeTypes, graphMeta };
}
