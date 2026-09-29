import type { Edge, Node } from '@xyflow/svelte';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';

/** Look-at camera → raymarch Menger sponge (phase 7A + 7C). */
export function createPhase7LookatMengerFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 32, y: 140 });
	const ray = createGraphNode('ray_lookat_from_uv', pass, { x: 200, y: 140 }, {
		ex: 1.85,
		ey: 0.95,
		ez: 2.35,
		tx: 0,
		ty: 0,
		tz: 0,
		fov: 52,
	});
	const march = createGraphNode('raymarch_scene', pass, { x: 440, y: 120 }, {
		maxSteps: 100,
		maxDist: 56,
		minStep: 0.002,
	});
	const fragOut = createGraphNode('frag_output', pass, { x: 700, y: 140 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 40, y: 360 });
	const sponge = createGraphNode('sdf_menger_sponge', pass, { x: 280, y: 360 }, { mScale: 1, mIters: 4 });
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 520, y: 360 });

	const nodes = [
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(sponge),
		toFlowNode(sink),
	];
	const edges: Edge[] = [
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),
		makeEdge(paramP.id, sponge.id, 'p', 'p'),
		makeEdge(sponge.id, sink.id, 'd', 'd'),
	];
	return { nodes, edges };
}

/** Voronoi domain warp → sphere + raymarch (phase 7B). */
export function createPhase7VoronoiSphereFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 32, y: 140 });
	const ray = createGraphNode('ray_from_uv', pass, { x: 200, y: 140 }, { fov: 55, camZ: 3.1 });
	const march = createGraphNode('raymarch_scene', pass, { x: 440, y: 120 }, { maxSteps: 96 });
	const fragOut = createGraphNode('frag_output', pass, { x: 700, y: 140 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 40, y: 360 });
	const warp = createGraphNode('domain_voronoi_warp', pass, { x: 240, y: 360 }, {
		freq: 3,
		amp: 0.1,
		tsx: 0.12,
		tsy: 0.08,
		tsz: 0,
	});
	const sph = createGraphNode('sdf_sphere', pass, { x: 460, y: 360 }, { r: 0.32 });
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 640, y: 360 });

	const nodes = [
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(warp),
		toFlowNode(sph),
		toFlowNode(sink),
	];
	const edges: Edge[] = [
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),
		makeEdge(paramP.id, warp.id, 'p', 'p'),
		makeEdge(warp.id, sph.id, 'p', 'p'),
		makeEdge(sph.id, sink.id, 'd', 'd'),
	];
	return { nodes, edges };
}

/** Time → IQ cosine palette (phase 7F / palettes). */
export function createPhase7PaletteFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const t = createGraphNode('time', pass, { x: 40, y: 100 });
	const pal = createGraphNode('cosine_palette', pass, { x: 280, y: 100 }, {});
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 520, y: 100 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 760, y: 100 });
	return {
		nodes: [toFlowNode(t), toFlowNode(pal), toFlowNode(v4), toFlowNode(out)],
		edges: [
			makeEdge(t.id, pal.id, 't', 't'),
			makeEdge(pal.id, v4.id, 'rgb', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}

export function createPhase7FresnelFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const vdh = createGraphNode('float_const', pass, { x: 40, y: 120 }, { value: 0.65 });
	const fr = createGraphNode('fresnel_schlick', pass, { x: 240, y: 120 }, { f0: 0.04 });
	const vis = createGraphNode('sdf_visualize', pass, { x: 460, y: 120 }, {});
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 680, y: 120 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 900, y: 120 });
	return {
		nodes: [toFlowNode(vdh), toFlowNode(fr), toFlowNode(vis), toFlowNode(v4), toFlowNode(out)],
		edges: [
			makeEdge(vdh.id, fr.id, 'v', 'vdh'),
			makeEdge(fr.id, vis.id, 'f', 'd'),
			makeEdge(vis.id, v4.id, 'rgb', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}

