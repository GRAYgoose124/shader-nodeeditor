import { compileGraph, type CompileResult, type GraphDocument, type NodeTypeDef } from '@shadertoy/compiler';
import type { Edge } from '@xyflow/svelte';
import type { PresetId } from '$lib/presetIds.js';
import { PRESET_LOADERS } from '$lib/presetRegistry.js';
import { flowToDoc, type FlowNodeAny } from '$lib/flowDoc.js';
import { flowStateFromPresetId } from '$lib/page/graphFileIo.js';

export function graphDocumentForPreset(presetId: PresetId, customNodeTypes: NodeTypeDef[] | undefined): GraphDocument {
	const { nodes, edges, graphMeta } = flowStateFromPresetId(presetId, PRESET_LOADERS, customNodeTypes ?? []);
	return flowToDoc(nodes as FlowNodeAny[], edges as Edge[], graphMeta, customNodeTypes);
}

export function compilePresetSnapshot(presetId: PresetId, customNodeTypes: NodeTypeDef[] | undefined): CompileResult | null {
	const doc = graphDocumentForPreset(presetId, customNodeTypes);
	const r = compileGraph(doc);
	if (r.errors.length > 0) return null;
	return r;
}

