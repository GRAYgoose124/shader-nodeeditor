import type { Edge, Node } from '@xyflow/svelte';
import type { GraphDocument } from '@shadertoy/compiler';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';

/** Simple raymarch sphere → fragment (no scene graph). */
export function createDefaultFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const uv = createGraphNode('uv', 'image', { x: 40, y: 80 });
	const rm = createGraphNode(
		'raymarch_sphere',
		'image',
		{ x: 280, y: 60 },
		{ r: 0.45, fov: 60, camZ: 3, maxSteps: 96 },
	);
	const out = createGraphNode('frag_output', 'image', { x: 560, y: 80 });
	return {
		nodes: [toFlowNode(uv), toFlowNode(rm), toFlowNode(out)],
		edges: [
			makeEdge(uv.id, rm.id, 'uv', 'uv'),
			makeEdge(rm.id, out.id, 'col', 'color'),
		],
	};
}

/**
 * UV → ray → raymarch_scene → out; scene uses domain_rotate_euler_time (Y time scale = 1) → box primitive → sink.
 */
export function createRaymarchSdfFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 32, y: 160 });
	const ray = createGraphNode('ray_from_uv', pass, { x: 200, y: 160 }, { fov: 58, camZ: 3.2 });
	const march = createGraphNode('raymarch_scene', pass, { x: 420, y: 140 }, {
		maxSteps: 96,
		maxDist: 48,
		eps: 0.0008,
		ambR: 0.02,
		ambG: 0.03,
		ambB: 0.07,
	});
	const fragOut = createGraphNode('frag_output', pass, { x: 680, y: 160 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 40, y: 380 });
	const rotY = createGraphNode('domain_rotate_euler_time', pass, { x: 240, y: 380 }, {
		tx: 0,
		ty: 1,
		tz: 0,
		rx: 0,
		ry: 0,
		rz: 0,
	});
	const prim = createGraphNode(
		'sdf_primitive',
		pass,
		{ x: 460, y: 380 },
		{ shape: 'box', hx: 0.32, hy: 0.22, hz: 0.38 },
	);
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 660, y: 380 });

	const nodes = [
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(rotY),
		toFlowNode(prim),
		toFlowNode(sink),
	];

	const edges: Edge[] = [
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),
		makeEdge(paramP.id, rotY.id, 'p', 'p'),
		makeEdge(rotY.id, prim.id, 'p', 'p'),
		makeEdge(prim.id, sink.id, 'd', 'd'),
	];

	return { nodes, edges };
}

/**
 * **`scene_sdf_repeat_begin` / `scene_sdf_repeat_end`** — compile-time `min` over a row of spheres along **X** (see node docs for limits).
 */
export function createRaymarchSceneSdfRepeatFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 32, y: 160 });
	const ray = createGraphNode('ray_from_uv', pass, { x: 200, y: 160 }, { fov: 58, camZ: 3.5 });
	const march = createGraphNode('raymarch_scene', pass, { x: 420, y: 140 }, {
		maxSteps: 128,
		maxDist: 56,
		eps: 0.001,
		ambR: 0.04,
		ambG: 0.05,
		ambB: 0.08,
	});
	const fragOut = createGraphNode('frag_output', pass, { x: 680, y: 160 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 40, y: 380 });
	const repB = createGraphNode('scene_sdf_repeat_begin', pass, { x: 220, y: 380 }, {
		zoneId: 'row',
		count: 6,
		axis: 'x',
		spacing: 0.52,
		indexName: 'ri',
	});
	const sph = createGraphNode('sdf_sphere', pass, { x: 440, y: 380 }, { r: 0.22 });
	const repE = createGraphNode('scene_sdf_repeat_end', pass, { x: 640, y: 380 }, { zoneId: 'row' });
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 820, y: 380 });

	const nodes = [
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(repB),
		toFlowNode(sph),
		toFlowNode(repE),
		toFlowNode(sink),
	];

	const edges: Edge[] = [
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),
		makeEdge(paramP.id, repB.id, 'p', 'p'),
		makeEdge(repB.id, sph.id, 'p', 'p'),
		makeEdge(sph.id, repE.id, 'd', 'd'),
		makeEdge(repE.id, sink.id, 'd', 'd'),
	];

	return { nodes, edges };
}

/**
 * Torus ∩ octahedron, hex-tiled (XZ honeycomb + Y). IQ octahedron size s (vertex at distance s);
 * tune torus: R+r ≈ 1.02·s, 2(R−r) ≈ 0.93·s/√3 so the tube hole sits just inside the face-center radius s/√3.
 */
export function createTorusOctaHexTessFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const s = 0.42;
	const R = 0.271;
	const r = 0.158;

	const uv = createGraphNode('uv', pass, { x: 32, y: 140 });
	const ray = createGraphNode('ray_from_uv', pass, { x: 200, y: 140 }, { fov: 58, camZ: 3.5 });
	const march = createGraphNode('raymarch_scene', pass, { x: 440, y: 120 }, {
		maxSteps: 128,
		maxDist: 56,
		eps: 0.001,
		ambR: 0.04,
		ambG: 0.05,
		ambB: 0.08,
	});
	const fragOut = createGraphNode('frag_output', pass, { x: 720, y: 140 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 32, y: 400 });
	const rot = createGraphNode('domain_rotate_euler_time', pass, { x: 220, y: 400 }, {
		tx: 0,
		ty: 0.28,
		tz: 0,
		rx: 0,
		ry: 0,
		rz: 0,
	});
	const hex = createGraphNode('domain_tessellate_hex_xz', pass, { x: 420, y: 400 }, {
		hexCell: 1.0,
		periodY: 1.0,
		yPhase: 0,
	});
	const torus = createGraphNode('sdf_torus', pass, { x: 660, y: 320 }, { R, r });
	const oct = createGraphNode('sdf_octahedron', pass, { x: 660, y: 480 }, { oct_s: s });
	const isect = createGraphNode('op_intersect', pass, { x: 880, y: 400 });
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 1060, y: 400 });

	const nodes = [
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(rot),
		toFlowNode(hex),
		toFlowNode(torus),
		toFlowNode(oct),
		toFlowNode(isect),
		toFlowNode(sink),
	];
	const edges: Edge[] = [
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),
		makeEdge(paramP.id, rot.id, 'p', 'p'),
		makeEdge(rot.id, hex.id, 'p', 'p'),
		makeEdge(hex.id, torus.id, 'p', 'p'),
		makeEdge(hex.id, oct.id, 'p', 'p'),
		makeEdge(torus.id, isect.id, 'd', 'a'),
		makeEdge(oct.id, isect.id, 'd', 'b'),
		makeEdge(isect.id, sink.id, 'd', 'd'),
	];
	return { nodes, edges };
}

/**
 * Same torus ∩ octahedron motif as the hex preset, but **self-similar** detail via `sdf_tessellate_feedback`
 * (KIFS fold + union of the motif at nested scales), not hex domain repetition.
 *
 * **SDF Octahedron** uses `motifSampling: world`: inside `motif(q, pScene)` the cage is evaluated at **scene** `p`,
 * the torus at **folded** `q`, so you get a **world-fixed** clip with **nested** intersect detail (not `oct(q)` per fold).
 */
export function createTorusOctaFeedbackTessFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const s = 0.42;
	const R = 0.271;
	const r = 0.158;

	const uv = createGraphNode('uv', pass, { x: 32, y: 140 });
	const ray = createGraphNode('ray_from_uv', pass, { x: 200, y: 140 }, { fov: 58, camZ: 3.5 });
	const march = createGraphNode('raymarch_scene', pass, { x: 440, y: 120 }, {
		maxSteps: 140,
		maxDist: 56,
		eps: 0.001,
		ambR: 0.04,
		ambG: 0.05,
		ambB: 0.08,
	});
	const fragOut = createGraphNode('frag_output', pass, { x: 720, y: 140 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 32, y: 400 });
	const rot = createGraphNode('domain_rotate_euler_time', pass, { x: 220, y: 400 }, {
		tx: 0,
		ty: 0.28,
		tz: 0,
		rx: 0,
		ry: 0,
		rz: 0,
	});
	const torus = createGraphNode('sdf_torus', pass, { x: 520, y: 320 }, { R, r });
	const oct = createGraphNode('sdf_octahedron', pass, { x: 520, y: 480 }, { oct_s: s });
	const isect = createGraphNode('op_intersect', pass, { x: 720, y: 400 });
	const fb = createGraphNode(
		'sdf_tessellate_feedback',
		pass,
		{ x: 900, y: 400 },
		{ loopMode: 'kifs', foldOx: 0.22, foldOy: 0.22, foldOz: 0.22, scale: 1.85, iters: 3 },
	);
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 1080, y: 400 });

	const nodes = [
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(rot),
		toFlowNode(torus),
		toFlowNode(oct),
		toFlowNode(isect),
		toFlowNode(fb),
		toFlowNode(sink),
	];
	const edges: Edge[] = [
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),
		makeEdge(paramP.id, rot.id, 'p', 'p'),
		makeEdge(rot.id, torus.id, 'p', 'p'),
		makeEdge(paramP.id, oct.id, 'p', 'p'),
		makeEdge(torus.id, isect.id, 'd', 'a'),
		makeEdge(oct.id, isect.id, 'd', 'b'),
		makeEdge(isect.id, fb.id, 'd', 'd'),
		makeEdge(fb.id, sink.id, 'd', 'd'),
	];
	return { nodes, edges };
}

/**
 * Raymarched sphere with **3D IFS branching**: rotate p → two `ifs_affine3` maps → `ifs_pick_shorter3` → sphere.
 * Mirrors the 2D chaos-game pick shorter pattern ([`ifs_pick_shorter2`](packages/compiler/src/builtins/ifs/control2d.ts)) in scene space.
 */
export function createSdfIfs3BranchFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 32, y: 140 });
	const ray = createGraphNode('ray_from_uv', pass, { x: 200, y: 140 }, { fov: 58, camZ: 3.6 });
	const march = createGraphNode('raymarch_scene', pass, { x: 440, y: 120 }, {
		maxSteps: 128,
		maxDist: 48,
		eps: 0.001,
		ambR: 0.06,
		ambG: 0.07,
		ambB: 0.1,
	});
	const fragOut = createGraphNode('frag_output', pass, { x: 680, y: 140 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 32, y: 400 });
	const rot = createGraphNode('domain_rotate_euler_time', pass, { x: 200, y: 400 }, {
		tx: 0,
		ty: 0.35,
		tz: 0,
		rx: 0,
		ry: 0,
		rz: 0,
	});
	const aff1 = createGraphNode('ifs_affine3', pass, { x: 420, y: 320 }, {
		m00: 0.45,
		m01: -0.14,
		m02: 0.1,
		m10: 0.14,
		m11: 0.45,
		m12: -0.06,
		m20: -0.08,
		m21: 0.08,
		m22: 0.44,
		tx: 0.05,
		ty: -0.04,
		tz: 0.02,
	});
	const aff2 = createGraphNode('ifs_affine3', pass, { x: 420, y: 480 }, {
		m00: 0.38,
		m01: 0.16,
		m02: -0.08,
		m10: -0.18,
		m11: 0.4,
		m12: 0.1,
		m20: 0.06,
		m21: -0.08,
		m22: 0.4,
		tx: -0.04,
		ty: 0.06,
		tz: -0.02,
	});
	const pick = createGraphNode('ifs_pick_shorter3', pass, { x: 640, y: 400 }, {});
	const sph = createGraphNode('sdf_sphere', pass, { x: 840, y: 400 }, { r: 0.34 });
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 1000, y: 400 });

	return {
		nodes: [
			toFlowNode(uv),
			toFlowNode(ray),
			toFlowNode(march),
			toFlowNode(fragOut),
			toFlowNode(paramP),
			toFlowNode(rot),
			toFlowNode(aff1),
			toFlowNode(aff2),
			toFlowNode(pick),
			toFlowNode(sph),
			toFlowNode(sink),
		],
		edges: [
			makeEdge(uv.id, ray.id, 'uv', 'uv'),
			makeEdge(ray.id, march.id, 'ro', 'ro'),
			makeEdge(ray.id, march.id, 'rd', 'rd'),
			makeEdge(march.id, fragOut.id, 'col', 'color'),
			makeEdge(paramP.id, rot.id, 'p', 'p'),
			makeEdge(rot.id, aff1.id, 'p', 'p'),
			makeEdge(rot.id, aff2.id, 'p', 'p'),
			makeEdge(aff1.id, pick.id, 'p', 'a'),
			makeEdge(aff2.id, pick.id, 'p', 'b'),
			makeEdge(pick.id, sph.id, 'p', 'p'),
			makeEdge(sph.id, sink.id, 'd', 'd'),
		],
	};
}

/** Schlick Fresnel (V·H) → SDF visualize false-color (phase 7F / out lighting). */
/** Lit sphere + time rotation (minimal raymarched scene). */
export function createLitSphereFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 32, y: 160 });
	const ray = createGraphNode('ray_from_uv', pass, { x: 200, y: 160 }, { fov: 58, camZ: 3.2 });
	const march = createGraphNode('raymarch_scene', pass, { x: 420, y: 140 }, {
		maxSteps: 88,
		maxDist: 40,
		ambR: 0.03,
		ambG: 0.04,
		ambB: 0.08,
	});
	const fragOut = createGraphNode('frag_output', pass, { x: 680, y: 160 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 40, y: 380 });
	const rotY = createGraphNode('domain_rotate_euler_time', pass, { x: 240, y: 380 }, {
		tx: 0,
		ty: 0.7,
		tz: 0,
		rx: 0,
		ry: 0,
		rz: 0,
	});
	const sph = createGraphNode('sdf_sphere', pass, { x: 460, y: 380 }, { r: 0.42 });
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 660, y: 380 });

	const nodes = [
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(rotY),
		toFlowNode(sph),
		toFlowNode(sink),
	];
	const edges: Edge[] = [
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),
		makeEdge(paramP.id, rotY.id, 'p', 'p'),
		makeEdge(rotY.id, sph.id, 'p', 'p'),
		makeEdge(sph.id, sink.id, 'd', 'd'),
	];
	return { nodes, edges };
}

/** Box minus sphere (CSG subtract) on one scene branch. */
export function createCsgSubtractFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 32, y: 140 });
	const ray = createGraphNode('ray_from_uv', pass, { x: 200, y: 140 }, { fov: 56, camZ: 3.4 });
	const march = createGraphNode('raymarch_scene', pass, { x: 420, y: 120 }, { maxSteps: 96, maxDist: 48 });
	const fragOut = createGraphNode('frag_output', pass, { x: 680, y: 140 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 40, y: 340 });
	const box = createGraphNode(
		'sdf_box',
		pass,
		{ x: 260, y: 320 },
		{ hx: 0.42, hy: 0.32, hz: 0.38 },
	);
	const sph = createGraphNode('sdf_sphere', pass, { x: 260, y: 420 }, { r: 0.28 });
	const sub = createGraphNode('op_subtract', pass, { x: 480, y: 360 });
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 660, y: 360 });

	const nodes = [
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(box),
		toFlowNode(sph),
		toFlowNode(sub),
		toFlowNode(sink),
	];
	const edges: Edge[] = [
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),
		makeEdge(paramP.id, box.id, 'p', 'p'),
		makeEdge(paramP.id, sph.id, 'p', 'p'),
		makeEdge(box.id, sub.id, 'd', 'a'),
		makeEdge(sph.id, sub.id, 'd', 'b'),
		makeEdge(sub.id, sink.id, 'd', 'd'),
	];
	return { nodes, edges };
}

/** FBM domain warp then sphere SDF. */
export function createDomainFbmSphereFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const pass = 'image' as const;
	const uv = createGraphNode('uv', pass, { x: 32, y: 140 });
	const ray = createGraphNode('ray_from_uv', pass, { x: 200, y: 140 }, { fov: 55, camZ: 3.2 });
	const march = createGraphNode('raymarch_scene', pass, { x: 420, y: 120 }, { maxSteps: 96 });
	const fragOut = createGraphNode('frag_output', pass, { x: 680, y: 140 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 40, y: 360 });
	const warp = createGraphNode('domain_fbm_displace', pass, { x: 240, y: 360 }, { freq: 1.8, amp: 0.14 });
	const sph = createGraphNode('sdf_sphere', pass, { x: 460, y: 360 }, { r: 0.34 });
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

/** Static raymarched still life: bufA = Voronoi → cosine palette (triplanar albedo). Image pass is intentionally heavy (GI, sky bounce, soft shadow, AO, ~100 march steps). **Shade with SDF albedo** defaults Off; turning it Off does not disable GI/sky — lower those toggles or max steps for FPS. */
export function createStillLifeSdfFlow(): { nodes: Node<ShaderNodeData, 'shader'>[]; edges: Edge[] } {
	const passA = 'bufA' as const;
	const pass = 'image' as const;

	const uvA = createGraphNode('uv', passA, { x: 24, y: 48 });
	const domA = createGraphNode('proc2d_domain', passA, { x: 200, y: 48 }, {
		scale: 2.85,
		ox: 0.12,
		oy: -0.08,
		angle: 0.18,
	});
	const voroA = createGraphNode('proc2d_voronoi_f12', passA, { x: 400, y: 48 }, { freq: 6.2, z: 0 });
	const lenA = createGraphNode('proc2d_length', passA, { x: 580, y: 48 }, {});
	const palA = createGraphNode('cosine_palette', passA, { x: 760, y: 48 }, {
		aR: 0.52,
		aG: 0.48,
		aB: 0.55,
		bR: 0.48,
		bG: 0.52,
		bB: 0.45,
		cR: 1.15,
		cG: 1.05,
		cB: 1.12,
		dR: 0.02,
		dG: 0.31,
		dB: 0.58,
	});
	const v4A = createGraphNode('vec4_from_vec3', passA, { x: 960, y: 48 }, { a: 1 });
	const outA = createGraphNode('frag_output', passA, { x: 1160, y: 48 });

	const uv = createGraphNode('uv', pass, { x: 32, y: 120 });
	const ray = createGraphNode('ray_lookat_from_uv', pass, { x: 200, y: 120 }, {
		ex: 1.42,
		ey: 1.05,
		ez: 2.05,
		tx: 0.04,
		ty: -0.28,
		tz: 0,
		ux: 0,
		uy: 1,
		uz: 0,
		fov: 52,
	});
	const march = createGraphNode('raymarch_scene', pass, { x: 420, y: 100 }, {
		maxSteps: 100,
		maxDist: 28,
		eps: 0.001,
		ambR: 0.026,
		ambG: 0.03,
		ambB: 0.036,
		curvAmp: 0.022,
		curvEps: 0.022,
		skyBounceOn: 1,
		skyStr: 0.12,
		skySteps: 12,
		skyBias: 0.03,
		skyMaxT: 32,
		skyTopR: 0.26,
		skyTopG: 0.32,
		skyTopB: 0.44,
		skyBotR: 0.07,
		skyBotG: 0.08,
		skyBotB: 0.11,
		softShadow: 0,
		shadowK: 12,
		shadowMax: 18,
		aoOn: 1,
		aoStep: 0.055,
		aoAmp: 0.17,
		lx: -0.52,
		ly: 0.8,
		lz: 0.38,
		specOn: 1,
		specPow: 58,
		specStr: 0.22,
		palMix: 0,
		surfTexOn: 1,
		surfTexChannel: 0,
		surfTexScale: 0.72,
		surfTexBlend: 0.82,
		surfTexMode: '0',
		giOn: 1,
		giStr: 0.44,
		giRough: 0.48,
		giSteps: 18,
		giMaxDist: 14,
		giBias: 0.022,
		giSecondBounce: 0,
		fogOn: 1,
		fogDensity: 0.032,
		fogR: 0.06,
		fogG: 0.07,
		fogB: 0.1,
	});
	const fragOut = createGraphNode('frag_output', pass, { x: 680, y: 120 });

	const paramP = createGraphNode('sdf_param_p', pass, { x: 40, y: 360 });
	const plane = createGraphNode(
		'sdf_primitive',
		pass,
		{ x: 260, y: 280 },
		{ shape: 'plane', nx: 0, ny: 1, nz: 0, plane_h: 0.4 },
	);

	const trBowl = createGraphNode('domain_translate', pass, { x: 220, y: 380 }, {
		tx: -0.1,
		ty: -0.3,
		tz: 0.1,
	});
	const bowl = createGraphNode(
		'sdf_primitive',
		pass,
		{ x: 400, y: 380 },
		{ shape: 'round_box', hx: 0.2, hy: 0.08, hz: 0.2, round_r: 0.04 },
	);

	const trPear = createGraphNode('domain_translate', pass, { x: 220, y: 480 }, {
		tx: 0.26,
		ty: -0.28,
		tz: 0.06,
	});
	const pear = createGraphNode('sdf_sphere', pass, { x: 400, y: 480 }, { r: 0.11 });

	const trApple = createGraphNode('domain_translate', pass, { x: 220, y: 580 }, {
		tx: 0.42,
		ty: -0.3,
		tz: -0.14,
	});
	const apple = createGraphNode('sdf_sphere', pass, { x: 400, y: 580 }, { r: 0.095 });

	const trBook = createGraphNode('domain_translate', pass, { x: 220, y: 680 }, {
		tx: -0.34,
		ty: -0.37,
		tz: -0.06,
	});
	const book = createGraphNode('sdf_box', pass, { x: 400, y: 680 }, { hx: 0.2, hy: 0.035, hz: 0.26 });

	const smin1 = createGraphNode('smin_float', pass, { x: 540, y: 430 }, { k: 0.055 });
	const smin2 = createGraphNode('smin_float', pass, { x: 660, y: 480 }, { k: 0.05 });
	const smin3 = createGraphNode('smin_float', pass, { x: 780, y: 530 }, { k: 0.045 });
	const uniOb = createGraphNode('op_union', pass, { x: 920, y: 400 });
	const sink = createGraphNode('scene_sdf_sink', pass, { x: 1080, y: 400 });

	const nodes = [
		toFlowNode(uvA),
		toFlowNode(domA),
		toFlowNode(voroA),
		toFlowNode(lenA),
		toFlowNode(palA),
		toFlowNode(v4A),
		toFlowNode(outA),
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(plane),
		toFlowNode(trBowl),
		toFlowNode(bowl),
		toFlowNode(trPear),
		toFlowNode(pear),
		toFlowNode(trApple),
		toFlowNode(apple),
		toFlowNode(trBook),
		toFlowNode(book),
		toFlowNode(smin1),
		toFlowNode(smin2),
		toFlowNode(smin3),
		toFlowNode(uniOb),
		toFlowNode(sink),
	];
	const edges: Edge[] = [
		makeEdge(uvA.id, domA.id, 'uv', 'uv'),
		makeEdge(domA.id, voroA.id, 'out', 'p'),
		makeEdge(voroA.id, lenA.id, 'f12', 'p'),
		makeEdge(lenA.id, palA.id, 'r', 't'),
		makeEdge(palA.id, v4A.id, 'rgb', 'rgb'),
		makeEdge(v4A.id, outA.id, 'col', 'color'),
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),
		makeEdge(paramP.id, plane.id, 'p', 'p'),
		makeEdge(paramP.id, trBowl.id, 'p', 'p'),
		makeEdge(trBowl.id, bowl.id, 'p', 'p'),
		makeEdge(paramP.id, trPear.id, 'p', 'p'),
		makeEdge(trPear.id, pear.id, 'p', 'p'),
		makeEdge(paramP.id, trApple.id, 'p', 'p'),
		makeEdge(trApple.id, apple.id, 'p', 'p'),
		makeEdge(paramP.id, trBook.id, 'p', 'p'),
		makeEdge(trBook.id, book.id, 'p', 'p'),
		makeEdge(bowl.id, smin1.id, 'd', 'a'),
		makeEdge(pear.id, smin1.id, 'd', 'b'),
		makeEdge(smin1.id, smin2.id, 'd', 'a'),
		makeEdge(apple.id, smin2.id, 'd', 'b'),
		makeEdge(smin2.id, smin3.id, 'd', 'a'),
		makeEdge(book.id, smin3.id, 'd', 'b'),
		makeEdge(plane.id, uniOb.id, 'd', 'a'),
		makeEdge(smin3.id, uniOb.id, 'd', 'b'),
		makeEdge(uniOb.id, sink.id, 'd', 'd'),
	];
	return { nodes, edges };
}

export function metaForStillLife(): GraphDocument['meta'] {
	return {
		name: 'still-life-sdf',
		iChannels: {
			image: { 0: 'bufA' },
		},
	};
}

