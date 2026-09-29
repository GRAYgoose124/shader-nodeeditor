<script lang="ts">
	import type { CompileResult, GraphMeta, NodeTypeDef, UniformManifestEntry } from '@shadertoy/compiler';
	import EditorInspectorMediaPanel from '$lib/editor/inspector/EditorInspectorMediaPanel.svelte';
	import type { BufferId, GraphNode } from '@shadertoy/compiler';
	import type { GraphUniformPreset, ParamAnimationSpec } from '@shadertoy/compiler';
	import type { Node } from '@xyflow/svelte';
	import type { ShadertoyRunner } from '@shadertoy/runner';
	import type { FrameNodeData, ShaderNodeData } from '$lib/flowDoc.js';
	import EditorInspectorUniformPresets from '$lib/editor/inspector/EditorInspectorUniformPresets.svelte';
	import EditorInspectorReadiness from '$lib/editor/inspector/EditorInspectorReadiness.svelte';
	import EditorInspectorIChannelTable from '$lib/editor/inspector/EditorInspectorIChannelTable.svelte';
	import EditorInspectorSelectedNode from '$lib/editor/inspector/EditorInspectorSelectedNode.svelte';
	import EditorInspectorParamAnimations from '$lib/editor/inspector/EditorInspectorParamAnimations.svelte';
	import EditorInspectorLiveUniforms from '$lib/editor/inspector/EditorInspectorLiveUniforms.svelte';

	let {
		graphMeta,
		patchGraphMeta,
		activePass,
		readiness,
		previewDockPanelPresent,
		onOpenPreview,
		previewCompileResult,
		compileResult,
		gpuError = null as string | null,
		selectedFlowNode,
		selectedDef,
		selectedNodeGlsl,
		patchSelectedGraphNode,
		selectedGroupNode,
		onToggleFrameCollapse,
		frameIds,
		onSetParentFrame,
		uniformGroupsByNode,
		nodeTypeById,
		previewRunner,
		readUniformScalar,
		setUniformScalar,
		resetUniform,
		uniformPresets,
		onSaveUniformPreset,
		onApplyUniformPreset,
		onDeleteUniformPreset,
		nodeTypeRegistry = new Map<string, NodeTypeDef>(),
		shaderGraphNodesById = new Map<string, GraphNode>(),
		patchParamAnimations,
	}: {
		graphMeta: GraphMeta;
		patchGraphMeta: (fn: (draft: GraphMeta) => void) => void;
		activePass: BufferId;
		readiness: {
			fragOut: boolean;
			fragWired: boolean;
			hasRaymarch: boolean;
			raymarchOk: boolean;
			compileOk: boolean;
		};
		previewDockPanelPresent: boolean;
		onOpenPreview: () => void;
		previewCompileResult: CompileResult | null;
		compileResult: CompileResult;
		gpuError?: string | null;
		selectedFlowNode: Node<ShaderNodeData, 'shader'> | null;
		selectedDef: NodeTypeDef | undefined;
		selectedNodeGlsl: string | null;
		patchSelectedGraphNode: (fn: (g: GraphNode) => void) => void;
		selectedGroupNode: Node<FrameNodeData, 'group'> | undefined;
		onToggleFrameCollapse: (id: string) => void;
		frameIds: string[];
		onSetParentFrame: (parentId: string) => void;
		uniformGroupsByNode: [string, { pass: BufferId; uniforms: UniformManifestEntry[] }][];
		nodeTypeById: Map<string, string>;
		previewRunner: ShadertoyRunner | null;
		readUniformScalar: (r: ShadertoyRunner | null, u: UniformManifestEntry) => number;
		setUniformScalar: (u: UniformManifestEntry, v: number) => void;
		resetUniform: (u: UniformManifestEntry) => void;
		uniformPresets: GraphUniformPreset[];
		onSaveUniformPreset: (name: string) => void;
		onApplyUniformPreset: (index: number) => void;
		onDeleteUniformPreset: (index: number) => void;
		nodeTypeRegistry?: Map<string, NodeTypeDef>;
		shaderGraphNodesById?: Map<string, GraphNode>;
		patchParamAnimations: (
			mut: (draft: Record<string, ParamAnimationSpec>) => void,
			recompile: boolean,
		) => void;
	} = $props();
</script>

<aside class="right nowheel">
	<EditorInspectorReadiness
		{previewDockPanelPresent}
		{onOpenPreview}
		{activePass}
		{readiness}
	/>
	<EditorInspectorMediaPanel {graphMeta} {activePass} {patchGraphMeta} {previewRunner} />
	<EditorInspectorIChannelTable {graphMeta} {activePass} {compileResult} {gpuError} />
	<EditorInspectorUniformPresets
		compileErrorsCount={compileResult.errors.length}
		{uniformPresets}
		{onSaveUniformPreset}
		{onApplyUniformPreset}
		{onDeleteUniformPreset}
	/>
	<EditorInspectorSelectedNode
		{selectedFlowNode}
		{selectedDef}
		{selectedNodeGlsl}
		{patchSelectedGraphNode}
		{selectedGroupNode}
		{onToggleFrameCollapse}
		{frameIds}
		{onSetParentFrame}
		{graphMeta}
		{patchParamAnimations}
	/>
	<EditorInspectorParamAnimations
		{graphMeta}
		nodeTypeRegistry={nodeTypeRegistry}
		shaderGraphNodesById={shaderGraphNodesById ?? new Map()}
		{patchParamAnimations}
	/>
	<EditorInspectorLiveUniforms
		{compileResult}
		{previewCompileResult}
		{uniformGroupsByNode}
		{nodeTypeById}
		{previewRunner}
		{readUniformScalar}
		{setUniformScalar}
		{resetUniform}
		{nodeTypeRegistry}
		{shaderGraphNodesById}
	/>
</aside>

<style>
	.right {
		border-left: 1px solid #252a33;
		padding: 10px;
		overflow: auto;
		overscroll-behavior: contain;
		font-size: 12px;
	}
	.right :global(h2) {
		margin: 16px 0 8px;
		font-size: 13px;
	}
	.right :global(h2:first-of-type) {
		margin-top: 0;
	}
</style>
