import type { Edge } from '@xyflow/svelte';
import type { GraphDocument } from '@shadertoy/compiler';
import type { PresetId, PresetGroup } from './presetIds.js';
import type { FlowNodeAny } from './flowDoc.js';
import {
	createAdvancedAtelierNebulaFlow,
	createBufaFractalTexturedRaymarchFlow,
	createChronosLatticeFlow,
	createCsgSubtractFlow,
	createCelticKnotSdfFlow,
	createDomainFbmSphereFlow,
	createFeedbackDemoFlow,
	createFeedbackInkDiffusionFlow,
	createLitSphereFlow,
	createHybridFractalArtifactFlow,
	createPhase7FresnelFlow,
	createPhase7LookatMengerFlow,
	createPhase7PaletteFlow,
	createPhase7VoronoiSphereFlow,
	createProc2dIfsFlow,
	createProc2dMandelbrotFlow,
	createIfsBufaChannelFlow,
	createIfsInversionRingFlow,
	createIfsMin2ChaosFlow,
	createNewtonBasinsDemoFlow,
	createProcedural2dBufferSampleFlow,
	createProcedural2dDualFbmMixFlow,
	createProcedural2dFbmPaletteFlow,
	createProcedural2dRidgedWarpFlow,
	createProcedural2dTiledKaleidVoroFlow,
	createRaymarchSdfFlow,
	createRaymarchSceneSdfRepeatFlow,
	createSdfCathedralFlow,
	createStillLifeSdfFlow,
	createSuesqueSandboxFieldFlow,
	createTorusOctaFeedbackTessFlow,
	createTorusOctaHexTessFlow,
	createSdfIfs3BranchFlow,
	createSdfFullPipelineShowcaseFlow,
	metaForAdvancedAtelierNebula,
	metaForBufaFractalTexturedRaymarch,
	metaForChronosLattice,
	metaForFeedbackDemo,
	metaForFeedbackInkDiffusion,
	metaForHybridFractalArtifact,
	metaForProcedural2dBufferSample,
	metaForSdfCathedral,
	metaForStillLife,
	metaForSuesqueSandboxField,
	metaForSdfFullPipelineShowcase,
} from './presets/index.js';

export type PresetBundle = {
	nodes: FlowNodeAny[];
	edges: Edge[];
	meta: GraphDocument['meta'];
};

function cloneFlow(get: () => { nodes: FlowNodeAny[]; edges: Edge[] }): {
	nodes: FlowNodeAny[];
	edges: Edge[];
} {
	return structuredClone(get());
}

export type PresetCatalogEntry = {
	id: PresetId;
	/** Section heading in the preset dropdown (keep stable for UX ordering). */
	groupLabel: string;
	/** Option text in the dropdown. */
	uiLabel: string;
	load: () => PresetBundle;
};

/** Single source: id, UI labels, group, and loader for every preset. Order matches dropdown. */
export const PRESET_CATALOG: readonly PresetCatalogEntry[] = [
	{
		id: 'advanced_atelier',
		groupLabel: 'Showcase',
		uiLabel: 'Atelier nebula (orbit trap + Julia → bufA, twisted CSG)',
		load: () => {
			const { nodes, edges } = cloneFlow(createAdvancedAtelierNebulaFlow);
			return { nodes, edges, meta: metaForAdvancedAtelierNebula() };
		},
	},
	{
		id: 'chronos_lattice',
		groupLabel: 'Showcase',
		uiLabel: 'Chronos lattice (IFS bufA → ping-pong bufB → hex tess raymarch)',
		load: () => {
			const { nodes, edges } = cloneFlow(createChronosLatticeFlow);
			return { nodes, edges, meta: metaForChronosLattice() };
		},
	},
	{
		id: 'show_ink_diffusion',
		groupLabel: 'Showcase',
		uiLabel: 'Ink diffusion (ping-pong bufA, 3×3 texel stencil, baked animations)',
		load: () => {
			const { nodes, edges } = cloneFlow(createFeedbackInkDiffusionFlow);
			return { nodes, edges, meta: metaForFeedbackInkDiffusion() };
		},
	},
	{
		id: 'show_sdf_cathedral',
		groupLabel: 'Showcase',
		uiLabel: 'Cathedral of repetition (KIFS folds + raymarch scene, baked animations)',
		load: () => {
			const { nodes, edges } = cloneFlow(createSdfCathedralFlow);
			return { nodes, edges, meta: metaForSdfCathedral() };
		},
	},
	{
		id: 'show_fractal_artifact',
		groupLabel: 'Showcase',
		uiLabel: 'Fractal artifact (bufA orbit trap → surface texture raymarch, baked animations)',
		load: () => {
			const { nodes, edges } = cloneFlow(createHybridFractalArtifactFlow);
			return { nodes, edges, meta: metaForHybridFractalArtifact() };
		},
	},
	{
		id: 'show_sdf_full_pipeline',
		groupLabel: 'Showcase',
		uiLabel:
			'SDF power stack (exported warp call + lattice shrine CSG, feedback tess, orbit albedo, raymarch)',
		load: () => {
			const { nodes, edges } = cloneFlow(createSdfFullPipelineShowcaseFlow);
			return { nodes, edges, meta: metaForSdfFullPipelineShowcase() };
		},
	},
	{
		id: 'raymarch',
		groupLabel: 'Starters',
		uiLabel: 'Raymarch + SDF box',
		load: () => {
			const { nodes, edges } = cloneFlow(createRaymarchSdfFlow);
			return { nodes, edges, meta: { name: 'raymarch' } };
		},
	},
	{
		id: 'raymarch_scene_sdf_repeat',
		groupLabel: 'Starters',
		uiLabel: 'Raymarch + scene SDF repeat (row of spheres)',
		load: () => {
			const { nodes, edges } = cloneFlow(createRaymarchSceneSdfRepeatFlow);
			return { nodes, edges, meta: { name: 'raymarch-scene-sdf-repeat' } };
		},
	},
	{
		id: 'lit_sphere',
		groupLabel: 'Starters',
		uiLabel: 'Lit sphere + spin',
		load: () => {
			const { nodes, edges } = cloneFlow(createLitSphereFlow);
			return { nodes, edges, meta: { name: 'starter-lit-sphere' } };
		},
	},
	{
		id: 'still_life',
		groupLabel: 'Starters',
		uiLabel: 'Still life (bufA palette + GI)',
		load: () => {
			const { nodes, edges } = cloneFlow(createStillLifeSdfFlow);
			return { nodes, edges, meta: metaForStillLife() };
		},
	},
	{
		id: 'csg_subtract',
		groupLabel: 'Starters',
		uiLabel: 'CSG: box − sphere',
		load: () => {
			const { nodes, edges } = cloneFlow(createCsgSubtractFlow);
			return { nodes, edges, meta: { name: 'starter-csg-subtract' } };
		},
	},
	{
		id: 'domain_fbm_sphere',
		groupLabel: 'Starters',
		uiLabel: 'FBM warp + sphere',
		load: () => {
			const { nodes, edges } = cloneFlow(createDomainFbmSphereFlow);
			return { nodes, edges, meta: { name: 'starter-domain-fbm-sphere' } };
		},
	},
	{
		id: 'sdf_celtic_knot',
		groupLabel: 'Starters',
		uiLabel: 'Trefoil knot (2,3 torus knot)',
		load: () => {
			const { nodes, edges } = cloneFlow(createCelticKnotSdfFlow);
			return { nodes, edges, meta: { name: 'starter-sdf-trefoil-knot' } };
		},
	},
	{
		id: 'proc2d_fbm',
		groupLabel: '2D procedural',
		uiLabel: 'FBM + cosine palette',
		load: () => {
			const { nodes, edges } = cloneFlow(createProcedural2dFbmPaletteFlow);
			return { nodes, edges, meta: { name: 'proc2d-fbm-palette' } };
		},
	},
	{
		id: 'proc2d_ridged_warp',
		groupLabel: '2D procedural',
		uiLabel: 'Ridged FBM + warp',
		load: () => {
			const { nodes, edges } = cloneFlow(createProcedural2dRidgedWarpFlow);
			return { nodes, edges, meta: { name: 'proc2d-ridged-warp' } };
		},
	},
	{
		id: 'proc2d_kaleid_voro',
		groupLabel: '2D procedural',
		uiLabel: 'Kaleid + Voronoi edge',
		load: () => {
			const { nodes, edges } = cloneFlow(createProcedural2dTiledKaleidVoroFlow);
			return { nodes, edges, meta: { name: 'proc2d-kaleid-voro' } };
		},
	},
	{
		id: 'proc2d_dual_fbm',
		groupLabel: '2D procedural',
		uiLabel: 'Dual FBM mix',
		load: () => {
			const { nodes, edges } = cloneFlow(createProcedural2dDualFbmMixFlow);
			return { nodes, edges, meta: { name: 'proc2d-dual-fbm-mix' } };
		},
	},
	{
		id: 'proc2d_buffer',
		groupLabel: '2D procedural',
		uiLabel: 'Buffer + sample (warp FBM)',
		load: () => {
			const { nodes, edges } = cloneFlow(createProcedural2dBufferSampleFlow);
			return {
				nodes,
				edges,
				meta: { ...metaForProcedural2dBufferSample(), name: 'proc2d-buffer-sample' },
			};
		},
	},
	{
		id: 'proc2d_mandelbrot',
		groupLabel: '2D procedural',
		uiLabel: 'Domain warp → Mandelbrot',
		load: () => {
			const { nodes, edges } = cloneFlow(createProc2dMandelbrotFlow);
			return { nodes, edges, meta: { name: 'proc2d-mandelbrot' } };
		},
	},
	{
		id: 'proc2d_ifs',
		groupLabel: '2D procedural',
		uiLabel: 'Domain → affine IFS chain',
		load: () => {
			const { nodes, edges } = cloneFlow(createProc2dIfsFlow);
			return { nodes, edges, meta: { name: 'proc2d-ifs' } };
		},
	},
	{
		id: 'ifs_min2_chaos',
		groupLabel: 'IFS / Fractal',
		uiLabel: 'Dual affine + pick shorter + fold (chaos-game IFS)',
		load: () => {
			const { nodes, edges } = cloneFlow(createIfsMin2ChaosFlow);
			return { nodes, edges, meta: { name: 'ifs-min2-chaos' } };
		},
	},
	{
		id: 'newton_basins_demo',
		groupLabel: 'IFS / Fractal',
		uiLabel: 'Newton z³−1 + Julia (mixed ramps)',
		load: () => {
			const { nodes, edges } = cloneFlow(createNewtonBasinsDemoFlow);
			return { nodes, edges, meta: { name: 'newton-basins-demo' } };
		},
	},
	{
		id: 'ifs_inversion_ring',
		groupLabel: 'IFS / Fractal',
		uiLabel: 'Circle inversion → IFS → length → ramp',
		load: () => {
			const { nodes, edges } = cloneFlow(createIfsInversionRingFlow);
			return { nodes, edges, meta: { name: 'ifs-inversion-ring' } };
		},
	},
	{
		id: 'ifs_bufa_channel',
		groupLabel: 'IFS / Fractal',
		uiLabel: 'bufA pick+sector IFS → image samples iChannel0',
		load: () => {
			const { nodes, edges, meta } = createIfsBufaChannelFlow();
			return { nodes: structuredClone(nodes), edges: structuredClone(edges), meta };
		},
	},
	{
		id: 'feedback',
		groupLabel: 'Buffers',
		uiLabel: 'Buffer + sample',
		load: () => {
			const { nodes, edges } = cloneFlow(createFeedbackDemoFlow);
			return { nodes, edges, meta: metaForFeedbackDemo() };
		},
	},
	{
		id: 'suesque_sandbox_field',
		groupLabel: 'Buffers',
		uiLabel: 'Suesque field (texel 3×3 + ping-pong bufA)',
		load: () => {
			const { nodes, edges } = cloneFlow(createSuesqueSandboxFieldFlow);
			return { nodes, edges, meta: metaForSuesqueSandboxField() };
		},
	},
	{
		id: 'bufA_fractal_tex_rm',
		groupLabel: 'Buffers',
		uiLabel: 'bufA fractal → textured raymarch',
		load: () => {
			const { nodes, edges } = cloneFlow(createBufaFractalTexturedRaymarchFlow);
			return { nodes, edges, meta: metaForBufaFractalTexturedRaymarch() };
		},
	},
	{
		id: 'p7_lookat_menger',
		groupLabel: 'Advanced · camera & lighting',
		uiLabel: 'Look-at + Menger sponge',
		load: () => {
			const { nodes, edges } = cloneFlow(createPhase7LookatMengerFlow);
			return { nodes, edges, meta: { name: 'phase7-lookat-menger' } };
		},
	},
	{
		id: 'p7_voronoi',
		groupLabel: 'Advanced · camera & lighting',
		uiLabel: 'Voronoi-warped sphere',
		load: () => {
			const { nodes, edges } = cloneFlow(createPhase7VoronoiSphereFlow);
			return { nodes, edges, meta: { name: 'phase7-voronoi-sphere' } };
		},
	},
	{
		id: 'p7_palette',
		groupLabel: 'Advanced · camera & lighting',
		uiLabel: 'Cosine palette from time',
		load: () => {
			const { nodes, edges } = cloneFlow(createPhase7PaletteFlow);
			return { nodes, edges, meta: { name: 'phase7-palette' } };
		},
	},
	{
		id: 'p7_fresnel',
		groupLabel: 'Advanced · camera & lighting',
		uiLabel: 'Schlick Fresnel + SDF false color',
		load: () => {
			const { nodes, edges } = cloneFlow(createPhase7FresnelFlow);
			return { nodes, edges, meta: { name: 'phase7-fresnel' } };
		},
	},
	{
		id: 'p8_torus_octa_hex',
		groupLabel: 'Advanced · motifs',
		uiLabel: 'Torus ∩ octahedron · hex tiling',
		load: () => {
			const { nodes, edges } = cloneFlow(createTorusOctaHexTessFlow);
			return { nodes, edges, meta: { name: 'phase8-torus-octa-hex' } };
		},
	},
	{
		id: 'p8_torus_octa_feedback',
		groupLabel: 'Advanced · motifs',
		uiLabel: 'Torus ∩ octahedron · feedback detail',
		load: () => {
			const { nodes, edges } = cloneFlow(createTorusOctaFeedbackTessFlow);
			return { nodes, edges, meta: { name: 'phase8-torus-octa-feedback' } };
		},
	},
	{
		id: 'sdf_ifs3_branch',
		groupLabel: 'Advanced · motifs',
		uiLabel: 'IFS 3D branch + sphere (pick shorter)',
		load: () => {
			const { nodes, edges } = cloneFlow(createSdfIfs3BranchFlow);
			return { nodes, edges, meta: { name: 'sdf-ifs3-branch-sphere' } };
		},
	},
];

function catalogToPresetGroups(catalog: readonly PresetCatalogEntry[]): PresetGroup[] {
	const order: string[] = [];
	const byGroup = new Map<string, { id: PresetId; label: string }[]>();
	for (const e of catalog) {
		if (!byGroup.has(e.groupLabel)) {
			order.push(e.groupLabel);
			byGroup.set(e.groupLabel, []);
		}
		byGroup.get(e.groupLabel)!.push({ id: e.id, label: e.uiLabel });
	}
	return order.map((label) => ({ label, items: byGroup.get(label)! }));
}

export const PRESET_GROUPS: PresetGroup[] = catalogToPresetGroups(PRESET_CATALOG);

/** Table-driven: built from [PRESET_CATALOG](presetCatalog.ts). */
export const PRESET_LOADERS: Record<PresetId, () => PresetBundle> = Object.fromEntries(
	PRESET_CATALOG.map((e) => [e.id, e.load]),
) as Record<PresetId, () => PresetBundle>;
