import type { Edge, Node } from '@xyflow/svelte';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';

/**
 * Trefoil: single (2,3) torus-knot tube (sdf_torus_knot) with slow scene spin.
 */
export function createCelticKnotSdfFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;

	const uv = createGraphNode('uv', pass, { x: 32, y: 140 });
	const ray = createGraphNode('ray_lookat_from_uv', pass, { x: 200, y: 140 }, {
		ex: 2.65,
		ey: 1.25,
		ez: 2.35,
		tx: 0,
		ty: 0,
		tz: 0,
		fov: 50,
	});
	const march = createGraphNode('raymarch_scene', pass, { x: 460, y: 120 }, {
		maxSteps: 144,
		maxDist: 32,
		eps: 0.00075,
		ambR: 0.03,
		ambG: 0.04,
		ambB: 0.08,
	});
	const fragOut = createGraphNode('frag_output', pass, { x: 720, y: 140 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 32, y: 380 });
	const rot = createGraphNode('domain_rotate_euler_time', pass, { x: 240, y: 380 }, {
		tx: 0,
		ty: 0.2,
		tz: 0,
		rx: 0,
		ry: 0,
		rz: 0,
	});
	const knot = createGraphNode('sdf_torus_knot', pass, { x: 480, y: 380 }, {
		R: 0.4,
		a: 0.22,
		r: 0.065,
		windP: 2,
		windQ: 3,
		samples: 96,
	});
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 700, y: 380 });

	const nodes = [
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(rot),
		toFlowNode(knot),
		toFlowNode(sink),
	];
	const edges: Edge[] = [
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),
		makeEdge(paramP.id, rot.id, 'p', 'p'),
		makeEdge(rot.id, knot.id, 'p', 'p'),
		makeEdge(knot.id, sink.id, 'd', 'd'),
	];
	return { nodes, edges };
}
