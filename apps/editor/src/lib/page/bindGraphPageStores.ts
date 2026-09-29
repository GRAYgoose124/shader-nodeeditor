import type { Edge } from '@xyflow/svelte';
import { graphEdgesStore, graphNodesStore, previewGpuErrorStore } from '$lib/editor/graphSync.js';
import { dockPreviewPanelPresent } from '$lib/editor/editorDockStores.js';
import type { FlowNodeAny } from '$lib/flowDoc.js';

/** Push current page flow state into XYFlow sync stores (dock-mounted graph). */
export function publishGraphFlowToStores(nodes: FlowNodeAny[], edges: Edge[]): void {
	graphNodesStore.set(nodes);
	graphEdgesStore.set(edges);
}

/**
 * Subscribe store → page: when dock mutates nodes/edges, update page state.
 * Compares with getters to avoid feedback loops (ref-equality store already guards most churn).
 */
export function subscribeGraphFlowFromStores(opts: {
	getNodes: () => FlowNodeAny[];
	setNodes: (v: FlowNodeAny[]) => void;
	getEdges: () => Edge[];
	setEdges: (v: Edge[]) => void;
}): () => void {
	const u1 = graphNodesStore.subscribe((v) => {
		if (v !== opts.getNodes()) opts.setNodes(v);
	});
	const u2 = graphEdgesStore.subscribe((v) => {
		if (v !== opts.getEdges()) opts.setEdges(v);
	});
	return () => {
		u1();
		u2();
	};
}

export function publishPreviewGpuError(message: string | null): void {
	previewGpuErrorStore.set(message);
}

export function subscribePreviewGpuErrorFromStore(opts: {
	getGpuError: () => string | null;
	setGpuError: (v: string | null) => void;
}): () => void {
	return previewGpuErrorStore.subscribe((v) => {
		if (v !== opts.getGpuError()) opts.setGpuError(v);
	});
}

export function subscribeDockPreviewPanelPresent(setPresent: (v: boolean) => void): () => void {
	return dockPreviewPanelPresent.subscribe(setPresent);
}
