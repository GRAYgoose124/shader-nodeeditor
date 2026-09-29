import type { GraphDocument } from '@shadertoy/compiler';
import type { Edge, Node } from '@xyflow/svelte';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';

/** UV → domain → FBM → cosine palette (2D procedural starter). */
export function createProcedural2dFbmPaletteFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 32, y: 100 });
	const dom = createGraphNode('proc2d_domain', pass, { x: 220, y: 100 }, { scale: 1.8, ox: 0, oy: 0, angle: 0 });
	const fbm = createGraphNode('proc2d_fbm', pass, { x: 420, y: 100 }, { freq: 2.2, lac: 2.02, gain: 0.52, z: 0 });
	const pal = createGraphNode('cosine_palette', pass, { x: 620, y: 100 }, {});
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 820, y: 100 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 1020, y: 100 });
	return {
		nodes: [toFlowNode(uv), toFlowNode(dom), toFlowNode(fbm), toFlowNode(pal), toFlowNode(v4), toFlowNode(out)],
		edges: [
			makeEdge(uv.id, dom.id, 'uv', 'uv'),
			makeEdge(dom.id, fbm.id, 'out', 'p'),
			makeEdge(fbm.id, pal.id, 'n', 't'),
			makeEdge(pal.id, v4.id, 'rgb', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}

/** Domain warp (FBM) → ridged FBM → palette (dramatic 2D clouds / marble). */
export function createProcedural2dRidgedWarpFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 32, y: 100 });
	const dom = createGraphNode('proc2d_domain', pass, { x: 200, y: 100 }, { scale: 2.2, angle: 0 });
	const warp = createGraphNode('proc2d_warp_fbm', pass, { x: 400, y: 100 }, {
		freq: 1.6,
		amp: 0.22,
		tsx: 0.04,
		tsy: 0.03,
	});
	const ridge = createGraphNode('proc2d_ridged_fbm', pass, { x: 600, y: 100 }, {
		freq: 2.4,
		sharp: 1.4,
	});
	const pal = createGraphNode('cosine_palette', pass, { x: 800, y: 100 }, {});
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 1000, y: 100 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 1200, y: 100 });
	return {
		nodes: [toFlowNode(uv),toFlowNode(dom),toFlowNode(warp),toFlowNode(ridge),toFlowNode(pal),toFlowNode(v4),toFlowNode(out)],
		edges: [
			makeEdge(uv.id, dom.id, 'uv', 'uv'),
			makeEdge(dom.id, warp.id, 'out', 'p'),
			makeEdge(warp.id, ridge.id, 'out', 'p'),
			makeEdge(ridge.id, pal.id, 'n', 't'),
			makeEdge(pal.id, v4.id, 'rgb', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}

/** Tile + mirror + kaleid (6) → Voronoi edge → cosine palette. */
export function createProcedural2dTiledKaleidVoroFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 24, y: 100 });
	const dom = createGraphNode('proc2d_domain', pass, { x: 180, y: 100 }, { scale: 3.2 });
	const rep = createGraphNode('proc2d_repeat_xy', pass, { x: 360, y: 100 }, { cx: 1.4, cy: 1.4 });
	const mir = createGraphNode('proc2d_mirror_xy', pass, { x: 520, y: 100 }, { ox: 0, oy: 0 });
	const kal = createGraphNode('proc2d_kaleidoscope', pass, { x: 700, y: 100 }, { sides: 6 });
	const edge = createGraphNode('proc2d_voronoi_edge', pass, { x: 880, y: 100 }, { freq: 8, scale: 2 });
	const pal = createGraphNode('cosine_palette', pass, { x: 1060, y: 100 }, {});
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 1240, y: 100 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 1420, y: 100 });
	return {
		nodes: [toFlowNode(uv), toFlowNode(dom), toFlowNode(rep), toFlowNode(mir), toFlowNode(kal), toFlowNode(edge), toFlowNode(pal), toFlowNode(v4), toFlowNode(out)],
		edges: [
			makeEdge(uv.id, dom.id, 'uv', 'uv'),
			makeEdge(dom.id, rep.id, 'out', 'p'),
			makeEdge(rep.id, mir.id, 'out', 'p'),
			makeEdge(mir.id, kal.id, 'out', 'p'),
			makeEdge(kal.id, edge.id, 'out', 'p'),
			makeEdge(edge.id, pal.id, 'e', 't'),
			makeEdge(pal.id, v4.id, 'rgb', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}

/** bufA: Voronoi-warp → gradient FBM → palette; image: full-screen sample (multipass procedural). */
export function createProcedural2dBufferSampleFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const passA = 'bufA' as const;
	const passI = 'image' as const;
	const uvA = createGraphNode('uv', passA, { x: 32, y: 80 });
	const domA = createGraphNode('proc2d_domain', passA, { x: 200, y: 80 }, { scale: 2 });
	const warpA = createGraphNode('proc2d_warp_voronoi', passA, { x: 400, y: 80 }, { freq: 2.5, amp: 0.08 });
	const fbmA = createGraphNode('proc2d_fbm_grad', passA, { x: 600, y: 80 }, { freq: 1.8 });
	const palA = createGraphNode('cosine_palette', passA, { x: 800, y: 80 }, {});
	const v4A = createGraphNode('vec4_from_vec3', passA, { x: 1000, y: 80 }, { a: 1 });
	const outA = createGraphNode('frag_output', passA, { x: 1180, y: 80 });

	const uvI = createGraphNode('uv', passI, { x: 32, y: 80 });
	const samp = createGraphNode('sample_channel', passI, { x: 260, y: 60 }, { channel: 0 });
	const outI = createGraphNode('frag_output', passI, { x: 520, y: 80 });

	return {
		nodes: [
			toFlowNode(uvA),
			toFlowNode(domA),
			toFlowNode(warpA),
			toFlowNode(fbmA),
			toFlowNode(palA),
			toFlowNode(v4A),
			toFlowNode(outA),
			toFlowNode(uvI),
			toFlowNode(samp),
			toFlowNode(outI),
		],
		edges: [
			makeEdge(uvA.id, domA.id, 'uv', 'uv'),
			makeEdge(domA.id, warpA.id, 'out', 'p'),
			makeEdge(warpA.id, fbmA.id, 'out', 'p'),
			makeEdge(fbmA.id, palA.id, 'n', 't'),
			makeEdge(palA.id, v4A.id, 'rgb', 'rgb'),
			makeEdge(v4A.id, outA.id, 'col', 'color'),
			makeEdge(uvI.id, samp.id, 'uv', 'uv'),
			makeEdge(samp.id, outI.id, 'rgba', 'color'),
		],
	};
}

export function metaForProcedural2dBufferSample(): GraphDocument['meta'] {
	return {
		iChannels: {
			image: { 0: 'bufA' },
		},
	};
}

/** UV → domain warp → Mandelbrot → fractal ramp (2D + fractal chain). */
export function createProc2dMandelbrotFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 28, y: 100 });
	const dom = createGraphNode('proc2d_domain', pass, { x: 200, y: 100 }, { scale: 2.4, angle: 0 });
	const warp = createGraphNode('proc2d_warp_fbm', pass, { x: 400, y: 100 }, {
		freq: 1.4,
		amp: 0.12,
		tsx: 0.05,
		tsy: 0.04,
	});
	const mb = createGraphNode('mandelbrot_escape', pass, { x: 600, y: 100 }, { scale: 2.6, cx: -0.5, cy: 0 });
	const ramp = createGraphNode('fractal_color_ramp', pass, { x: 820, y: 100 }, {});
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 1040, y: 100 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 1240, y: 100 });
	return {
		nodes: [toFlowNode(uv), toFlowNode(dom), toFlowNode(warp), toFlowNode(mb), toFlowNode(ramp), toFlowNode(v4), toFlowNode(out)],
		edges: [
			makeEdge(uv.id, dom.id, 'uv', 'uv'),
			makeEdge(dom.id, warp.id, 'out', 'p'),
			makeEdge(warp.id, mb.id, 'out', 'uv'),
			makeEdge(mb.id, ramp.id, 'esc', 't'),
			makeEdge(ramp.id, v4.id, 'rgb', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}

/** UV → domain → affine IFS → fold → iterate → IFS RGB. */
export function createProc2dIfsFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 28, y: 100 });
	const dom = createGraphNode('proc2d_domain', pass, { x: 200, y: 100 }, { scale: 3 });
	const aff = createGraphNode('ifs_affine', pass, { x: 400, y: 100 }, {
		mxx: 0.48,
		mxy: -0.22,
		myx: 0.22,
		myy: 0.48,
		tx: 0.08,
		ty: -0.04,
	});
	const fold = createGraphNode('ifs_linear_fold', pass, { x: 600, y: 100 }, { angle: 92, shift: 0.95 });
	const it = createGraphNode('ifs_iterate', pass, { x: 800, y: 100 }, { scale: 1.65, iters: 8 });
	const rgb = createGraphNode('ifs_to_rgb', pass, { x: 1020, y: 100 }, {});
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 1240, y: 100 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 1440, y: 100 });
	return {
		nodes: [toFlowNode(uv), toFlowNode(dom), toFlowNode(aff), toFlowNode(fold), toFlowNode(it), toFlowNode(rgb), toFlowNode(v4), toFlowNode(out)],
		edges: [
			makeEdge(uv.id, dom.id, 'uv', 'uv'),
			makeEdge(dom.id, aff.id, 'out', 'z'),
			makeEdge(aff.id, fold.id, 'out', 'z'),
			makeEdge(fold.id, it.id, 'out', 'z'),
			makeEdge(it.id, rgb.id, 'out', 'z'),
			makeEdge(rgb.id, v4.id, 'rgb', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}

/**
 * bufA: warped-domain Mandelbrot + ramp; image: sphere raymarch with triplanar albedo from iChannel0 (bufA).
 */
export function createProcedural2dDualFbmMixFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 24, y: 100 });
	const dom = createGraphNode('proc2d_domain', pass, { x: 180, y: 100 }, { scale: 2.4 });
	const f1 = createGraphNode('proc2d_fbm', pass, { x: 380, y: 60 }, { freq: 1.4, lac: 2.05, gain: 0.5 });
	const f2 = createGraphNode('proc2d_fbm', pass, { x: 380, y: 160 }, { freq: 3.2, lac: 2.08, gain: 0.48, z: 2.5 });
	const t = createGraphNode('float_const', pass, { x: 380, y: 260 }, { value: 0.42 });
	const blend = createGraphNode('proc2d_mix_float', pass, { x: 560, y: 100 });
	const pal = createGraphNode('cosine_palette', pass, { x: 740, y: 100 }, {});
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 920, y: 100 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 1100, y: 100 });
	return {
		nodes: [toFlowNode(uv), toFlowNode(dom), toFlowNode(f1), toFlowNode(f2), toFlowNode(t), toFlowNode(blend), toFlowNode(pal), toFlowNode(v4), toFlowNode(out)],
		edges: [
			makeEdge(uv.id, dom.id, 'uv', 'uv'),
			makeEdge(dom.id, f1.id, 'out', 'p'),
			makeEdge(dom.id, f2.id, 'out', 'p'),
			makeEdge(f1.id, blend.id, 'n', 'a'),
			makeEdge(f2.id, blend.id, 'n', 'b'),
			makeEdge(t.id, blend.id, 'v', 't'),
			makeEdge(blend.id, pal.id, 'out', 't'),
			makeEdge(pal.id, v4.id, 'rgb', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}
