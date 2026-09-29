import type { Node, NodeTypes, EdgeTypes } from '@xyflow/svelte';
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
import type { GraphUniformPreset } from '@shadertoy/compiler';
import type { ShadertoyRunner } from '@shadertoy/runner';
import type { FrameNodeData, ShaderNodeData } from '$lib/flowDoc.js';
import type { GraphPageDockBuildInput } from '$lib/page/bindGraphPageDockStores.js';
import type { GraphPageActions } from '$lib/page/graphPageActions.js';
import type { UniformGroupsByNodeEntry } from '$lib/page/graphPageDerived.js';
import { restoreClosedDockPanels } from '$lib/editor/editorDockApi.js';

export type GraphPageDockBridgeParams = {
	nodeTypes: NodeTypes;
	edgeTypes: EdgeTypes;
	defaultEdgeOptions: Record<string, unknown>;
	snapGridOn: boolean;
	actions: GraphPageActions;
	mergedDiagnostics: GraphPageDockBuildInput['mergedDiagnostics'];
	focusProblemTick: number;
	focusProblemNodeId: string | null;
	focusProblemEdgeTick: number;
	focusProblemEdgeId: string | null;
	filteredPalette: GraphPageDockBuildInput['filteredPalette'];
	paletteQuery: string;
	setPaletteQuery: (q: string) => void;
	graphMeta: GraphMeta;
	activePass: BufferId;
	setActivePass: (pass: BufferId) => void;
	passHasNodes: (pass: BufferId) => boolean;
	onToggleSnapGrid: () => void;
	readiness: GraphPageDockBuildInput['readiness'];
	previewDockPanelPresent: boolean;
	onOpenPreview: () => void;
	previewCompileResult: CompileResult | null;
	compileResult: CompileResult;
	gpuError: string | null;
	selectedFlowNode: Node<ShaderNodeData, 'shader'> | null;
	selectedDef: NodeTypeDef | undefined;
	selectedNodeGlsl: string | null;
	selectedGroupNode: Node<FrameNodeData, 'group'> | undefined;
	frameIds: string[];
	uniformGroupsByNode: UniformGroupsByNodeEntry[];
	nodeTypeById: Map<string, string>;
	previewRunner: ShadertoyRunner | null;
	uniformPresetsList: GraphUniformPreset[];
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
	previewAfterFrame?: (r: ShadertoyRunner) => void;
	getCurrentDoc: () => GraphDocument;
	customNodeTypes: NodeTypeDef[];
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
	patchGraphMeta: (fn: (draft: GraphMeta) => void) => void;
};

/** Builds the object passed to `buildGraphPageDockPushes` from page state + `createGraphPageActions` result. */
export function buildGraphPageDockBuildInput(p: GraphPageDockBridgeParams): GraphPageDockBuildInput {
	return {
		nodeTypes: p.nodeTypes,
		edgeTypes: p.edgeTypes,
		defaultEdgeOptions: p.defaultEdgeOptions,
		snapGridOn: p.snapGridOn,
		isValidConnection: p.actions.isValidConnection,
		patchShaderNodeParam: p.actions.patchShaderNodeParam,
		patchShaderNodeParamGraphBypass: p.actions.patchShaderNodeParamGraphBypass,
		onConnect: p.actions.onConnect,
		onFlowDelete: p.actions.onFlowDelete,
		onSelectionChange: p.actions.onSelectionChange,
		onBeforeReconnect: p.actions.onBeforeReconnect,
		onReconnect: p.actions.onReconnect,
		onShaderNodeDragStop: p.actions.onShaderNodeDragStop,
		mergedDiagnostics: p.mergedDiagnostics,
		focusProblemTick: p.focusProblemTick,
		focusProblemNodeId: p.focusProblemNodeId,
		focusProblemEdgeTick: p.focusProblemEdgeTick,
		focusProblemEdgeId: p.focusProblemEdgeId,
		filteredPalette: p.filteredPalette,
		paletteQuery: p.paletteQuery,
		addNodeType: p.actions.addNodeType,
		setPaletteQuery: p.setPaletteQuery,
		graphMeta: p.graphMeta,
		activePass: p.activePass,
		setActivePass: p.setActivePass,
		passHasNodes: p.passHasNodes,
		onToggleSnapGrid: p.onToggleSnapGrid,
		readiness: p.readiness,
		previewDockPanelPresent: p.previewDockPanelPresent,
		onOpenPreview: p.onOpenPreview,
		previewCompileResult: p.previewCompileResult,
		compileResult: p.compileResult,
		gpuError: p.gpuError,
		selectedFlowNode: p.selectedFlowNode,
		selectedDef: p.selectedDef,
		selectedNodeGlsl: p.selectedNodeGlsl,
		patchSelectedGraphNode: p.actions.patchSelectedGraphNode,
		selectedGroupNode: p.selectedGroupNode,
		toggleFrameCollapse: p.actions.toggleFrameCollapse,
		frameIds: p.frameIds,
		setSelectedShaderParentFrame: p.actions.setSelectedShaderParentFrame,
		uniformGroupsByNode: p.uniformGroupsByNode,
		nodeTypeById: p.nodeTypeById,
		previewRunner: p.previewRunner,
		readUniformScalar: p.actions.readUniformScalar,
		setUniformScalar: p.actions.setUniformScalar,
		resetUniform: p.actions.resetUniform,
		uniformPresetsList: p.uniformPresetsList,
		saveUniformPreset: p.actions.saveUniformPreset,
		applyUniformPreset: p.actions.applyUniformPreset,
		deleteUniformPreset: p.actions.deleteUniformPreset,
		registry: p.registry,
		shaderGraphNodesById: p.shaderGraphNodesById,
		onProblemsFocusNode: p.onProblemsFocusNode,
		onProblemsFocusEdge: p.onProblemsFocusEdge,
		knownEdgeIds: p.knownEdgeIds,
		knownNodeIds: p.knownNodeIds,
		graphEpoch: p.graphEpoch,
		previewLookatOrbitNodeId: p.previewLookatOrbitNodeId,
		bumpUniformUiTick: p.bumpUniformUiTick,
		setPreviewRunner: p.setPreviewRunner,
		setPreviewCanvas: p.setPreviewCanvas,
		snapshotPreviewPng: p.snapshotPreviewPng,
		toggleWebmRecord: p.toggleWebmRecord,
		recordingWebm: p.recordingWebm,
		previewPaused: p.previewPaused,
		onTogglePreviewPause: p.onTogglePreviewPause,
		previewTimeRestartKey: p.previewTimeRestartKey,
		onPreviewRestartTime: p.onPreviewRestartTime,
		previewBeforeFrame: p.actions.applyPreviewParamAnimations,
		previewAfterFrame: p.previewAfterFrame,
		previewSupportsSceneSdfProbe: p.previewSupportsSceneSdfProbe,
		previewSupportsWireProbe: p.previewSupportsWireProbe,
		previewFlowImageHasSceneSdf: p.previewFlowImageHasSceneSdf,
		selectedNodeIdForGpuDebug: p.selectedNodeIdForGpuDebug,
		debugSceneProbeOn: p.debugSceneProbeOn,
		onDebugSceneProbeOn: p.onDebugSceneProbeOn,
		debugSceneViz: p.debugSceneViz,
		onDebugSceneViz: p.onDebugSceneViz,
		debugProbePx: p.debugProbePx,
		debugProbePy: p.debugProbePy,
		debugProbePz: p.debugProbePz,
		onDebugProbeP: p.onDebugProbeP,
		debugProbeScale: p.debugProbeScale,
		onDebugProbeScale: p.onDebugProbeScale,
		debugProbeSlice: p.debugProbeSlice,
		onDebugProbeSlice: p.onDebugProbeSlice,
		debugProbeEps: p.debugProbeEps,
		onDebugProbeEps: p.onDebugProbeEps,
		debugWireProbeOn: p.debugWireProbeOn,
		onDebugWireProbeOn: p.onDebugWireProbeOn,
		debugHudText: p.debugHudText,
		previewSampleDebugCenterPixel: p.previewSampleDebugCenterPixel,
		onPreviewDebugCenterPixel: p.onPreviewDebugCenterPixel,
		patchParamAnimations: p.actions.patchParamAnimations,
		patchGraphMeta: p.patchGraphMeta,
		getCurrentDoc: p.getCurrentDoc,
		customNodeTypes: p.customNodeTypes,
		loadPreset: p.actions.loadPreset,
		loadUserPresetFromDoc: p.actions.loadUserPresetFromDoc,
		onRestoreDockPanels: restoreClosedDockPanels,
		duplicateSelectedNodes: p.actions.duplicateSelectedNodes,
		groupSelectedShaderNodes: p.actions.groupSelectedShaderNodes,
		snapSelectionPositionsToGrid: p.actions.snapSelectionPositionsToGrid,
		alignSelectionNodes: p.actions.alignSelectionNodes,
		bakeSceneSdfToCustomNode: p.actions.bakeSceneSdfToCustomNode,
		bakeSelectionToCustomNode: p.actions.bakeSelectionToCustomNode,
		addFrame: p.actions.addFrame,
		exportJson: p.actions.exportJson,
		exportLivePage: p.actions.exportLivePage,
		exportSelectedSubgraph: p.actions.exportSelectedSubgraph,
		importGraphJson: p.actions.importGraphJson,
		importSubgraphJson: p.actions.importSubgraphJson,
		importNodeDefs: p.actions.importNodeDefs,
	};
}
