import type { Edge, Node } from '@xyflow/svelte';
import type { BufferId } from '@shadertoy/compiler';
import type { FlowNodeAny, ShaderNodeData } from '$lib/flowDoc.js';

function lookatFeedsRaymarch(lookatId: string, marchIds: Set<string>, edges: Edge[]): boolean {
	const q: string[] = [];
	for (const h of ['ro', 'rd'] as const) {
		for (const e of edges) {
			if (e.source === lookatId && e.sourceHandle === h) q.push(e.target);
		}
	}
	const seen = new Set(q);
	while (q.length) {
		const n = q.shift()!;
		if (marchIds.has(n)) return true;
		for (const e of edges) {
			if (e.source === n && !seen.has(e.target)) {
				seen.add(e.target);
				q.push(e.target);
			}
		}
	}
	return false;
}

/**
 * When a `ray_lookat_from_uv` node's ro/rd reach `raymarch_scene`, preview can orbit by dragging.
 */
export function findLookatOrbitNodeId(
	nodes: FlowNodeAny[],
	edges: Edge[],
	pass: BufferId,
): string | null {
	const passShaders = nodes.filter(
		(n): n is Node<ShaderNodeData, 'shader'> =>
			n.type === 'shader' && n.data.graphNode.pass === pass,
	);
	const marchIds = new Set(
		passShaders.filter((n) => n.data.graphNode.typeId === 'raymarch_scene').map((n) => n.id),
	);
	if (marchIds.size === 0) return null;

	const lookats = passShaders.filter((n) => n.data.graphNode.typeId === 'ray_lookat_from_uv');
	for (const L of lookats) {
		if (lookatFeedsRaymarch(L.id, marchIds, edges)) return L.id;
	}
	return null;
}
