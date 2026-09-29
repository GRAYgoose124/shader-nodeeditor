import type { Connection, Edge, Node, NodeTypes, EdgeTypes } from '@xyflow/svelte';
import type {
	BufferId,
	CompileResult,
	GraphMeta,
	GraphNode,
	NodeTypeDef,
	ParamAnimationSpec,
	UniformManifestEntry,
} from '@shadertoy/compiler';
import type { GraphUniformPreset } from '@shadertoy/compiler';
import type { ShadertoyRunner } from '@shadertoy/runner';
import type { FrameNodeData, ShaderNodeData } from '$lib/flowDoc.js';
import type { ShaderNodePatchFn } from '$lib/editor/shaderNodeContext.js';
import {
	flowDockStore,
	paletteDockStore,
	inspectorDockStore,
	problemsDockStore,
	previewDockStore,
	type FlowDockProps,
	type PaletteDockProps,
	type InspectorDockProps,
	type ProblemsDockProps,
	type PreviewDockProps,
} from '$lib/editor/editorDockStores.js';

/** Mirrors `EditorInspectorPanel` readiness prop. */
type Readiness = {
	fragOut: boolean;
	fragWired: boolean;
	hasRaymarch: boolean;
	raymarchOk: boolean;
	compileOk: boolean;
};

export type GraphPageDockPushes = {
	flow: FlowDockProps;
	palette: PaletteDockProps;
	inspector: InspectorDockProps;
	problems: ProblemsDockProps;
	preview: PreviewDockProps;
};

/** Push all dock panel stores in one place (call from a single `$effect` in `+page.svelte`). */
export function syncGraphPageDockStores(s: GraphPageDockPushes): void {
	flowDockStore.set(s.flow);
	paletteDockStore.set(s.palette);
	inspectorDockStore.set(s.inspector);
	problemsDockStore.set(s.problems);
	previewDockStore.set(s.preview);
}

export type GraphPageDockBuildInput = {
	nodeTypes: NodeTypes;
	edgeTypes: EdgeTypes;
	defaultEdgeOptions: Record<string, unknown>;
	snapGridOn: boolean;
	isValidConnection: (c: Connection | Edge) => boolean;
	patchShaderNodeParam: ShaderNodePatchFn;
	onConnect: (c: Connection) => void;
	onFlowDelete: (p: { nodes: Node[]; edges: Edge[] }) => void;
	onSelectionChange: (p: { nodes: Node[] }) => void;
	onBeforeReconnect: (newEdge: Edge, oldEdge: Edge) => Edge | false;
	onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
	onShaderNodeDragStop: () => void;
	mergedDiagnostics: {
		errorNodeIds: Set<string>;
		errorEdgeIds: Set<string>;
		errorPortsByNode: Map<string, { inputs: Set<string>; outputs: Set<string> }>;
	};
	focusProblemTick: number;
	focusProblemNodeId: string | null;
	filteredPalette: PaletteDockProps['filteredPalette'];
	paletteQuery: string;
	addNodeType: (typeId: string) => void;
	setPaletteQuery: (q: string) => void;
	graphMeta: GraphMeta;
	activePass: BufferId;
	readiness: Readiness;
	previewDockPanelPresent: boolean;
	onOpenPreview: () => void;
	previewCompileResult: CompileResult | null;
	compileResult: CompileResult;
	gpuError: string | null;
	selectedFlowNode: Node<ShaderNodeData, 'shader'> | null;
	selectedDef: NodeTypeDef | undefined;
	selectedNodeGlsl: string | null;
	patchSelectedGraphNode: (fn: (g: GraphNode) => void) => void;
	selectedGroupNode: Node<FrameNodeData, 'group'> | undefined;
	toggleFrameCollapse: (id: string) => void;
	frameIds: string[];
	setSelectedShaderParentFrame: (parentId: string) => void;
	uniformGroupsByNode: [string, { pass: BufferId; uniforms: UniformManifestEntry[] }][];
	nodeTypeById: Map<string, string>;
	previewRunner: ShadertoyRunner | null;
	readUniformScalar: (r: ShadertoyRunner | null, u: UniformManifestEntry) => number;
	setUniformScalar: (u: UniformManifestEntry, v: number) => void;
	resetUniform: (u: UniformManifestEntry) => void;
	uniformPresetsList: GraphUniformPreset[];
	saveUniformPreset: (name: string) => void;
	applyUniformPreset: (index: number) => void;
	deleteUniformPreset: (index: number) => void;
	registry: Map<string, NodeTypeDef>;
	shaderGraphNodesById: Map<string, GraphNode>;
	onProblemsFocusNode: (id: string) => void;
	graphEpoch: number;
	previewLookatOrbitNodeId: string | null;
	bumpUniformUiTick: () => void;
	setPreviewRunner: (r: ShadertoyRunner | null) => void;
	setPreviewCanvas: (c: HTMLCanvasElement | null) => void;
	snapshotPreviewPng: () => void;
	toggleWebmRecord: () => void;
	recordingWebm: boolean;
	previewPaused: boolean;
	onTogglePreviewPause: () => void;
	previewTimeRestartKey: number;
	onPreviewRestartTime: () => void;
	previewBeforeFrame: (r: ShadertoyRunner) => void;
	patchParamAnimations: (
		mut: (draft: Record<string, ParamAnimationSpec>) => void,
		recompile: boolean,
	) => void;
};

export function buildGraphPageDockPushes(input: GraphPageDockBuildInput): GraphPageDockPushes {
	return {
		flow: {
			nodeTypes: input.nodeTypes,
			edgeTypes: input.edgeTypes,
			defaultEdgeOptions: input.defaultEdgeOptions,
			snapGridOn: input.snapGridOn,
			isValidConnection: input.isValidConnection,
			patchShaderParam: input.patchShaderNodeParam,
			onConnect: input.onConnect,
			onFlowDelete: input.onFlowDelete,
			onSelectionChange: input.onSelectionChange,
			onBeforeReconnect: input.onBeforeReconnect,
			onReconnect: input.onReconnect,
			onNodeDragStop: input.onShaderNodeDragStop,
			errorNodeIds: input.mergedDiagnostics.errorNodeIds,
			errorEdgeIds: input.mergedDiagnostics.errorEdgeIds,
			errorPortsByNode: input.mergedDiagnostics.errorPortsByNode,
			focusTick: input.focusProblemTick,
			focusNodeId: input.focusProblemNodeId,
		},
		palette: {
			filteredPalette: input.filteredPalette,
			paletteQuery: input.paletteQuery,
			onAddType: input.addNodeType,
			onPaletteQueryChange: input.setPaletteQuery,
		},
		inspector: {
			graphMeta: input.graphMeta,
			activePass: input.activePass,
			readiness: input.readiness,
			previewDockPanelPresent: input.previewDockPanelPresent,
			onOpenPreview: input.onOpenPreview,
			previewCompileResult: input.previewCompileResult,
			compileResult: input.compileResult,
			gpuError: input.gpuError,
			selectedFlowNode: input.selectedFlowNode,
			selectedDef: input.selectedDef,
			selectedNodeGlsl: input.selectedNodeGlsl,
			patchSelectedGraphNode: input.patchSelectedGraphNode,
			selectedGroupNode: input.selectedGroupNode,
			onToggleFrameCollapse: input.toggleFrameCollapse,
			frameIds: input.frameIds,
			onSetParentFrame: input.setSelectedShaderParentFrame,
			uniformGroupsByNode: input.uniformGroupsByNode,
			nodeTypeById: input.nodeTypeById,
			previewRunner: input.previewRunner,
			readUniformScalar: input.readUniformScalar,
			setUniformScalar: input.setUniformScalar,
			resetUniform: input.resetUniform,
			uniformPresets: input.uniformPresetsList,
			onSaveUniformPreset: input.saveUniformPreset,
			onApplyUniformPreset: input.applyUniformPreset,
			onDeleteUniformPreset: input.deleteUniformPreset,
			nodeTypeRegistry: input.registry,
			shaderGraphNodesById: input.shaderGraphNodesById,
			patchParamAnimations: input.patchParamAnimations,
		},
		problems: {
			compileResult: input.compileResult,
			gpuError: input.gpuError,
			onFocusNode: input.onProblemsFocusNode,
		},
		preview: {
			previewCompileResult: input.previewCompileResult,
			compileResult: input.compileResult,
			reloadKey: input.graphEpoch,
			lookatOrbitNodeId: input.previewLookatOrbitNodeId,
			onUniformTweak: input.bumpUniformUiTick,
			onRunnerReady: input.setPreviewRunner,
			onCanvasReady: input.setPreviewCanvas,
			onSnapshotPng: input.snapshotPreviewPng,
			onToggleWebmRecord: input.toggleWebmRecord,
			recordingWebm: input.recordingWebm,
			previewPaused: input.previewPaused,
			onTogglePreviewPause: input.onTogglePreviewPause,
			previewTimeRestartKey: input.previewTimeRestartKey,
			onPreviewRestartTime: input.onPreviewRestartTime,
			beforeFrame: input.previewBeforeFrame,
		},
	};
}
