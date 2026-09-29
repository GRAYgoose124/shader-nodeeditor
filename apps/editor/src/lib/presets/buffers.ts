import type { Edge, Node } from '@xyflow/svelte';
import type { GraphDocument } from '@shadertoy/compiler';
import { suesqueSandboxFieldGraphDocument } from '@shadertoy/compiler';
import {
	createGraphNode,
	docToFlowNodesAndEdges,
	toFlowNode,
	type FlowNodeAny,
	type ShaderNodeData,
} from '../flowDoc.js';
import { makeEdge } from './utils.js';

/** bufA: animated palette by time → image samples iChannel0 */
export function createFeedbackDemoFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const tA = createGraphNode('time', 'bufA', { x: 40, y: 120 });
	const pal = createGraphNode('sin_time_color', 'bufA', { x: 280, y: 100 });
	const v4A = createGraphNode('vec4_from_vec3', 'bufA', { x: 520, y: 100 }, { a: 1 });
	const outA = createGraphNode('frag_output', 'bufA', { x: 760, y: 100 });

	const uvI = createGraphNode('uv', 'image', { x: 40, y: 80 });
	const samp = createGraphNode('sample_channel', 'image', { x: 280, y: 60 }, { channel: 0 });
	const outI = createGraphNode('frag_output', 'image', { x: 520, y: 80 });

	return {
		nodes: [
			toFlowNode(tA),
			toFlowNode(pal),
			toFlowNode(v4A),
			toFlowNode(outA),
			toFlowNode(uvI),
			toFlowNode(samp),
			toFlowNode(outI),
		],
		edges: [
			makeEdge(tA.id, pal.id, 't', 't'),
			makeEdge(pal.id, v4A.id, 'rgb', 'rgb'),
			makeEdge(v4A.id, outA.id, 'col', 'color'),
			makeEdge(uvI.id, samp.id, 'uv', 'uv'),
			makeEdge(samp.id, outI.id, 'rgba', 'color'),
		],
	};
}

export function metaForFeedbackDemo(): GraphDocument['meta'] {
	return {
		iChannels: {
			image: { 0: 'bufA' },
		},
	};
}
/**
 * Port of `suesque_sandbox/old.glsl` **mainImage** default branch as a **`GraphDocument`**
 * (`suesqueSandboxFieldGraphDocument`): CHG/STENCIL is **`vec4_channels`** + float trig/arith + **`vec4_swizzle`** (no **`expr_vec4`**).
 * Approximation: `iFrame - cFrame < 100` when `cFrame`≈0 → **`mask_frame_below`**.
 */
export function createSuesqueSandboxFieldFlow(): { nodes: FlowNodeAny[]; edges: Edge[] } {
	const doc = structuredClone(suesqueSandboxFieldGraphDocument());
	return docToFlowNodesAndEdges(doc);
}

export function metaForSuesqueSandboxField(): GraphDocument['meta'] {
	const { meta } = suesqueSandboxFieldGraphDocument();
	return { ...meta };
}
export function createBufaFractalTexturedRaymarchFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const passA = 'bufA' as const;
	const passI = 'image' as const;
	const uvA = createGraphNode('uv', passA, { x: 32, y: 90 });
	const domA = createGraphNode('proc2d_domain', passA, { x: 200, y: 90 }, { scale: 2.2 });
	const warpA = createGraphNode('proc2d_warp_fbm', passA, { x: 400, y: 90 }, { freq: 1.5, amp: 0.11, tsx: 0.04, tsy: 0.035 });
	const mbA = createGraphNode('mandelbrot_escape', passA, { x: 620, y: 90 }, { scale: 2.65, cx: -0.55, cy: 0 });
	const rampA = createGraphNode('fractal_color_ramp', passA, { x: 840, y: 90 }, {});
	const v4A = createGraphNode('vec4_from_vec3', passA, { x: 1060, y: 90 }, { a: 1 });
	const outA = createGraphNode('frag_output', passA, { x: 1280, y: 90 });

	const uvI = createGraphNode('uv', passI, { x: 32, y: 220 });
	const rayI = createGraphNode('ray_from_uv', passI, { x: 200, y: 220 }, { fov: 56, camZ: 3.15 });
	const marchI = createGraphNode('raymarch_scene', passI, { x: 460, y: 200 }, {
		maxSteps: 96,
		maxDist: 48,
		eps: 0.001,
		surfTexOn: 1,
		surfTexChannel: 0,
		surfTexScale: 2.25,
		surfTexBlend: 0.88,
		surfTexMode: '0',
	});
	const fragI = createGraphNode('frag_output', passI, { x: 740, y: 220 });

	const paramP = createGraphNode('sdf_param_p', passI, { x: 40, y: 420 });
	const rotY = createGraphNode('domain_rotate_euler_time', passI, { x: 260, y: 420 }, {
		tx: 0,
		ty: 0.55,
		tz: 0,
		rx: 0,
		ry: 0,
		rz: 0,
	});
	const sph = createGraphNode('sdf_sphere', passI, { x: 500, y: 420 }, { r: 0.38 });
	const sink = createGraphNode('scene_sdf_sink', passI, { x: 720, y: 420 });

	return {
		nodes: [
			toFlowNode(uvA),
			toFlowNode(domA),
			toFlowNode(warpA),
			toFlowNode(mbA),
			toFlowNode(rampA),
			toFlowNode(v4A),
			toFlowNode(outA),
			toFlowNode(uvI),
			toFlowNode(rayI),
			toFlowNode(marchI),
			toFlowNode(fragI),
			toFlowNode(paramP),
			toFlowNode(rotY),
			toFlowNode(sph),
			toFlowNode(sink),
		],
		edges: [
			makeEdge(uvA.id, domA.id, 'uv', 'uv'),
			makeEdge(domA.id, warpA.id, 'out', 'p'),
			makeEdge(warpA.id, mbA.id, 'out', 'uv'),
			makeEdge(mbA.id, rampA.id, 'esc', 't'),
			makeEdge(rampA.id, v4A.id, 'rgb', 'rgb'),
			makeEdge(v4A.id, outA.id, 'col', 'color'),
			makeEdge(uvI.id, rayI.id, 'uv', 'uv'),
			makeEdge(rayI.id, marchI.id, 'ro', 'ro'),
			makeEdge(rayI.id, marchI.id, 'rd', 'rd'),
			makeEdge(marchI.id, fragI.id, 'col', 'color'),
			makeEdge(paramP.id, rotY.id, 'p', 'p'),
			makeEdge(rotY.id, sph.id, 'p', 'p'),
			makeEdge(sph.id, sink.id, 'd', 'd'),
		],
	};
}

export function metaForBufaFractalTexturedRaymarch(): GraphDocument['meta'] {
	return {
		name: 'bufa-fractal-textured-raymarch',
		iChannels: {
			image: { 0: 'bufA' },
		},
	};
}

