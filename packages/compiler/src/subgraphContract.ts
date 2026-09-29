import type { GraphDocument, GraphEditorBoundaryPort } from './types.js';

function insideFrameIds(doc: GraphDocument, frameId: string): Set<string> {
	return new Set(doc.nodes.filter((n) => n.parentId === frameId).map((n) => n.id));
}

/**
 * Recompute crossing ports for a frame from the graph document (same rules as the editor’s `frameCollapse` helpers).
 */
export function computeFrameBoundaryPorts(doc: GraphDocument, frameId: string): GraphEditorBoundaryPort[] {
	const inside = insideFrameIds(doc, frameId);
	const inMap = new Map<string, GraphEditorBoundaryPort>();
	for (const e of doc.edges) {
		if (!inside.has(e.target) || inside.has(e.source)) continue;
		const handleId = e.targetHandle ?? '';
		const k = `${e.target}\0${handleId}`;
		if (!inMap.has(k)) inMap.set(k, { kind: 'in', nodeId: e.target, handleId });
	}
	const outMap = new Map<string, GraphEditorBoundaryPort>();
	for (const e of doc.edges) {
		if (!inside.has(e.source) || inside.has(e.target)) continue;
		const handleId = e.sourceHandle ?? '';
		const k = `${e.source}\0${handleId}`;
		if (!outMap.has(k)) outMap.set(k, { kind: 'out', nodeId: e.source, handleId });
	}
	const sortKey = (p: GraphEditorBoundaryPort) => `${p.kind}\0${p.nodeId}\0${p.handleId}`;
	return [...inMap.values(), ...outMap.values()].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

function portKey(p: GraphEditorBoundaryPort): string {
	return `${p.kind}\0${p.nodeId}\0${p.handleId}`;
}

/**
 * Returns issues when persisted `boundaryPorts` on a collapsed frame no longer matches graph crossings.
 */
export function validateFrameBoundaryContract(
	doc: GraphDocument,
	frameId: string,
	stored: GraphEditorBoundaryPort[] | undefined,
): string[] {
	if (!stored?.length) return [];
	const cur = computeFrameBoundaryPorts(doc, frameId);
	const a = [...stored].map(portKey).sort().join('|');
	const b = cur.map(portKey).sort().join('|');
	if (a !== b) {
		return [
			`Frame ${frameId.slice(0, 8)}…: boundaryPorts in meta are stale vs edges (expand & re-collapse to refresh)`,
		];
	}
	return [];
}

/** Run contract check for every collapsed frame that carries `boundaryPorts`. */
export function validateAllFrameBoundaries(doc: GraphDocument): string[] {
	const frames = doc.meta.editor?.frames ?? [];
	const out: string[] = [];
	for (const fr of frames) {
		if (!fr.collapsed || !fr.boundaryPorts?.length) continue;
		out.push(...validateFrameBoundaryContract(doc, fr.id, fr.boundaryPorts));
	}
	return out;
}
