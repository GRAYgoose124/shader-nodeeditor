import type { BufferId, GraphEdge, GraphNode } from './types.js';

export function edgesForPass(edges: GraphEdge[], nodesById: Map<string, GraphNode>, pass: BufferId): GraphEdge[] {
	return edges.filter((e) => {
		const s = nodesById.get(e.source);
		const t = nodesById.get(e.target);
		return s && t && s.pass === pass && t.pass === pass;
	});
}

export function collectUpstream(pass: BufferId, targetId: string, edges: GraphEdge[], nodesById: Map<string, GraphNode>): Set<string> {
	const passEdges = edgesForPass(edges, nodesById, pass);
	const incoming = new Map<string, GraphEdge[]>();
	for (const e of passEdges) {
		const arr = incoming.get(e.target) ?? [];
		arr.push(e);
		incoming.set(e.target, arr);
	}
	const seen = new Set<string>();
	const stack = [targetId];
	while (stack.length) {
		const n = stack.pop()!;
		if (seen.has(n)) continue;
		const node = nodesById.get(n);
		if (!node || node.pass !== pass) continue;
		seen.add(n);
		for (const e of incoming.get(n) ?? []) {
			stack.push(e.source);
		}
	}
	return seen;
}

export function topoOrder(nodeIds: Set<string>, passEdges: GraphEdge[]): string[] | null {
	const forward = new Map<string, string[]>();
	const indeg = new Map<string, number>();
	for (const id of nodeIds) {
		indeg.set(id, 0);
		forward.set(id, []);
	}
	for (const e of passEdges) {
		if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
		forward.get(e.source)!.push(e.target);
		indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
	}
	const q: string[] = [...nodeIds].filter((id) => indeg.get(id) === 0);
	const out: string[] = [];
	while (q.length) {
		const u = q.shift()!;
		out.push(u);
		for (const v of forward.get(u) ?? []) {
			const nv = (indeg.get(v) ?? 0) - 1;
			indeg.set(v, nv);
			if (nv === 0) q.push(v);
		}
	}
	if (out.length !== nodeIds.size) return null;
	return out;
}

/** Valid suffix for GLSL function `scene_sdf_*` */
export function sceneFnSuffix(pass: BufferId): string {
	return pass.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Incoming edges grouped by target node id. */
export function buildIncomingEdgeMap(edges: GraphEdge[]): Map<string, GraphEdge[]> {
	const m = new Map<string, GraphEdge[]>();
	for (const e of edges) {
		const arr = m.get(e.target) ?? [];
		arr.push(e);
		m.set(e.target, arr);
	}
	return m;
}

/**
 * Nodes on any path from `fromId` back to `paramPId` (inclusive of both).
 * Used to extract the motif subgraph for `sdf_tessellate_feedback`.
 */
export function collectMotifAncestorSet(
	fromId: string,
	paramPId: string,
	incomingByTarget: Map<string, GraphEdge[]>,
): Set<string> {
	const seen = new Set<string>();
	const stack: string[] = [fromId];
	while (stack.length) {
		const n = stack.pop()!;
		if (seen.has(n)) continue;
		seen.add(n);
		if (n === paramPId) continue;
		for (const e of incomingByTarget.get(n) ?? []) {
			stack.push(e.source);
		}
	}
	return seen;
}
