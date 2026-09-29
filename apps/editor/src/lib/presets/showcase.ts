import type { Edge, Node } from '@xyflow/svelte';
import type { GraphDocument } from '@shadertoy/compiler';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';

/**
 * **Atelier nebula** — dense showcase: bufA mixes orbit-trap Mandelbrot (warped domain) with a Julia branch;
 * image raymarches a look-at camera on a smooth-union twisted box + torus + core sphere, triplanar-textured from bufA.
 */
export function createAdvancedAtelierNebulaFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const passA = 'bufA' as const;
	const passI = 'image' as const;

	const uvA = createGraphNode('uv', passA, { x: 28, y: 72 });
	const domA = createGraphNode('proc2d_domain', passA, { x: 200, y: 72 }, { scale: 2.35, angle: 14, ox: 0.02, oy: -0.03 });
	const warpA = createGraphNode('proc2d_warp_fbm', passA, { x: 400, y: 72 }, {
		freq: 1.65,
		lac: 2.05,
		gain: 0.52,
		amp: 0.125,
		tsx: 0.038,
		tsy: 0.032,
	});
	const orbitA = createGraphNode('mandelbrot_orbit_trap', passA, { x: 620, y: 56 }, {
		cx: -0.18,
		cy: 0.07,
		scale: 2.05,
		tx: 0.15,
		ty: -0.12,
		trapScale: 5.5,
		maxIter: 96,
	});
	const rampOrbit = createGraphNode('fractal_color_ramp', passA, { x: 860, y: 40 }, {
		freq: 18.5,
		b0: 0.05,
		b1: 0.55,
		b2: 1.05,
	});
	const juliaA = createGraphNode('julia_escape', passA, { x: 620, y: 168 }, {
		jx: -0.792,
		jy: 0.148,
		scale: 2.75,
		maxIter: 100,
	});
	const rampJulia = createGraphNode('fractal_color_ramp', passA, { x: 860, y: 168 }, {
		freq: 14,
		b0: 0.2,
		b1: 0.85,
		b2: 1.35,
	});
	const mixCol = createGraphNode('mix_vec3', passA, { x: 1080, y: 96 }, { t: 0.46 });
	const v4A = createGraphNode('vec4_from_vec3', passA, { x: 1280, y: 96 }, { a: 1 });
	const outA = createGraphNode('frag_output', passA, { x: 1480, y: 96 });

	const uvI = createGraphNode('uv', passI, { x: 28, y: 240 });
	const rayI = createGraphNode('ray_lookat_from_uv', passI, { x: 220, y: 240 }, {
		ex: 2.15,
		ey: 1.05,
		ez: 2.55,
		tx: 0,
		ty: 0.06,
		tz: 0,
		fov: 46,
	});
	const marchI = createGraphNode('raymarch_scene', passI, { x: 500, y: 210 }, {
		maxSteps: 112,
		maxDist: 52,
		eps: 0.00085,
		ambR: 0.025,
		ambG: 0.04,
		ambB: 0.09,
		palMix: 0.38,
		specOn: 1,
		specPow: 48,
		specStr: 0.32,
		softShadow: 1,
		shadowK: 28,
		curvAmp: 0.14,
		curvEps: 0.022,
		fogOn: 1,
		fogDensity: 0.055,
		fogR: 0.04,
		fogG: 0.06,
		fogB: 0.12,
		reflOn: 1,
		reflStr: 0.22,
		reflSteps: 6,
		surfTexOn: 1,
		surfTexChannel: 0,
		surfTexScale: 2.35,
		surfTexBlend: 0.84,
		surfTexMode: '0',
	});
	const fragI = createGraphNode('frag_output', passI, { x: 780, y: 240 });

	const paramP = createGraphNode('sdf_param_p', passI, { x: 36, y: 520 });
	const rotI = createGraphNode('domain_rotate_euler_time', passI, { x: 240, y: 520 }, {
		tx: 0,
		ty: 0.42,
		tz: 0,
		rx: 0.12,
		ry: 0,
		rz: -0.08,
	});
	const twistI = createGraphNode('domain_twist', passI, { x: 460, y: 520 }, {
		axis: '1',
		k: 2.35,
		timeScale: 0.32,
	});
	const boxI = createGraphNode('sdf_box', passI, { x: 680, y: 460 }, { hx: 0.36, hy: 0.2, hz: 0.36 });
	const roundI = createGraphNode('op_round_d', passI, { x: 880, y: 460 }, { rad: 0.055 });
	const torusI = createGraphNode('sdf_torus', passI, { x: 680, y: 580 }, { R: 0.29, r: 0.1 });
	const smin1 = createGraphNode('smin_float', passI, { x: 1080, y: 520 }, { k: 0.13 });
	const coreSph = createGraphNode('sdf_sphere', passI, { x: 680, y: 700 }, { r: 0.11 });
	const smin2 = createGraphNode('smin_float', passI, { x: 1280, y: 580 }, { k: 0.11 });
	const sinkI = createGraphNode('scene_sdf_sink', passI, { x: 1480, y: 560 });

	return {
		nodes: [
			toFlowNode(uvA),
			toFlowNode(domA),
			toFlowNode(warpA),
			toFlowNode(orbitA),
			toFlowNode(rampOrbit),
			toFlowNode(juliaA),
			toFlowNode(rampJulia),
			toFlowNode(mixCol),
			toFlowNode(v4A),
			toFlowNode(outA),
			toFlowNode(uvI),
			toFlowNode(rayI),
			toFlowNode(marchI),
			toFlowNode(fragI),
			toFlowNode(paramP),
			toFlowNode(rotI),
			toFlowNode(twistI),
			toFlowNode(boxI),
			toFlowNode(roundI),
			toFlowNode(torusI),
			toFlowNode(smin1),
			toFlowNode(coreSph),
			toFlowNode(smin2),
			toFlowNode(sinkI),
		],
		edges: [
			makeEdge(uvA.id, domA.id, 'uv', 'uv'),
			makeEdge(domA.id, warpA.id, 'out', 'p'),
			makeEdge(warpA.id, orbitA.id, 'out', 'uv'),
			makeEdge(orbitA.id, rampOrbit.id, 'esc', 't'),
			makeEdge(domA.id, juliaA.id, 'out', 'uv'),
			makeEdge(juliaA.id, rampJulia.id, 'esc', 't'),
			makeEdge(rampOrbit.id, mixCol.id, 'rgb', 'a'),
			makeEdge(rampJulia.id, mixCol.id, 'rgb', 'b'),
			makeEdge(mixCol.id, v4A.id, 'out', 'rgb'),
			makeEdge(v4A.id, outA.id, 'col', 'color'),
			makeEdge(uvI.id, rayI.id, 'uv', 'uv'),
			makeEdge(rayI.id, marchI.id, 'ro', 'ro'),
			makeEdge(rayI.id, marchI.id, 'rd', 'rd'),
			makeEdge(marchI.id, fragI.id, 'col', 'color'),
			makeEdge(paramP.id, rotI.id, 'p', 'p'),
			makeEdge(rotI.id, twistI.id, 'p', 'p'),
			makeEdge(twistI.id, boxI.id, 'p', 'p'),
			makeEdge(twistI.id, torusI.id, 'p', 'p'),
			makeEdge(twistI.id, coreSph.id, 'p', 'p'),
			makeEdge(boxI.id, roundI.id, 'd', 'd'),
			makeEdge(roundI.id, smin1.id, 'd', 'a'),
			makeEdge(torusI.id, smin1.id, 'd', 'b'),
			makeEdge(smin1.id, smin2.id, 'd', 'a'),
			makeEdge(coreSph.id, smin2.id, 'd', 'b'),
			makeEdge(smin2.id, sinkI.id, 'd', 'd'),
		],
	};
}

export function metaForAdvancedAtelierNebula(): GraphDocument['meta'] {
	return {
		name: 'advanced-atelier-nebula',
		iChannels: {
			image: { 0: 'bufA' },
		},
	};
}

/**
 * **Chronos lattice** — bufA: kaleid → IFS stained-glass; bufB: ping-pong mix with bufA inject + warp smear (`mix_vec4`);
 * image: look-at raymarch, hex-tiled torus ∩ octahedron + gem smin, lit with palette / fog / refl / sky bounce, surf tex from bufB.
 */
export function createChronosLatticeFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const passA = 'bufA' as const;
	const passB = 'bufB' as const;
	const passI = 'image' as const;
	const s = 0.42;
	const R = 0.271;
	const r = 0.158;

	const uvA = createGraphNode('uv', passA, { x: 24, y: 80 });
	const kalA = createGraphNode('proc2d_kaleidoscope', passA, { x: 200, y: 80 }, { sides: 6 });
	const domA = createGraphNode('proc2d_domain', passA, { x: 400, y: 80 }, { scale: 2.85, angle: 11 });
	const affA = createGraphNode('ifs_affine', passA, { x: 600, y: 80 }, {
		mxx: 0.5,
		mxy: -0.2,
		myx: 0.2,
		myy: 0.46,
		tx: 0.06,
		ty: -0.05,
	});
	const foldA = createGraphNode('ifs_linear_fold', passA, { x: 800, y: 80 }, { angle: 88, shift: 0.92 });
	const itA = createGraphNode('ifs_iterate', passA, { x: 1000, y: 80 }, { scale: 1.62, iters: 9 });
	const rgbA = createGraphNode('ifs_to_rgb', passA, { x: 1200, y: 80 }, { bias: 0.48, amp: 0.52, gain: 1.15 });
	const v4A = createGraphNode('vec4_from_vec3', passA, { x: 1400, y: 80 }, { a: 1 });
	const outA = createGraphNode('frag_output', passA, { x: 1580, y: 80 });

	const uvB = createGraphNode('uv', passB, { x: 24, y: 260 });
	const warpB = createGraphNode('proc2d_warp_fbm', passB, { x: 220, y: 260 }, {
		freq: 1.35,
		lac: 2.02,
		gain: 0.5,
		amp: 0.095,
		tsx: 0.028,
		tsy: 0.024,
	});
	const sB0 = createGraphNode('sample_channel', passB, { x: 460, y: 240 }, { channel: 0 });
	const sB1 = createGraphNode('sample_channel', passB, { x: 460, y: 300 }, { channel: 1 });
	const mixB = createGraphNode('mix_vec4', passB, { x: 680, y: 260 }, { t: 0.09 });
	const outB = createGraphNode('frag_output', passB, { x: 880, y: 260 });

	const uvI = createGraphNode('uv', passI, { x: 24, y: 420 });
	const rayI = createGraphNode('ray_lookat_from_uv', passI, { x: 200, y: 420 }, {
		ex: 2.35,
		ey: 1.1,
		ez: 2.65,
		tx: 0,
		ty: 0.05,
		tz: 0,
		fov: 44,
	});
	const marchI = createGraphNode('raymarch_scene', passI, { x: 480, y: 400 }, {
		maxSteps: 128,
		maxDist: 56,
		eps: 0.001,
		ambR: 0.028,
		ambG: 0.042,
		ambB: 0.085,
		palMix: 0.42,
		specOn: 1,
		specPow: 44,
		specStr: 0.3,
		softShadow: 1,
		shadowK: 30,
		curvAmp: 0.12,
		curvEps: 0.02,
		fogOn: 1,
		fogDensity: 0.048,
		fogR: 0.035,
		fogG: 0.055,
		fogB: 0.1,
		reflOn: 1,
		reflStr: 0.2,
		reflSteps: 6,
		skyBounceOn: 1,
		skyStr: 0.16,
		skySteps: 12,
		surfTexOn: 1,
		surfTexChannel: 0,
		surfTexScale: 2.5,
		surfTexBlend: 0.86,
		surfTexMode: '0',
	});
	const fragI = createGraphNode('frag_output', passI, { x: 760, y: 420 });

	const paramP = createGraphNode('sdf_param_p', passI, { x: 32, y: 640 });
	const rot = createGraphNode('domain_rotate_euler_time', passI, { x: 220, y: 640 }, {
		tx: 0,
		ty: 0.32,
		tz: 0,
		rx: 0,
		ry: 0,
		rz: 0,
	});
	const hex = createGraphNode('domain_tessellate_hex_xz', passI, { x: 420, y: 640 }, {
		hexCell: 1.0,
		periodY: 1.0,
		yPhase: 0,
	});
	const torus = createGraphNode('sdf_torus', passI, { x: 660, y: 560 }, { R, r });
	const oct = createGraphNode('sdf_octahedron', passI, { x: 660, y: 720 }, { oct_s: s });
	const isect = createGraphNode('op_intersect', passI, { x: 880, y: 640 });
	const gem = createGraphNode('sdf_sphere', passI, { x: 660, y: 840 }, { r: 0.115 });
	const sminGem = createGraphNode('smin_float', passI, { x: 1080, y: 680 }, { k: 0.1 });
	const sink = createGraphNode('scene_sdf_sink', passI, { x: 1280, y: 640 });

	return {
		nodes: [
			toFlowNode(uvA),
			toFlowNode(kalA),
			toFlowNode(domA),
			toFlowNode(affA),
			toFlowNode(foldA),
			toFlowNode(itA),
			toFlowNode(rgbA),
			toFlowNode(v4A),
			toFlowNode(outA),
			toFlowNode(uvB),
			toFlowNode(warpB),
			toFlowNode(sB0),
			toFlowNode(sB1),
			toFlowNode(mixB),
			toFlowNode(outB),
			toFlowNode(uvI),
			toFlowNode(rayI),
			toFlowNode(marchI),
			toFlowNode(fragI),
			toFlowNode(paramP),
			toFlowNode(rot),
			toFlowNode(hex),
			toFlowNode(torus),
			toFlowNode(oct),
			toFlowNode(isect),
			toFlowNode(gem),
			toFlowNode(sminGem),
			toFlowNode(sink),
		],
		edges: [
			makeEdge(uvA.id, kalA.id, 'uv', 'p'),
			makeEdge(kalA.id, domA.id, 'out', 'uv'),
			makeEdge(domA.id, affA.id, 'out', 'z'),
			makeEdge(affA.id, foldA.id, 'out', 'z'),
			makeEdge(foldA.id, itA.id, 'out', 'z'),
			makeEdge(itA.id, rgbA.id, 'out', 'z'),
			makeEdge(rgbA.id, v4A.id, 'rgb', 'rgb'),
			makeEdge(v4A.id, outA.id, 'col', 'color'),
			makeEdge(uvB.id, warpB.id, 'uv', 'p'),
			makeEdge(warpB.id, sB0.id, 'out', 'uv'),
			makeEdge(warpB.id, sB1.id, 'out', 'uv'),
			makeEdge(sB0.id, mixB.id, 'rgba', 'a'),
			makeEdge(sB1.id, mixB.id, 'rgba', 'b'),
			makeEdge(mixB.id, outB.id, 'out', 'color'),
			makeEdge(uvI.id, rayI.id, 'uv', 'uv'),
			makeEdge(rayI.id, marchI.id, 'ro', 'ro'),
			makeEdge(rayI.id, marchI.id, 'rd', 'rd'),
			makeEdge(marchI.id, fragI.id, 'col', 'color'),
			makeEdge(paramP.id, rot.id, 'p', 'p'),
			makeEdge(rot.id, hex.id, 'p', 'p'),
			makeEdge(hex.id, torus.id, 'p', 'p'),
			makeEdge(hex.id, oct.id, 'p', 'p'),
			makeEdge(hex.id, gem.id, 'p', 'p'),
			makeEdge(torus.id, isect.id, 'd', 'a'),
			makeEdge(oct.id, isect.id, 'd', 'b'),
			makeEdge(isect.id, sminGem.id, 'd', 'a'),
			makeEdge(gem.id, sminGem.id, 'd', 'b'),
			makeEdge(sminGem.id, sink.id, 'd', 'd'),
		],
	};
}

export function metaForChronosLattice(): GraphDocument['meta'] {
	return {
		name: 'chronos-lattice',
		iChannels: {
			bufB: { 0: 'bufB', 1: 'bufA' },
			image: { 0: 'bufB' },
		},
	};
}

