import type { Edge } from '@xyflow/svelte';

export function applyDiagnosticEdgeStyles(
	edges: Edge[],
	errorEdgeIds: Set<string>,
): { next: Edge[]; changed: boolean } {
	let changed = false;
	const next = edges.map((e) => {
		const isBad = errorEdgeIds.has(e.id);
		const wantClass = isBad ? 'edge-error' : undefined;
		const wantStyle = undefined;
		if (e.class === wantClass && e.style === wantStyle) return e;
		changed = true;
		return { ...e, class: wantClass, style: wantStyle };
	});
	return { next, changed };
}

