import { BuiltinNodeId } from '../builtinIds.js';
import { outVar } from '../ident.js';
import type { BufferId, GraphDocument, GraphEdge, GraphNode, NodeTypeDef } from '../types.js';
import { computeFrameBoundaryPorts } from '../subgraphContract.js';
import { sanitizeExportFnBase } from './frameFnExport.js';
import { getLiteralStringParam, paramById } from './params.js';

/**
 * `domain_call_exported_vec3` must invoke `vec3 fn(vec3 p)` with the same argument as the
 * export frame's **boundary in** (the formal parameter `p` inside `fn`). Wiring the call
 * from the frame **boundary out** would apply the transform twice; wiring from an unrelated
 * node can reference skipped frame-interior GLSL vars. Resolve the correct expression here.
 */
export function domainCallExportedVec3BoundaryInExpr(args: {
	doc: GraphDocument;
	callNode: GraphNode;
	registry: Map<string, NodeTypeDef>;
	nodesById: Map<string, GraphNode>;
	pe: GraphEdge[];
	pass: BufferId;
	paramPId: string | null;
}): string | null {
	const { doc, callNode, registry, nodesById, pe, pass, paramPId } = args;
	const def = registry.get(callNode.typeId);
	if (!def || def.id !== BuiltinNodeId.DomainCallExportedVec3) return null;

	const want = sanitizeExportFnBase(
		getLiteralStringParam(callNode, paramById(def, 'fnBase'), 'my_xform'),
	);
	const frames = doc.meta.editor?.frames ?? [];
	for (const fr of frames) {
		const raw = fr.exportVec3Fn?.trim();
		if (!raw) continue;
		if (sanitizeExportFnBase(raw) !== want) continue;

		const insideIds = new Set(
			doc.nodes.filter((n) => n.parentId === fr.id && n.pass === pass).map((n) => n.id),
		);
		const ins = computeFrameBoundaryPorts(doc, fr.id).filter((c) => c.kind === 'in');
		if (ins.length !== 1) return null;
		const bin = ins[0]!;
		const edge = pe.find((e) => e.target === bin.nodeId && e.targetHandle === bin.handleId);
		if (!edge) return null;
		if (insideIds.has(edge.source)) return null;

		if (paramPId && edge.source === paramPId && edge.sourceHandle === 'p') return 'p';
		return outVar(edge.source, edge.sourceHandle);
	}

	return null;
}

export function rewriteDomainCallExportedVec3WireMap(
	wm: Map<string, string>,
	args: Omit<Parameters<typeof domainCallExportedVec3BoundaryInExpr>[0], 'callNode'> & {
		callNode: GraphNode;
		/** When set and non-empty, only rewrite calls whose node id is in this set (motif pullback subgraph). */
		motifAncestorIds: Set<string> | null;
		exportedInteriorSkip: Set<string>;
	},
): Map<string, string> {
	const { motifAncestorIds, exportedInteriorSkip, callNode, pe } = args;

	if (motifAncestorIds && motifAncestorIds.size > 0 && !motifAncestorIds.has(callNode.id)) {
		return wm;
	}

	const edge = pe.find((e) => e.target === callNode.id && e.targetHandle === 'p');
	const wiredSource = edge?.source;
	if (!wiredSource || !exportedInteriorSkip.has(wiredSource)) {
		return wm;
	}

	const arg = domainCallExportedVec3BoundaryInExpr({ ...args, callNode });
	if (!arg) return wm;
	const next = new Map(wm);
	next.set('p', arg);
	return next;
}
