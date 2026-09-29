import {
	ensureFloatUniform,
	getLiteralStringParam,
	getParamChoice,
	getParamScalar,
	literalParamGlsl,
	paramById,
	resolveParamFloatGlsl,
} from './params.js';
import { sanitizeExportFnBase } from './frameFnExport.js';
import { expandSdfPrimitive } from '../expandSdfPrimitive.js';
import { BuiltinNodeId } from '../builtinIds.js';
import { outVar, sanitizeNodeId } from '../ident.js';
import { markerBlockRE, RaymarchTemplateMarker } from '../raymarchTemplateMarkers.js';

function buildWinningStrandIqNormalBlock(ns: string, strandFns: string[]): string {
	const k = strandFns.length;
	const lines: string[] = [];
	for (let i = 0; i < k; i++) {
		lines.push(`    float dsw${i}_${ns} = ${strandFns[i]}(pmc_${ns});`);
	}
	lines.push(`    int win_${ns} = 0;`);
	lines.push(`    float bestD_${ns} = dsw0_${ns};`);
	for (let i = 1; i < k; i++) {
		lines.push(`    if (dsw${i}_${ns} < bestD_${ns}) { bestD_${ns} = dsw${i}_${ns}; win_${ns} = ${i}; }`);
	}
	lines.push(`    vec3 nmc_${ns};`);
	lines.push(`    vec2 ve_${ns} = vec2(nEpsU_${ns}, 0.0);`);
	lines.push(`    if (float({{param:iqNormal}}) > 0.5) {`);
	for (let i = 0; i < k; i++) {
		if (i === 0) {
			lines.push(`      if (win_${ns} == ${i}) {`);
		} else {
			lines.push(`      } else if (win_${ns} == ${i}) {`);
		}
		lines.push(`        nmc_${ns} = normalize(vec3(`);
		lines.push(`          ${strandFns[i]}(pmc_${ns} + ve_${ns}.xyy) - ${strandFns[i]}(pmc_${ns} - ve_${ns}.xyy),`);
		lines.push(`          ${strandFns[i]}(pmc_${ns} + ve_${ns}.yxy) - ${strandFns[i]}(pmc_${ns} - ve_${ns}.yxy),`);
		lines.push(`          ${strandFns[i]}(pmc_${ns} + ve_${ns}.yyx) - ${strandFns[i]}(pmc_${ns} - ve_${ns}.yyx)));`);
	}
	lines.push(`      }`);
	lines.push(`    } else {`);
	lines.push(`      nmc_${ns} = normalize(pmc_${ns});`);
	lines.push(`    }`);
	return lines.join('\n');
}

function applyPrimaryNormalWinningStrand(
	tpl: string,
	opts: ExpandOpts | undefined,
	ns: string,
): string {
	const re = markerBlockRE(RaymarchTemplateMarker.BeginPrimaryNormal, RaymarchTemplateMarker.EndPrimaryNormal);
	const fns = opts?.sceneStrandFnNames;
	if (opts?.unionWinningStrandNormal && fns?.length) {
		const block = buildWinningStrandIqNormalBlock(ns, fns);
		return tpl.replace(re, `\n${block}\n`);
	}
	return tpl.replace(re, (_m, inner: string) => `\n${inner}\n`);
}
import type { BufferId, GraphNode, NodeTypeDef, UniformManifestEntry } from '../types.js';

export type ExpandOpts = {
	sceneSdfFnName?: string;
	/** `scene_mat_<pass>(p)` — only set when **Shade with SDF albedo** is On (literal) and the scene uses `sdf_albedo`. */
	sceneMatFnName?: string;
	sceneEmitDefaultMat?: boolean;
	/** Inside `glsl_repeat_*` zones: replace `{{loop:key}}` in templates / expr bodies. */
	loopReplacements?: Record<string, string>;
	/** `scene_strand_i_<pass>(p)` names when stratified union codegen ran. */
	sceneStrandFnNames?: string[];
	/** Primary-hit normal from argmin strand (IQ gradient on that strand only). */
	unionWinningStrandNormal?: boolean;
};

/** Strip heavy optional sections when compile-time (literal) toggles are off — keeps default shaders small. */
function applyRaymarchOptionalStrips(tpl: string, node: GraphNode, def: NodeTypeDef): string {
	if (def.id !== BuiltinNodeId.RaymarchScene) return tpl;
	const strips: { begin: string; end: string; paramId: string }[] = [
		{ begin: RaymarchTemplateMarker.BeginSky, end: RaymarchTemplateMarker.EndSky, paramId: 'skyBounceOn' },
		{ begin: RaymarchTemplateMarker.BeginRefl, end: RaymarchTemplateMarker.EndRefl, paramId: 'reflOn' },
		{ begin: RaymarchTemplateMarker.BeginGi, end: RaymarchTemplateMarker.EndGi, paramId: 'giOn' },
		{
			begin: RaymarchTemplateMarker.BeginSdfAlbedo,
			end: RaymarchTemplateMarker.EndSdfAlbedo,
			paramId: 'sdfAlbedoShadeOn',
		},
	];
	for (const { begin, end, paramId } of strips) {
		const re = markerBlockRE(begin, end);
		const p = def.params.find((x) => x.id === paramId);
		const remove = p?.binding === 'literal' && getParamScalar(node, p) <= 0.5;
		tpl = tpl.replace(re, (_m, inner: string) => (remove ? '\n' : `\n${inner}\n`));
	}
	const refineRe = new RegExp(
		`\\n\\/\\/<<${RaymarchTemplateMarker.BeginRefine}>>\\n([\\s\\S]*?)\\n\\/\\/<<${RaymarchTemplateMarker.EndRefine}>>`,
	);
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
	if (def.id === BuiltinNodeId.SdfParamP) return '';
	if (def.id === BuiltinNodeId.SdfTessellateFeedback || def.id === BuiltinNodeId.SdfIteratePullback) return '';
	if (def.id === BuiltinNodeId.DomainCallExportedVec3) {
		const pIn = wm.get('p') ?? 'p';
		const fn = sanitizeExportFnBase(getLiteralStringParam(node, paramById(def, 'fnBase'), 'my_xform'));
		return `// node: ${node.id}\nvec3 ${outVar(node.id, 'p')} = ${fn}(${pIn});`;
	}
	if (def.id === BuiltinNodeId.DomainCallExportedSdf) {
		const pIn = wm.get('p') ?? 'p';
		const fn = sanitizeExportFnBase(getLiteralStringParam(node, paramById(def, 'fnBase'), 'my_sdf'));
		return `// node: ${node.id}\nfloat ${outVar(node.id, 'd')} = ${fn}(${pIn});`;
	}
	if (def.id === BuiltinNodeId.SdfRepeatExportedMin) {
		const ns = sanitizeNodeId(node.id);
		const pIn = wm.get('p') ?? 'p';
		const fn = sanitizeExportFnBase(getLiteralStringParam(node, paramById(def, 'fnBase'), 'my_sdf'));
		const countP = paramById(def, 'count')!;
		const countLit = Math.max(1, Math.min(16, Math.floor(getParamScalar(node, countP) || 1)));
		const axis = getParamChoice(node, paramById(def, 'axis'), 'x');
		const sp = ensureFloatUniform(node, paramById(def, 'spacing')!, uniforms, animatedKeys);
		const iv = `irp_${ns}`;
		const offs =
			axis === 'y'
				? `vec3(0.0, float(${sp}) * float(${iv}), 0.0)`
				: axis === 'z'
					? `vec3(0.0, 0.0, float(${sp}) * float(${iv}))`
					: `vec3(float(${sp}) * float(${iv}), 0.0, 0.0)`;
		return `// node: ${node.id} — repeat exported SDF (min)
float acc_${ns} = 1e9;
for (int ${iv} = 0; ${iv} < 16; ${iv}++) {
  if (float(${iv}) >= float(${countLit})) break;
  acc_${ns} = min(acc_${ns}, ${fn}(${pIn} + ${offs}));
}
float ${outVar(node.id, 'd')} = acc_${ns};`;
	}
	if (def.id === BuiltinNodeId.SceneSdfRepeatBegin) {
		const pIn = wm.get('p') ?? 'p';
		const sp = ensureFloatUniform(node, paramById(def, 'spacing')!, uniforms, animatedKeys);
		const axis = getParamChoice(node, paramById(def, 'axis'), 'x');
		const ik = getLiteralStringParam(node, paramById(def, 'indexName'), 'ri');
		const loopTok = `{{loop:${ik}}}`;
		const mul = `(${loopTok}) * float(${sp})`;
		const offs =
			axis === 'y'
				? `vec3(0.0, ${mul}, 0.0)`
				: axis === 'z'
					? `vec3(0.0, 0.0, ${mul})`
					: `vec3(${mul}, 0.0, 0.0)`;
		return `// node: ${node.id} — scene_sdf_repeat_begin\nvec3 ${outVar(node.id, 'p')} = ${pIn} + ${offs};`;
	}
	if (def.id === BuiltinNodeId.SceneSdfRepeatEnd) return '';
	if (def.id === BuiltinNodeId.GlslRepeatEnd) return '';
	if (def.id === BuiltinNodeId.FeedbackPassSubsteps) return '';
	if (def.id === BuiltinNodeId.SdfPrimitive)
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
	if (def.id === BuiltinNodeId.RaymarchScene) {
		tpl = applyRaymarchOptionalStrips(tpl, node, def);
	}
	tpl = tpl.replace(/\{\{nodeId\}\}/g, node.id);
	tpl = tpl.replace(/\{\{ns\}\}/g, ns);
	tpl = tpl.replace(/\{\{passTag\}\}/g, pass);

	if (def.id === BuiltinNodeId.RaymarchScene) {
		tpl = applyPrimaryNormalWinningStrand(tpl, opts, ns);
	}

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
		const repl = resolveParamFloatGlsl(node, p, wm, uniforms, animatedKeys);
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
		if (opts?.loopReplacements) {
			for (const [k, v] of Object.entries(opts.loopReplacements)) {
				const needle = `{{loop:${k}}}`;
				if (body.includes(needle)) body = body.split(needle).join(v);
			}
		}
		tpl = tpl.replace(/\{\{body\}\}/g, body);
	}

	if (opts?.loopReplacements) {
		for (const [k, v] of Object.entries(opts.loopReplacements)) {
			const needle = `{{loop:${k}}}`;
			if (tpl.includes(needle)) tpl = tpl.split(needle).join(v);
		}
	}

	return tpl;
}
