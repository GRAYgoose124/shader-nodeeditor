import type { CompileResult, GraphDocument, NodeTypeDef } from '@shadertoy/compiler';
import {
	parseGraphDocument,
	parseNodeTypeDefsJson,
	stringifyGraphDocument,
} from '@shadertoy/compiler';
import type { Edge } from '@xyflow/svelte';
import { buildExportLiveHtmlDocument } from '$lib/exportLiveHtml.js';
import { flowToDoc, sortFlowNodesParentsBeforeChildren, type FlowNodeAny } from '$lib/flowDoc.js';
import { mapEdgesShaderWire } from '$lib/page/flowEdges.js';
import { downloadJsonBlob } from '$lib/page/downloadJson.js';
import { flowStateFromGraphDocument } from '$lib/page/graphDocumentImport.js';
import {
	buildSubgraphClipboardV1,
	mergeSubgraphV1IntoFlow,
	parseSubgraphClipboardV1,
	type FlowDocSnapshot,
} from '$lib/page/subgraphClipboard.js';
import { packShaderNodesResolveOverlap } from '$lib/shaderNodeLayout.js';
import type { PresetId } from '$lib/presetIds.js';
import type { PresetBundle } from '$lib/presetCatalog.js';

export function exportGraphJson(
	nodes: FlowNodeAny[],
	edges: Edge[],
	graphMeta: GraphDocument['meta'],
	customNodeTypes: NodeTypeDef[],
): void {
	const doc = flowToDoc(nodes, edges, graphMeta, customNodeTypes);
	downloadJsonBlob((graphMeta.name ?? 'graph') + '.json', stringifyGraphDocument(doc, 2));
}

export function exportLivePageOrAlert(
	compileResult: CompileResult,
	graphMeta: GraphDocument['meta'],
	initialUniformScalars?: Record<string, number>,
): void {
	if (compileResult.errors.length > 0) {
		alert('Fix compile errors before exporting a live page.');
		return;
	}
	try {
		const html = buildExportLiveHtmlDocument(compileResult, {
			title: graphMeta.name ?? 'Shader export',
			paramAnimations: graphMeta.editor?.paramAnimations ?? null,
			initialUniformScalars:
				initialUniformScalars && Object.keys(initialUniformScalars).length > 0
					? initialUniformScalars
					: null,
		});
		const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		const base =
			(graphMeta.name ?? 'graph').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_|_$/g, '').slice(0, 80) ||
			'graph';
		a.download = base + '-live.html';
		a.click();
		URL.revokeObjectURL(a.href);
	} catch (e) {
		alert(e instanceof Error ? e.message : String(e));
	}
}

export function exportSubgraphSelectionOrAlert(
	nodes: FlowNodeAny[],
	edges: Edge[],
	selectedNodeIds: string[],
	baseName: string,
): void {
	const bundle = buildSubgraphClipboardV1(nodes, edges, selectedNodeIds);
	if (!bundle) {
		alert('Select one or more shader nodes to export.');
		return;
	}
	downloadJsonBlob(baseName + '-subgraph.json', JSON.stringify(bundle, null, 2));
}

export function parseSubgraphMergeFromText(
	text: string,
	ctx: FlowDocSnapshot,
): { ok: true; snapshot: FlowDocSnapshot } | { ok: false; message: string } {
	try {
		const payload = parseSubgraphClipboardV1(JSON.parse(text) as unknown);
		if (!payload) throw new Error('Expected shadertoy-subgraph v1 with nodes[]');
		const snapshot = mergeSubgraphV1IntoFlow(ctx, payload, { packOverlap: false });
		return { ok: true, snapshot };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}
}

export function parseImportGraphFromText(
	text: string,
): { ok: true; snapshot: ReturnType<typeof flowStateFromGraphDocument> } | { ok: false; message: string } {
	try {
		const parsed = parseGraphDocument(text);
		if (!parsed.ok) throw new Error(parsed.error);
		const snapshot = flowStateFromGraphDocument(parsed.doc);
		return { ok: true, snapshot };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}
}

export function parseImportNodeDefsFromText(
	text: string,
): { ok: true; defs: NodeTypeDef[] } | { ok: false; message: string } {
	const r = parseNodeTypeDefsJson(text);
	if (!r.ok) return { ok: false, message: r.error };
	return { ok: true, defs: r.defs };
}

export function flowStateFromPresetId(
	presetId: PresetId,
	loaders: Record<PresetId, () => PresetBundle>,
	customNodeTypes: NodeTypeDef[],
): {
	nodes: FlowNodeAny[];
	edges: Edge[];
	graphMeta: GraphDocument['meta'];
} {
	const { nodes: n, edges: e, meta } = loaders[presetId]();
	let flowNodes = sortFlowNodesParentsBeforeChildren(n);
	const edgesOut = mapEdgesShaderWire(e);
	flowNodes = sortFlowNodesParentsBeforeChildren(
		packShaderNodesResolveOverlap(flowNodes, customNodeTypes),
	);
	return { nodes: flowNodes, edges: edgesOut, graphMeta: meta };
}
