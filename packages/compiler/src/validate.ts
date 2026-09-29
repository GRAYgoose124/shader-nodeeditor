import type { BufferId, GraphDocument, GraphEdge, GraphNode, NodeTypeDef } from './types.js';
import { buildIncomingEdgeMap, collectMotifAncestorSet, collectUpstream, edgesForPass, topoOrder } from './graphutil.js';
import { orderedPasses } from './orderPasses.js';
import { validateAllFrameBoundaries } from './subgraphContract.js';

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

export function validateGraph(doc: GraphDocument, registry: Map<string, NodeTypeDef>): ValidationResult {
	const errors: string[] = [];
	const nodesById = new Map(doc.nodes.map((n) => [n.id, n]));

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
		if (def.id === 'sdf_torus') {
			const R = numericData(n.data, 'R');
			const r = numericData(n.data, 'r');
			if (R !== undefined && r !== undefined && R <= r) {
				errors.push(
					`Node ${n.id} (sdf_torus): major R (${R}) should be greater than minor r (${r}) for a non-degenerate torus`,
				);
			}
		}
		if (def.id === 'sdf_primitive' && n.data.shape === 'torus') {
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

		const outputs = passNodes.filter((n) => regId(registry, n.typeId) === 'frag_output');
		if (outputs.length !== 1) {
			errors.push(`Pass ${pass}: need exactly one Fragment output node (found ${outputs.length})`);
			continue;
		}
		const outNode = outputs[0]!;
		const pe = edgesForPass(doc.edges, nodesById, pass);

		const mainReach = collectUpstream(pass, outNode.id, doc.edges, nodesById);
		const sceneSinks = passNodes.filter((n) => regId(registry, n.typeId) === 'scene_sdf_sink');
		const hasRaymarchScene = passNodes.some((n) => regId(registry, n.typeId) === 'raymarch_scene');
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
			const paramPs = passNodes.filter((n) => regId(registry, n.typeId) === 'sdf_param_p');
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
		for (const n of passNodes) {
			if (!allowed.has(n.id)) {
				errors.push(`Pass ${pass}: node ${n.id} is not connected to Fragment output or Scene SDF sink`);
			}
		}

		const topoMain = topoOrder(mainReach, pe);
		if (!topoMain) {
			errors.push(`Pass ${pass}: cycle in main graph`);
		}

		if (sceneSinks.length === 1) {
			const peScene = pe.filter((e) => sceneReach.has(e.source) && sceneReach.has(e.target));
			const topoScene = topoOrder(sceneReach, peScene);
			if (!topoScene) {
				errors.push(`Pass ${pass}: cycle in scene SDF graph`);
			}

			const fractalFb = passNodes.filter(
				(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === 'sdf_tessellate_feedback',
			);
			const paramPInScene = passNodes.filter(
				(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === 'sdf_param_p',
			);
			if (fractalFb.length > 1) {
				errors.push(
					`Pass ${pass}: at most one "SDF feedback tessellation" node per scene (found ${fractalFb.length})`,
				);
			} else if (fractalFb.length === 1 && paramPInScene.length === 1) {
				const F = fractalFb[0]!;
				const dEdge = pe.find((e) => e.target === F.id && e.targetHandle === 'd');
				if (!dEdge) {
					errors.push(`Pass ${pass}: sdf_tessellate_feedback missing distance input`);
				} else {
					const paramPId = paramPInScene[0]!.id;
					const incoming = buildIncomingEdgeMap(pe);
					const M = collectMotifAncestorSet(dEdge.source, paramPId, incoming);
					if (!M.has(paramPId)) {
						errors.push(
							`Pass ${pass}: sdf_tessellate_feedback motif must reach Scene position p (wire the distance from a subgraph fed by sdf_param_p)`,
						);
					} else {
						const outgoing = new Map<string, GraphEdge[]>();
						for (const e of pe) {
							const arr = outgoing.get(e.source) ?? [];
							arr.push(e);
							outgoing.set(e.source, arr);
						}
						for (const nid of M) {
							if (nid === paramPId) continue;
							for (const e of outgoing.get(nid) ?? []) {
								if (!M.has(e.target) && e.target !== F.id) {
									errors.push(
										`Pass ${pass}: sdf_tessellate_feedback motif is wired to ${e.target} outside the motif (only the feedback node may consume the motif distance output)`,
									);
								}
							}
						}
					}
				}
			}
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
			if (def.id === 'sdf_param_p') continue;
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
				const arr = byHandle.get(inp.id);
				if (!arr || arr.length === 0) {
					errors.push(`Pass ${pass}: node ${n.id} missing input "${inp.id}"`);
					continue;
				}
				if (arr.length > 1) {
					errors.push(
						`Pass ${pass}: node ${n.id} has multiple wires into input "${inp.id}" (${arr.length}); only one source may feed each port`,
					);
					continue;
				}
				const ed = arr[0]!;
				if (!allowed.has(ed.source)) {
					errors.push(`Pass ${pass}: node ${n.id} input "${inp.id}" from unknown node`);
				}
				if (onlyMain && !mainReach.has(ed.source)) {
					errors.push(`Pass ${pass}: node ${n.id} input "${inp.id}" must come from main graph`);
				}
				if (onlyScene && !sceneReach.has(ed.source)) {
					errors.push(`Pass ${pass}: scene node ${n.id} input "${inp.id}" must come from scene graph`);
				}
			}
		}
	}

	errors.push(...validateAllFrameBoundaries(doc));

	return { ok: errors.length === 0, errors };
}
