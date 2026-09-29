import type {
	BufferId,
	CompileResult,
	GraphDocument,
	GraphNode,
	GraphUniformPreset,
	NodeTypeDef,
	ParamAnimationSpec,
	UniformManifestEntry,
} from '@shadertoy/compiler';
import type { Connection, Edge, Node } from '@xyflow/svelte';
import type { ShadertoyRunner } from '@shadertoy/runner';
import type { PresetId } from '$lib/presetIds.js';
import type { FlowNodeAny } from '$lib/flowDoc.js';

export type GraphPageActionApi = {
	getNodes: () => FlowNodeAny[];
	setNodes: (v: FlowNodeAny[]) => void;
	getEdges: () => Edge[];
	setEdges: (v: Edge[]) => void;
	getGraphMeta: () => GraphDocument['meta'];
	setGraphMeta: (v: GraphDocument['meta']) => void;
	getCustomNodeTypes: () => NodeTypeDef[];
	setCustomNodeTypes: (v: NodeTypeDef[]) => void;
	bumpGraphEpoch: () => void;
	getActivePass: () => BufferId;
	getSelectedNodeId: () => string | null;
	setSelectedNodeId: (v: string | null) => void;
	getSelectedNodeIds: () => string[];
	setSelectedNodeIds: (v: string[]) => void;
	getCompileResult: () => CompileResult;
	getPreviewCompileResult: () => CompileResult | null;
	getPreviewRunner: () => ShadertoyRunner | null;
	setPreviewRunner: (r: ShadertoyRunner | null) => void;
	getUniformUiTick: () => number;
	bumpUniformUiTick: () => void;
	getGraphEpoch: () => number;
	getUniformPresetsList: () => GraphUniformPreset[];
	setPreviewPaused: (v: boolean) => void;
	bumpPreviewTimeRestartKey: () => void;
	getRegistry: () => Map<string, NodeTypeDef>;
	getShaderGraphNodesById: () => Map<string, GraphNode>;
};

export type GraphPageActions = {
	isValidConnection: (c: Connection | Edge) => boolean;
	onConnect: (c: Connection) => void;
	onBeforeReconnect: (newEdge: Edge, oldEdge: Edge) => Edge | false;
	onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
	onFlowDelete: (p: { nodes: Node[]; edges: Edge[] }) => void;
	onSelectionChange: (p: { nodes: Node[] }) => void;
	duplicateSelectedNodes: () => void;
	groupSelectedShaderNodes: () => void;
	snapSelectionPositionsToGrid: () => void;
	alignSelectionNodes: () => void;
	bakeSceneSdfToCustomNode: () => void;
	bakeSelectionToCustomNode: () => void;
	addFrame: () => void;
	toggleFrameCollapse: (frameId: string) => void;
	onShaderNodeDragStop: () => void;
	copySelectionToClipboard: () => Promise<void>;
	pasteFromClipboard: () => Promise<void>;
	readUniformScalar: (r: ShadertoyRunner | null, u: UniformManifestEntry) => number;
	setUniformScalar: (u: UniformManifestEntry, v: number) => void;
	resetUniform: (u: UniformManifestEntry) => void;
	patchParamAnimations: (mut: (draft: Record<string, ParamAnimationSpec>) => void, recompile: boolean) => void;
	applyPreviewParamAnimations: (r: ShadertoyRunner) => void;
	setSelectedShaderParentFrame: (parentId: string) => void;
	addNodeType: (typeId: string) => void;
	patchSelectedGraphNode: (fn: (g: GraphNode) => void) => void;
	patchShaderNodeParam: (nodeId: string, paramId: string, value: number) => void;
	patchShaderNodeParamGraphBypass: (nodeId: string, paramId: string, bypassed: boolean) => void;
	loadPreset: (which: PresetId) => void;
	loadUserPresetFromDoc: (doc: GraphDocument) => void;
	exportSelectedSubgraph: () => void;
	importSubgraphJson: (ev: Event) => void;
	exportJson: () => void;
	exportLivePage: () => void;
	importGraphJson: (ev: Event) => void;
	importNodeDefs: (ev: Event) => void;
	saveUniformPreset: (name: string) => void;
	applyUniformPreset: (index: number) => void;
	deleteUniformPreset: (index: number) => void;
};
