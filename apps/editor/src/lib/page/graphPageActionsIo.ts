import type { GraphDocument } from '@shadertoy/compiler';
import { uniformName } from '@shadertoy/compiler';
import type { PresetId } from '$lib/presetIds.js';
import { PRESET_LOADERS } from '$lib/presetRegistry.js';
import {
	exportGraphJson,
	exportLivePageOrAlert,
	exportSubgraphSelectionOrAlert,
	flowStateFromPresetId,
	parseImportGraphFromText,
	parseImportNodeDefsFromText,
	parseSubgraphMergeFromText,
} from '$lib/page/graphFileIo.js';
import { collectScalarUniformValues } from '$lib/page/uniformPresets.js';
import { flowStateFromGraphDocument } from '$lib/page/graphDocumentImport.js';
import type { GraphPageActionApi, GraphPageActions } from './graphPageActionTypes.js';

export function createGraphPageActionsIo(
	api: GraphPageActionApi,
): Pick<
	GraphPageActions,
	| 'loadPreset'
	| 'loadUserPresetFromDoc'
	| 'exportSelectedSubgraph'
	| 'importSubgraphJson'
	| 'exportJson'
	| 'exportLivePage'
	| 'importGraphJson'
	| 'importNodeDefs'
> {
	function loadPreset(which: PresetId) {
		const r = flowStateFromPresetId(which, PRESET_LOADERS, api.getCustomNodeTypes());
		api.setNodes(r.nodes);
		api.setEdges(r.edges);
		api.setGraphMeta({
			...r.graphMeta,
			editor: { ...r.graphMeta.editor, builtinPresetGalleryId: which },
		});
		// Avoid wire-probe / inspector targeting node ids that no longer exist on the new graph.
		api.setSelectedNodeId(null);
		api.setSelectedNodeIds([]);
		api.bumpGraphEpoch();
		api.bumpPreviewTimeRestartKey();
		if (r.graphMeta.editor?.paramAnimations) api.setPreviewPaused(false);
	}

	function loadUserPresetFromDoc(doc: GraphDocument) {
		const snap = flowStateFromGraphDocument(doc);
		api.setNodes(snap.nodes);
		api.setEdges(snap.edges);
		api.setGraphMeta(snap.graphMeta);
		api.setCustomNodeTypes(snap.customNodeTypes);
		api.setSelectedNodeId(null);
		api.setSelectedNodeIds([]);
		api.bumpGraphEpoch();
		api.bumpPreviewTimeRestartKey();
	}

	function exportSelectedSubgraph() {
		exportSubgraphSelectionOrAlert(
			api.getNodes(),
			api.getEdges(),
			api.getSelectedNodeIds(),
			api.getGraphMeta().name ?? 'graph',
		);
	}

	function importSubgraphJson(ev: Event) {
		const f = (ev.target as HTMLInputElement).files?.[0];
		if (!f) return;
		f.text().then((t) => {
			const r = parseSubgraphMergeFromText(t, {
				nodes: api.getNodes(),
				edges: api.getEdges(),
				graphMeta: api.getGraphMeta(),
				customNodeTypes: api.getCustomNodeTypes(),
			});
			if (!r.ok) {
				alert(r.message);
				return;
			}
			api.setNodes(r.snapshot.nodes);
			api.setEdges(r.snapshot.edges);
			api.setGraphMeta(r.snapshot.graphMeta);
			api.setCustomNodeTypes(r.snapshot.customNodeTypes);
			api.setSelectedNodeId(null);
			api.setSelectedNodeIds([]);
			api.bumpGraphEpoch();
		});
		(ev.target as HTMLInputElement).value = '';
	}

	function exportJson() {
		exportGraphJson(api.getNodes(), api.getEdges(), api.getGraphMeta(), api.getCustomNodeTypes());
	}

	function exportLivePage() {
		const compileResult = api.getCompileResult();
		const runner = api.getPreviewRunner();
		let initialUniformScalars: Record<string, number> | undefined;
		if (runner && compileResult.errors.length === 0) {
			initialUniformScalars = collectScalarUniformValues(compileResult.manifest, runner);
			const specs = api.getGraphMeta().editor?.paramAnimations;
			if (specs && initialUniformScalars) {
				for (const spec of Object.values(specs)) {
					if (!spec || typeof spec.nodeId !== 'string' || typeof spec.paramId !== 'string') continue;
					delete initialUniformScalars[uniformName(spec.nodeId, spec.paramId)];
				}
				if (Object.keys(initialUniformScalars).length === 0) initialUniformScalars = undefined;
			}
		}
		exportLivePageOrAlert(compileResult, api.getGraphMeta(), initialUniformScalars);
	}

	function importGraphJson(ev: Event) {
		const f = (ev.target as HTMLInputElement).files?.[0];
		if (!f) return;
		f.text().then((t) => {
			const r = parseImportGraphFromText(t);
			if (!r.ok) {
				alert(r.message);
				return;
			}
			api.setCustomNodeTypes(r.snapshot.customNodeTypes);
			api.setGraphMeta(r.snapshot.graphMeta);
			api.setNodes(r.snapshot.nodes);
			api.setEdges(r.snapshot.edges);
			api.setSelectedNodeId(null);
			api.setSelectedNodeIds([]);
			api.bumpGraphEpoch();
		});
		(ev.target as HTMLInputElement).value = '';
	}

	function importNodeDefs(ev: Event) {
		const f = (ev.target as HTMLInputElement).files?.[0];
		if (!f) return;
		f.text().then((t) => {
			const r = parseImportNodeDefsFromText(t);
			if (!r.ok) {
				alert(r.message);
				return;
			}
			api.setCustomNodeTypes([...api.getCustomNodeTypes(), ...r.defs]);
			api.bumpGraphEpoch();
		});
		(ev.target as HTMLInputElement).value = '';
	}

	return {
		loadPreset,
		loadUserPresetFromDoc,
		exportSelectedSubgraph,
		importSubgraphJson,
		exportJson,
		exportLivePage,
		importGraphJson,
		importNodeDefs,
	};
}
