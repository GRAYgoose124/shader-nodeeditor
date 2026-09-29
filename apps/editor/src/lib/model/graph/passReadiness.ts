import type { GraphNode } from '@shadertoy/compiler';
import type { Edge } from '@xyflow/svelte';

export type PassReadiness = {
	fragOut: boolean;
	fragWired: boolean;
	hasRaymarch: boolean;
	raymarchOk: boolean;
	compileOk: boolean;
};

export function computePassReadiness(
	passGraphNodes: GraphNode[],
	edges: Edge[],
	compileErrorsCount: number,
): PassReadiness {
	const fragNodes = passGraphNodes.filter((n) => n.typeId === 'frag_output');
	const fragWired = fragNodes.some((n) =>
		edges.some((e) => e.target === n.id && e.targetHandle === 'color'),
	);
	const hasRaymarch = passGraphNodes.some((n) => n.typeId === 'raymarch_scene');
	const hasSink = passGraphNodes.some((n) => n.typeId === 'scene_sdf_sink');
	const raymarchOk = !hasRaymarch || hasSink;
	return {
		fragOut: fragNodes.length > 0,
		fragWired,
		hasRaymarch,
		raymarchOk,
		compileOk: compileErrorsCount === 0,
	};
}

