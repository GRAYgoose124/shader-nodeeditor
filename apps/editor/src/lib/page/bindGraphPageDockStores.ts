import type { Connection, Edge, Node, NodeTypes, EdgeTypes } from '@xyflow/svelte';
import type {
	BufferId,
	CompileResult,
	GraphDocument,
	GraphMeta,
	GraphNode,
	NodeTypeDef,
	ParamAnimationSpec,
	SceneSdfProbeVisualization,
	UniformManifestEntry,
} from '@shadertoy/compiler';
import type { PresetId } from '$lib/presetIds.js';
import type { GraphUniformPreset } from '@shadertoy/compiler';
import type { ShadertoyRunner } from '@shadertoy/runner';
import type { FrameNodeData, ShaderNodeData } from '$lib/flowDoc.js';
import type { ShaderNodeParamBypassPatchFn, ShaderNodePatchFn } from '$lib/editor/shaderNodeContext.js';
import {
	flowDockStore,
	paletteDockStore,
	inspectorDockStore,
	problemsDockStore,
	previewDockStore,
	toolbarDockStore,
	presetLibraryDockStore,
	type FlowDockProps,
	type PaletteDockProps,
	type InspectorDockProps,
	type ProblemsDockProps,
	type PreviewDockProps,
	type ToolbarDockProps,
	type PresetLibraryDockProps,
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
	toolbar: ToolbarDockProps;
	presets: PresetLibraryDockProps;
};

/** Push all dock panel stores in one place (call from a single `$effect` in `+page.svelte`). */
export function syncGraphPageDockStores(s: GraphPageDockPushes): void {
	flowDockStore.set(s.flow);
	paletteDockStore.set(s.palette);
	inspectorDockStore.set(s.inspector);
	problemsDockStore.set(s.problems);
	previewDockStore.set(s.preview);
	toolbarDockStore.set(s.toolbar);
	presetLibraryDockStore.set(s.presets);
}

export type GraphPageDockBuildInput = {
	nodeTypes: NodeTypes;
	edgeTypes: EdgeTypes;
	defaultEdgeOptions: Record<string, unknown>;
	snapGridOn: boolean;
	isValidConnection: (c: Connection | Edge) => boolean;
	patchShaderNodeParam: ShaderNodePatchFn;
	patchShaderNodeParamGraphBypass: ShaderNodeParamBypassPatchFn;
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
	focusProblemEdgeTick: number;
	focusProblemEdgeId: string | null;
	filteredPalette: PaletteDockProps['filteredPalette'];
	paletteQuery: string;
	addNodeType: (typeId: string) => void;
	setPaletteQuery: (q: string) => void;
	graphMeta: GraphMeta;
	patchGraphMeta: (fn: (draft: GraphMeta) => void) => void;
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
	onProblemsFocusEdge: (id: string) => void;
	knownEdgeIds: Set<string>;
	knownNodeIds: Set<string>;
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
	previewAfterFrame?: (r: ShadertoyRunner) => void;
	previewSupportsSceneSdfProbe: boolean;
	previewSupportsWireProbe: boolean;
	previewFlowImageHasSceneSdf: boolean;
	selectedNodeIdForGpuDebug: string | null;
	debugSceneProbeOn: boolean;
	onDebugSceneProbeOn: (v: boolean) => void;
	debugSceneViz: SceneSdfProbeVisualization;
	onDebugSceneViz: (v: SceneSdfProbeVisualization) => void;
	debugProbePx: number;
	debugProbePy: number;
	debugProbePz: number;
	onDebugProbeP: (axis: 0 | 1 | 2, v: number) => void;
	debugProbeScale: number;
	onDebugProbeScale: (v: number) => void;
	debugProbeSlice: number;
	onDebugProbeSlice: (v: number) => void;
	debugProbeEps: number;
	onDebugProbeEps: (v: number) => void;
	debugWireProbeOn: boolean;
	onDebugWireProbeOn: (v: boolean) => void;
	debugHudText: string | null;
	previewSampleDebugCenterPixel: boolean;
	onPreviewDebugCenterPixel?: (rgba: [number, number, number, number]) => void;
	patchParamAnimations: (
		mut: (draft: Record<string, ParamAnimationSpec>) => void,
		recompile: boolean,
	) => void;
	getCurrentDoc: () => GraphDocument;
	customNodeTypes: NodeTypeDef[];
	loadPreset: (which: PresetId) => void;
	loadUserPresetFromDoc: (doc: GraphDocument) => void;
	setActivePass: (pass: BufferId) => void;
	passHasNodes: (pass: BufferId) => boolean;
	onToggleSnapGrid: () => void;
	onRestoreDockPanels: () => void;
	duplicateSelectedNodes: () => void;
	groupSelectedShaderNodes: () => void;
	snapSelectionPositionsToGrid: () => void;
	alignSelectionNodes: () => void;
	bakeSceneSdfToCustomNode: () => void;
	bakeSelectionToCustomNode: () => void;
	addFrame: () => void;
	exportJson: () => void;
	exportLivePage: () => void;
	exportSelectedSubgraph: () => void;
	importGraphJson: (ev: Event) => void;
	importSubgraphJson: (ev: Event) => void;
	importNodeDefs: (ev: Event) => void;
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
			patchShaderParamGraphBypass: input.patchShaderNodeParamGraphBypass,
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
			focusEdgeTick: input.focusProblemEdgeTick,
			focusEdgeId: input.focusProblemEdgeId,
		},
		palette: {
			filteredPalette: input.filteredPalette,
			paletteQuery: input.paletteQuery,
			onAddType: input.addNodeType,
			onPaletteQueryChange: input.setPaletteQuery,
		},
		inspector: {
			graphMeta: input.graphMeta,
			patchGraphMeta: input.patchGraphMeta,
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
			onFocusEdge: input.onProblemsFocusEdge,
			knownEdgeIds: input.knownEdgeIds,
			knownNodeIds: input.knownNodeIds,
		},
		preview: {
			activePass: input.activePass,
			onActivePassChange: input.setActivePass,
			passHasNodes: input.passHasNodes,
			previewCompileResult: input.previewCompileResult,
			compileResult: input.compileResult,
			graphMeta: input.graphMeta,
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
			afterFrame: input.previewAfterFrame,
			flowImageHasSceneSdf: input.previewFlowImageHasSceneSdf,
			selectedNodeIdForDebug: input.selectedNodeIdForGpuDebug,
			supportsSceneSdfProbe: input.previewSupportsSceneSdfProbe,
			supportsWireProbe: input.previewSupportsWireProbe,
			debugSceneProbeOn: input.debugSceneProbeOn,
			onDebugSceneProbeOn: input.onDebugSceneProbeOn,
			debugSceneViz: input.debugSceneViz,
			onDebugSceneViz: input.onDebugSceneViz,
			debugProbePx: input.debugProbePx,
			debugProbePy: input.debugProbePy,
			debugProbePz: input.debugProbePz,
			onDebugProbeP: input.onDebugProbeP,
			debugProbeScale: input.debugProbeScale,
			onDebugProbeScale: input.onDebugProbeScale,
			debugProbeSlice: input.debugProbeSlice,
			onDebugProbeSlice: input.onDebugProbeSlice,
			debugProbeEps: input.debugProbeEps,
			onDebugProbeEps: input.onDebugProbeEps,
			debugWireProbeOn: input.debugWireProbeOn,
			onDebugWireProbeOn: input.onDebugWireProbeOn,
			debugHudText: input.debugHudText,
			sampleDebugCenterPixel: input.previewSampleDebugCenterPixel,
			onDebugCenterPixel: input.onPreviewDebugCenterPixel,
		},
		toolbar: {
			activePass: input.activePass,
			onActivePassChange: input.setActivePass,
			compileResult: input.compileResult,
			snapGridOn: input.snapGridOn,
			onDuplicate: input.duplicateSelectedNodes,
			onGroup: input.groupSelectedShaderNodes,
			onSnapGrid: input.snapSelectionPositionsToGrid,
			onToggleSnapGrid: input.onToggleSnapGrid,
			onAlignNodes: input.alignSelectionNodes,
			onBakeSceneSdf: input.bakeSceneSdfToCustomNode,
			onBakeSelection: input.bakeSelectionToCustomNode,
			onAddFrame: input.addFrame,
			onExportGraph: input.exportJson,
			onExportLivePage: input.exportLivePage,
			onExportSelection: input.exportSelectedSubgraph,
			onImportGraph: input.importGraphJson,
			onMergeSubgraph: input.importSubgraphJson,
			onImportNodeDefs: input.importNodeDefs,
			onRestoreDockPanels: input.onRestoreDockPanels,
		},
		presets: {
			onLoadBuiltin: input.loadPreset,
			onLoadUserDoc: input.loadUserPresetFromDoc,
			getCurrentDoc: input.getCurrentDoc,
			customNodeTypes: input.customNodeTypes,
		},
	};
}
