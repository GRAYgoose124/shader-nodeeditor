/** GLSL types supported for ports and params */
export type GlslType = 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'sampler2D' | 'int';

/** Runtime uniform vs compile-time literal in generated shader */
export type ParamBinding = 'uniform' | 'literal';

export interface PortDef {
	id: string;
	type: GlslType;
	label?: string;
	/**
	 * Inside `sdf_tessellate_feedback` motif codegen, a direct `sdf_param_p → p` wire normally uses the
	 * fold coordinate `q`. Set `world` so this input uses scene `p` on every `motif(q, pScene)` call (KIFS
	 * won't re-fold the cage). Default: folded behavior (omit = folded).
	 */
	motifSampling?: 'folded' | 'world';
}

export interface ParamChoice {
	value: string;
	label: string;
}

/**
 * When set, inspector hides this param unless `node.data[paramId]` matches.
 * Use `values` for string literal enums; `numericEquals` for numeric toggles (missing/non-number → 0).
 */
export interface ParamVisibleWhen {
	paramId: string;
	values?: string[];
	numericEquals?: number[];
}

export interface ParamDef {
	id: string;
	label?: string;
	glslType: GlslType;
	default: number | string | [number, number] | [number, number, number] | [number, number, number, number];
	min?: number;
	max?: number;
	step?: number;
	binding: ParamBinding;
	/** String enum for the inspector; compile-time when `binding` is `literal`. */
	choices?: ParamChoice[];
	/** Contextual visibility (e.g. sdf_primitive shape). */
	visibleWhen?: ParamVisibleWhen;
}

export type NodeCodegenKind = 'template' | 'glsl_expr';

/**
 * Node type definition: template uses placeholders:
 * - {{nodeId}} — raw graph node id (for comments)
 * - {{out:portId}} — generated GLSL identifier for that output
 * - {{in:portId}} — expression wired from upstream (must be connected)
 * - {{param:paramId}} — literal substituted, or uniform name if binding uniform
 * - {{uniform:paramId}} — always the uniform identifier (for declarations)
 *
 * `glsl_expr`: `template` should contain `{{body}}`. `GraphNode.data.expression` is a string
 * where `{{in:portId}}` is replaced with the wired expression (disconnected ports → `0.`).
 */
export interface NodeTypeDef {
	id: string;
	label: string;
	category?: string;
	/** Short help for the inspector */
	description?: string;
	/** Optional link to docs or reference */
	docUrl?: string;
	inputs: PortDef[];
	outputs: PortDef[];
	params: ParamDef[];
	/** Param ids (`binding: 'uniform'`, scalar) to show as compact controls on the graph node in the editor. */
	canvasParams?: string[];
	template: string;
	codegenKind?: NodeCodegenKind;
}

/** Shadertoy-style buffer pass */
export type BufferId = 'image' | 'bufA' | 'bufB' | 'bufC' | 'bufD';

export interface GraphNode {
	id: string;
	typeId: string;
	/** Which pass this node belongs to */
	pass: BufferId;
	position: { x: number; y: number };
	data: Record<string, unknown>;
	/** Optional XYFlow group frame id (editor-only; ignored by compile) */
	parentId?: string;
}

/** Boundary port on a collapsed frame (subgraph I/O contract metadata). */
export interface GraphEditorBoundaryPort {
	kind: 'in' | 'out';
	nodeId: string;
	handleId: string;
}

/** How a slider value oscillates over shader time when `paramAnimations` is enabled. */
export type ParamAnimationCurve = 'sine' | 'triangle' | 'saw' | 'smooth';

/**
 * Per-parameter animation driven in the preview/export runner from `iTime`.
 * Keys: {@link paramAnimKey} in `paramAnimation.ts`.
 */
export interface ParamAnimationSpec {
	nodeId: string;
	paramId: string;
	curve: ParamAnimationCurve;
	/** Cycles per second (applied to phase before shaping). */
	speed: number;
	/** Seconds added to shader time before evaluation. */
	phase: number;
	/**
	 * 0 = no motion (stays at slider); 1 = use full param range around the slider value.
	 * Ignored when {@link range} is set (finite).
	 */
	depth: number;
	/**
	 * Peak-to-peak amplitude in parameter units (wave maps 0…1 to center − range/2 … center + range/2).
	 * When omitted or non-finite, amplitude is `depth * (max − min)` from the param def.
	 */
	range?: number;
	/** Added after the wave, before clamping to the param min/max. */
	offset?: number;
}

/** Visual group frame persisted in graph meta (editor-only). */
export interface GraphEditorFrame {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	label?: string;
	collapsed?: boolean;
	/**
	 * Ports where edges cross the frame boundary; persisted when the frame is collapsed.
	 * Used for validation and future named-subgraph codegen (compile still inlines interior nodes today).
	 */
	boundaryPorts?: GraphEditorBoundaryPort[];
}

export interface GraphEdge {
	id: string;
	source: string;
	sourceHandle: string;
	target: string;
	targetHandle: string;
}

export interface GraphMeta {
	name?: string;
	/** Execution order for passes that exist (default: bufA, bufB, bufC, bufD, image) */
	passOrder?: BufferId[];
	/**
	 * For each pass, which buffer feeds iChannel0..3 (previous frame / resolved ping-pong).
	 * Omitted channels are not sampled (runner may bind a black 1×1 texture).
	 */
	iChannels?: Partial<Record<BufferId, Partial<Record<0 | 1 | 2 | 3, BufferId>>>>;
	/** Editor-only layout (frames); not used by compileGraph */
	editor?: {
		frames?: GraphEditorFrame[];
		/** Saved snapshots of uniform values (by GLSL uniform name) for live performance / exploration */
		uniformPresets?: GraphUniformPreset[];
		/**
		 * Time-driven float params (literal → uniform while present). Keys: `paramAnimKey(nodeId, paramId)`.
		 */
		paramAnimations?: Record<string, ParamAnimationSpec>;
	};
}

/** Scalar uniform snapshot (float / int stored as number; first component only for vectors in MVP). */
export interface GraphUniformPreset {
	name: string;
	values: Record<string, number>;
}

export interface GraphDocument {
	version: 1;
	meta: GraphMeta;
	nodes: GraphNode[];
	edges: GraphEdge[];
	viewport?: { x: number; y: number; zoom: number };
	/** Extra node types shipped with the graph (custom nodes) */
	customNodeTypes?: NodeTypeDef[];
}

/** Uniform entry for runner / UI */
export interface UniformManifestEntry {
	/** Full GLSL uniform name */
	name: string;
	type: GlslType;
	nodeId: string;
	paramId: string;
	default: number | number[];
	min?: number;
	max?: number;
	step?: number;
	label?: string;
	/** Preview applies a curve from `meta.editor.paramAnimations` each frame. */
	driver?: 'paramAnimation';
}

export interface PassManifest {
	id: BufferId;
	/** iChannelN → buffer id that was rendered last frame */
	channels: Partial<Record<`iChannel${0 | 1 | 2 | 3}`, BufferId>>;
	/** This pass reads from a buffer that is written in the same pass (needs ping-pong) */
	pingPong: boolean;
	uniforms: UniformManifestEntry[];
}

export interface CompileResult {
	errors: string[];
	passes: Partial<
		Record<
			BufferId,
			{
				fragmentSource: string;
				vertexSource: string;
			}
		>
	>;
	manifest: {
		passes: PassManifest[];
		globalUniforms: { name: string; type: GlslType }[];
	};
}

export const DEFAULT_PASS_ORDER: BufferId[] = ['bufA', 'bufB', 'bufC', 'bufD', 'image'];
