import type { Edge, Node } from '@xyflow/svelte';
import type { GraphDocument } from '@shadertoy/compiler';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';

/**
 * Domain + warp → two parallel affines → pick shorter → fold → iterate → IFS RGB (chaos-game style).
 */
export function createIfsMin2ChaosFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 24, y: 100 });
	const dom = createGraphNode('proc2d_domain', pass, { x: 200, y: 100 }, { scale: 2.85, angle: 9 });
	const warp = createGraphNode('proc2d_warp_fbm', pass, { x: 400, y: 100 }, {
		freq: 1.35,
		amp: 0.08,
		tsx: 0.04,
		tsy: 0.032,
	});
	const aff1 = createGraphNode('ifs_affine', pass, { x: 600, y: 60 }, {
		mxx: 0.46,
		mxy: -0.18,
		myx: 0.18,
		myy: 0.46,
		tx: 0.05,
		ty: -0.04,
	});
	const aff2 = createGraphNode('ifs_affine', pass, { x: 600, y: 180 }, {
		mxx: 0.38,
		mxy: 0.22,
		myx: -0.2,
		myy: 0.4,
		tx: -0.03,
		ty: 0.06,
	});
	const pick = createGraphNode('ifs_pick_shorter2', pass, { x: 820, y: 100 }, {});
	const fold = createGraphNode('ifs_linear_fold', pass, { x: 1020, y: 100 }, { angle: 91, shift: 0.94 });
	const it = createGraphNode('ifs_iterate', pass, { x: 1220, y: 100 }, { scale: 1.62, iters: 9 });
	const rgb = createGraphNode('ifs_to_rgb', pass, { x: 1420, y: 100 }, { bias: 0.47, amp: 0.5, gain: 1.12 });
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 1620, y: 100 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 1820, y: 100 });
	return {
		nodes: [
			toFlowNode(uv),
			toFlowNode(dom),
			toFlowNode(warp),
			toFlowNode(aff1),
			toFlowNode(aff2),
			toFlowNode(pick),
			toFlowNode(fold),
			toFlowNode(it),
			toFlowNode(rgb),
			toFlowNode(v4),
			toFlowNode(out),
		],
		edges: [
			makeEdge(uv.id, dom.id, 'uv', 'uv'),
			makeEdge(dom.id, warp.id, 'out', 'p'),
			makeEdge(warp.id, aff1.id, 'out', 'z'),
			makeEdge(warp.id, aff2.id, 'out', 'z'),
			makeEdge(aff1.id, pick.id, 'out', 'a'),
			makeEdge(aff2.id, pick.id, 'out', 'b'),
			makeEdge(pick.id, fold.id, 'out', 'z'),
			makeEdge(fold.id, it.id, 'out', 'z'),
			makeEdge(it.id, rgb.id, 'out', 'z'),
			makeEdge(rgb.id, v4.id, 'rgb', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}

/** Domain → Newton z³−1 + cosine ramp; parallel Julia branch mixed for a two-fractal lab look. */
export function createNewtonBasinsDemoFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 24, y: 100 });
	const dom = createGraphNode('proc2d_domain', pass, { x: 200, y: 100 }, { scale: 2.4, angle: 0 });
	const nw = createGraphNode('newton_escape', pass, { x: 420, y: 60 }, { scale: 2.9, maxIter: 56, eps: 0.003 });
	const jl = createGraphNode('julia_escape', pass, { x: 420, y: 200 }, { jx: -0.75, jy: 0.11, scale: 3.2, maxIter: 90 });
	const rampN = createGraphNode('fractal_color_ramp', pass, { x: 660, y: 40 }, { freq: 19, b0: 0.05, b1: 0.55, b2: 1.0 });
	const rampJ = createGraphNode('fractal_color_ramp', pass, { x: 660, y: 200 }, { freq: 14, b0: 0.25, b1: 0.85, b2: 1.2 });
	const mix = createGraphNode('mix_vec3', pass, { x: 900, y: 120 }, { t: 0.52 });
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 1100, y: 120 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 1300, y: 120 });
	return {
		nodes: [
			toFlowNode(uv),
			toFlowNode(dom),
			toFlowNode(nw),
			toFlowNode(jl),
			toFlowNode(rampN),
			toFlowNode(rampJ),
			toFlowNode(mix),
			toFlowNode(v4),
			toFlowNode(out),
		],
		edges: [
			makeEdge(uv.id, dom.id, 'uv', 'uv'),
			makeEdge(dom.id, nw.id, 'out', 'uv'),
			makeEdge(dom.id, jl.id, 'out', 'uv'),
			makeEdge(nw.id, rampN.id, 'basin', 't'),
			makeEdge(jl.id, rampJ.id, 'esc', 't'),
			makeEdge(rampN.id, mix.id, 'rgb', 'a'),
			makeEdge(rampJ.id, mix.id, 'rgb', 'b'),
			makeEdge(mix.id, v4.id, 'out', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}

/** Circle inversion in domain → affine → fold → iterate → length → fractal ramp. */
export function createIfsInversionRingFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 24, y: 100 });
	const dom = createGraphNode('proc2d_domain', pass, { x: 180, y: 100 }, { scale: 3.1, angle: -6 });
	const inv = createGraphNode('ifs_circle_inversion', pass, { x: 380, y: 100 }, { cx: 0.05, cy: -0.02, R: 0.42 });
	const aff = createGraphNode('ifs_affine', pass, { x: 580, y: 100 }, {
		mxx: 0.52,
		mxy: 0.12,
		myx: -0.12,
		myy: 0.5,
		tx: 0,
		ty: 0,
	});
	const fold = createGraphNode('ifs_linear_fold', pass, { x: 780, y: 100 }, { angle: 88, shift: 0.9 });
	const it = createGraphNode('ifs_iterate', pass, { x: 980, y: 100 }, { scale: 1.58, iters: 8 });
	const len = createGraphNode('proc2d_length', pass, { x: 1180, y: 100 }, {});
	const ramp = createGraphNode('fractal_color_ramp', pass, { x: 1380, y: 100 }, { freq: 16, b0: 0.1, b1: 0.65, b2: 1.1 });
	const v4 = createGraphNode('vec4_from_vec3', pass, { x: 1600, y: 100 }, { a: 1 });
	const out = createGraphNode('frag_output', pass, { x: 1800, y: 100 });
	return {
		nodes: [
			toFlowNode(uv),
			toFlowNode(dom),
			toFlowNode(inv),
			toFlowNode(aff),
			toFlowNode(fold),
			toFlowNode(it),
			toFlowNode(len),
			toFlowNode(ramp),
			toFlowNode(v4),
			toFlowNode(out),
		],
		edges: [
			makeEdge(uv.id, dom.id, 'uv', 'uv'),
			makeEdge(dom.id, inv.id, 'out', 'z'),
			makeEdge(inv.id, aff.id, 'out', 'z'),
			makeEdge(aff.id, fold.id, 'out', 'z'),
			makeEdge(fold.id, it.id, 'out', 'z'),
			makeEdge(it.id, len.id, 'out', 'p'),
			makeEdge(len.id, ramp.id, 'r', 't'),
			makeEdge(ramp.id, v4.id, 'rgb', 'rgb'),
			makeEdge(v4.id, out.id, 'col', 'color'),
		],
	};
}

/** bufA: pick-short IFS to RGB; image samples bufA (proves buffer + IFS integration). */
export function createIfsBufaChannelFlow(): {
	nodes: Node<ShaderNodeData, 'shader'>[];
	edges: Edge[];
	meta: GraphDocument['meta'];
} {
	const passA = 'bufA' as const;
	const passI = 'image' as const;

	const uvA = createGraphNode('uv', passA, { x: 24, y: 90 });
	const domA = createGraphNode('proc2d_domain', passA, { x: 200, y: 90 }, { scale: 2.6, angle: 12 });
	const affA = createGraphNode('ifs_affine', passA, { x: 400, y: 50 }, {
		mxx: 0.45,
		mxy: -0.15,
		myx: 0.15,
		myy: 0.44,
		tx: 0.04,
		ty: -0.03,
	});
	const affB = createGraphNode('ifs_affine', passA, { x: 400, y: 150 }, {
		mxx: 0.36,
		mxy: 0.2,
		myx: -0.18,
		myy: 0.38,
		tx: -0.02,
		ty: 0.055,
	});
	const pickA = createGraphNode('ifs_pick_shorter2', passA, { x: 620, y: 90 }, {});
	const foldA = createGraphNode('ifs_sector_fold', passA, { x: 800, y: 90 }, { folds: 4 });
	const itA = createGraphNode('ifs_iterate', passA, { x: 980, y: 90 }, { scale: 1.55, iters: 7 });
	const rgbA = createGraphNode('ifs_to_rgb', passA, { x: 1160, y: 90 }, {});
	const v4A = createGraphNode('vec4_from_vec3', passA, { x: 1340, y: 90 }, { a: 1 });
	const outA = createGraphNode('frag_output', passA, { x: 1520, y: 90 });

	const uvI = createGraphNode('uv', passI, { x: 24, y: 280 });
	const samp = createGraphNode('sample_channel', passI, { x: 220, y: 280 }, { channel: 0 });
	const outI = createGraphNode('frag_output', passI, { x: 440, y: 280 });

	return {
		nodes: [
			toFlowNode(uvA),
			toFlowNode(domA),
			toFlowNode(affA),
			toFlowNode(affB),
			toFlowNode(pickA),
			toFlowNode(foldA),
			toFlowNode(itA),
			toFlowNode(rgbA),
			toFlowNode(v4A),
			toFlowNode(outA),
			toFlowNode(uvI),
			toFlowNode(samp),
			toFlowNode(outI),
		],
		edges: [
			makeEdge(uvA.id, domA.id, 'uv', 'uv'),
			makeEdge(domA.id, affA.id, 'out', 'z'),
			makeEdge(domA.id, affB.id, 'out', 'z'),
			makeEdge(affA.id, pickA.id, 'out', 'a'),
			makeEdge(affB.id, pickA.id, 'out', 'b'),
			makeEdge(pickA.id, foldA.id, 'out', 'z'),
			makeEdge(foldA.id, itA.id, 'out', 'z'),
			makeEdge(itA.id, rgbA.id, 'out', 'z'),
			makeEdge(rgbA.id, v4A.id, 'rgb', 'rgb'),
			makeEdge(v4A.id, outA.id, 'col', 'color'),
			makeEdge(uvI.id, samp.id, 'uv', 'uv'),
			makeEdge(samp.id, outI.id, 'rgba', 'color'),
		],
		meta: {
			name: 'ifs-bufa-pick-channel',
			iChannels: { image: { 0: 'bufA' } },
		},
	};
}
