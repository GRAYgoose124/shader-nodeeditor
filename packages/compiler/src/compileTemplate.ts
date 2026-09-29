import { ensureFloatUniform, getParamScalar, literalParamGlsl } from './compileParams.js';
import { expandSdfPrimitive } from './expandSdfPrimitive.js';
import { outVar, sanitizeNodeId } from './ident.js';
import { isParamAnimatable, paramAnimKey } from './paramAnimation.js';
import type { BufferId, GraphNode, NodeTypeDef, UniformManifestEntry } from './types.js';

export type ExpandOpts = {
	sceneSdfFnName?: string;
	/** `scene_mat_<pass>(p)` — only set when **Shade with SDF albedo** is On (literal) and the scene uses `sdf_albedo`. */
	sceneMatFnName?: string;
	sceneEmitDefaultMat?: boolean;
};

/** Strip heavy optional sections when compile-time (literal) toggles are off — keeps default shaders small. */
function applyRaymarchOptionalStrips(tpl: string, node: GraphNode, def: NodeTypeDef): string {
	if (def.id !== 'raymarch_scene') return tpl;
	const strips: { begin: string; end: string; paramId: string }[] = [
		{ begin: 'BEGIN_RM_SKY', end: 'END_RM_SKY', paramId: 'skyBounceOn' },
		{ begin: 'BEGIN_RM_REFL', end: 'END_RM_REFL', paramId: 'reflOn' },
		{ begin: 'BEGIN_RM_GI', end: 'END_RM_GI', paramId: 'giOn' },
		{ begin: 'BEGIN_RM_SDF_ALBEDO', end: 'END_RM_SDF_ALBEDO', paramId: 'sdfAlbedoShadeOn' },
	];
	for (const { begin, end, paramId } of strips) {
		const re = new RegExp(`\\n\\/\\/<<${begin}>>\\n([\\s\\S]*?)\\n\\/\\/<<${end}>>`, 'g');
		const p = def.params.find((x) => x.id === paramId);
		const remove = p?.binding === 'literal' && getParamScalar(node, p) <= 0.5;
		tpl = tpl.replace(re, (_m, inner: string) => (remove ? '\n' : `\n${inner}\n`));
	}
	const refineRe = /\n\/\/<<BEGIN_RM_REFINE>>\n([\s\S]*?)\n\/\/<<END_RM_REFINE>>/;
	const pr = def.params.find((x) => x.id === 'surfaceRefineOn');
	const refineLoop = `    for (int srf_{{ns}} = 0; srf_{{ns}} < 2; srf_{{ns}}++) {
        float dsrf_{{ns}} = {{sceneSdf}}(pmc_{{ns}});
        pmc_{{ns}} -= rmd_{{ns}} * dsrf_{{ns}};
      }`;
	if (pr?.binding === 'literal') {
		const on = getParamScalar(node, pr) > 0.5;
		tpl = tpl.replace(refineRe, '\n' + (on ? refineLoop : '') + '\n');
	} else {
		tpl = tpl.replace(refineRe, (_m, inner: string) => '\n' + inner + '\n');
	}
	return tpl;
}

function expandInputs(
	def: NodeTypeDef,
	wm: Map<string, string>,
	kind: 'template' | 'glsl_expr',
): Record<string, string> {
	const m: Record<string, string> = {};
	for (const inp of def.inputs) {
		const w = wm.get(inp.id);
		if (kind === 'glsl_expr') {
			m[inp.id] = w ?? defaultZeroForType(inp.type);
		} else {
			m[inp.id] = w ?? '/* missing */';
		}
	}
	return m;
}

function defaultZeroForType(t: string): string {
	switch (t) {
		case 'float':
			return '0.0';
		case 'vec2':
			return 'vec2(0.0)';
		case 'vec3':
			return 'vec3(0.0)';
		case 'vec4':
			return 'vec4(0.0)';
		case 'mat4':
			return 'mat4(1.0)';
		default:
			return '0.0';
	}
}

function iChannelSamplerForParamId(node: GraphNode, def: NodeTypeDef, paramId: string): string {
	const p = def.params.find((x) => x.id === paramId);
	const ch = p ? Math.round(getParamScalar(node, p)) : 0;
	const c = Math.max(0, Math.min(3, ch));
	return `iChannel${c}`;
}

export function expandTemplate(
	node: GraphNode,
	def: NodeTypeDef,
	wm: Map<string, string>,
	uniforms: UniformManifestEntry[],
	pass: BufferId,
	animatedKeys: Set<string>,
	opts?: ExpandOpts,
): string {
	if (def.id === 'sdf_param_p') return '';
	if (def.id === 'sdf_tessellate_feedback') return '';
	if (def.id === 'sdf_primitive')
		return expandSdfPrimitive(
			node,
			def,
			wm,
			uniforms,
			opts?.sceneEmitDefaultMat ?? false,
			animatedKeys,
		);

	const ns = sanitizeNodeId(node.id);
	const ins = expandInputs(def, wm, def.codegenKind === 'glsl_expr' ? 'glsl_expr' : 'template');

	let tpl = def.template;
	if (def.id === 'raymarch_scene') {
		tpl = applyRaymarchOptionalStrips(tpl, node, def);
	}
	tpl = tpl.replace(/\{\{nodeId\}\}/g, node.id);
	tpl = tpl.replace(/\{\{ns\}\}/g, ns);
	tpl = tpl.replace(/\{\{passTag\}\}/g, pass);

	if (opts?.sceneSdfFnName) {
		tpl = tpl.replace(/\{\{sceneSdf\}\}/g, opts.sceneSdfFnName);
	}
	if (opts?.sceneMatFnName) {
		tpl = tpl.replace(/\{\{sceneMatFn\}\}/g, opts.sceneMatFnName);
	}

	for (const out of def.outputs) {
		tpl = tpl.replace(new RegExp(`\\{\\{out:${out.id}\\}\\}`, 'g'), outVar(node.id, out.id));
	}

	for (const hid of Object.keys(ins)) {
		const expr = ins[hid]!;
		tpl = tpl.replace(new RegExp(`\\{\\{in:${hid}\\}\\}`, 'g'), expr);
	}

	for (const p of def.params) {
		const key = paramAnimKey(node.id, p.id);
		const anim = animatedKeys.has(key) && isParamAnimatable(p);
		const forceUniform = p.binding === 'uniform' || (p.binding === 'literal' && anim);
		const repl = forceUniform
			? ensureFloatUniform(node, p, uniforms, animatedKeys)
			: literalParamGlsl(node, p);
		tpl = tpl.replace(new RegExp(`\\{\\{param:${p.id}\\}\\}`, 'g'), repl);
		tpl = tpl.replace(new RegExp(`\\{\\{uniform:${p.id}\\}\\}`, 'g'), repl);
	}

	tpl = tpl.replace(/\{\{iChannel:param:(\w+)\}\}/g, (_, pid: string) =>
		iChannelSamplerForParamId(node, def, pid),
	);

	if (def.codegenKind === 'glsl_expr') {
		let body = typeof node.data.expression === 'string' ? node.data.expression : '0.0';
		for (const inp of def.inputs) {
			body = body.replace(new RegExp(`\\{\\{in:${inp.id}\\}\\}`, 'g'), ins[inp.id]!);
		}
		for (const out of def.outputs) {
			body = body.replace(new RegExp(`\\{\\{out:${out.id}\\}\\}`, 'g'), outVar(node.id, out.id));
		}
		tpl = tpl.replace(/\{\{body\}\}/g, body);
	}

	return tpl;
}
