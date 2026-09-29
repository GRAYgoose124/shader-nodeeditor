import { expandTemplate } from './compileTemplate.js';
import { ensureFloatUniform, paramById } from './compileParams.js';
import { expandSdfPrimitive } from './expandSdfPrimitive.js';
import { outVar, sanitizeNodeId } from './ident.js';
import type { BufferId, GraphEdge, GraphNode, NodeTypeDef, UniformManifestEntry } from './types.js';

function regId(registry: Map<string, NodeTypeDef>, typeId: string): string | undefined {
	return registry.get(typeId)?.id;
}

/** When set, `sdf_param_p → p` resolves to `q` or `pScene` inside a two-arg motif (see `PortDef.motifSampling`). */
export type MotifWireContext = {
	registry: Map<string, NodeTypeDef>;
	nodesById: Map<string, GraphNode>;
};

export function sceneReachHasSdfAlbedo(
	sceneReach: Set<string>,
	registry: Map<string, NodeTypeDef>,
	nodesById: Map<string, GraphNode>,
): boolean {
	for (const id of sceneReach) {
		const n = nodesById.get(id);
		if (!n) continue;
		if (regId(registry, n.typeId) === 'sdf_albedo') return true;
	}
	return false;
}

function matRefForPort(
	targetId: string,
	inputPort: string,
	pe: GraphEdge[],
	nodeSet: Set<string>,
): string {
	const e = pe.find((x) => x.target === targetId && x.targetHandle === inputPort);
	if (!e || !nodeSet.has(e.source)) return 'vec3(1.0)';
	return outVar(e.source, 'mat');
}

function emitSceneCsgMat(
	node: GraphNode,
	def: NodeTypeDef,
	wm: Map<string, string>,
	pe: GraphEdge[],
	nodeSet: Set<string>,
	uniforms: UniformManifestEntry[],
	animatedKeys: Set<string>,
): string | null {
	const da = wm.get('a');
	const db = wm.get('b');
	if (da === undefined || db === undefined) return null;
	const ma = matRefForPort(node.id, 'a', pe, nodeSet);
	const mb = matRefForPort(node.id, 'b', pe, nodeSet);
	const od = outVar(node.id, 'd');
	const om = outVar(node.id, 'mat');
	const ns = sanitizeNodeId(node.id);
	const head = `// node: ${node.id}`;

	switch (def.id) {
		case 'op_union':
			return `${head}\nfloat ${od} = min(${da}, ${db});\nvec3 ${om} = ${da} < ${db} ? ${ma} : ${mb};`;
		case 'op_subtract':
			return `${head}\nfloat ${od} = max(${da}, -${db});\nvec3 ${om} = ${da} > -${db} ? ${ma} : ${mb};`;
		case 'op_intersect':
			return `${head}\nfloat ${od} = max(${da}, ${db});\nvec3 ${om} = ${da} > ${db} ? ${ma} : ${mb};`;
		case 'smin_float': {
			const k = ensureFloatUniform(node, paramById(def, 'k'), uniforms, animatedKeys);
			return `${head}
float ka_${ns} = max(float(${k}), 1e-5);
float ha_${ns} = clamp(0.5 + 0.5 * (${db} - ${da}) / ka_${ns}, 0.0, 1.0);
float ${od} = mix(${db}, ${da}, ha_${ns}) - ka_${ns} * ha_${ns} * (1.0 - ha_${ns});
vec3 ${om} = mix(${mb}, ${ma}, ha_${ns});`;
		}
		case 'smin_exp_float': {
			const k = ensureFloatUniform(node, paramById(def, 'k'), uniforms, animatedKeys);
			return `${head}
float kb_${ns} = max(float(${k}), 1e-5);
float wa_${ns} = exp(-kb_${ns} * ${da});
float wb_${ns} = exp(-kb_${ns} * ${db});
float ${od} = -log(max(wa_${ns} + wb_${ns}, 1e-20)) / kb_${ns};
vec3 ${om} = (wa_${ns} * ${ma} + wb_${ns} * ${mb}) / max(wa_${ns} + wb_${ns}, 1e-20);`;
		}
		case 'smax_float': {
			const k = ensureFloatUniform(node, paramById(def, 'k'), uniforms, animatedKeys);
			return `${head}
float kx_${ns} = max(float(${k}), 1e-5);
float hx_${ns} = clamp(0.5 + 0.5 * (${da} - ${db}) / kx_${ns}, 0.0, 1.0);
float ${od} = -mix(-${db}, -${da}, hx_${ns}) + kx_${ns} * hx_${ns} * (1.0 - hx_${ns});
vec3 ${om} = mix(${mb}, ${ma}, hx_${ns});`;
		}
		case 'smax_exp_float': {
			const k = ensureFloatUniform(node, paramById(def, 'k'), uniforms, animatedKeys);
			return `${head}
float ky_${ns} = max(float(${k}), 1e-5);
float wxa_${ns} = exp(ky_${ns} * ${da});
float wxb_${ns} = exp(ky_${ns} * ${db});
float ${od} = log(max(wxa_${ns} + wxb_${ns}, 1e-20)) / ky_${ns};
vec3 ${om} = (wxa_${ns} * ${ma} + wxb_${ns} * ${mb}) / max(wxa_${ns} + wxb_${ns}, 1e-20);`;
		}
		case 'smin_smooth_sub_float': {
			const k = ensureFloatUniform(node, paramById(def, 'k'), uniforms, animatedKeys);
			return `${head}
float ks_${ns} = max(float(${k}), 1e-5);
float bn_${ns} = -${db};
float hs_${ns} = clamp(0.5 + 0.5 * (bn_${ns} - ${da}) / ks_${ns}, 0.0, 1.0);
float ${od} = mix(bn_${ns}, ${da}, hs_${ns}) - ks_${ns} * hs_${ns} * (1.0 - hs_${ns});
vec3 ${om} = mix(${mb}, ${ma}, hs_${ns});`;
		}
		default:
			return null;
	}
}

export function emitSceneNodeLine(
	nid: string,
	node: GraphNode,
	def: NodeTypeDef,
	pe: GraphEdge[],
	nodeSet: Set<string>,
	wm: Map<string, string>,
	registry: Map<string, NodeTypeDef>,
	nodesById: Map<string, GraphNode>,
	passUniforms: UniformManifestEntry[],
	pass: BufferId,
	emitHitMat: boolean,
	passthroughSdfAlbedo: boolean,
	paramPId: string | null,
	motifWire: MotifWireContext | null,
	animatedKeys: Set<string>,
): string {
	if (def.id === 'sdf_albedo' && passthroughSdfAlbedo) {
		const dd = wm.get('d');
		if (!dd) return '';
		return `// node: ${nid} — sdf_albedo (distance only; enable “Shade with SDF albedo” on Raymarch for color)\nfloat ${outVar(nid, 'd')} = ${dd};`;
	}

	if (!emitHitMat) {
		if (def.id === 'sdf_primitive')
			return expandSdfPrimitive(node, def, wm, passUniforms, false, animatedKeys);
		return expandTemplate(node, def, wm, passUniforms, pass, animatedKeys);
	}

	if (def.id === 'sdf_param_p' || def.id === 'sdf_tessellate_feedback') return '';
	if (def.id === 'scene_sdf_sink') {
		const dd = wm.get('d');
		if (!dd) return '';
		const mr = matRefForPort(nid, 'd', pe, nodeSet);
		return `// node: ${nid}\no_scened = ${dd};\no_scenemat = ${mr};`;
	}
	if (def.id === 'sdf_albedo') {
		return expandTemplate(node, def, wm, passUniforms, pass, animatedKeys);
	}

	const csg = emitSceneCsgMat(node, def, wm, pe, nodeSet, passUniforms, animatedKeys);
	if (csg) return csg;

	const dIn = def.inputs.find((i) => i.id === 'd');
	const dOut = def.outputs.find((o) => o.id === 'd');
	if (dIn && dOut && def.id !== 'sdf_albedo') {
		const code = expandTemplate(node, def, wm, passUniforms, pass, animatedKeys);
		if (!code.trim()) return '';
		const mr = matRefForPort(nid, 'd', pe, nodeSet);
		return `${code}\nvec3 ${outVar(nid, 'mat')} = ${mr};`;
	}

	if (def.id === 'sdf_primitive') {
		return expandSdfPrimitive(node, def, wm, passUniforms, true, animatedKeys);
	}

	if (dOut && !dIn) {
		const code = expandTemplate(node, def, wm, passUniforms, pass, animatedKeys);
		if (!code.trim()) return '';
		return `${code}\nvec3 ${outVar(nid, 'mat')} = vec3(1.0);`;
	}

	return expandTemplate(node, def, wm, passUniforms, pass, animatedKeys);
}

export function motifUsesWorldSamplingPort(
	topoM: string[],
	pe: GraphEdge[],
	paramPId: string,
	registry: Map<string, NodeTypeDef>,
	nodesById: Map<string, GraphNode>,
): boolean {
	for (const nid of topoM) {
		const e = pe.find((x) => x.target === nid && x.source === paramPId && x.sourceHandle === 'p');
		if (!e) continue;
		const def = registry.get(nodesById.get(nid)!.typeId);
		const port = def?.inputs.find((i) => i.id === e.targetHandle);
		if (port?.motifSampling === 'world') return true;
	}
	return false;
}

export function wireMapForNode(
	targetId: string,
	pe: GraphEdge[],
	nodeSet: Set<string>,
	paramPId: string | null,
	motifWire: MotifWireContext | null = null,
): Map<string, string> {
	const wm = new Map<string, string>();
	for (const e of pe) {
		if (e.target !== targetId) continue;
		if (!nodeSet.has(e.source) || !nodeSet.has(e.target)) continue;
		if (paramPId && e.source === paramPId && e.sourceHandle === 'p') {
			if (motifWire) {
				const def = motifWire.registry.get(motifWire.nodesById.get(targetId)!.typeId);
				const port = def?.inputs.find((i) => i.id === e.targetHandle);
				const sym = port?.motifSampling === 'world' ? 'pScene' : 'q';
				wm.set(e.targetHandle, sym);
			} else {
				wm.set(e.targetHandle, 'p');
			}
		} else {
			wm.set(e.targetHandle, outVar(e.source, e.sourceHandle));
		}
	}
	return wm;
}
