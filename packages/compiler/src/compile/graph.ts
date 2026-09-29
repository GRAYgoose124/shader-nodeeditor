import { expandTemplate, type ExpandOpts } from './template.js';
import { clampPassSubsteps, ensureFloatUniform, getParamScalar, paramById } from './params.js';
import { outVar, sanitizeNodeId } from '../ident.js';
import { buildRegistry } from '../registry.js';
import type {
	BufferId,
	CompileDebugOptions,
	CompileResult,
	GraphDocument,
	GraphNode,
	NodeTypeDef,
	PassManifest,
	UniformManifestEntry,
} from '../types.js';
import { GLOBAL_UNIFORMS } from '../globalUniforms.js';
import { resolveIChannelBinding } from '../ichannelBinding.js';
import { collectUpstream, edgesForPass, sceneFnSuffix, topoOrder } from '../graphutil.js';
import { emitPassFragment } from './emitPassFragment.js';
import { glslUniformDecl, indentBlock, VERTEX_SHADER } from '../glslPrelude.js';
import { orderedPasses } from '../orderPasses.js';
import { paramAnimationKeysFromMeta } from '../paramAnimation.js';
import { validateGraph } from '../validate.js';
import { BuiltinNodeId } from '../builtinIds.js';
import { emitSceneNodeLine, sceneReachHasSdfAlbedo, wireMapForNode } from './scene.js';
import { emitRepeatZoneBlock, planRepeatMainZones, topoRepeatBody } from './repeatMain.js';
import { tryStratifyUnionScene, sceneStrandFnName } from './stratifiedUnion.js';
import {
	collectExportedFrameInteriorNodeIds,
	emitSceneExportFrameFns,
} from './frameFnExport.js';
import { rewriteDomainCallExportedVec3WireMap } from './domainCallExportedArg.js';
import { emitMotifPullbackGlsl, isMotifPullbackBuiltin, tryMotifPullbackPlan } from './motifPullback.js';
import {
	emitSceneSdfZoneHelperGlsl,
	emitSceneSdfZoneHitHelperGlsl,
	planSceneSdfZones,
	sceneSdfZoneEndFnMap,
	sceneSdfZoneHitFnName,
	sceneSdfZoneSkipSet,
	sortSceneSdfZonesByTopo,
} from './sceneSdfZone.js';
import {
	emitSceneSdfRepeatMinBlock,
	planSceneSdfRepeatZones,
	sceneRepeatTopoBody,
	sceneSdfRepeatEndPlanMap,
	sceneSdfRepeatSkipSet,
	sceneReachHasSdfRepeatMarkers,
	sortSceneSdfRepeatZonesByTopo,
} from './sceneSdfRepeat.js';
import { pushSceneSdfProbeUniforms, sceneSdfProbeMainPreamble } from './sceneSdfProbe.js';
import { emitWireProbeTail, pushWireProbeUniforms } from './wireProbe.js';

function regId(registry: Map<string, NodeTypeDef>, typeId: string): string | undefined {
	return registry.get(typeId)?.id;
}

function nestMinSceneCalls(parts: string[]): string {
	if (parts.length === 1) return parts[0]!;
	const [a, ...rest] = parts;
	return `min(${a!}, ${nestMinSceneCalls(rest)})`;
}

function resolvePassSubsteps(
	doc: GraphDocument,
	pass: BufferId,
	passNodes: GraphNode[],
	registry: Map<string, NodeTypeDef>,
): number {
	if (pass === 'image') return 1;
	const fromMeta = clampPassSubsteps(doc.meta.passSubsteps?.[pass] ?? 1);
	const subNodes = passNodes.filter((n) => regId(registry, n.typeId) === BuiltinNodeId.FeedbackPassSubsteps);
	if (subNodes.length === 0) return fromMeta;
	const node = subNodes[0]!;
	const def = registry.get(node.typeId);
	if (!def) return fromMeta;
	const pCount = paramById(def, 'count');
	const raw = pCount ? getParamScalar(node, pCount) : 1;
	return clampPassSubsteps(raw);
}

type PassCompileOk = {
	pass: BufferId;
	vertexSource: string;
	fragmentSource: string;
	manifest: PassManifest;
};

type PassCompileErr = { errors: string[] };

function compileOnePass(args: {
	doc: GraphDocument;
	pass: BufferId;
	registry: Map<string, NodeTypeDef>;
	nodesById: Map<string, GraphNode>;
	animatedKeys: Set<string>;
	debug?: CompileDebugOptions;
}): PassCompileOk | PassCompileErr {
	const { doc, pass, registry, nodesById, animatedKeys, debug } = args;

	// Stage: pass partitioning
	const passNodes = doc.nodes.filter((n) => n.pass === pass);
	if (passNodes.length === 0) return { errors: [] };

	// Stage: reachability + topo (main graph)
	const outFrag = passNodes.find((n) => regId(registry, n.typeId) === BuiltinNodeId.FragOutput);
	if (!outFrag) return { errors: [] };

	const mainReach = collectUpstream(pass, outFrag.id, doc.edges, nodesById);
	const pe = edgesForPass(doc.edges, nodesById, pass);
	const peMain = pe.filter((e) => mainReach.has(e.source) && mainReach.has(e.target));
	const topoMain = topoOrder(mainReach, peMain);
	if (!topoMain) return { errors: [`Pass ${pass}: internal topo failed (main)`] };

	// Stage: scene subgraph emission (optional)
	const passUniforms: UniformManifestEntry[] = [];
	let sceneFnBlock = '';
	let sceneFnName = '';
	let sceneReach = new Set<string>();
	let emitSceneHitForPass = false;
	let sceneStrandRayOpts: Partial<ExpandOpts> = {};

	const sceneSinkNode = passNodes.find((n) => regId(registry, n.typeId) === BuiltinNodeId.SceneSdfSink);
	if (sceneSinkNode) {
		sceneReach = collectUpstream(pass, sceneSinkNode.id, doc.edges, nodesById);
		const peScene = pe.filter((e) => sceneReach.has(e.source) && sceneReach.has(e.target));
		const topoScene = topoOrder(sceneReach, peScene);
		if (!topoScene) return { errors: [`Pass ${pass}: internal topo failed (scene SDF)`] };

		const passSfx = sceneFnSuffix(pass);
		sceneFnName = `scene_sdf_${passSfx}`;

		const exportedInteriorSkip = collectExportedFrameInteriorNodeIds(doc, pass);

		const paramPNode = passNodes.find(
			(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === BuiltinNodeId.SdfParamP,
		);
		const paramPId = paramPNode?.id ?? null;

		const hasSceneAlbedoNodes = sceneReachHasSdfAlbedo(sceneReach, registry, nodesById);
		const marchNode = passNodes.find((n) => regId(registry, n.typeId) === BuiltinNodeId.RaymarchScene);
		const marchTy = marchNode ? registry.get(marchNode.typeId) : undefined;
		const albShadeP = marchTy && paramById(marchTy, 'sdfAlbedoShadeOn');
		const sdfAlbedoShadeOn = !!(marchNode && albShadeP && getParamScalar(marchNode, albShadeP) > 0.5);
		const emitHitBody = hasSceneAlbedoNodes && sdfAlbedoShadeOn;
		emitSceneHitForPass = emitHitBody;

		let motifPreamble = '';
		let motifSkip = new Set<string>();
		let fractalBodyD: string | null = null;
		let fractalBodyHit: string | null = null;

		const fractalFb = passNodes.find(
			(n) => sceneReach.has(n.id) && isMotifPullbackBuiltin(regId(registry, n.typeId)),
		);
		if (fractalFb && paramPId) {
			const mp = tryMotifPullbackPlan({
				pass,
				fractalFb,
				paramPId,
				pe,
				peScene,
				registry,
				nodesById,
			});
			if (!mp.ok) return { errors: mp.errors };
			const emitted = emitMotifPullbackGlsl({
				doc,
				plan: mp.plan,
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
			});
			motifPreamble = emitted.motifPreamble;
			motifSkip = emitted.motifSkip;
			fractalBodyD = emitted.fractalBodyD;
			fractalBodyHit = emitted.fractalBodyHit;
		}

		const sceneReachForExports = new Set([...sceneReach, ...exportedInteriorSkip]);
		const exportFnRes = emitSceneExportFrameFns({
			doc,
			pass,
			registry,
			nodesById,
			sceneReach: sceneReachForExports,
			pe,
			passUniforms,
			animatedKeys,
		});
		if (exportFnRes.errors.length) return { errors: exportFnRes.errors };
		const exportFnGlsl = exportFnRes.glsl;

		const hasSceneSdfZoneMarkers = passNodes.some(
			(n) =>
				sceneReach.has(n.id) &&
				(regId(registry, n.typeId) === BuiltinNodeId.SceneSdfZoneBegin ||
					regId(registry, n.typeId) === BuiltinNodeId.SceneSdfZoneEnd),
		);

		const zonePlanRes = planSceneSdfZones({
			pass,
			passNodes,
			nodesById,
			registry,
			sceneReach,
			pe,
			peScene,
		});
		if (!zonePlanRes.ok) return { errors: zonePlanRes.errors };
		const sceneZonesSorted = sortSceneSdfZonesByTopo(zonePlanRes.zones, topoScene);
		const zoneSkip = sceneSdfZoneSkipSet(sceneZonesSorted);
		const zoneEndFn = sceneSdfZoneEndFnMap(sceneZonesSorted);

		const repeatPlanRes = planSceneSdfRepeatZones({
			pass,
			passNodes,
			nodesById,
			registry,
			sceneReach,
			pe,
			peScene,
		});
		if (!repeatPlanRes.ok) return { errors: repeatPlanRes.errors };
		const sceneRepeatsSorted = sortSceneSdfRepeatZonesByTopo(repeatPlanRes.zones, topoScene);
		const repeatSkip = sceneSdfRepeatSkipSet(sceneRepeatsSorted);
		const repeatEndPlan = sceneSdfRepeatEndPlanMap(sceneRepeatsSorted);

		const hasSceneSdfRepeatMarkers = sceneReachHasSdfRepeatMarkers(sceneReach, passNodes, registry);

		const zoneHelpersGlsl = sceneZonesSorted
			.map((zone) =>
				emitSceneSdfZoneHelperGlsl({
					zone,
					peScene,
					pe,
					sceneReach,
					paramPId,
					registry,
					nodesById,
					passUniforms,
					pass,
					hasSceneAlbedoNodes,
					emitHitBody,
					motifSkip,
					exportedInteriorSkip,
					animatedKeys,
				}),
			)
			.join('\n\n');
		const zoneHitHelpersGlsl =
			emitHitBody && sceneZonesSorted.length > 0
				? sceneZonesSorted
						.map((zone) =>
							emitSceneSdfZoneHitHelperGlsl({
								zone,
								peScene,
								pe,
								sceneReach,
								paramPId,
								registry,
								nodesById,
								passUniforms,
								pass,
								motifSkip,
								exportedInteriorSkip,
								animatedKeys,
							}),
						)
						.join('\n\n')
				: '';
		const zoneBlockPrefix = [zoneHelpersGlsl, zoneHitHelpersGlsl].filter(Boolean).join('\n\n');
		const zoneBlockPrefixFinal = zoneBlockPrefix ? `${zoneBlockPrefix}\n\n` : '';

		const pushSceneLines = (fractalChunk: string | null, hitMat: boolean): string[] => {
			const passthroughAlbedo = hasSceneAlbedoNodes && (!emitHitBody || !hitMat);
			const acc: string[] = [];
			for (const nid of topoScene) {
				const node = nodesById.get(nid)!;
				const def = registry.get(node.typeId);
				if (!def) continue;
				if (def.id === BuiltinNodeId.SdfParamP) continue;
				if (motifSkip.size > 0 && motifSkip.has(nid)) continue;
				if (isMotifPullbackBuiltin(def.id)) {
					if (fractalChunk) acc.push(fractalChunk);
					continue;
				}
				if (exportedInteriorSkip.has(nid)) continue;

				const rep = repeatEndPlan.get(nid);
				if (rep) {
					const topoB = sceneRepeatTopoBody(rep, peScene);
					if (!topoB) {
						acc.push(`// internal: scene_sdf_repeat topo failed ${nid}`);
						continue;
					}
					const accV = `acc_rep_${sanitizeNodeId(nid)}`;
					const tailD = outVar(rep.tailSourceId, rep.tailSourceHandle);
					const block = emitSceneSdfRepeatMinBlock({
						zone: rep,
						topoBody: topoB,
						emitLine: (id, lopts) => {
							const nN = nodesById.get(id)!;
							const dN = registry.get(nN.typeId)!;
							let wmN = wireMapForNode(id, pe, sceneReach, paramPId);
							wmN = rewriteDomainCallExportedVec3WireMap(wmN, {
								doc,
								callNode: nN,
								registry,
								nodesById,
								pe,
								pass,
								paramPId,
								motifAncestorIds: motifSkip.size > 0 ? motifSkip : null,
								exportedInteriorSkip,
							});
							return emitSceneNodeLine(
								id,
								nN,
								dN,
								pe,
								sceneReach,
								wmN,
								registry,
								nodesById,
								passUniforms,
								pass,
								hitMat,
								passthroughAlbedo,
								paramPId,
								null,
								animatedKeys,
								lopts,
							);
						},
						accVar: accV,
						tailDExpr: tailD,
					});
					const od = outVar(nid, 'd');
					acc.push(
						`float ${accV} = 1e9;\n// node: ${nid} — scene_sdf_repeat_end "${rep.zoneKey}"\n${block}\nfloat ${od} = ${accV};`,
					);
					continue;
				}

				if (repeatSkip.has(nid)) continue;
				if (zoneSkip.has(nid)) continue;
				if (def.id === BuiltinNodeId.SceneSdfZoneEnd) {
					const zfn = zoneEndFn.get(nid);
					if (zfn) {
						const od = outVar(nid, 'd');
						if (hitMat && emitHitBody) {
							const zh = sceneSdfZoneHitFnName(zfn);
							const om = outVar(nid, 'mat');
							acc.push(
								`// node: ${nid} — scene_sdf_zone_end (hit)\nfloat ${od};\nvec3 ${om};\n${zh}(p, ${od}, ${om});`,
							);
						} else {
							acc.push(`// node: ${nid} — scene_sdf_zone_end\nfloat ${od} = ${zfn}(p);`);
						}
					}
					continue;
				}
				let wm = wireMapForNode(nid, pe, sceneReach, paramPId);
				wm = rewriteDomainCallExportedVec3WireMap(wm, {
					doc,
					callNode: node,
					registry,
					nodesById,
					pe,
					pass,
					paramPId,
					motifAncestorIds: motifSkip.size > 0 ? motifSkip : null,
					exportedInteriorSkip,
				});
				const code = emitSceneNodeLine(
					nid,
					node,
					def,
					pe,
					sceneReach,
					wm,
					registry,
					nodesById,
					passUniforms,
					pass,
					hitMat,
					passthroughAlbedo,
					paramPId,
					null,
					animatedKeys,
				);
				if (code.trim()) acc.push(code);
			}
			return acc;
		};

		const stratifyTry = tryStratifyUnionScene({
			pass,
			sceneSinkId: sceneSinkNode.id,
			sceneReach,
			peScene,
			nodesById,
			registry,
			paramPId,
			topoScene,
			hasFractalFeedback: !!fractalFb,
			emitSceneHitBody: emitHitBody,
			hasSceneSdfZoneMarkers,
			hasSceneSdfRepeatMarkers,
		});

		const marchUnionNode = passNodes.find((n) => regId(registry, n.typeId) === BuiltinNodeId.RaymarchScene);
		if (marchUnionNode) {
			const mdef = registry.get(marchUnionNode.typeId);
			const uhn = mdef ? paramById(mdef, 'unionHitNormal') : undefined;
			if (uhn && getParamScalar(marchUnionNode, uhn) > 0.5) {
				const deferStratifyForZones =
					!stratifyTry.ok &&
					hasSceneSdfZoneMarkers &&
					stratifyTry.reason === 'scene SDF zone markers present';
				const deferStratifyForRepeat =
					!stratifyTry.ok &&
					hasSceneSdfRepeatMarkers &&
					stratifyTry.reason === 'scene SDF repeat markers present';
				if (!stratifyTry.ok && !deferStratifyForZones && !deferStratifyForRepeat) {
					return {
						errors: [
							`Pass ${pass}: Union hit normal (winning strand) requires a stratifiable pure op_union scene (${stratifyTry.reason})`,
						],
					};
				}
				if (stratifyTry.ok) {
					sceneStrandRayOpts = {
						sceneStrandFnNames: stratifyTry.strands.map((_, i) => sceneStrandFnName(i, stratifyTry.passSfx)),
						unionWinningStrandNormal: true,
					};
				}
			}
		}

		if (stratifyTry.ok) {
			const strandBlocks: string[] = [];
			for (let si = 0; si < stratifyTry.strands.length; si++) {
				const { nodes: snodes, terminalId } = stratifyTry.strands[si]!;
				const acc: string[] = [];
				for (const nid of snodes) {
					const nodeN = nodesById.get(nid)!;
					const dfn = registry.get(nodeN.typeId);
					if (!dfn) continue;
					if (dfn.id === BuiltinNodeId.SdfParamP) continue;
					if (motifSkip.size > 0 && motifSkip.has(nid)) continue;
					if (isMotifPullbackBuiltin(dfn.id)) {
						if (fractalBodyD) acc.push(fractalBodyD);
						continue;
					}
					if (exportedInteriorSkip.has(nid)) continue;
					let wm = wireMapForNode(nid, pe, sceneReach, paramPId);
					wm = rewriteDomainCallExportedVec3WireMap(wm, {
						doc,
						callNode: nodeN,
						registry,
						nodesById,
						pe,
						pass,
						paramPId,
						motifAncestorIds: motifSkip.size > 0 ? motifSkip : null,
						exportedInteriorSkip,
					});
					const code = emitSceneNodeLine(
						nid,
						nodeN,
						dfn,
						pe,
						sceneReach,
						wm,
						registry,
						nodesById,
						passUniforms,
						pass,
						false,
						hasSceneAlbedoNodes && (!emitHitBody || !false),
						paramPId,
						null,
						animatedKeys,
					);
					if (code.trim()) acc.push(code);
				}
				const retV = outVar(terminalId, 'd');
				const inner = indentBlock(acc.join('\n'), '  ');
				const fnName = sceneStrandFnName(si, stratifyTry.passSfx);
				strandBlocks.push(`float ${fnName}(vec3 p) {\n${inner}\n  return ${retV};\n}`);
			}
			const calls = stratifyTry.strands.map((_, i) => `${sceneStrandFnName(i, stratifyTry.passSfx)}(p)`);
			const minExpr = nestMinSceneCalls(calls);
			sceneFnBlock = `${exportFnGlsl}${motifPreamble}${zoneBlockPrefixFinal}${strandBlocks.join('\n\n')}\n\nvec3 scene_mat_${passSfx}(vec3 p) { return vec3(1.0); }\nfloat scene_sdf_${passSfx}(vec3 p) {\n  return ${minExpr};\n}\n\n`;
		} else {
			const sceneLinesD = pushSceneLines(fractalBodyD, false);
			const innerSceneD = indentBlock(sceneLinesD.join('\n'), '  ');
			if (emitHitBody) {
				const sceneLinesHit = pushSceneLines(fractalBodyHit, true);
				const innerHit = indentBlock(sceneLinesHit.join('\n'), '  ');
				sceneFnBlock = `${exportFnGlsl}${motifPreamble}${zoneBlockPrefixFinal}float scene_sdf_${passSfx}(vec3 p) {\n${innerSceneD}\n}\nvoid scene_hit_${passSfx}(vec3 p, out float o_scened, out vec3 o_scenemat) {\n${innerHit}\n}\nvec3 scene_mat_${passSfx}(vec3 p) {\n  float sdm_; vec3 smm_; scene_hit_${passSfx}(p, sdm_, smm_);\n  return smm_;\n}\n\n`;
			} else {
				sceneFnBlock = `${exportFnGlsl}${motifPreamble}${zoneBlockPrefixFinal}vec3 scene_mat_${passSfx}(vec3 p) { return vec3(1.0); }\nfloat scene_sdf_${passSfx}(vec3 p) {\n${innerSceneD}\n}\n\n`;
			}
		}
	}

	// Stage: template expansion (main graph)
	const wireMain = new Map<string, Map<string, string>>();
	for (const e of peMain) {
		const inner = wireMain.get(e.target) ?? new Map();
		inner.set(e.targetHandle, outVar(e.source, e.sourceHandle));
		wireMain.set(e.target, inner);
	}

	const repPlan = planRepeatMainZones({ pass, passNodes, nodesById, registry, mainReach, pe });
	if (!repPlan.ok) return { errors: repPlan.errors };

	const repeatSkip = new Set<string>();
	const endZones = new Map<string, (typeof repPlan.zones)[number]>();
	for (const z of repPlan.zones) {
		for (const b of z.bodyIds) repeatSkip.add(b);
		repeatSkip.add(z.endId);
		endZones.set(z.endId, z);
	}

	const lines: string[] = [];
	for (const nid of topoMain) {
		const node = nodesById.get(nid)!;
		const def = registry.get(node.typeId);
		if (!def) continue;
		if (sceneSinkNode && sceneReach.has(nid) && !mainReach.has(nid)) continue;

		const zone = endZones.get(nid);
		if (zone) {
			const topoB = topoRepeatBody(zone.bodyIds, peMain);
			if (!topoB) return { errors: [`Pass ${pass}: repeat zone "${zone.zoneKey}" internal topo failed`] };
			const expandNode = (id: string, loopOpts: ExpandOpts) => {
				const n = nodesById.get(id)!;
				const d = registry.get(n.typeId)!;
				const wm = wireMain.get(id) ?? new Map();
				const opt: ExpandOpts | undefined =
					d.id === BuiltinNodeId.RaymarchScene && sceneFnName
						? {
								sceneSdfFnName: sceneFnName,
								...(emitSceneHitForPass ? { sceneMatFnName: `scene_mat_${sceneFnSuffix(pass)}` } : {}),
								...sceneStrandRayOpts,
							}
						: undefined;
				return expandTemplate(n, d, wm, passUniforms, pass, animatedKeys, { ...opt, ...loopOpts });
			};
			const outName = outVar(zone.endId, 'out');
			lines.push(`float ${outName} = 0.0;`);
			const tail = outVar(zone.tailSourceId, zone.tailSourceHandle);
			const block = emitRepeatZoneBlock({
				zone,
				topoBody: topoB,
				expandNode,
				tailAssign: `${outName} = ${tail};`,
			});
			lines.push(`// node: ${zone.endId} — glsl_repeat zone "${zone.zoneKey}"\n${block}`);
			continue;
		}

		if (repeatSkip.has(nid)) continue;

		const wm = wireMain.get(nid) ?? new Map();
		const opt: ExpandOpts | undefined =
			def.id === BuiltinNodeId.RaymarchScene && sceneFnName
				? {
						sceneSdfFnName: sceneFnName,
						...(emitSceneHitForPass ? { sceneMatFnName: `scene_mat_${sceneFnSuffix(pass)}` } : {}),
						...sceneStrandRayOpts,
					}
				: undefined;
		const code = expandTemplate(node, def, wm, passUniforms, pass, animatedKeys, opt);
		if (code.trim()) lines.push(code);
	}

	// Stage: final shader assembly (optional debug probes)
	let supportsSceneSdfProbe = false;
	let sceneProbePreamble = '';
	if (
		debug?.sceneSdfProbe &&
		debug.sceneSdfProbe.pass === pass &&
		sceneFnBlock !== '' &&
		sceneFnName !== ''
	) {
		pushSceneSdfProbeUniforms(passUniforms);
		sceneProbePreamble = sceneSdfProbeMainPreamble(sceneFnName, debug.sceneSdfProbe.visualization);
		supportsSceneSdfProbe = true;
	}

	let supportsWireProbe = false;
	let wireTail = '';
	if (debug?.wireProbe && debug.wireProbe.pass === pass) {
		const wt = emitWireProbeTail(debug.wireProbe.targetNodeId, peMain, registry, nodesById);
		if (wt) {
			pushWireProbeUniforms(passUniforms);
			wireTail = `\n${wt}`;
			supportsWireProbe = true;
		}
	}

	const uniformBlock = passUniforms.map(glslUniformDecl).join('\n');
	const mainJoined = `${sceneProbePreamble}${lines.join('\n')}${wireTail}`;
	const mainBody = indentBlock(mainJoined, '  ');
	const frag = emitPassFragment(uniformBlock, sceneFnBlock, mainBody);

	const chMap = doc.meta.iChannels?.[pass] ?? {};
	const channels: PassManifest['channels'] = {};
	for (const k of [0, 1, 2, 3] as const) {
		const resolved = resolveIChannelBinding(chMap[k]);
		if (resolved) {
			channels[`iChannel${k}`] = resolved;
		}
	}

	const pingPong = [0, 1, 2, 3].some((k) => {
		const r = resolveIChannelBinding(chMap[k as 0 | 1 | 2 | 3]);
		return r?.kind === 'buffer' && r.bufferId === pass;
	});
	const substeps = resolvePassSubsteps(doc, pass, passNodes, registry);

	return {
		pass,
		vertexSource: VERTEX_SHADER,
		fragmentSource: frag,
		manifest: {
			id: pass,
			channels,
			pingPong,
			substeps,
			uniforms: passUniforms,
			...(supportsSceneSdfProbe ? { supportsSceneSdfProbe: true } : {}),
			...(supportsWireProbe ? { supportsWireProbe: true } : {}),
		},
	};
}

export function compileGraph(doc: GraphDocument, debug?: CompileDebugOptions): CompileResult {
	const registry = buildRegistry(doc.customNodeTypes ?? []);
	const val = validateGraph(doc, registry);

	if (!val.ok) {
		return { errors: val.errors, passes: {}, manifest: { passes: [], globalUniforms: GLOBAL_UNIFORMS } };
	}

	const nodesById = new Map(doc.nodes.map((n) => [n.id, n]));
	const passOrder = orderedPasses(doc);
	const animatedKeys = paramAnimationKeysFromMeta(doc.meta);
	const passesOut: CompileResult['passes'] = {};
	const manifestPasses: PassManifest[] = [];

	for (const pass of passOrder) {
		const r = compileOnePass({ doc, pass, registry, nodesById, animatedKeys, debug });
		if ('errors' in r) {
			if (r.errors.length === 0) continue;
			return { errors: r.errors, passes: {}, manifest: { passes: [], globalUniforms: GLOBAL_UNIFORMS } };
		}
		passesOut[pass] = { fragmentSource: r.fragmentSource, vertexSource: r.vertexSource };
		manifestPasses.push(r.manifest);
	}

	return { errors: [], passes: passesOut, manifest: { passes: manifestPasses, globalUniforms: GLOBAL_UNIFORMS } };
}
