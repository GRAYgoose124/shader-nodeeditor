/** GLSL types supported for ports and params */
export type GlslType = 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'sampler2D' | 'int';

/** Runtime uniform vs compile-time literal in generated shader */
export type ParamBinding = 'uniform' | 'literal';

export interface PortDef {
	id: string;
	type: GlslType;
	label?: string;
	/**
	 * Inside `sdf_tessellate_feedback` / `sdf_iterate_pullback` motif codegen, a direct `sdf_param_p → p` wire normally uses the
	 * fold coordinate `q`. Set `world` so this input uses scene `p` on every `motif(q, pScene)` call (KIFS
	 * won't re-fold the cage). Default: folded behavior (omit = folded).
	 */
	motifSampling?: 'folded' | 'world';
	/** When true, the port need not be wired. */
	optional?: boolean;
	/** Param id this optional float input overrides when wired and not bypassed (`paramWire__*` handle ids). */
	paramWireFor?: string;
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
	 * Used for validation and named `vec3` scene exports when {@link exportVec3Fn} is set.
	 */
	boundaryPorts?: GraphEditorBoundaryPort[];
	/**
	 * When non-empty, compiler emits `vec3 <sanitized_name>(vec3 p)` from this frame's interior (same pass as child nodes).
	 * Requires exactly one boundary **in** and one **out**, both `vec3`, and interior contained in the scene SDF reach set.
	 */
	exportVec3Fn?: string;
	/**
	 * When non-empty, compiler emits `float <sanitized_name>(vec3 p)` from this frame's interior.
	 * Requires exactly one boundary **in** (`vec3` **p**). Either one boundary **out** (`float` **d**) or no out crossing and a terminal interior node with float output **d**. Mutually exclusive with {@link exportVec3Fn} on the same frame.
	 */
	exportSdfFn?: string;
}

export interface GraphEdge {
	id: string;
	source: string;
	sourceHandle: string;
	target: string;
	targetHandle: string;
}

/** External media source referenced by `meta.iChannels` (image / video texture or audio analysis). */
export interface GraphMediaInput {
	id: string;
	kind: 'image' | 'video' | 'audio';
	label?: string;
	/** Best-effort file name hint for rebind after import */
	fileName?: string;
}

/**
 * Per-slot iChannel binding: sample another buffer pass, or an external media id.
 * Legacy JSON used bare `BufferId` strings only.
 */
export type IChannelSlotBinding = BufferId | { media: string };

/** Resolved at compile time for the runner */
export type ChannelBindingResolved =
	| { kind: 'buffer'; bufferId: BufferId }
	| { kind: 'media'; mediaId: string };

export interface GraphMeta {
	name?: string;
	/** Catalog of user media inputs (files); referenced from {@link iChannels} via `{ media: id }` */
	mediaInputs?: GraphMediaInput[];
	/** Execution order for passes that exist (default: bufA, bufB, bufC, bufD, image) */
	passOrder?: BufferId[];
	/**
	 * Run a buffer pass N times per displayed frame (draw + ping-pong flip each time).
	 * Required for correct multi-step reaction–diffusion; see ARCHITECTURE.md.
	 * Overridden by `feedback_pass_substeps` node when present on that pass.
	 */
	passSubsteps?: Partial<Record<BufferId, number>>;
	/**
	 * For each pass, which buffer or external media feeds iChannel0..3 (previous frame / resolved ping-pong).
	 * Use a bare {@link BufferId} string for buffer sampling, or `{ media: "<GraphMediaInput.id>" }` for uploads.
	 * Omitted channels are not sampled (runner may bind a black 1×1 texture).
	 */
	iChannels?: Partial<Record<BufferId, Partial<Record<0 | 1 | 2 | 3, IChannelSlotBinding>>>>;
	/** Editor-only layout (frames); not used by compileGraph */
	editor?: {
		frames?: GraphEditorFrame[];
		/**
		 * When set (e.g. after loading a built-in preset), the editor may save the main preview’s first
		 * post-compile frame as that preset’s library thumbnail. Editor-only.
		 */
		builtinPresetGalleryId?: string;
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

/** Optional compile-time debug hooks (editor / tooling). */
export type SceneSdfProbeVisualization = 'distance_rgb' | 'distance_nan_flags' | 'gradient_mag';

export interface CompileDebugOptions {
	/**
	 * When set, this pass's fragment shader prepends an early-out that visualizes `scene_sdf_<pass>(u_dbg_scene_p)`.
	 * Only applied if the pass actually emits a scene SDF (scene sink present).
	 */
	sceneSdfProbe?: {
		pass: BufferId;
		visualization: SceneSdfProbeVisualization;
	};
	/**
	 * Appends a tail that overwrites `fragColor` when `u_dbg_wire_on` is set, using the first
	 * displayable incoming wire to `targetNodeId` (main graph only; skips `mat4` / `sampler2D`).
	 */
	wireProbe?: {
		pass: BufferId;
		targetNodeId: string;
	};
}

export interface PassManifest {
	id: BufferId;
	/** iChannelN → buffer pass or external media id */
	channels: Partial<Record<`iChannel${0 | 1 | 2 | 3}`, ChannelBindingResolved>>;
	/** This pass reads from a buffer that was written in the same pass (needs ping-pong) */
	pingPong: boolean;
	/** Buffer draws per displayed frame (default 1); image pass always 1 */
	substeps: number;
	uniforms: UniformManifestEntry[];
	/** True when {@link CompileDebugOptions.sceneSdfProbe} was applied to this pass. */
	supportsSceneSdfProbe?: boolean;
	/** True when {@link CompileDebugOptions.wireProbe} was applied to this pass. */
	supportsWireProbe?: boolean;
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
