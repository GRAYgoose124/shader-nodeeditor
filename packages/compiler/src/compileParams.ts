import { uniformName } from './ident.js';
import { isParamAnimatable, paramAnimKey } from './paramAnimation.js';
import { resolveParamChoice } from './paramVisibility.js';
import type { GraphNode, NodeTypeDef, ParamDef, UniformManifestEntry } from './types.js';

export function getParamScalar(node: GraphNode, p: ParamDef): number {
	const v = node.data[p.id];
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'boolean') return v ? 1 : 0;
	if (typeof v === 'string') {
		const n = Number(v);
		if (Number.isFinite(n)) return n;
	}
	const d = p.default;
	if (typeof d === 'number' && Number.isFinite(d)) return d;
	if (typeof d === 'string') {
		const nd = Number(d);
		if (Number.isFinite(nd)) return nd;
	}
	return 0;
}

export function getParamChoice(node: GraphNode, p: ParamDef | undefined): string {
	return resolveParamChoice(node.data, p, 'sphere');
}

export function paramById(def: NodeTypeDef, id: string): ParamDef | undefined {
	return def.params.find((x) => x.id === id);
}

export function formatLiteral(n: number): string {
	if (!Number.isFinite(n)) return '0.0';
	return n % 1 === 0 ? `${n}.0` : String(n);
}

export function ensureFloatUniform(
	node: GraphNode,
	p: ParamDef | undefined,
	uniforms: UniformManifestEntry[],
	animatedKeys?: Set<string>,
): string {
	if (!p) return '0.0';
	const v = getParamScalar(node, p);
	const key = paramAnimKey(node.id, p.id);
	const anim =
		!!animatedKeys?.has(key) && isParamAnimatable(p);
	const asUniform = p.binding === 'uniform' || (p.binding === 'literal' && anim);
	if (!asUniform) return formatLiteral(v);
	const un = uniformName(node.id, p.id);
	const existing = uniforms.find((u) => u.name === un);
	if (existing) {
		if (anim) existing.driver = 'paramAnimation';
		return un;
	}
	uniforms.push({
		name: un,
		type: p.glslType,
		nodeId: node.id,
		paramId: p.id,
		default: v,
		min: p.min,
		max: p.max,
		step: p.step,
		label: p.label,
		...(anim ? { driver: 'paramAnimation' as const } : {}),
	});
	return un;
}

/** Literal `{{param:id}}` for templates: numeric choice values become GLSL floats; scalars use formatLiteral. */
export function literalParamGlsl(node: GraphNode, p: ParamDef): string {
	if (p.choices?.length) {
		const s = getParamChoice(node, p);
		const n = Number(s);
		if (Number.isFinite(n)) return formatLiteral(n);
		return s;
	}
	return formatLiteral(getParamScalar(node, p));
}
