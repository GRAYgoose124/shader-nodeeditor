import type { Edge, Node } from '@xyflow/svelte';
import type { GraphDocument } from '@shadertoy/compiler';
import { toFlowNode, type FlowNodeAny, type FrameNodeData } from '../flowDoc.js';
import { createGraphNodeFixedId, makeEdge } from './utils.js';

const FRAME_WARP = 'full_warp_frame';
const EXPORT_FN = 'showcase_warp';

function presetWarpFrame(
	position: { x: number; y: number },
	size: { width: number; height: number },
): Node<FrameNodeData, 'group'> {
	const { width, height } = size;
	return {
		id: FRAME_WARP,
		type: 'group',
		position: { ...position },
		draggable: true,
		dragHandle: '.frame-drag-handle',
		data: {
			label: 'Warp export → showcase_warp(p)',
			collapsed: false,
			width,
			height,
			exportVec3Fn: EXPORT_FN,
		},
		style: `width: ${width}px; height: ${height}px`,
	};
}

/**
 * **Full SDF stack** — **exported warp** (`showcase_warp`: mild swirl + translate) → scene call,
 * **finite lattice** shrine CSG in **repeat space**, **`sdf_tessellate_feedback`** (KIFS with **raw** distance norm for marchable gradients),
 * **KIFS orbit min** → **SDF albedo**. **Look-at** camera + **tetra normals** help the raymarch read a pullback field.
 */
export function createSdfFullPipelineShowcaseFlow(): { nodes: FlowNodeAny[]; edges: Edge[] } {
	const pass = 'image' as const;

	const frameGroup = presetWarpFrame(
		{ x: 900, y: 320 },
		{ width: 440, height: 240 },
	);

	const uv = createGraphNodeFixedId('full_uv', 'uv', pass, { x: 32, y: 120 });
	const ray = createGraphNodeFixedId('full_ray', 'ray_lookat_from_uv', pass, { x: 200, y: 120 }, {
		ex: 2.65,
		ey: 1.05,
		ez: 2.85,
		tx: 0.08,
		ty: 0.15,
		tz: 0.02,
		fov: 46,
	});
	const march = createGraphNodeFixedId('full_march', 'raymarch_scene', pass, { x: 460, y: 100 }, {
		maxSteps: 420,
		maxDist: 100,
		eps: 0.0011,
		distTrust: 0.26,
		stepScale: 0.8,
		relHitEps: 0.00008,
		minStep: 0.001,
		maxStepAbs: 0.11,
		maxStepRelT: 0.048,
		surfaceRecoverOn: '1',
		recoverBand: 12,
		nTetra: 1,
		nEps: 0.00055,
		nEpsRel: 0.06,
		ambR: 0.032,
		ambG: 0.042,
		ambB: 0.072,
		specOn: 1,
		specPow: 52,
		specStr: 0.3,
		softShadow: 1,
		shadowK: 14,
		shadowStart: 0.035,
		fogOn: 1,
		fogDensity: 0.017,
		fogR: 0.035,
		fogG: 0.05,
		fogB: 0.09,
		sdfAlbedoShadeOn: '1',
	});
	const fragOut = createGraphNodeFixedId('full_out', 'frag_output', pass, { x: 740, y: 120 });

	const paramP = createGraphNodeFixedId('full_p', 'sdf_param_p', pass, { x: 32, y: 380 });
	// tx,ty,tz here are **time scales** (rad/s), not angles — non-zero spins the whole SDF every frame
	// and wrecks sphere marching on approximate pullback fields (flashing gray / missed hits).
	const rot = createGraphNodeFixedId('full_rot', 'domain_rotate_euler_time', pass, { x: 180, y: 380 }, {
		tx: 0,
		ty: 0,
		tz: 0,
		rx: 0,
		ry: 0.2,
		rz: 0,
	});
	/** Parallel camera transform for orbit scalar (must not share `warpCall` — motif pullback reachability). */
	const rotOrb = createGraphNodeFixedId('full_rot_o', 'domain_rotate_euler_time', pass, { x: 180, y: 520 }, {
		tx: 0,
		ty: 0,
		tz: 0,
		rx: 0,
		ry: 0.2,
		rz: 0,
	});
	const warpCallOrb = createGraphNodeFixedId(
		'full_warp_o',
		'domain_call_exported_vec3',
		pass,
		{ x: 1380, y: 520 },
		{ fnBase: EXPORT_FN },
	);
	/** Apollonian-style warp inside the export frame (boundary in → swirl → translate → out). */
	const frSwirl = {
		...createGraphNodeFixedId('full_w_swirl', 'domain_variation_swirl', pass, { x: 980, y: 360 }, {
			k: 0.075,
		}),
		parentId: FRAME_WARP,
	};
	const frTr = {
		...createGraphNodeFixedId(
			'full_fr_tr',
			'domain_translate',
			pass,
			{ x: 1020, y: 400 },
			{ tx: 0.052, ty: -0.03, tz: 0.028 },
		),
		parentId: FRAME_WARP,
	};

	// --- Shrine lattice macro sculpture (architectural ribs + mechanical bores) ---
	/** `domain_call_exported_vec3` is wired **frame out → call** for the export contract; the compiler passes the frame **boundary in** expr into `showcase_warp` so the warp is applied once. */
	const warpCall = createGraphNodeFixedId(
		'full_warp_call',
		'domain_call_exported_vec3',
		pass,
		{ x: 1380, y: 380 },
		{ fnBase: EXPORT_FN },
	);
	const rep = createGraphNodeFixedId('full_rep', 'domain_repeat_limited_xyz', pass, { x: 1580, y: 380 }, {
		cx: 1.32,
		cy: 1.12,
		cz: 1.32,
		lx: 1,
		ly: 2,
		lz: 1,
	});
	/** Same repeat as `full_rep`; fed from **`full_warp_o`** so the KIFS metric stays in lattice space without motif fan-out violations. */
	const repOrb = createGraphNodeFixedId('full_rep_orb', 'domain_repeat_limited_xyz', pass, { x: 1580, y: 520 }, {
		cx: 1.32,
		cy: 1.12,
		cz: 1.32,
		lx: 1,
		ly: 2,
		lz: 1,
	});

	// Pillar frame: 4 corner posts + cross-beams so the macro silhouette isn't “one box”.
	const pTr0 = createGraphNodeFixedId('full_pil_tr0', 'domain_translate', pass, { x: 1600, y: 140 }, {
		tx: 0.42,
		ty: 0.0,
		tz: 0.42,
	});
	const pTr1 = createGraphNodeFixedId('full_pil_tr1', 'domain_translate', pass, { x: 1600, y: 220 }, {
		tx: -0.42,
		ty: 0.0,
		tz: 0.42,
	});
	const pTr2 = createGraphNodeFixedId('full_pil_tr2', 'domain_translate', pass, { x: 1600, y: 300 }, {
		tx: 0.42,
		ty: 0.0,
		tz: -0.42,
	});
	const pTr3 = createGraphNodeFixedId('full_pil_tr3', 'domain_translate', pass, { x: 1600, y: 380 }, {
		tx: -0.42,
		ty: 0.0,
		tz: -0.42,
	});
	const pillar0 = createGraphNodeFixedId('full_pil0', 'sdf_capsule_y', pass, { x: 1760, y: 140 }, { r: 0.06, h: 0.52 });
	const pillar1 = createGraphNodeFixedId('full_pil1', 'sdf_capsule_y', pass, { x: 1760, y: 220 }, { r: 0.06, h: 0.52 });
	const pillar2 = createGraphNodeFixedId('full_pil2', 'sdf_capsule_y', pass, { x: 1760, y: 300 }, { r: 0.06, h: 0.52 });
	const pillar3 = createGraphNodeFixedId('full_pil3', 'sdf_capsule_y', pass, { x: 1760, y: 380 }, { r: 0.06, h: 0.52 });
	const pillarU0 = createGraphNodeFixedId('full_pil_u0', 'smin_float', pass, { x: 1960, y: 200 }, { k: 0.09 });
	const pillarU1 = createGraphNodeFixedId('full_pil_u1', 'smin_float', pass, { x: 2140, y: 240 }, { k: 0.09 });
	const pillarU2 = createGraphNodeFixedId('full_pil_u2', 'smin_float', pass, { x: 2320, y: 280 }, { k: 0.09 });

	const beamX = createGraphNodeFixedId('full_beam_x', 'sdf_box', pass, { x: 1760, y: 460 }, { hx: 0.56, hy: 0.05, hz: 0.09 });
	const beamZ = createGraphNodeFixedId('full_beam_z', 'sdf_box', pass, { x: 1760, y: 520 }, { hx: 0.09, hy: 0.05, hz: 0.56 });
	const beamU = createGraphNodeFixedId('full_beam_u', 'smin_float', pass, { x: 1960, y: 500 }, { k: 0.1 });

	const ribCapsule = createGraphNodeFixedId('full_rib_cap', 'sdf_capsule_y', pass, { x: 1760, y: 260 }, {
		r: 0.065,
		h: 0.48,
	});
	const ribFlange = createGraphNodeFixedId('full_rib_flange', 'sdf_box', pass, { x: 1760, y: 420 }, {
		hx: 0.26,
		hy: 0.06,
		hz: 0.26,
	});
	const ribFlangeRound = createGraphNodeFixedId('full_rib_round', 'op_round_d', pass, { x: 1940, y: 420 }, {
		rad: 0.045,
	});
	const ribCollar = createGraphNodeFixedId('full_rib_ring', 'sdf_torus', pass, { x: 1760, y: 560 }, {
		R: 0.26,
		r: 0.038,
	});
	const ribUnion0 = createGraphNodeFixedId('full_rib_u0', 'smin_float', pass, { x: 2140, y: 320 }, { k: 0.1 });
	const ribUnion1 = createGraphNodeFixedId('full_rib_u1', 'smin_float', pass, { x: 2320, y: 420 }, { k: 0.1 });

	// Combine the pillar frame with the rib “hardware”.
	const structU0 = createGraphNodeFixedId('full_struct_u0', 'smin_float', pass, { x: 2500, y: 360 }, { k: 0.12 });
	const structU1 = createGraphNodeFixedId('full_struct_u1', 'smin_float', pass, { x: 2680, y: 420 }, { k: 0.12 });
	// Central lantern stack (reads as a stupa / reliquary spine inside each repeated cell).
	const lanternShaft = createGraphNodeFixedId('full_lan_shaft', 'sdf_capsule_y', pass, { x: 2680, y: 180 }, {
		r: 0.048,
		h: 0.58,
	});
	const lanternHalo = createGraphNodeFixedId('full_lan_halo', 'sdf_torus', pass, { x: 2680, y: 240 }, {
		R: 0.2,
		r: 0.022,
	});
	const lanternU = createGraphNodeFixedId('full_lan_u', 'smin_float', pass, { x: 2860, y: 210 }, { k: 0.08 });
	const structCore = createGraphNodeFixedId('full_struct_core', 'smin_float', pass, { x: 2860, y: 380 }, {
		k: 0.1,
	});

	// Macro mechanical + shrine cuts: make negative space obvious before any bounding.
	const boreCyl = createGraphNodeFixedId('full_bore_cyl', 'sdf_cylinder_y', pass, { x: 2140, y: 660 }, { r: 0.12 });
	const boreRing = createGraphNodeFixedId('full_bore_ring', 'sdf_torus', pass, { x: 2140, y: 760 }, { R: 0.26, r: 0.02 });
	const cut0 = createGraphNodeFixedId('full_cut0', 'smin_smooth_sub_float', pass, { x: 3040, y: 520 }, { k: 0.12 });
	const cut1 = createGraphNodeFixedId('full_cut1', 'smin_smooth_sub_float', pass, { x: 3220, y: 600 }, { k: 0.12 });

	const winTrF = createGraphNodeFixedId('full_win_tr_f', 'domain_translate', pass, { x: 2500, y: 640 }, {
		tx: 0.0,
		ty: 0.0,
		tz: 0.5,
	});
	const winTrB = createGraphNodeFixedId('full_win_tr_b', 'domain_translate', pass, { x: 2500, y: 720 }, {
		tx: 0.0,
		ty: 0.0,
		tz: -0.5,
	});
	const winBoxF = createGraphNodeFixedId('full_win_box_f', 'sdf_box', pass, { x: 2680, y: 660 }, { hx: 0.34, hy: 0.26, hz: 0.09 });
	const winBoxB = createGraphNodeFixedId('full_win_box_b', 'sdf_box', pass, { x: 2680, y: 720 }, { hx: 0.34, hy: 0.26, hz: 0.09 });
	const winU = createGraphNodeFixedId('full_win_u', 'smin_float', pass, { x: 2860, y: 700 }, { k: 0.08 });
	const cutWin = createGraphNodeFixedId('full_cut_win', 'smin_smooth_sub_float', pass, { x: 3400, y: 680 }, { k: 0.1 });
	// Keep this macro SDF solid (not onion shell) for stable raymarch hits.

	// Micro motif: repeated bolt holes / rivets inside each cell for fine detail.
	const microRep = createGraphNodeFixedId('full_micro_rep', 'domain_repeat_xyz', pass, { x: 2500, y: 700 }, {
		cx: 0.36,
		cy: 0.3,
		cz: 0.36,
	});
	const microHole = createGraphNodeFixedId('full_micro_hole', 'sdf_sphere', pass, { x: 2680, y: 720 }, { r: 0.045 });
	const microSub = createGraphNodeFixedId('full_micro_sub', 'smin_smooth_sub_float', pass, { x: 2860, y: 720 }, { k: 0.06 });

	// Macro voids in **repeat space** (same `p` as pillars / cuts) so CSG is coherent.
	const voidCenter = createGraphNodeFixedId('full_void_center', 'sdf_sphere', pass, { x: 2500, y: 840 }, { r: 0.48 });
	const voidCenterSub = createGraphNodeFixedId('full_void_sub0', 'smin_smooth_sub_float', pass, { x: 2860, y: 840 }, { k: 0.16 });
	const voidBore = createGraphNodeFixedId('full_void_bore', 'sdf_cylinder_y', pass, { x: 2500, y: 980 }, { r: 0.2 });
	const voidBoreSub = createGraphNodeFixedId('full_void_sub1', 'smin_smooth_sub_float', pass, { x: 3040, y: 900 }, { k: 0.12 });

	// Rounded shrine hull: clips stray lattice arms into one jewel-like silhouette (still reads as architecture).
	const hullBox = createGraphNodeFixedId('full_hull_box', 'sdf_box', pass, { x: 3180, y: 820 }, {
		hx: 0.92,
		hy: 1.05,
		hz: 0.92,
	});
	const hullRound = createGraphNodeFixedId('full_hull_round', 'op_round_d', pass, { x: 3360, y: 820 }, { rad: 0.14 });
	const hullClip = createGraphNodeFixedId('full_hull_clip', 'smax_float', pass, { x: 3540, y: 860 }, { k: 0.1 });

	/** Thin FBM on the shell distance before tessellation — keeps `amp` small so sphere marching stays stable. */
	const shellFbm = createGraphNodeFixedId('full_shell_fbm', 'sdf_fbm_offset', pass, { x: 3680, y: 900 }, {
		freq: 2.35,
		lac: 2.02,
		gain: 0.48,
		amp: 0.02,
		tsx: 0,
		tsy: 0,
		tsz: 0,
	});

	const fb = createGraphNodeFixedId('full_fb', 'sdf_tessellate_feedback', pass, { x: 2160, y: 880 }, {
		loopMode: 'kifs',
		combineMode: 'min',
		distanceNorm: 'raw',
		foldOx: 0.18,
		foldOy: 0.18,
		foldOz: 0.18,
		scale: 1.4,
		iters: 2,
	});

	// Orbit metric in repeat space so flame bands wrap the same geometry the ray hits.
	const orb = createGraphNodeFixedId('full_orb', 'domain_kifs_orbit_min', pass, { x: 1980, y: 580 }, {
		ox: 0.2,
		oy: 0.18,
		oz: 0.2,
		scale: 1.42,
		iters: 5,
	});
	const alb = createGraphNodeFixedId('full_alb', 'sdf_albedo_scalar_mix', pass, { x: 2340, y: 400 }, {
		e0: 0.1,
		e1: 0.92,
		r0: 0.04,
		g0: 0.06,
		b0: 0.14,
		r1: 0.55,
		g1: 0.82,
		b1: 0.78,
	});
	const sink = createGraphNodeFixedId('full_sink', 'scene_sdf_sink', pass, { x: 2520, y: 400 });

	const nodes: FlowNodeAny[] = [
		frameGroup,
		toFlowNode(uv),
		toFlowNode(ray),
		toFlowNode(march),
		toFlowNode(fragOut),
		toFlowNode(paramP),
		toFlowNode(rot),
		toFlowNode(rotOrb),
		toFlowNode(warpCallOrb),
		toFlowNode(frSwirl),
		toFlowNode(frTr),
		toFlowNode(warpCall),
		toFlowNode(rep),
		toFlowNode(repOrb),
		toFlowNode(pTr0),
		toFlowNode(pTr1),
		toFlowNode(pTr2),
		toFlowNode(pTr3),
		toFlowNode(pillar0),
		toFlowNode(pillar1),
		toFlowNode(pillar2),
		toFlowNode(pillar3),
		toFlowNode(pillarU0),
		toFlowNode(pillarU1),
		toFlowNode(pillarU2),
		toFlowNode(beamX),
		toFlowNode(beamZ),
		toFlowNode(beamU),
		toFlowNode(ribCapsule),
		toFlowNode(ribFlange),
		toFlowNode(ribFlangeRound),
		toFlowNode(ribCollar),
		toFlowNode(ribUnion0),
		toFlowNode(ribUnion1),
		toFlowNode(structU0),
		toFlowNode(structU1),
		toFlowNode(lanternShaft),
		toFlowNode(lanternHalo),
		toFlowNode(lanternU),
		toFlowNode(structCore),
		toFlowNode(boreCyl),
		toFlowNode(boreRing),
		toFlowNode(cut0),
		toFlowNode(cut1),
		toFlowNode(winTrF),
		toFlowNode(winTrB),
		toFlowNode(winBoxF),
		toFlowNode(winBoxB),
		toFlowNode(winU),
		toFlowNode(cutWin),
		toFlowNode(microRep),
		toFlowNode(microHole),
		toFlowNode(microSub),
		toFlowNode(voidCenter),
		toFlowNode(voidCenterSub),
		toFlowNode(voidBore),
		toFlowNode(voidBoreSub),
		toFlowNode(hullBox),
		toFlowNode(hullRound),
		toFlowNode(hullClip),
		toFlowNode(shellFbm),
		toFlowNode(fb),
		toFlowNode(orb),
		toFlowNode(alb),
		toFlowNode(sink),
	];

	const edges: Edge[] = [
		makeEdge(uv.id, ray.id, 'uv', 'uv'),
		makeEdge(ray.id, march.id, 'ro', 'ro'),
		makeEdge(ray.id, march.id, 'rd', 'rd'),
		makeEdge(march.id, fragOut.id, 'col', 'color'),

		makeEdge(paramP.id, rot.id, 'p', 'p'),
		makeEdge(paramP.id, rotOrb.id, 'p', 'p'),
		makeEdge(rotOrb.id, warpCallOrb.id, 'p', 'p'),
		makeEdge(rot.id, frSwirl.id, 'p', 'p'),
		makeEdge(frSwirl.id, frTr.id, 'p', 'p'),
		makeEdge(frTr.id, warpCall.id, 'p', 'p'),
		makeEdge(warpCall.id, rep.id, 'p', 'p'),
		makeEdge(warpCallOrb.id, repOrb.id, 'p', 'p'),

		makeEdge(rep.id, pTr0.id, 'p', 'p'),
		makeEdge(rep.id, pTr1.id, 'p', 'p'),
		makeEdge(rep.id, pTr2.id, 'p', 'p'),
		makeEdge(rep.id, pTr3.id, 'p', 'p'),
		makeEdge(pTr0.id, pillar0.id, 'p', 'p'),
		makeEdge(pTr1.id, pillar1.id, 'p', 'p'),
		makeEdge(pTr2.id, pillar2.id, 'p', 'p'),
		makeEdge(pTr3.id, pillar3.id, 'p', 'p'),
		makeEdge(pillar0.id, pillarU0.id, 'd', 'a'),
		makeEdge(pillar1.id, pillarU0.id, 'd', 'b'),
		makeEdge(pillarU0.id, pillarU1.id, 'd', 'a'),
		makeEdge(pillar2.id, pillarU1.id, 'd', 'b'),
		makeEdge(pillarU1.id, pillarU2.id, 'd', 'a'),
		makeEdge(pillar3.id, pillarU2.id, 'd', 'b'),

		makeEdge(rep.id, beamX.id, 'p', 'p'),
		makeEdge(rep.id, beamZ.id, 'p', 'p'),
		makeEdge(beamX.id, beamU.id, 'd', 'a'),
		makeEdge(beamZ.id, beamU.id, 'd', 'b'),

		makeEdge(rep.id, ribCapsule.id, 'p', 'p'),
		makeEdge(rep.id, ribFlange.id, 'p', 'p'),
		makeEdge(ribFlange.id, ribFlangeRound.id, 'd', 'd'),
		makeEdge(rep.id, ribCollar.id, 'p', 'p'),
		makeEdge(ribCapsule.id, ribUnion0.id, 'd', 'a'),
		makeEdge(ribFlangeRound.id, ribUnion0.id, 'd', 'b'),
		makeEdge(ribUnion0.id, ribUnion1.id, 'd', 'a'),
		makeEdge(ribCollar.id, ribUnion1.id, 'd', 'b'),

		makeEdge(rep.id, boreCyl.id, 'p', 'p'),
		makeEdge(rep.id, boreRing.id, 'p', 'p'),
		makeEdge(pillarU2.id, structU0.id, 'd', 'a'),
		makeEdge(beamU.id, structU0.id, 'd', 'b'),
		makeEdge(structU0.id, structU1.id, 'd', 'a'),
		makeEdge(ribUnion1.id, structU1.id, 'd', 'b'),
		makeEdge(rep.id, lanternShaft.id, 'p', 'p'),
		makeEdge(rep.id, lanternHalo.id, 'p', 'p'),
		makeEdge(lanternShaft.id, lanternU.id, 'd', 'a'),
		makeEdge(lanternHalo.id, lanternU.id, 'd', 'b'),
		makeEdge(structU1.id, structCore.id, 'd', 'a'),
		makeEdge(lanternU.id, structCore.id, 'd', 'b'),

		makeEdge(structCore.id, cut0.id, 'd', 'a'),
		makeEdge(boreCyl.id, cut0.id, 'd', 'b'),
		makeEdge(cut0.id, cut1.id, 'd', 'a'),
		makeEdge(boreRing.id, cut1.id, 'd', 'b'),

		makeEdge(rep.id, winTrF.id, 'p', 'p'),
		makeEdge(rep.id, winTrB.id, 'p', 'p'),
		makeEdge(winTrF.id, winBoxF.id, 'p', 'p'),
		makeEdge(winTrB.id, winBoxB.id, 'p', 'p'),
		makeEdge(winBoxF.id, winU.id, 'd', 'a'),
		makeEdge(winBoxB.id, winU.id, 'd', 'b'),
		makeEdge(cut1.id, cutWin.id, 'd', 'a'),
		makeEdge(winU.id, cutWin.id, 'd', 'b'),

		makeEdge(rep.id, microRep.id, 'p', 'p'),
		makeEdge(microRep.id, microHole.id, 'p', 'p'),
		makeEdge(cutWin.id, microSub.id, 'd', 'a'),
		makeEdge(microHole.id, microSub.id, 'd', 'b'),

		makeEdge(rep.id, voidCenter.id, 'p', 'p'),
		makeEdge(microSub.id, voidCenterSub.id, 'd', 'a'),
		makeEdge(voidCenter.id, voidCenterSub.id, 'd', 'b'),
		makeEdge(rep.id, voidBore.id, 'p', 'p'),
		makeEdge(voidCenterSub.id, voidBoreSub.id, 'd', 'a'),
		makeEdge(voidBore.id, voidBoreSub.id, 'd', 'b'),

		makeEdge(rep.id, hullBox.id, 'p', 'p'),
		makeEdge(hullBox.id, hullRound.id, 'd', 'd'),
		makeEdge(voidBoreSub.id, hullClip.id, 'd', 'a'),
		makeEdge(hullRound.id, hullClip.id, 'd', 'b'),

		makeEdge(rep.id, shellFbm.id, 'p', 'p'),
		makeEdge(hullClip.id, shellFbm.id, 'd', 'd'),
		makeEdge(shellFbm.id, fb.id, 'd', 'd'),
		makeEdge(fb.id, alb.id, 'd', 'd'),
		makeEdge(repOrb.id, orb.id, 'p', 'p'),
		makeEdge(orb.id, alb.id, 'm', 'h'),
		makeEdge(alb.id, sink.id, 'd', 'd'),
	];

	return { nodes, edges };
}

export function metaForSdfFullPipelineShowcase(): GraphDocument['meta'] {
	// No param animations: time-varying domain + approximate pullback SDF → unstable hits / flashing gray.
	return {
		name: 'showcase-sdf-full-pipeline',
		editor: { paramAnimations: {} },
	};
}
