import type { Edge, Node } from '@xyflow/svelte';
import type { BufferId, CompileResult, GraphEdge, NodeTypeDef } from '@shadertoy/compiler';
import {
	bakedSelectionInputPortId,
	bakedSelectionOutputPortId,
	buildBakedSelectionCustomType,
	topoOrder,
	type BakedSelectionBoundaryIn,
	type BakedSelectionBoundaryOut,
} from '@shadertoy/compiler';
import {
	createGraphNode,
	sortFlowNodesParentsBeforeChildren,
	toFlowNode,
	type FlowNodeAny,
	type FrameNodeData,
	type ShaderNodeData,
} from '$lib/flowDoc.js';

function flowEdgesToGraphEdges(edges: Edge[]): GraphEdge[] {
	return edges
		.filter((e) => e.type === 'shaderWire' || e.type === undefined)
		.map((e) => ({
			id: e.id,
			source: e.source,
			target: e.target,
			sourceHandle: e.sourceHandle ?? '',
			targetHandle: e.targetHandle ?? '',
		}));
}

export type BakeSelectionToCustomResult =
	| { ok: true; def: NodeTypeDef; nodes: FlowNodeAny[]; edges: Edge[]; bakedNodeId: string }
	| { ok: false; error: string };

/**
 * Replace the selected shader subgraph with one custom node: boundary wires become ports;
 * GLSL is the compiler-emitted blocks for those nodes (see `buildBakedSelectionCustomType`).
 */
export function tryBakeSelectionToCustomNode(args: {
	nodes: FlowNodeAny[];
	edges: Edge[];
	selectedNodeIds: string[];
	activePass: BufferId;
	compileResult: CompileResult;
	registry: Map<string, NodeTypeDef>;
	graphMetaName?: string | null;
}): BakeSelectionToCustomResult {
	const { nodes, edges, selectedNodeIds, activePass, compileResult, registry, graphMetaName } = args;

	if (compileResult.errors.length > 0) {
		return { ok: false, error: 'Fix compile errors first.' };
	}

	const frag = compileResult.passes[activePass]?.fragmentSource;
	if (!frag?.trim()) {
		return { ok: false, error: 'No compiled shader for this pass.' };
	}

	const selectedShaderIds = selectedNodeIds.filter((id) => {
		const n = nodes.find((x) => x.id === id);
		return n?.type === 'shader';
	});
	if (selectedShaderIds.length === 0) {
		return { ok: false, error: 'Select one or more shader nodes in the graph.' };
	}

	for (const id of selectedShaderIds) {
		const n = nodes.find((x) => x.id === id) as Node<ShaderNodeData, 'shader'>;
		const p = n.data.graphNode.pass ?? 'image';
		if (p !== activePass) {
			return {
				ok: false,
				error: 'Selection spans multiple passes or does not match the active pass. Switch pass or adjust selection.',
			};
		}
	}

	const selSet = new Set(selectedShaderIds);
	const ge = flowEdgesToGraphEdges(edges);

	type RawIn = {
		sourceNodeId: string;
		sourceHandle: string;
		targetNodeId: string;
		targetHandle: string;
	};
	type RawOut = RawIn;

	const inboundByPort = new Map<string, RawIn>();
	for (const e of ge) {
		const s = e.source;
		const t = e.target;
		const sh = e.sourceHandle;
		const th = e.targetHandle;
		if (!selSet.has(s) && selSet.has(t)) {
			const key = `${t}\0${th}`;
			const prev = inboundByPort.get(key);
			if (prev) {
				if (prev.sourceNodeId !== s || prev.sourceHandle !== sh) {
					return {
						ok: false,
						error: `Multiple external sources for the same input port (${t} ← ${th}). Disconnect extras before baking.`,
					};
				}
			} else {
				inboundByPort.set(key, { sourceNodeId: s, sourceHandle: sh, targetNodeId: t, targetHandle: th });
			}
		}
	}

	const outboundByPort = new Map<string, RawOut>();
	for (const e of ge) {
		const s = e.source;
		const t = e.target;
		const sh = e.sourceHandle;
		const th = e.targetHandle;
		if (selSet.has(s) && !selSet.has(t)) {
			const key = `${s}\0${sh}`;
			const prev = outboundByPort.get(key);
			if (prev) {
				if (prev.targetNodeId !== t || prev.targetHandle !== th) {
					return {
						ok: false,
						error: `Multiple external targets for the same output port (${s} → ${sh}). Disconnect extras before baking.`,
					};
				}
			} else {
				outboundByPort.set(key, { sourceNodeId: s, sourceHandle: sh, targetNodeId: t, targetHandle: th });
			}
		}
	}

	if (outboundByPort.size === 0) {
		return {
			ok: false,
			error: 'Nothing leaves the selection: add at least one wire from an interior node to a node outside the selection.',
		};
	}

	const resolveShaderNode = (id: string) => {
		const n = nodes.find((x) => x.id === id);
		if (!n || n.type !== 'shader') return null;
		return n.data.graphNode;
	};

	const boundaryIn: BakedSelectionBoundaryIn[] = [];
	for (const w of inboundByPort.values()) {
		const srcGn = resolveShaderNode(w.sourceNodeId);
		const tgtGn = resolveShaderNode(w.targetNodeId);
		if (!srcGn || !tgtGn) {
			return { ok: false, error: 'Could not resolve shader node for a boundary wire.' };
		}
		const srcDef = registry.get(srcGn.typeId);
		const tgtDef = registry.get(tgtGn.typeId);
		if (!srcDef || !tgtDef) {
			return { ok: false, error: `Missing node type definition for a boundary wire (${srcGn.typeId} / ${tgtGn.typeId}).` };
		}
		const outP = srcDef.outputs.find((p) => p.id === w.sourceHandle);
		const inP = tgtDef.inputs.find((p) => p.id === w.targetHandle);
		if (!outP || !inP) {
			return { ok: false, error: `Unknown port on boundary wire (${w.sourceHandle} → ${w.targetHandle}).` };
		}
		if (outP.type !== inP.type) {
			return { ok: false, error: `Type mismatch on boundary wire: ${outP.type} vs ${inP.type}.` };
		}
		boundaryIn.push({
			...w,
			glslType: inP.type,
		});
	}

	const boundaryOut: BakedSelectionBoundaryOut[] = [];
	for (const w of outboundByPort.values()) {
		const srcGn = resolveShaderNode(w.sourceNodeId);
		const tgtGn = resolveShaderNode(w.targetNodeId);
		if (!srcGn || !tgtGn) {
			return { ok: false, error: 'Could not resolve shader node for a boundary wire.' };
		}
		const srcDef = registry.get(srcGn.typeId);
		const tgtDef = registry.get(tgtGn.typeId);
		if (!srcDef || !tgtDef) {
			return { ok: false, error: `Missing node type definition for a boundary wire (${srcGn.typeId} / ${tgtGn.typeId}).` };
		}
		const outP = srcDef.outputs.find((p) => p.id === w.sourceHandle);
		const inP = tgtDef.inputs.find((p) => p.id === w.targetHandle);
		if (!outP || !inP) {
			return { ok: false, error: `Unknown port on boundary wire (${w.sourceHandle} → ${w.targetHandle}).` };
		}
		if (outP.type !== inP.type) {
			return { ok: false, error: `Type mismatch on boundary wire: ${outP.type} vs ${inP.type}.` };
		}
		boundaryOut.push({
			...w,
			glslType: outP.type,
		});
	}

	const subEdges = ge.filter((e) => selSet.has(e.source) && selSet.has(e.target));
	const order = topoOrder(selSet, subEdges);
	if (!order) {
		return { ok: false, error: 'Cycle inside the selection (shader wires). Remove the cycle before baking.' };
	}

	const label = (graphMetaName?.trim() || 'Graph') + ' — selection';
	const bakedNodeId = crypto.randomUUID();
	const def = buildBakedSelectionCustomType({
		fragmentSource: frag,
		orderedNodeIds: order,
		boundaryIn,
		boundaryOut,
		label,
		bakedNodeIdForUniforms: bakedNodeId,
	});
	if (!def) {
		return {
			ok: false,
			error: 'Could not extract compiled GLSL for the selection. Recompile and ensure each node emits a // node: block.',
		};
	}

	const selectedShaderFlows = selectedShaderIds
		.map((id) => nodes.find((n) => n.id === id))
		.filter((n): n is Extract<FlowNodeAny, { type: 'shader' }> => n?.type === 'shader');

	let sx = 0;
	let sy = 0;
	for (const n of selectedShaderFlows) {
		sx += n.position.x;
		sy += n.position.y;
	}
	const pos = { x: sx / selectedShaderFlows.length, y: sy / selectedShaderFlows.length };

	const parents = selectedShaderFlows.map((n) => n.parentId).filter(Boolean);
	const commonParent = parents.length > 0 && parents.every((p) => p === parents[0]) ? parents[0]! : undefined;

	const gn = createGraphNode(def.id, activePass, pos);
	gn.id = bakedNodeId;
	if (commonParent) {
		gn.parentId = commonParent;
	}
	const bakedFlow = toFlowNode(gn);
	if (commonParent) {
		bakedFlow.parentId = commonParent;
		const frame = nodes.find(
			(x): x is Node<FrameNodeData, 'group'> => x.id === commonParent && x.type === 'group',
		);
		bakedFlow.hidden = frame?.data.collapsed === true;
	}

	const nextNodes = sortFlowNodesParentsBeforeChildren([
		...nodes.filter((n) => !(n.type === 'shader' && selSet.has(n.id))),
		bakedFlow,
	]);

	const newEdges: Edge[] = [];
	for (const e of edges) {
		if (e.type !== 'shaderWire' && e.type !== undefined) {
			newEdges.push(e);
			continue;
		}
		const s = e.source;
		const t = e.target;
		const inS = selSet.has(s);
		const inT = selSet.has(t);
		if (!inS && !inT) {
			newEdges.push(e);
			continue;
		}
		if (inS && inT) {
			continue;
		}
		// Boundary edges are re-created below (handles may change for the baked node).
	}

	for (const w of boundaryIn) {
		newEdges.push({
			id: crypto.randomUUID(),
			type: 'shaderWire',
			source: w.sourceNodeId,
			target: bakedNodeId,
			sourceHandle: w.sourceHandle,
			targetHandle: bakedSelectionInputPortId(w.targetNodeId, w.targetHandle),
		});
	}
	for (const w of boundaryOut) {
		newEdges.push({
			id: crypto.randomUUID(),
			type: 'shaderWire',
			source: bakedNodeId,
			target: w.targetNodeId,
			sourceHandle: bakedSelectionOutputPortId(w.sourceNodeId, w.sourceHandle),
			targetHandle: w.targetHandle,
		});
	}

	return { ok: true, def, nodes: nextNodes, edges: newEdges, bakedNodeId };
}
