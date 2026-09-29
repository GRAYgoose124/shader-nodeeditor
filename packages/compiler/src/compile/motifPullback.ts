import { BuiltinNodeId } from '../builtinIds.js';
import { indentBlock } from '../glslPrelude.js';
import { outVar, sanitizeNodeId } from '../ident.js';
import type { BufferId, GraphDocument, GraphEdge, GraphNode, NodeTypeDef, UniformManifestEntry } from '../types.js';
import { buildIncomingEdgeMap, collectMotifAncestorSet, topoOrder } from '../graphutil.js';
import {
	emitSceneNodeLine,
	motifUsesWorldSamplingPort,
	wireMapForNode,
	type MotifWireContext,
} from './scene.js';
import {
	ensureFloatUniform,
	getParamChoice,
	literalParamGlsl,
	paramById,
} from './params.js';
import { rewriteDomainCallExportedVec3WireMap } from './domainCallExportedArg.js';

function regId(registry: Map<string, NodeTypeDef>, typeId: string): string | undefined {
	return registry.get(typeId)?.id;
}

export function isMotifPullbackBuiltin(defId: string | undefined): boolean {
	return defId === BuiltinNodeId.SdfTessellateFeedback || defId === BuiltinNodeId.SdfIteratePullback;
}

export type MotifPullbackPlan = {
	fractalFb: GraphNode;
	M: Set<string>;
	topoM: string[];
	producerY: string;
};

/**
 * Validates motif pullback wiring and extracts the motif subgraph for compile / validate.
 */
export function tryMotifPullbackPlan(args: {
	pass: BufferId;
	fractalFb: GraphNode;
	paramPId: string;
	pe: GraphEdge[];
	peScene: GraphEdge[];
	registry: Map<string, NodeTypeDef>;
	nodesById: Map<string, GraphNode>;
}): { ok: true; plan: MotifPullbackPlan } | { ok: false; errors: string[] } {
	const { pass, fractalFb, paramPId, pe, peScene, registry, nodesById } = args;
	const dEdge = pe.find((e) => e.target === fractalFb.id && e.targetHandle === 'd');
	if (!dEdge) {
		return {
			ok: false,
			errors: [`Pass ${pass}: fractal motif pullback node missing distance input (${fractalFb.id})`],
		};
	}
	const producerY = dEdge.source;
	if (producerY === fractalFb.id) {
		return {
			ok: false,
			errors: [
				`Pass ${pass}: fractal motif pullback (${fractalFb.id}) distance input must come from the motif subgraph, not from the pullback node itself`,
			],
		};
	}

	const incoming = buildIncomingEdgeMap(pe);
	const M = collectMotifAncestorSet(producerY, paramPId, incoming);
	if (!M.has(paramPId)) {
		return {
			ok: false,
			errors: [
				`Pass ${pass}: fractal motif pullback (${fractalFb.id}) must reach Scene position p (wire distance from a subgraph fed by sdf_param_p)`,
			],
		};
	}

	if (M.size === 0) {
		return {
			ok: false,
			errors: [`Pass ${pass}: fractal motif pullback (${fractalFb.id}) has empty motif subgraph`],
		};
	}

	const paramPCount = [...M].filter((nid) => regId(registry, nodesById.get(nid)!.typeId) === BuiltinNodeId.SdfParamP)
		.length;
	if (paramPCount > 1) {
		return {
			ok: false,
			errors: [
				`Pass ${pass}: fractal motif pullback (${fractalFb.id}) motif subgraph contains more than one Scene position p node (ambiguous)`,
			],
		};
	}

	for (const nid of M) {
		if (nid === fractalFb.id) continue;
		const defId = regId(registry, nodesById.get(nid)!.typeId);
		if (isMotifPullbackBuiltin(defId)) {
			return {
				ok: false,
				errors: [
					`Pass ${pass}: fractal motif pullback (${fractalFb.id}) motif must not contain another pullback node (${nid})`,
				],
			};
		}
	}

	const topoM = topoOrder(M, peScene);
	if (!topoM) {
		return {
			ok: false,
			errors: [`Pass ${pass}: fractal motif pullback subgraph has a cycle (${fractalFb.id})`],
		};
	}

	const outgoing = new Map<string, GraphEdge[]>();
	for (const e of pe) {
		const arr = outgoing.get(e.source) ?? [];
		arr.push(e);
		outgoing.set(e.source, arr);
	}
	for (const nid of M) {
		if (nid === paramPId) continue;
		for (const e of outgoing.get(nid) ?? []) {
			if (!M.has(e.target) && e.target !== fractalFb.id) {
				return {
					ok: false,
					errors: [
						`Pass ${pass}: fractal motif pullback (${fractalFb.id}) motif is wired to ${e.target} outside the motif (only the pullback node may consume the motif distance output)`,
					],
				};
			}
		}
	}

	return {
		ok: true,
		plan: { fractalFb, M, topoM, producerY },
	};
}

export function emitMotifPullbackGlsl(args: {
	doc: GraphDocument;
	plan: MotifPullbackPlan;
	pe: GraphEdge[];
	registry: Map<string, NodeTypeDef>;
	nodesById: Map<string, GraphNode>;
	passUniforms: UniformManifestEntry[];
	pass: BufferId;
	hasSceneAlbedoNodes: boolean;
	emitHitBody: boolean;
	paramPId: string;
	animatedKeys: Set<string>;
	exportedInteriorSkip: Set<string>;
}): {
	motifPreamble: string;
	motifSkip: Set<string>;
	fractalBodyD: string;
	fractalBodyHit: string;
} {
	const {
		doc,
		plan,
		pe,
		registry,
		nodesById,
		passUniforms,
		pass,
		hasSceneAlbedoNodes,
		emitHitBody,
		paramPId,
		animatedKeys,
		exportedInteriorSkip,
	} = args;
	const { fractalFb, M, topoM, producerY } = plan;

	const twoArgMotif = motifUsesWorldSamplingPort(topoM, pe, paramPId, registry, nodesById);
	const motifWire: MotifWireContext | null = twoArgMotif ? { registry, nodesById } : null;
	const motifLines: string[] = [];
	for (const nid of topoM) {
		const n = nodesById.get(nid)!;
		const d = registry.get(n.typeId);
		if (!d || d.id === BuiltinNodeId.SdfParamP) continue;
		let wm = wireMapForNode(nid, pe, M, paramPId, motifWire);
		wm = rewriteDomainCallExportedVec3WireMap(wm, {
			doc,
			callNode: n,
			registry,
			nodesById,
			pe,
			pass,
			paramPId,
			motifAncestorIds: M,
			exportedInteriorSkip,
		});
		const code = emitSceneNodeLine(
			nid,
			n,
			d,
			pe,
			M,
			wm,
			registry,
			nodesById,
			passUniforms,
			pass,
			false,
			hasSceneAlbedoNodes,
			paramPId,
			motifWire,
			animatedKeys,
		);
		if (code.trim()) motifLines.push(code);
	}
	const retVar = outVar(producerY, 'd');
	const nsF = sanitizeNodeId(fractalFb.id);
	const motifFnName = `motif_${nsF}`;
	const motifInner = `${motifLines.join('\n')}\nreturn ${retVar};`;
	const motifPreamble = twoArgMotif
		? `float ${motifFnName}(vec3 q, vec3 pScene) {\n${indentBlock(motifInner, '  ')}\n}\n\n`
		: `float ${motifFnName}(vec3 p) {\n${indentBlock(motifInner, '  ')}\n}\n\n`;

	const Fdef = registry.get(fractalFb.typeId)!;
	const ox = ensureFloatUniform(fractalFb, paramById(Fdef, 'foldOx'), passUniforms, animatedKeys);
	const oy = ensureFloatUniform(fractalFb, paramById(Fdef, 'foldOy'), passUniforms, animatedKeys);
	const oz = ensureFloatUniform(fractalFb, paramById(Fdef, 'foldOz'), passUniforms, animatedKeys);
	const sc = ensureFloatUniform(fractalFb, paramById(Fdef, 'scale'), passUniforms, animatedKeys);
	const itersLit = literalParamGlsl(fractalFb, paramById(Fdef, 'iters')!);
	const outD = outVar(fractalFb.id, 'd');
	const motifCallQ = twoArgMotif ? `${motifFnName}(qtf_${nsF}, p)` : `${motifFnName}(qtf_${nsF})`;
	const motifCallP = twoArgMotif ? `${motifFnName}(p, p)` : `${motifFnName}(p)`;

	const loopModeRaw = getParamChoice(
		fractalFb,
		paramById(Fdef, 'loopMode'),
		Fdef.id === BuiltinNodeId.SdfIteratePullback ? 'kifs' : 'scale_only',
	);
	const loopMode =
		loopModeRaw === 'scale_only' || loopModeRaw === 'fold_no_scale' ? loopModeRaw : 'kifs';

	const combineModeRaw = getParamChoice(fractalFb, paramById(Fdef, 'combineMode'), 'min');
	const combineMode = combineModeRaw === 'smin' ? 'smin' : 'min';

	const distanceNormRaw = getParamChoice(fractalFb, paramById(Fdef, 'distanceNorm'), 'by_weight');
	const distanceNorm = distanceNormRaw === 'raw' ? 'raw' : 'by_weight';
	const divideByWeight = distanceNorm !== 'raw';

	const combineK =
		combineMode === 'smin'
			? ensureFloatUniform(fractalFb, paramById(Fdef, 'combineK'), passUniforms, animatedKeys)
			: null;

	const mergeCandidateLine = (candidateExpr: string): string => {
		if (combineMode === 'smin' && combineK) {
			return `  float ka_${nsF} = max(float(${combineK}), 1e-5);
  float ha_${nsF} = clamp(0.5 + 0.5 * (${candidateExpr} - ${outD}) / ka_${nsF}, 0.0, 1.0);
  ${outD} = mix(${candidateExpr}, ${outD}, ha_${nsF}) - ka_${nsF} * ha_${nsF} * (1.0 - ha_${nsF});`;
		}
		return `  ${outD} = min(${outD}, ${candidateExpr});`;
	};

	let iterLoopBody: string;
	if (loopMode === 'scale_only') {
		const cand = divideByWeight ? `${motifCallQ} / wtf_${nsF}` : `${motifCallQ}`;
		iterLoopBody = `  qtf_${nsF} *= float(${sc});
  wtf_${nsF} *= float(${sc});
${mergeCandidateLine(cand)}`;
	} else if (loopMode === 'fold_no_scale') {
		iterLoopBody = `  qtf_${nsF} = abs(qtf_${nsF}) - vec3(float(${ox}), float(${oy}), float(${oz}));
${mergeCandidateLine(motifCallQ)}`;
	} else {
		const cand = divideByWeight ? `${motifCallQ} / wtf_${nsF}` : `${motifCallQ}`;
		iterLoopBody = `  qtf_${nsF} = abs(qtf_${nsF}) - vec3(float(${ox}), float(${oy}), float(${oz}));
  qtf_${nsF} *= float(${sc});
  wtf_${nsF} *= float(${sc});
${mergeCandidateLine(cand)}`;
	}

	const kifsLoop = `for (int itf_${nsF} = 0; itf_${nsF} < 8; itf_${nsF}++) {
  if (float(itf_${nsF}) >= float(${itersLit})) break;
${iterLoopBody}
}`;

	const nodeFractalLabel =
		Fdef.id === BuiltinNodeId.SdfIteratePullback
			? `SDF iterate pullback (${loopMode})`
			: `SDF feedback tessellation (${loopMode})`;

	const initLines =
		loopMode === 'fold_no_scale'
			? `vec3 qtf_${nsF} = p;
float ${outD} = ${motifCallP};
${kifsLoop}`
			: `vec3 qtf_${nsF} = p;
float wtf_${nsF} = 1.0;
float ${outD} = ${motifCallP};
${kifsLoop}`;

	const fractalMatLine = `vec3 ${outVar(fractalFb.id, 'mat')} = vec3(1.0);\n`;
	const fractalBodyD = `// node: ${fractalFb.id} — ${nodeFractalLabel}
${initLines}`;
	const fractalBodyHit = emitHitBody ? fractalBodyD + fractalMatLine : fractalBodyD;

	return {
		motifPreamble,
		motifSkip: M,
		fractalBodyD,
		fractalBodyHit,
	};
}
