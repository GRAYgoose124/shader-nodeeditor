import type { Edge } from '@xyflow/svelte';
import type { GraphDocument, NodeTypeDef } from '@shadertoy/compiler';

import {
	buildSubgraphClipboardV1,
	mergeSubgraphV1IntoFlow,
	parseSubgraphClipboardV1,
	writeSubgraphToClipboard,
} from '$lib/page/subgraphClipboard.js';
import type { FlowNodeAny } from '$lib/flowDoc.js';

export async function copySelectionToClipboard(args: {
	nodes: FlowNodeAny[];
	edges: Edge[];
	selectedNodeIds: string[];
}): Promise<void> {
	const bundle = buildSubgraphClipboardV1(args.nodes, args.edges, args.selectedNodeIds);
	if (!bundle) return;
	await writeSubgraphToClipboard(bundle);
}

export async function pasteFromClipboard(args: {
	readClipboardText: () => Promise<string>;
	state: { nodes: FlowNodeAny[]; edges: Edge[]; graphMeta: GraphDocument['meta']; customNodeTypes: NodeTypeDef[] };
}): Promise<{
	nodes: FlowNodeAny[];
	edges: Edge[];
	graphMeta: GraphDocument['meta'];
	customNodeTypes: NodeTypeDef[];
} | null> {
	let text: string;
	try {
		text = await args.readClipboardText();
	} catch {
		return null;
	}
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return null;
	}
	const payload = parseSubgraphClipboardV1(raw);
	if (!payload) return null;
	return mergeSubgraphV1IntoFlow(args.state, payload);
}

