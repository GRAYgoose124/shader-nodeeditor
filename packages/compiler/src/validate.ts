import type { BufferId, GraphDocument, GraphEdge, GraphNode, NodeTypeDef } from './types.js';
import { resolveIChannelBinding } from './ichannelBinding.js';
import { BuiltinNodeId } from './builtinIds.js';
import { getParamScalar, MAX_PASS_SUBSTEPS, paramById } from './compile/params.js';
import { sceneReachHasSdfAlbedo } from './compile/scene.js';
import { tryStratifyUnionScene } from './compile/stratifiedUnion.js';
import { planRepeatMainZones } from './compile/repeatMain.js';
import { collectUpstream, edgesForPass, topoOrder } from './graphutil.js';
import { orderedPasses } from './orderPasses.js';
import { validateAllFrameBoundaries } from './subgraphContract.js';
import {
	collectExportedFrameInteriorNodeIds,
	validateDomainCallExportedSdf,
	validateDomainCallExportedVec3,
} from './compile/frameFnExport.js';
import type { MotifPullbackPlan } from './compile/motifPullback.js';
import { tryMotifPullbackPlan } from './compile/motifPullback.js';
import {
	motifSliceConflictsWithZonesOrRepeats,
	planSceneSdfRepeatZones,
	sceneReachHasSdfRepeatMarkers,
	zonesAndRepeatsOverlap,
} from './compile/sceneSdfRepeat.js';
import { planSceneSdfZones } from './compile/sceneSdfZone.js';

export interface ValidationResult {
	ok: boolean;
	errors: string[];
}

export function validateCustomGlsl(expr: string): string[] {
	const errs: string[] = [];
	if (expr.includes('#')) errs.push('Expression must not contain #');
	if (expr.includes('__')) errs.push('Expression must not contain __');
	if (/\bmain\b/.test(expr)) errs.push('Expression must not reference main');
	if (expr.length > 4000) errs.push('Expression too long');
	return errs;
}

function regId(registry: Map<string, NodeTypeDef>, typeId: string): string | undefined {
	return registry.get(typeId)?.id;
}

function gcdInt(a: number, b: number): number {
	let x = Math.abs(Math.floor(a));
	let y = Math.abs(Math.floor(b));
	while (y !== 0) {
		const t = x % y;
		x = y;
		y = t;
	}
	return x;
}

export function validateGraph(doc: GraphDocument, registry: Map<string, NodeTypeDef>): ValidationResult {
	const errors: string[] = [];
	const nodesById = new Map(doc.nodes.map((n) => [n.id, n]));

	for (const fr of doc.meta.editor?.frames ?? []) {
		if (fr.exportVec3Fn?.trim() && fr.exportSdfFn?.trim()) {
			errors.push(
				`Frame ${fr.id.slice(0, 8)}…: cannot set both exportVec3Fn and exportSdfFn on the same frame`,
			);
		}
	}

	const mediaIds = new Set((doc.meta.mediaInputs ?? []).map((m) => m.id));
	for (const pass of orderedPasses(doc)) {
		const ch = doc.meta.iChannels?.[pass] ?? {};
		for (const k of [0, 1, 2, 3] as const) {
			const r = resolveIChannelBinding(ch[k]);
			if (r?.kind === 'media' && !mediaIds.has(r.mediaId)) {
				errors.push(`Pass ${pass} iChannel${k}: unknown media input "${r.mediaId}"`);
			}
		}
	}

	function numericData(d: Record<string, unknown>, key: string): number | undefined {
		const v = d[key];
		return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
	}

	for (const n of doc.nodes) {
		const def = registry.get(n.typeId);
		if (!def) {
			errors.push(`Unknown node type: ${n.typeId} (${n.id})`);
			continue;
		}
		if (def.codegenKind === 'glsl_expr') {
			const ex = n.data.expression;
			if (typeof ex !== 'string' || !ex.trim()) {
				errors.push(`Node ${n.id} (${def.id}) needs data.expression string`);
			} else {
				errors.push(...validateCustomGlsl(ex).map((e) => `${n.id}: ${e}`));
			}
		}
		if (def.id === BuiltinNodeId.SdfTorus) {
			const R = numericData(n.data, 'R');
			const r = numericData(n.data, 'r');
			if (R !== undefined && r !== undefined && R <= r) {
				errors.push(
					`Node ${n.id} (sdf_torus): major R (${R}) should be greater than minor r (${r}) for a non-degenerate torus`,
				);
			}
		}
		if (def.id === BuiltinNodeId.SdfTorusKnot) {
			const wp = numericData(n.data, 'windP');
			const wq = numericData(n.data, 'windQ');
			const samples = numericData(n.data, 'samples');
			const refineIters = numericData(n.data, 'refineIters');
			if (wp !== undefined && wq !== undefined) {
				const pi = Math.max(1, Math.floor(wp));
				const qi = Math.max(1, Math.floor(wq));
				if (gcdInt(pi, qi) !== 1) {
					errors.push(
						`Node ${n.id} (sdf_torus_knot): winding p (${pi}) and q (${qi}) must be coprime for a knot`,
					);
				}
			}
			if (samples !== undefined && (samples < 8 || samples > 128)) {
				errors.push(`Node ${n.id} (sdf_torus_knot): samples must be between 8 and 128 (got ${samples})`);
			}
			if (refineIters !== undefined && (refineIters < 0 || refineIters > 16)) {
				errors.push(
					`Node ${n.id} (sdf_torus_knot): Newton iters (refineIters) must be between 0 and 16 (got ${refineIters})`,
				);
			}
		}
		if (def.id === BuiltinNodeId.SdfPrimitive && n.data.shape === 'torus') {
			const R = numericData(n.data, 'R');
			const r = numericData(n.data, 'r');
			if (R !== undefined && r !== undefined && R <= r) {
				errors.push(
					`Node ${n.id} (sdf_primitive torus): major R should be greater than minor r (got R=${R}, r=${r})`,
				);
			}
		}
	}

	const order = orderedPasses(doc);

	for (const pass of order) {
		const passNodes = doc.nodes.filter((n) => n.pass === pass);
		if (passNodes.length === 0) continue;

		const outputs = passNodes.filter((n) => regId(registry, n.typeId) === BuiltinNodeId.FragOutput);
		if (outputs.length !== 1) {
			errors.push(`Pass ${pass}: need exactly one Fragment output node (found ${outputs.length})`);
			continue;
		}
		const outNode = outputs[0]!;
		const pe = edgesForPass(doc.edges, nodesById, pass);

		const mainReach = collectUpstream(pass, outNode.id, doc.edges, nodesById);
		const sceneSinks = passNodes.filter((n) => regId(registry, n.typeId) === BuiltinNodeId.SceneSdfSink);
		const hasRaymarchScene = passNodes.some((n) => regId(registry, n.typeId) === BuiltinNodeId.RaymarchScene);
		if (sceneSinks.length > 1) {
			errors.push(`Pass ${pass}: at most one Scene SDF sink allowed (found ${sceneSinks.length})`);
		}
		if (hasRaymarchScene && sceneSinks.length !== 1) {
			errors.push(`Pass ${pass}: "Raymarch scene SDF" requires exactly one "Scene SDF (return)" node`);
		}
		if (sceneSinks.length === 1 && !hasRaymarchScene) {
			errors.push(`Pass ${pass}: "Scene SDF (return)" requires a "Raymarch scene SDF" node in this pass`);
		}

		let sceneReach = new Set<string>();
		if (sceneSinks.length === 1) {
			sceneReach = collectUpstream(pass, sceneSinks[0]!.id, doc.edges, nodesById);
			const paramPs = passNodes.filter((n) => regId(registry, n.typeId) === BuiltinNodeId.SdfParamP);
			const paramsInScene = paramPs.filter((p) => sceneReach.has(p.id));
			if (paramsInScene.length !== 1) {
				errors.push(
					`Pass ${pass}: scene graph needs exactly one "Scene position p" node (found ${paramsInScene.length})`,
				);
			}
			if (sceneSinks[0] && !sceneReach.has(sceneSinks[0].id)) {
				errors.push(`Pass ${pass}: scene sink not in its own upstream set (internal)`);
			}
		}

		const allowed = new Set<string>([...mainReach, ...sceneReach]);
		for (const nid of collectExportedFrameInteriorNodeIds(doc, pass)) {
			allowed.add(nid);
		}
		for (const n of passNodes) {
			if (regId(registry, n.typeId) === BuiltinNodeId.FeedbackPassSubsteps) {
				allowed.add(n.id);
			}
		}
		for (const n of passNodes) {
			if (!allowed.has(n.id)) {
				errors.push(`Pass ${pass}: node ${n.id} is not connected to Fragment output or Scene SDF sink`);
			}
		}

		const topoMain = topoOrder(mainReach, pe);
		if (!topoMain) {
			errors.push(`Pass ${pass}: cycle in main graph`);
		} else {
			const rep = planRepeatMainZones({ pass, passNodes, nodesById, registry, mainReach, pe });
			if (!rep.ok) errors.push(...rep.errors);
		}

		const substepNodes = passNodes.filter(
			(n) => regId(registry, n.typeId) === BuiltinNodeId.FeedbackPassSubsteps,
		);
		if (pass === 'image' && substepNodes.length > 0) {
			errors.push(`Pass ${pass}: feedback_pass_substeps is not allowed on the image pass`);
		}
		if (substepNodes.length > 1) {
			errors.push(
				`Pass ${pass}: at most one feedback_pass_substeps node allowed (found ${substepNodes.length})`,
			);
		}

		const ps = doc.meta.passSubsteps?.[pass];
		if (
			ps !== undefined &&
			(typeof ps !== 'number' || !Number.isFinite(ps) || ps < 1 || ps > MAX_PASS_SUBSTEPS)
		) {
			errors.push(
				`Pass ${pass}: meta.passSubsteps must be a finite number in [1, ${MAX_PASS_SUBSTEPS}]`,
			);
		}

		if (sceneSinks.length === 1) {
			const peScene = pe.filter((e) => sceneReach.has(e.source) && sceneReach.has(e.target));
			const topoScene = topoOrder(sceneReach, peScene);
			if (!topoScene) {
				errors.push(`Pass ${pass}: cycle in scene SDF graph`);
			}

			const fractalFb = passNodes.filter(
				(n) =>
					sceneReach.has(n.id) &&
					(regId(registry, n.typeId) === BuiltinNodeId.SdfTessellateFeedback ||
						regId(registry, n.typeId) === BuiltinNodeId.SdfIteratePullback),
			);
			const paramPInScene = passNodes.filter(
				(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === BuiltinNodeId.SdfParamP,
			);
			const hasSceneSdfZoneMarkers = passNodes.some(
				(n) =>
					sceneReach.has(n.id) &&
					(regId(registry, n.typeId) === BuiltinNodeId.SceneSdfZoneBegin ||
						regId(registry, n.typeId) === BuiltinNodeId.SceneSdfZoneEnd),
			);
			const hasSceneSdfRepeatMarkers = sceneReachHasSdfRepeatMarkers(sceneReach, passNodes, registry);

			let motifPlanOk: MotifPullbackPlan | null = null;
			if (fractalFb.length > 1) {
				errors.push(
					`Pass ${pass}: at most one fractal motif pullback node per scene — use either "SDF feedback tessellation" or "SDF iterate pullback" (found ${fractalFb.length})`,
				);
			} else if (fractalFb.length === 1 && paramPInScene.length === 1) {
				const F = fractalFb[0]!;
				const mp = tryMotifPullbackPlan({
					pass,
					fractalFb: F,
					paramPId: paramPInScene[0]!.id,
					pe,
					peScene,
					registry,
					nodesById,
				});
				if (!mp.ok) errors.push(...mp.errors);
				else motifPlanOk = mp.plan;
			}

			if (topoScene) {
				const zc = planSceneSdfZones({
					pass,
					passNodes,
					nodesById,
					registry,
					sceneReach,
					pe,
					peScene,
				});
				if (!zc.ok) errors.push(...zc.errors);

				const rc = planSceneSdfRepeatZones({
					pass,
					passNodes,
					nodesById,
					registry,
					sceneReach,
					pe,
					peScene,
				});
				if (!rc.ok) errors.push(...rc.errors);

				if (zc.ok && rc.ok && zc.zones.length > 0 && rc.zones.length > 0) {
					if (zonesAndRepeatsOverlap(zc.zones, rc.zones)) {
						errors.push(
							`Pass ${pass}: scene SDF zone and repeat regions overlap (nested/overlapping zone+repeat bodies not supported in v1)`,
						);
					}
				}

				if (zc.ok && rc.ok && fractalFb.length === 1 && motifPlanOk) {
					const cx = motifSliceConflictsWithZonesOrRepeats(motifPlanOk.M, zc.zones, rc.zones);
					if (cx.conflict) {
						errors.push(
							`Pass ${pass}: fractal motif pullback conflicts with scene SDF zones/repeat (${cx.detail})`,
						);
					}
				}
			}

			if (topoScene && paramPInScene.length === 1) {
				const marchUV = passNodes.find((n) => regId(registry, n.typeId) === BuiltinNodeId.RaymarchScene);
				if (marchUV) {
					const mdef = registry.get(marchUV.typeId);
					const uhn = mdef ? paramById(mdef, 'unionHitNormal') : undefined;
					if (uhn && getParamScalar(marchUV, uhn) > 0.5) {
						const hasSceneAlbedoNodes = sceneReachHasSdfAlbedo(sceneReach, registry, nodesById);
						const albShadeP = mdef ? paramById(mdef, 'sdfAlbedoShadeOn') : undefined;
						const sdfAlbedoShadeOn = !!(albShadeP && getParamScalar(marchUV, albShadeP) > 0.5);
						const emitHitBody = hasSceneAlbedoNodes && sdfAlbedoShadeOn;
						const fractalOne = fractalFb.length === 1 ? fractalFb[0] : undefined;
						const st = tryStratifyUnionScene({
							pass,
							sceneSinkId: sceneSinks[0]!.id,
							sceneReach,
							peScene,
							nodesById,
							registry,
							paramPId: paramPInScene[0]!.id,
							topoScene,
							hasFractalFeedback: !!fractalOne,
							emitSceneHitBody: emitHitBody,
							hasSceneSdfZoneMarkers,
							hasSceneSdfRepeatMarkers,
						});
						if (!st.ok) {
							const deferStratifyForZones =
								hasSceneSdfZoneMarkers && st.reason === 'scene SDF zone markers present';
							const deferStratifyForRepeat =
								hasSceneSdfRepeatMarkers && st.reason === 'scene SDF repeat markers present';
							if (!deferStratifyForZones && !deferStratifyForRepeat) {
								errors.push(
									`Pass ${pass}: Union hit normal (winning strand) requires a stratifiable pure op_union scene (${st.reason})`,
								);
							}
						}
					}
				}
			}

			errors.push(...validateDomainCallExportedVec3(doc, pass, registry, nodesById));
			errors.push(...validateDomainCallExportedSdf(doc, pass, registry, nodesById));
		}

		for (const e of pe) {
			if (!allowed.has(e.source) || !allowed.has(e.target)) continue;
			const src = nodesById.get(e.source);
			const tgt = nodesById.get(e.target);
			if (!src || !tgt) continue;
			const sDef = registry.get(src.typeId);
			const tDef = registry.get(tgt.typeId);
			if (!sDef || !tDef) continue;
			const sport = sDef.outputs.find((o) => o.id === e.sourceHandle);
			const tport = tDef.inputs.find((i) => i.id === e.targetHandle);
			if (!sport) errors.push(`Edge ${e.id}: unknown source handle ${e.sourceHandle}`);
			if (!tport) errors.push(`Edge ${e.id}: unknown target handle ${e.targetHandle}`);
			if (sport && tport && sport.type !== tport.type) {
				errors.push(`Edge ${e.id}: type mismatch ${sport.type} → ${tport.type}`);
			}
		}

		for (const nid of allowed) {
			const n = nodesById.get(nid)!;
			const def = registry.get(n.typeId);
			if (!def || def.codegenKind === 'glsl_expr') continue;
			if (def.id === BuiltinNodeId.SdfParamP) continue;
			const incoming = pe.filter((e) => e.target === nid);
			const byHandle = new Map<string, GraphEdge[]>();
			for (const e of incoming) {
				const arr = byHandle.get(e.targetHandle) ?? [];
				arr.push(e);
				byHandle.set(e.targetHandle, arr);
			}
			const onlyMain = mainReach.has(nid) && !sceneReach.has(nid);
			const onlyScene = sceneReach.has(nid) && !mainReach.has(nid);

			for (const inp of def.inputs) {
				if (inp.optional) continue;
				const arr = byHandle.get(inp.id);
				if (!arr || arr.length === 0) {
					errors.push(`Pass ${pass}: node ${n.id} missing input "${inp.id}"`);
					continue;
				}
				if (arr.length > 1) {
					const eids = arr.map((e) => e.id).join(', ');
					errors.push(
						`Pass ${pass}: node ${n.id} has multiple wires into input "${inp.id}" (${arr.length}); only one source may feed each port; edges ${eids}`,
					);
					continue;
				}
				const ed = arr[0]!;
				if (!allowed.has(ed.source)) {
					errors.push(
						`Pass ${pass}: node ${n.id} input "${inp.id}" from unknown node; edge ${ed.id}`,
					);
				}
				if (onlyMain && !mainReach.has(ed.source)) {
					errors.push(
						`Pass ${pass}: node ${n.id} input "${inp.id}" must come from main graph; edge ${ed.id}`,
					);
				}
				if (onlyScene && !sceneReach.has(ed.source)) {
					errors.push(
						`Pass ${pass}: scene node ${n.id} input "${inp.id}" must come from scene graph; edge ${ed.id}`,
					);
				}
			}
		}
	}

	errors.push(...validateAllFrameBoundaries(doc));

	return { ok: errors.length === 0, errors };
}
