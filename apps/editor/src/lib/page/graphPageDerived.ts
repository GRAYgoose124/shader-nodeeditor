import type {
	BufferId,
	CompileDebugOptions,
	CompileResult,
	GraphDocument,
	GraphNode,
	NodeTypeDef,
	UniformManifestEntry,
} from '@shadertoy/compiler';
import { compileGraph, extractNodeGlslBlock, stringifyGraphDocument } from '@shadertoy/compiler';
import type { Edge, Node } from '@xyflow/svelte';
import {
	gpuErrorRelatedNodeIds,
	mergeDiagnostics,
	parseValidateAnchors,
} from '$lib/compileDiagnostics.js';
import { flowToDoc, type FlowNodeAny, type FrameNodeData, type ShaderNodeData } from '$lib/flowDoc.js';
import { findLookatOrbitNodeId } from '$lib/lookatOrbit.js';
import { computePassReadiness, type PassReadiness } from '$lib/page/passReadiness.js';

export type UniformGroupsByNodeEntry = [string, { pass: BufferId; uniforms: UniformManifestEntry[] }];

export function buildCompileResultFromFlow(
	nodes: FlowNodeAny[],
	edges: Edge[],
	graphMeta: GraphDocument['meta'],
	customNodeTypes: NodeTypeDef[],
	debug?: CompileDebugOptions,
): CompileResult {
	const doc = flowToDoc(nodes, edges, graphMeta, customNodeTypes);
	void stringifyGraphDocument(doc);
	return compileGraph(doc, debug);
}

export function buildMergedDiagnostics(
	compileResult: CompileResult,
	gpuError: string | null,
	knownNodeIds: Set<string>,
): {
	errorNodeIds: Set<string>;
	errorEdgeIds: Set<string>;
	errorPortsByNode: Map<string, { inputs: Set<string>; outputs: Set<string> }>;
} {
	const va = parseValidateAnchors(compileResult.errors, knownNodeIds);
	const gpuIds = gpuErrorRelatedNodeIds(gpuError, compileResult.errors.length === 0 ? compileResult : null);
	return mergeDiagnostics(va, gpuIds);
}

export function buildKnownNodeIds(nodes: FlowNodeAny[]): Set<string> {
	return new Set(nodes.map((n) => n.id));
}

/** First edge in list order into `targetNodeId` where both ends are `image`-pass shader nodes. */
/** True when the flow has a `scene_sdf_sink` on the image pass (same condition as compiler scene emission). */
export function flowImagePassHasSceneSdfSink(nodes: FlowNodeAny[]): boolean {
	return nodes.some(
		(n) =>
			n.type === 'shader' &&
			n.data.graphNode.pass === 'image' &&
			n.data.graphNode.typeId === 'scene_sdf_sink',
	);
}

export function firstImagePassIncomingEdgeId(
	nodes: FlowNodeAny[],
	edges: Edge[],
	targetNodeId: string,
): string | undefined {
	for (const e of edges) {
		if (e.target !== targetNodeId) continue;
		const sn = nodes.find((n) => n.id === e.source);
		const tn = nodes.find((n) => n.id === e.target);
		if (!sn || sn.type !== 'shader' || !tn || tn.type !== 'shader') continue;
		if (sn.data.graphNode.pass !== 'image' || tn.data.graphNode.pass !== 'image') continue;
		return e.id;
	}
	return undefined;
}

export function filterPassShaderNodes(
	nodes: FlowNodeAny[],
	activePass: BufferId,
): Node<ShaderNodeData, 'shader'>[] {
	return nodes.filter(
		(n): n is Node<ShaderNodeData, 'shader'> =>
			n.type === 'shader' && n.data.graphNode.pass === activePass,
	);
}

export function buildReadiness(
	passShaderNodes: Node<ShaderNodeData, 'shader'>[],
	edges: Edge[],
	compileErrorCount: number,
): PassReadiness {
	return computePassReadiness(
		passShaderNodes.map((n) => n.data.graphNode),
		edges,
		compileErrorCount,
	);
}

export function buildNodeTypeById(nodes: FlowNodeAny[]): Map<string, string> {
	const m = new Map<string, string>();
	for (const n of nodes) {
		if (n.type === 'shader') m.set(n.id, n.data.graphNode.typeId);
	}
	return m;
}

export function buildShaderGraphNodesById(nodes: FlowNodeAny[]): Map<string, GraphNode> {
	const m = new Map<string, GraphNode>();
	for (const n of nodes) {
		if (n.type === 'shader') m.set(n.id, n.data.graphNode);
	}
	return m;
}

export function buildSelectedGroupNode(
	nodes: FlowNodeAny[],
	selectedNodeIds: string[],
): Node<FrameNodeData, 'group'> | undefined {
	const id = selectedNodeIds.length === 1 ? selectedNodeIds[0] : undefined;
	if (!id) return undefined;
	const n = nodes.find((x) => x.id === id && x.type === 'group');
	return n as Node<FrameNodeData, 'group'> | undefined;
}

export function buildFrameIds(nodes: FlowNodeAny[]): string[] {
	return nodes.filter((n) => n.type === 'group').map((n) => n.id);
}

export function buildUniformGroupsByNode(compileResult: CompileResult): UniformGroupsByNodeEntry[] {
	if (compileResult.errors.length > 0) return [];
	const m = new Map<string, { pass: BufferId; uniforms: UniformManifestEntry[] }>();
	for (const pp of compileResult.manifest.passes) {
		for (const u of pp.uniforms) {
			const cur = m.get(u.nodeId) ?? { pass: pp.id, uniforms: [] };
			cur.uniforms.push(u);
			m.set(u.nodeId, cur);
		}
	}
	return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function buildSelectedNodeGlsl(
	compileResult: CompileResult,
	activePass: BufferId,
	selectedNodeId: string | null,
): string | null {
	if (!selectedNodeId || compileResult.errors.length > 0) return null;
	const frag = compileResult.passes[activePass]?.fragmentSource;
	if (!frag) return null;
	return extractNodeGlslBlock(frag, selectedNodeId);
}

export function buildSelectedFlowNode(
	nodes: FlowNodeAny[],
	selectedNodeId: string | null,
): Node<ShaderNodeData, 'shader'> | null {
	const n = nodes.find((x) => x.id === selectedNodeId);
	if (!n || n.type !== 'shader') return null;
	return n;
}

export function buildPreviewLookatOrbitNodeId(
	nodes: FlowNodeAny[],
	edges: Edge[],
	activePass: BufferId,
): string | null {
	return findLookatOrbitNodeId(nodes, edges, activePass);
}
