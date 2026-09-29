import { expandTemplate, type ExpandOpts } from './compileTemplate.js';
import { ensureFloatUniform, getParamScalar, literalParamGlsl, paramById } from './compileParams.js';
import { outVar, sanitizeNodeId } from './ident.js';
import { buildRegistry } from './registry.js';
import type {
	BufferId,
	CompileResult,
	GlslType,
	GraphDocument,
	GraphNode,
	NodeTypeDef,
	PassManifest,
	UniformManifestEntry,
} from './types.js';
import {
	buildIncomingEdgeMap,
	collectMotifAncestorSet,
	collectUpstream,
	edgesForPass,
	sceneFnSuffix,
	topoOrder,
} from './graphutil.js';
import { emitPassFragment } from './emitPassFragment.js';
import { glslUniformDecl, indentBlock, VERTEX_SHADER } from './glslPrelude.js';
import { orderedPasses } from './orderPasses.js';
import { paramAnimationKeysFromMeta } from './paramAnimation.js';
import { validateGraph } from './validate.js';
import {
	emitSceneNodeLine,
	motifUsesWorldSamplingPort,
	sceneReachHasSdfAlbedo,
	wireMapForNode,
	type MotifWireContext,
} from './compileScene.js';

function regId(registry: Map<string, NodeTypeDef>, typeId: string): string | undefined {
	return registry.get(typeId)?.id;
}

export function compileGraph(doc: GraphDocument): CompileResult {
	const registry = buildRegistry(doc.customNodeTypes ?? []);
	const val = validateGraph(doc, registry);
	const globalUniforms: { name: string; type: GlslType }[] = [
		{ name: 'iResolution', type: 'vec3' },
		{ name: 'iTime', type: 'float' },
		{ name: 'iMouse', type: 'vec4' },
		{ name: 'iFrame', type: 'int' },
		{ name: 'iChannel0', type: 'sampler2D' },
		{ name: 'iChannel1', type: 'sampler2D' },
		{ name: 'iChannel2', type: 'sampler2D' },
		{ name: 'iChannel3', type: 'sampler2D' },
	];

	if (!val.ok) {
		return { errors: val.errors, passes: {}, manifest: { passes: [], globalUniforms } };
	}

	const nodesById = new Map(doc.nodes.map((n) => [n.id, n]));
	const passOrder = orderedPasses(doc);
	const animatedKeys = paramAnimationKeysFromMeta(doc.meta);
	const passesOut: CompileResult['passes'] = {};
	const manifestPasses: PassManifest[] = [];

	for (const pass of passOrder) {
		const passNodes = doc.nodes.filter((n) => n.pass === pass);
		if (passNodes.length === 0) continue;

		let emitSceneHitForPass = false;

		const outFrag = passNodes.find((n) => regId(registry, n.typeId) === 'frag_output');
		if (!outFrag) continue;

		const mainReach = collectUpstream(pass, outFrag.id, doc.edges, nodesById);
		const pe = edgesForPass(doc.edges, nodesById, pass);
		const peMain = pe.filter((e) => mainReach.has(e.source) && mainReach.has(e.target));
		const topoMain = topoOrder(mainReach, peMain);
		if (!topoMain) {
			return {
				errors: [`Pass ${pass}: internal topo failed (main)`],
				passes: {},
				manifest: { passes: [], globalUniforms },
			};
		}

		const passUniforms: UniformManifestEntry[] = [];
		let sceneFnBlock = '';
		let sceneFnName = '';
		let sceneReach = new Set<string>();

		const sceneSinkNode = passNodes.find((n) => regId(registry, n.typeId) === 'scene_sdf_sink');
		if (sceneSinkNode) {
			sceneReach = collectUpstream(pass, sceneSinkNode.id, doc.edges, nodesById);
			const peScene = pe.filter((e) => sceneReach.has(e.source) && sceneReach.has(e.target));
			const topoScene = topoOrder(sceneReach, peScene);
			if (!topoScene) {
				return {
					errors: [`Pass ${pass}: internal topo failed (scene SDF)`],
					passes: {},
					manifest: { passes: [], globalUniforms },
				};
			}
			const passSfx = sceneFnSuffix(pass);
			sceneFnName = `scene_sdf_${passSfx}`;
			const paramPNode = passNodes.find(
				(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === 'sdf_param_p',
			);
			const paramPId = paramPNode?.id ?? null;
			const hasSceneAlbedoNodes = sceneReachHasSdfAlbedo(sceneReach, registry, nodesById);
			const marchNode = passNodes.find((n) => regId(registry, n.typeId) === 'raymarch_scene');
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
				(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === 'sdf_tessellate_feedback',
			);
			if (fractalFb && paramPId) {
				const dEdge = pe.find((e) => e.target === fractalFb.id && e.targetHandle === 'd');
				if (!dEdge) {
					return {
						errors: [`Pass ${pass}: sdf_tessellate_feedback missing distance input`],
						passes: {},
						manifest: { passes: [], globalUniforms },
					};
				}
				const producerY = dEdge.source;
				const incoming = buildIncomingEdgeMap(pe);
				const M = collectMotifAncestorSet(producerY, paramPId, incoming);
				const topoM = topoOrder(M, peScene);
				if (!topoM) {
					return {
						errors: [`Pass ${pass}: sdf_tessellate_feedback motif subgraph has a cycle`],
						passes: {},
						manifest: { passes: [], globalUniforms },
					};
				}
				motifSkip = M;
				const twoArgMotif = motifUsesWorldSamplingPort(topoM, pe, paramPId, registry, nodesById);
				const motifWire: MotifWireContext | null = twoArgMotif ? { registry, nodesById } : null;
				const motifLines: string[] = [];
				for (const nid of topoM) {
					const n = nodesById.get(nid)!;
					const d = registry.get(n.typeId);
					if (!d || d.id === 'sdf_param_p') continue;
					const wm = wireMapForNode(nid, pe, M, paramPId, motifWire);
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
				motifPreamble = twoArgMotif
					? `float ${motifFnName}(vec3 q, vec3 pScene) {\n${indentBlock(motifInner, '  ')}\n}\n\n`
					: `float ${motifFnName}(vec3 p) {\n${indentBlock(motifInner, '  ')}\n}\n\n`;

				const Fdef = registry.get(fractalFb.typeId)!;
				// Initial distance must be motif(p): the wired `d` refers to vars only emitted inside motif_*(),
				// so we cannot use wireMap's g_<producer>_d in the outer scene_sdf body.
				const ox = ensureFloatUniform(fractalFb, paramById(Fdef, 'foldOx'), passUniforms, animatedKeys);
				const oy = ensureFloatUniform(fractalFb, paramById(Fdef, 'foldOy'), passUniforms, animatedKeys);
				const oz = ensureFloatUniform(fractalFb, paramById(Fdef, 'foldOz'), passUniforms, animatedKeys);
				const sc = ensureFloatUniform(fractalFb, paramById(Fdef, 'scale'), passUniforms, animatedKeys);
				const itersLit = literalParamGlsl(fractalFb, paramById(Fdef, 'iters')!);
				const outD = outVar(fractalFb.id, 'd');
				const kifsLoop = `for (int itf_${nsF} = 0; itf_${nsF} < 8; itf_${nsF}++) {
  if (float(itf_${nsF}) >= float(${itersLit})) break;
  qtf_${nsF} = abs(qtf_${nsF}) - vec3(float(${ox}), float(${oy}), float(${oz}));
  qtf_${nsF} *= float(${sc});
  wtf_${nsF} *= float(${sc});
  ${outD} = min(${outD}, ${twoArgMotif ? `${motifFnName}(qtf_${nsF}, p)` : `${motifFnName}(qtf_${nsF})`} / wtf_${nsF});
}`;
				const fractalMatLine = `vec3 ${outVar(fractalFb.id, 'mat')} = vec3(1.0);\n`;
				fractalBodyD = twoArgMotif
					? `// node: ${fractalFb.id} — SDF feedback tessellation (KIFS union of motif)
vec3 qtf_${nsF} = p;
float wtf_${nsF} = 1.0;
float ${outD} = ${motifFnName}(p, p);
${kifsLoop}`
					: `// node: ${fractalFb.id} — SDF feedback tessellation (KIFS union of motif)
vec3 qtf_${nsF} = p;
float wtf_${nsF} = 1.0;
float ${outD} = ${motifFnName}(p);
${kifsLoop}`;
				fractalBodyHit = emitHitBody ? fractalBodyD + fractalMatLine : fractalBodyD;
			}

			const pushSceneLines = (fractalChunk: string | null, hitMat: boolean): string[] => {
				const passthroughAlbedo = hasSceneAlbedoNodes && (!emitHitBody || !hitMat);
				const acc: string[] = [];
				for (const nid of topoScene) {
					const node = nodesById.get(nid)!;
					const def = registry.get(node.typeId);
					if (!def) continue;
					if (def.id === 'sdf_param_p') continue;
					if (motifSkip.size > 0 && motifSkip.has(nid)) continue;
					if (def.id === 'sdf_tessellate_feedback') {
						if (fractalChunk) acc.push(fractalChunk);
						continue;
					}
					const wm = wireMapForNode(nid, pe, sceneReach, paramPId);
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

			const sceneLinesD = pushSceneLines(fractalBodyD, false);
			const innerSceneD = indentBlock(sceneLinesD.join('\n'), '  ');
			if (emitHitBody) {
				const sceneLinesHit = pushSceneLines(fractalBodyHit, true);
				const innerHit = indentBlock(sceneLinesHit.join('\n'), '  ');
				sceneFnBlock = `${motifPreamble}float scene_sdf_${passSfx}(vec3 p) {\n${innerSceneD}\n}\nvoid scene_hit_${passSfx}(vec3 p, out float o_scened, out vec3 o_scenemat) {\n${innerHit}\n}\nvec3 scene_mat_${passSfx}(vec3 p) {\n  float sdm_; vec3 smm_; scene_hit_${passSfx}(p, sdm_, smm_);\n  return smm_;\n}\n\n`;
			} else {
				sceneFnBlock = `${motifPreamble}vec3 scene_mat_${passSfx}(vec3 p) { return vec3(1.0); }\nfloat scene_sdf_${passSfx}(vec3 p) {\n${innerSceneD}\n}\n\n`;
			}
		}

		const wireMain = new Map<string, Map<string, string>>();
		for (const e of peMain) {
			const inner = wireMain.get(e.target) ?? new Map();
			inner.set(e.targetHandle, outVar(e.source, e.sourceHandle));
			wireMain.set(e.target, inner);
		}

		const lines: string[] = [];
		for (const nid of topoMain) {
			const node = nodesById.get(nid)!;
			const def = registry.get(node.typeId);
			if (!def) continue;
			if (sceneSinkNode && sceneReach.has(nid) && !mainReach.has(nid)) continue;
			const wm = wireMain.get(nid) ?? new Map();
			const opt: ExpandOpts | undefined =
				def.id === 'raymarch_scene' && sceneFnName
					? {
							sceneSdfFnName: sceneFnName,
							...(emitSceneHitForPass
								? { sceneMatFnName: `scene_mat_${sceneFnSuffix(pass)}` }
								: {}),
						}
					: undefined;
			const code = expandTemplate(node, def, wm, passUniforms, pass, animatedKeys, opt);
			if (code.trim()) lines.push(code);
		}

		const uniformBlock = passUniforms.map(glslUniformDecl).join('\n');
		const mainBody = indentBlock(lines.join('\n'), '  ');
		const frag = emitPassFragment(uniformBlock, sceneFnBlock, mainBody);

		passesOut[pass] = { fragmentSource: frag, vertexSource: VERTEX_SHADER };

		const chMap = doc.meta.iChannels?.[pass] ?? {};
		const channels: PassManifest['channels'] = {};
		for (const k of [0, 1, 2, 3] as const) {
			const b = chMap[k];
			if (b !== undefined) {
				channels[`iChannel${k}`] = b;
			}
		}

		const pingPong = [0, 1, 2, 3].some((k) => chMap[k as 0 | 1 | 2 | 3] === pass);

		manifestPasses.push({
			id: pass,
			channels,
			pingPong,
			uniforms: passUniforms,
		});
	}

	return { errors: [], passes: passesOut, manifest: { passes: manifestPasses, globalUniforms } };
}
