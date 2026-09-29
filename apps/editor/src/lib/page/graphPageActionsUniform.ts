import { isParamAnimatable, isParamGraphDriveFromEdges, uniformName } from '@shadertoy/compiler';
import type { ParamAnimationSpec, UniformManifestEntry } from '@shadertoy/compiler';
import type { ShadertoyRunner } from '@shadertoy/runner';
import {
	readUniformScalar as readUniformScalarValue,
	resetUniformToDefault,
	setUniformScalarValue,
} from '$lib/page/uniformHelpers.js';
import {
	applyUniformPresetToRunner,
	collectScalarUniformValues,
	graphMetaWithAppendedUniformPreset,
	graphMetaWithoutUniformPresetAt,
} from '$lib/page/uniformPresets.js';
import { sampleParamAnimationValue } from '$lib/paramAnimationRuntime.js';
import { boundsFromParamDef, readParamNumber } from '$lib/editor/paramControls.js';
import type { GraphPageActionApi, GraphPageActions } from './graphPageActionTypes.js';

export function createGraphPageActionsUniform(
	api: GraphPageActionApi,
): Pick<
	GraphPageActions,
	| 'readUniformScalar'
	| 'setUniformScalar'
	| 'resetUniform'
	| 'patchParamAnimations'
	| 'applyPreviewParamAnimations'
	| 'saveUniformPreset'
	| 'applyUniformPreset'
	| 'deleteUniformPreset'
> {
	function readUniformScalar(r: ShadertoyRunner | null, u: UniformManifestEntry): number {
		void api.getUniformUiTick();
		void api.getGraphEpoch();
		return readUniformScalarValue(r, u);
	}

	function setUniformScalar(u: UniformManifestEntry, v: number) {
		setUniformScalarValue(api.getPreviewRunner(), u, v);
		api.bumpUniformUiTick();
	}

	function resetUniform(u: UniformManifestEntry) {
		resetUniformToDefault(api.getPreviewRunner(), u.name);
		api.bumpUniformUiTick();
	}

	function patchParamAnimations(
		mut: (draft: Record<string, ParamAnimationSpec>) => void,
		recompile: boolean,
	) {
		const graphMeta = api.getGraphMeta();
		const ed = { ...(graphMeta.editor ?? {}) };
		const pa = { ...(ed.paramAnimations ?? {}) };
		mut(pa);
		const nextEditor = { ...ed };
		if (Object.keys(pa).length === 0) delete nextEditor.paramAnimations;
		else nextEditor.paramAnimations = pa;
		api.setGraphMeta({ ...graphMeta, editor: nextEditor });
		if (recompile) api.bumpGraphEpoch();
	}

	function applyPreviewParamAnimations(r: ShadertoyRunner) {
		if (!api.getPreviewCompileResult()) {
			return;
		}
		const specs = api.getGraphMeta().editor?.paramAnimations;
		if (!specs) return;
		const registry = api.getRegistry();
		const shaderGraphNodesById = api.getShaderGraphNodesById();
		const edges = api.getEdges();
		const t = r.getEffectiveTimeSec();
		for (const spec of Object.values(specs)) {
			const gn = shaderGraphNodesById.get(spec.nodeId);
			if (!gn) continue;
			if (isParamGraphDriveFromEdges(edges, gn, spec.paramId)) continue;
			const def = registry.get(gn.typeId);
			const p = def?.params.find((x) => x.id === spec.paramId);
			if (!p || !isParamAnimatable(p)) continue;
			const b = boundsFromParamDef(p);
			const center = readParamNumber(gn.data, p, b);
			const v = sampleParamAnimationValue(spec, t, center, b.min, b.max);
			const uname = uniformName(spec.nodeId, spec.paramId);
			r.setUniform(uname, v);
		}
	}

	function saveUniformPreset(name: string) {
		const n = name.trim();
		const previewRunner = api.getPreviewRunner();
		const compileResult = api.getCompileResult();
		if (!n || !previewRunner || compileResult.errors.length > 0) return;
		const values = collectScalarUniformValues(compileResult.manifest, previewRunner);
		api.setGraphMeta(
			graphMetaWithAppendedUniformPreset(
				api.getGraphMeta(),
				api.getUniformPresetsList(),
				n,
				values,
			),
		);
	}

	function applyUniformPreset(index: number) {
		const p = api.getUniformPresetsList()[index];
		if (!p || !api.getPreviewRunner()) return;
		applyUniformPresetToRunner(api.getPreviewRunner()!, p);
		api.bumpUniformUiTick();
	}

	function deleteUniformPreset(index: number) {
		api.setGraphMeta(
			graphMetaWithoutUniformPresetAt(api.getGraphMeta(), api.getUniformPresetsList(), index),
		);
	}

	return {
		readUniformScalar,
		setUniformScalar,
		resetUniform,
		patchParamAnimations,
		applyPreviewParamAnimations,
		saveUniformPreset,
		applyUniformPreset,
		deleteUniformPreset,
	};
}
