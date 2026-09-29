import { writable } from 'svelte/store';
import type { ComponentProps } from 'svelte';
import type { Connection, Edge, Node, NodeTypes, EdgeTypes } from '@xyflow/svelte';
import type EditorPalette from './EditorPalette.svelte';
import type EditorInspectorPanel from './EditorInspectorPanel.svelte';
import type EditorProblemsPanel from './EditorProblemsPanel.svelte';
import type EditorPreviewDockBody from './EditorPreviewDockBody.svelte';
import type { ShaderNodePatchFn } from '$lib/editor/shaderNodeContext.js';

export type PaletteDockProps = Pick<
	ComponentProps<typeof EditorPalette>,
	'filteredPalette' | 'onAddType'
> & {
	paletteQuery: string;
	onPaletteQueryChange: (q: string) => void;
};

export type InspectorDockProps = ComponentProps<typeof EditorInspectorPanel>;

export type ProblemsDockProps = ComponentProps<typeof EditorProblemsPanel>;

export type PreviewDockProps = ComponentProps<typeof EditorPreviewDockBody>;

/** Flow canvas props except bindable nodes/edges (those use graphSync stores). */
export type FlowDockProps = {
	nodeTypes: NodeTypes;
	edgeTypes: EdgeTypes;
	defaultEdgeOptions: Record<string, unknown>;
	snapGridOn: boolean;
	isValidConnection: (c: Connection | Edge) => boolean;
	patchShaderParam: ShaderNodePatchFn;
	onConnect: (c: Connection) => void;
	onFlowDelete: (p: { nodes: Node[]; edges: Edge[] }) => void;
	onSelectionChange: (p: { nodes: Node[] }) => void;
	onBeforeReconnect: (newEdge: Edge, oldEdge: Edge) => Edge | false;
	onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
	onNodeDragStop: () => void;
	errorNodeIds: Set<string>;
	errorEdgeIds: Set<string>;
	errorPortsByNode: Map<string, { inputs: Set<string>; outputs: Set<string> }>;
	focusTick: number;
	focusNodeId: string | null;
};

export const flowDockStore = writable<FlowDockProps | null>(null);
export const paletteDockStore = writable<PaletteDockProps | null>(null);
export const inspectorDockStore = writable<InspectorDockProps | null>(null);
export const problemsDockStore = writable<ProblemsDockProps | null>(null);
export const previewDockStore = writable<PreviewDockProps | null>(null);

/** Mirrors whether Dockview still has a `preview` panel (may be hidden behind another tab). */
export const dockPreviewPanelPresent = writable(true);
