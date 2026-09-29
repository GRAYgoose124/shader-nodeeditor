import type { Edge, Node } from '@xyflow/svelte';
import type { GraphDocument, ParamAnimationSpec } from '@shadertoy/compiler';
import { paramAnimKey } from '@shadertoy/compiler';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { createGraphNodeFixedId, makeEdge } from './utils.js';

function anim(
	nodeId: string,
	paramId: string,
	partial: Partial<Omit<ParamAnimationSpec, 'nodeId' | 'paramId'>>,
): ParamAnimationSpec {
	return {
		nodeId,
		paramId,
		// Match inspector "Animate" defaults (defaultParamAnimationSpec):
		// - depth: 1 (full min/max span)
		// - offset: 0 (oscillate around the current slider value)
		// Baked presets should feel identical to manually toggling Animate on.
		curve: partial.curve ?? 'sine',
		speed: partial.speed ?? 0.25,
		phase: partial.phase ?? 0,
		depth: partial.depth ?? 1,
		range: partial.range,
		offset: partial.offset ?? 0,
	};
}

/**
 * **Gray–Scott reaction–diffusion** — ping-pong `bufA`, 3×3 Laplacian (texel stencil) + one Euler step + seeds.\n
 * Stencil **weights sum to 0** so a flat field is not amplified each frame; image pass only grades `RGBA`.\n
 * Note: uses deterministic node ids for baked `paramAnimations`.
 */
export function createFeedbackInkDiffusionFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const passA = 'bufA' as const;
	const passI = 'image' as const;

	// bufA
	const uvA = createGraphNodeFixedId('ink_uvA', 'uv', passA, { x: 40, y: 60 });
	const pixA = createGraphNodeFixedId('ink_pix', 'frag_coord_xy', passA, { x: 40, y: 180 });
	const prevA = createGraphNodeFixedId('ink_prev', 'sample_channel_texel', passA, { x: 260, y: 180 }, { channel: 0 });
	// Zero-sum stencil: wC + 4*wN + 4*wD = 0 ⇒ Laplacian of a flat field is 0 (otherwise you only get “diffusion lift”).
	const lapA = createGraphNodeFixedId('ink_lap', 'conv3x3_texel', passA, { x: 260, y: 300 }, {
		channel: 0,
		wCenter: -1.1,
		wCardinal: 0.22,
		wDiagonal: 0.055,
		wrapMode: '0',
	});

	const frameA = createGraphNodeFixedId('ink_frame', 'frame', passA, { x: 40, y: 420 });
	const maskInit = createGraphNodeFixedId('ink_mask_init', 'mask_frame_below', passA, { x: 260, y: 420 }, { edge: 240 });

	// seed1 = high-u substrate disk; seed2 = v-rich catalyst disk (Gray–Scott, not decorative RGB).
	const seed1 = createGraphNodeFixedId('ink_seed1', 'splat_uv_disk_vec4', passA, { x: 260, y: 60 }, {
		cx: 0.5,
		cy: 0.52,
		radius: 0.06,
		r: 0.98,
		g: 0.05,
		b: 0.1,
		alpha: 1,
	});
	const seed2 = createGraphNodeFixedId('ink_seed2', 'splat_uv_disk_vec4', passA, { x: 260, y: 110 }, {
		cx: 0.36,
		cy: 0.45,
		radius: 0.055,
		r: 0.14,
		g: 0.62,
		b: 0.72,
		alpha: 1,
	});
	const seedMix = createGraphNodeFixedId('ink_seed_mix', 'vec4_add', passA, { x: 520, y: 90 });
	const seedGate = createGraphNodeFixedId('ink_seed_gate', 'vec4_mul_float', passA, { x: 740, y: 120 });

	const update = createGraphNodeFixedId('ink_update', 'expr_vec4', passA, { x: 520, y: 330 });
	(update.data as any).expression = `
// a = prev, b = laplacian, x = init mask
vec4 p0 = {{in:a}};
vec4 l = {{in:b}};
float mInit = clamp({{in:x}}, 0.0, 1.0);

// Bootstrap: empty buffer + wrong (u,v) ratio ⇒ u*v² ≈ 0 forever — looks like “diffusion only”.
vec4 p = vec4(
  mix(p0.x, max(p0.x, 0.93), mInit * 0.7),
  mix(p0.y, max(p0.y, 0.06), mInit * 0.55),
  p0.z,
  p0.w);

float u = clamp(p.x, 0.0, 1.0);
float v = clamp(p.y, 0.0, 1.0);

// Pearson “coral”-class (F,κ) — large stable Turing region; z/w tilt F,κ slightly.
float du = 0.18;
float dv = 0.09;
float F = 0.0545 + 0.004 * p.z;
float K = 0.0618 + 0.005 * p.w;

float lapU = l.x;
float lapV = l.y;
float uvv = u * v * v;
// Gray-Scott: du*Lu - u*v^2 + F(1-u); dv*Lv + u*v^2 - (F+K)v
u += du * lapU - uvv + F * (1.0 - u);
v += dv * lapV + uvv - (F + K) * v;

// Tiny symmetry noise: keeps modes from freezing into a fat uniform after seeds stop (iTime / fragCoord are globals).
float pn = sin(iTime * 0.65 + dot(gl_FragCoord.xy, vec2(0.012, 0.018)));
v += 0.00011 * pn;
u += 0.000025 * cos(pn * 1.3);

float dye = clamp(p.z + 0.18 * l.z, 0.0, 1.0);
float modA = clamp(p.w + 0.12 * l.w, 0.0, 1.0);
vec4 q = vec4(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0), dye, modA);

{{out:out}} = mix(q, vec4(1.0, 0.0, 0.0, 0.0), mInit * 0.02);
`;

	const addSeed = createGraphNodeFixedId('ink_add_seed', 'vec4_add', passA, { x: 980, y: 220 });
	const outA = createGraphNodeFixedId('ink_outA', 'frag_output', passA, { x: 1200, y: 220 });

	// image: grade full RGBA so dye (z) and mod (w) contribute — avoids two-level smoothstep posterization on u,v alone.
	const uvI = createGraphNodeFixedId('ink_uvI', 'uv', passI, { x: 40, y: 560 });
	const sampI = createGraphNodeFixedId('ink_sampI', 'sample_channel', passI, { x: 260, y: 560 }, { channel: 0 });

	const grade = createGraphNodeFixedId('ink_grade', 'expr_vec4', passI, { x: 740, y: 560 });
	(grade.data as any).expression = `
vec4 s = {{in:a}};
float u = clamp(s.x, 0.0, 1.0);
float v = clamp(s.y, 0.0, 1.0);
float dye = clamp(s.z, 0.0, 1.0);
float mw = clamp(s.w, 0.0, 1.0);
float pu = pow(u, 0.58);
float pv = pow(v, 0.55);
float sep = pow(abs(v - u), 0.72);
// 2D continuous blend in (u,v) — no nested smoothsteps (those snap to a handful of solids).
vec3 paper = vec3(0.94, 0.91, 0.87);
vec3 teal = vec3(0.05, 0.2, 0.34);
vec3 rust = vec3(0.48, 0.15, 0.08);
vec3 rgb =
    paper
    + pv * (teal - paper) * (0.55 + 0.35 * (1.0 - pu))
    + pu * (rust - paper) * (0.5 + 0.4 * (1.0 - pv));
// Phase tint: every (u,v) pair gets a slightly different hue drift (not just u vs v plates).
float ang = atan(v - 0.16, u - 0.14);
vec3 phase = 0.04 * vec3(cos(ang * 1.1), cos(ang * 1.1 + 2.1), cos(ang * 1.1 + 4.2));
rgb += phase * (0.25 + 1.8 * sep);
rgb += sep * vec3(0.16, 0.12, 0.06);
rgb += dye * vec3(0.05, 0.14, 0.22);
rgb += (mw - 0.5) * vec3(0.04, -0.02, 0.05);
rgb = clamp(rgb, vec3(0.02), vec3(0.96));
{{out:out}} = vec4(rgb, 1.0);
`;

	const outI = createGraphNodeFixedId('ink_outI', 'frag_output', passI, { x: 1200, y: 560 });

	return {
		nodes: [
			toFlowNode(uvA),
			toFlowNode(pixA),
			toFlowNode(prevA),
			toFlowNode(lapA),
			toFlowNode(frameA),
			toFlowNode(maskInit),
			toFlowNode(seed1),
			toFlowNode(seed2),
			toFlowNode(seedMix),
			toFlowNode(seedGate),
			toFlowNode(update),
			toFlowNode(addSeed),
			toFlowNode(outA),
			toFlowNode(uvI),
			toFlowNode(sampI),
			toFlowNode(grade),
			toFlowNode(outI),
		],
		edges: [
			makeEdge(pixA.id, prevA.id, 'xy', 'pixel'),
			makeEdge(pixA.id, lapA.id, 'xy', 'pixel'),
			makeEdge(frameA.id, maskInit.id, 'f', 'frame'),
			makeEdge(uvA.id, seed1.id, 'uv', 'uv'),
			makeEdge(uvA.id, seed2.id, 'uv', 'uv'),
			makeEdge(seed1.id, seedMix.id, 'out', 'a'),
			makeEdge(seed2.id, seedMix.id, 'out', 'b'),
			makeEdge(seedMix.id, seedGate.id, 'out', 'a'),
			makeEdge(maskInit.id, seedGate.id, 'm', 's'),
			makeEdge(prevA.id, update.id, 'rgba', 'a'),
			makeEdge(lapA.id, update.id, 'out', 'b'),
			makeEdge(maskInit.id, update.id, 'm', 'x'),
			makeEdge(update.id, addSeed.id, 'out', 'a'),
			makeEdge(seedGate.id, addSeed.id, 'out', 'b'),
			makeEdge(addSeed.id, outA.id, 'out', 'color'),

			makeEdge(uvI.id, sampI.id, 'uv', 'uv'),
			makeEdge(sampI.id, grade.id, 'rgba', 'a'),
			makeEdge(grade.id, outI.id, 'out', 'color'),
		],
	};
}

export function metaForFeedbackInkDiffusion(): GraphDocument['meta'] {
	const m: Record<string, ParamAnimationSpec> = {};
	// Don’t animate Laplacian weights here: changing only card/diag breaks zero-sum and washes the field.
	// Subtle seed drift
	m[paramAnimKey('ink_seed1', 'cx')] = anim('ink_seed1', 'cx', { curve: 'sine', speed: 0.03, range: 0.18, offset: 0.5 });
	m[paramAnimKey('ink_seed2', 'cy')] = anim('ink_seed2', 'cy', { curve: 'sine', speed: 0.04, range: 0.16, offset: 0.45 });

	return {
		name: 'showcase-ink-diffusion',
		passSubsteps: { bufA: 5 },
		iChannels: {
			bufA: { 0: 'bufA' },
			image: { 0: 'bufA' },
		},
		editor: { paramAnimations: m },
	};
}

/**
 * **Cathedral of repetition** — raymarched SDF scene built from KIFS folds + primitives.\n
 * Demonstrates: domain transforms, smooth-min blends, and the raymarch scene node.\n
 * Note: uses deterministic node ids for baked `paramAnimations`.\n
 */
export function createSdfCathedralFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const passI = 'image' as const;

	const uvI = createGraphNodeFixedId('cat_uv', 'uv', passI, { x: 40, y: 60 });
	const cam = createGraphNodeFixedId('cat_cam', 'ray_lookat_from_uv', passI, { x: 260, y: 60 }, {
		ex: 2.8,
		ey: 1.2,
		ez: 3.2,
		tx: 0,
		ty: 0.4,
		tz: 0,
		fov: 44,
	});
	const march = createGraphNodeFixedId('cat_march', 'raymarch_scene', passI, { x: 540, y: 40 }, {
		maxSteps: 120,
		maxDist: 60,
		eps: 0.0009,
		ambR: 0.02,
		ambG: 0.03,
		ambB: 0.07,
		specOn: 1,
		specPow: 52,
		specStr: 0.32,
		softShadow: 1,
		shadowK: 14,
		curvAmp: 0.12,
		curvEps: 0.02,
		fogOn: 1,
		fogDensity: 0.045,
		fogR: 0.05,
		fogG: 0.06,
		fogB: 0.09,
		reflOn: '0',
	});
	const outI = createGraphNodeFixedId('cat_out', 'frag_output', passI, { x: 820, y: 60 });

	// Scene body
	const p = createGraphNodeFixedId('cat_p', 'sdf_param_p', passI, { x: 40, y: 300 });
	const rot = createGraphNodeFixedId('cat_rot', 'domain_rotate_euler_time', passI, { x: 260, y: 300 }, {
		tx: 0,
		ty: 0.18,
		tz: 0,
		rx: 0.06,
		ry: 0.0,
		rz: -0.03,
	});
	// Use a known-good fractal SDF node for reliability (menger sponge), then sculpt it.
	const sponge = createGraphNodeFixedId('cat_sponge', 'sdf_menger_sponge', passI, { x: 480, y: 300 }, {
		mScale: 1.0,
		mIters: 4,
	});
	const onion = createGraphNodeFixedId('cat_onion', 'op_onion_d', passI, { x: 700, y: 300 }, { th: 0.035 });
	const twist = createGraphNodeFixedId('cat_twist', 'domain_twist', passI, { x: 920, y: 300 }, {
		axis: '1',
		k: 1.25,
		timeScale: 0.18,
	});
	const tor = createGraphNodeFixedId('cat_tor', 'sdf_torus', passI, { x: 1140, y: 300 }, { R: 0.45, r: 0.12 });
	const smin = createGraphNodeFixedId('cat_smin', 'smin_float', passI, { x: 1340, y: 300 }, { k: 0.22 });
	const round = createGraphNodeFixedId('cat_round', 'op_round_d', passI, { x: 1540, y: 300 }, { rad: 0.03 });
	const sink = createGraphNodeFixedId('cat_sink', 'scene_sdf_sink', passI, { x: 1740, y: 300 });

	return {
		nodes: [
			toFlowNode(uvI),
			toFlowNode(cam),
			toFlowNode(march),
			toFlowNode(outI),
			toFlowNode(p),
			toFlowNode(rot),
			toFlowNode(sponge),
			toFlowNode(onion),
			toFlowNode(twist),
			toFlowNode(tor),
			toFlowNode(smin),
			toFlowNode(round),
			toFlowNode(sink),
		],
		edges: [
			makeEdge(uvI.id, cam.id, 'uv', 'uv'),
			makeEdge(cam.id, march.id, 'ro', 'ro'),
			makeEdge(cam.id, march.id, 'rd', 'rd'),
			makeEdge(march.id, outI.id, 'col', 'color'),

			makeEdge(p.id, rot.id, 'p', 'p'),
			makeEdge(rot.id, sponge.id, 'p', 'p'),
			makeEdge(sponge.id, onion.id, 'd', 'd'),
			makeEdge(rot.id, twist.id, 'p', 'p'),
			makeEdge(twist.id, tor.id, 'p', 'p'),
			makeEdge(onion.id, smin.id, 'd', 'a'),
			makeEdge(tor.id, smin.id, 'd', 'b'),
			makeEdge(smin.id, round.id, 'd', 'd'),
			makeEdge(round.id, sink.id, 'd', 'd'),
		],
	};
}

export function metaForSdfCathedral(): GraphDocument['meta'] {
	const m: Record<string, ParamAnimationSpec> = {};
	// Use the same semantics as manually toggling Animate:
	// oscillate around the current slider value (no baked offset), using full min/max span by default.
	m[paramAnimKey('cat_cam', 'ex')] = anim('cat_cam', 'ex', { curve: 'sine', speed: 0.12 });
	m[paramAnimKey('cat_cam', 'ez')] = anim('cat_cam', 'ez', { curve: 'triangle', speed: 0.09 });
	m[paramAnimKey('cat_cam', 'ty')] = anim('cat_cam', 'ty', { curve: 'sine', speed: 0.18 });
	m[paramAnimKey('cat_twist', 'k')] = anim('cat_twist', 'k', { curve: 'smooth', speed: 0.16 });
	m[paramAnimKey('cat_march', 'lx')] = anim('cat_march', 'lx', { curve: 'sine', speed: 0.22 });
	m[paramAnimKey('cat_march', 'lz')] = anim('cat_march', 'lz', { curve: 'sine', speed: 0.19 });
	m[paramAnimKey('cat_sponge', 'mScale')] = anim('cat_sponge', 'mScale', { curve: 'smooth', speed: 0.11 });

	return {
		name: 'showcase-sdf-cathedral',
		editor: { paramAnimations: m },
	};
}

/**
 * **Fractal artifact** — bufA generates an orbit-trap texture; image raymarches a scene textured from bufA.\n
 * Demonstrates: buffer → surface texture pipeline plus raymarch lighting.\n
 */
export function createHybridFractalArtifactFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const passA = 'bufA' as const;
	const passI = 'image' as const;

	// bufA: warped orbit trap palette
	const uvA = createGraphNodeFixedId('art_uvA', 'uv', passA, { x: 40, y: 60 });
	const domA = createGraphNodeFixedId('art_dom', 'proc2d_domain', passA, { x: 240, y: 60 }, {
		scale: 2.6,
		angle: 12,
		ox: 0.02,
		oy: -0.01,
	});
	const warp = createGraphNodeFixedId('art_warp', 'proc2d_warp_fbm', passA, { x: 460, y: 60 }, {
		freq: 1.55,
		lac: 2.02,
		gain: 0.52,
		amp: 0.12,
		tsx: 0.035,
		tsy: 0.03,
	});
	const trap = createGraphNodeFixedId('art_trap', 'mandelbrot_orbit_trap', passA, { x: 700, y: 50 }, {
		cx: -0.18,
		cy: 0.08,
		scale: 2.25,
		tx: 0.14,
		ty: -0.11,
		trapScale: 6.2,
		maxIter: 112,
	});
	const ramp = createGraphNodeFixedId('art_ramp', 'fractal_color_ramp', passA, { x: 940, y: 50 }, {
		freq: 18.0,
		b0: 0.15,
		b1: 0.8,
		b2: 1.35,
	});
	const v4A = createGraphNodeFixedId('art_v4A', 'vec4_from_vec3', passA, { x: 1160, y: 50 }, { a: 1 });
	const outA = createGraphNodeFixedId('art_outA', 'frag_output', passA, { x: 1380, y: 50 });

	// image: textured raymarch
	const uvI = createGraphNodeFixedId('art_uvI', 'uv', passI, { x: 40, y: 220 });
	const cam = createGraphNodeFixedId('art_cam', 'ray_from_uv', passI, { x: 240, y: 220 }, { fov: 56, camZ: 3.25 });
	const march = createGraphNodeFixedId('art_march', 'raymarch_scene', passI, { x: 520, y: 200 }, {
		maxSteps: 112,
		maxDist: 56,
		eps: 0.001,
		ambR: 0.02,
		ambG: 0.03,
		ambB: 0.07,
		specOn: 1,
		specPow: 44,
		specStr: 0.3,
		softShadow: 1,
		shadowK: 14,
		curvAmp: 0.12,
		curvEps: 0.02,
		fogOn: 1,
		fogDensity: 0.05,
		fogR: 0.035,
		fogG: 0.055,
		fogB: 0.1,
		reflOn: '1',
		reflStr: 0.2,
		reflSteps: 6,
		surfTexOn: 1,
		surfTexChannel: 0,
		surfTexScale: 2.4,
		surfTexBlend: 0.86,
		surfTexMode: '0',
	});
	const outI = createGraphNodeFixedId('art_outI', 'frag_output', passI, { x: 800, y: 220 });

	// Scene geometry (simple but rich once textured)
	const p = createGraphNodeFixedId('art_p', 'sdf_param_p', passI, { x: 40, y: 420 });
	const rot = createGraphNodeFixedId('art_rot', 'domain_rotate_euler_time', passI, { x: 240, y: 420 }, {
		tx: 0,
		ty: 0.45,
		tz: 0,
		rx: 0.12,
		ry: 0.0,
		rz: -0.06,
	});
	const twist = createGraphNodeFixedId('art_twist', 'domain_twist', passI, { x: 460, y: 420 }, {
		axis: '1',
		k: 2.1,
		timeScale: 0.28,
	});
	const sph = createGraphNodeFixedId('art_sph', 'sdf_sphere', passI, { x: 700, y: 380 }, { r: 0.34 });
	const box = createGraphNodeFixedId('art_box', 'sdf_box', passI, { x: 700, y: 480 }, { hx: 0.28, hy: 0.28, hz: 0.28 });
	const smin = createGraphNodeFixedId('art_smin', 'smin_exp_float', passI, { x: 920, y: 430 }, { k: 10 });
	const sink = createGraphNodeFixedId('art_sink', 'scene_sdf_sink', passI, { x: 1140, y: 430 });

	return {
		nodes: [
			toFlowNode(uvA),
			toFlowNode(domA),
			toFlowNode(warp),
			toFlowNode(trap),
			toFlowNode(ramp),
			toFlowNode(v4A),
			toFlowNode(outA),
			toFlowNode(uvI),
			toFlowNode(cam),
			toFlowNode(march),
			toFlowNode(outI),
			toFlowNode(p),
			toFlowNode(rot),
			toFlowNode(twist),
			toFlowNode(sph),
			toFlowNode(box),
			toFlowNode(smin),
			toFlowNode(sink),
		],
		edges: [
			makeEdge(uvA.id, domA.id, 'uv', 'uv'),
			makeEdge(domA.id, warp.id, 'out', 'p'),
			makeEdge(warp.id, trap.id, 'out', 'uv'),
			makeEdge(trap.id, ramp.id, 'esc', 't'),
			makeEdge(ramp.id, v4A.id, 'rgb', 'rgb'),
			makeEdge(v4A.id, outA.id, 'col', 'color'),

			makeEdge(uvI.id, cam.id, 'uv', 'uv'),
			makeEdge(cam.id, march.id, 'ro', 'ro'),
			makeEdge(cam.id, march.id, 'rd', 'rd'),
			makeEdge(march.id, outI.id, 'col', 'color'),

			makeEdge(p.id, rot.id, 'p', 'p'),
			makeEdge(rot.id, twist.id, 'p', 'p'),
			makeEdge(twist.id, sph.id, 'p', 'p'),
			makeEdge(twist.id, box.id, 'p', 'p'),
			makeEdge(sph.id, smin.id, 'd', 'a'),
			makeEdge(box.id, smin.id, 'd', 'b'),
			makeEdge(smin.id, sink.id, 'd', 'd'),
		],
	};
}

export function metaForHybridFractalArtifact(): GraphDocument['meta'] {
	const m: Record<string, ParamAnimationSpec> = {};
	m[paramAnimKey('art_dom', 'angle')] = anim('art_dom', 'angle', { curve: 'sine', speed: 0.02, range: 24, offset: 12 });
	m[paramAnimKey('art_warp', 'amp')] = anim('art_warp', 'amp', { curve: 'smooth', speed: 0.05, range: 0.08, offset: 0.11 });
	m[paramAnimKey('art_trap', 'tx')] = anim('art_trap', 'tx', { curve: 'sine', speed: 0.03, range: 0.5, offset: 0.14 });
	m[paramAnimKey('art_trap', 'ty')] = anim('art_trap', 'ty', { curve: 'triangle', speed: 0.03, range: 0.5, offset: -0.11 });
	m[paramAnimKey('art_march', 'palMix')] = anim('art_march', 'palMix', { curve: 'sine', speed: 0.04, range: 0.6, offset: 0.35 });
	m[paramAnimKey('art_twist', 'k')] = anim('art_twist', 'k', { curve: 'smooth', speed: 0.06, range: 1.1, offset: 2.0 });

	return {
		name: 'showcase-fractal-artifact',
		iChannels: {
			image: { 0: 'bufA' },
		},
		editor: { paramAnimations: m },
	};
}

