import type { Edge } from '@xyflow/svelte';
import type { BufferId, GraphNode } from '@shadertoy/compiler';

export function makeEdge(
	source: string,
	target: string,
	sourceHandle: string,
	targetHandle: string,
): Edge {
	return { id: crypto.randomUUID(), source, target, sourceHandle, targetHandle };
}

/**
 * Preset helper: stable node ids so presets can ship baked `meta.editor.paramAnimations`.
 * (Normal editor graph creation still uses random UUIDs.)
 */
export function createGraphNodeFixedId(
	id: string,
	typeId: string,
	pass: BufferId,
	position: { x: number; y: number },
	data: Record<string, unknown> = {},
): GraphNode {
	return {
		id,
		typeId,
		pass,
		position: { ...position },
		data: { ...data },
	};
}
