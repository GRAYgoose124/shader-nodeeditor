import { uniformName } from '../ident.js';
import { isParamAnimatable, paramAnimKey } from '../paramAnimation.js';
import { isParamGraphDriveActive, paramWirePortId } from '../paramWire.js';
import { resolveParamChoice } from '../paramVisibility.js';
import type { GraphNode, NodeTypeDef, ParamDef, UniformManifestEntry } from '../types.js';

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

export function getParamChoice(node: GraphNode, p: ParamDef | undefined, fallback = 'sphere'): string {
	return resolveParamChoice(node.data, p, fallback);
}

/** Sanitized identifier fragment for repeat zone keys / loop index prefix. */
export function getLiteralStringParam(node: GraphNode, p: ParamDef | undefined, fallback: string): string {
	if (!p) return sanitizeRepeatKey(fallback);
	const v = node.data[p.id];
	if (typeof v === 'string' && v.trim()) return sanitizeRepeatKey(v.trim());
	const d = p.default;
	if (typeof d === 'string' && d.trim()) return sanitizeRepeatKey(d.trim());
	if (typeof d === 'number' && Number.isFinite(d)) return sanitizeRepeatKey(String(Math.floor(d)));
	return sanitizeRepeatKey(fallback);
}

function sanitizeRepeatKey(s: string): string {
	const t = s.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^([0-9])/, '_$1');
	return t.length > 0 ? t : 'z';
}

export function paramById(def: NodeTypeDef, id: string): ParamDef | undefined {
	return def.params.find((x) => x.id === id);
}

export function formatLiteral(n: number): string {
	if (!Number.isFinite(n)) return '0.0';
	return n % 1 === 0 ? `${n}.0` : String(n);
}

export const MAX_PASS_SUBSTEPS = 32;

export function clampPassSubsteps(n: number): number {
	if (!Number.isFinite(n)) return 1;
	return Math.max(1, Math.min(MAX_PASS_SUBSTEPS, Math.floor(n)));
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

/**
 * Scalar float expression for `{{param:*}}` / `{{uniform:*}}`: graph wire (when active), else uniform name or literal.
 */
export function resolveParamFloatGlsl(
	node: GraphNode,
	p: ParamDef | undefined,
	wm: Map<string, string>,
	uniforms: UniformManifestEntry[],
	animatedKeys: Set<string>,
): string {
	if (!p) return '0.0';
	if (isParamGraphDriveActive(node, p, wm)) {
		return wm.get(paramWirePortId(p.id))!;
	}
	const key = paramAnimKey(node.id, p.id);
	const anim = animatedKeys.has(key) && isParamAnimatable(p);
	const forceUniform = p.binding === 'uniform' || (p.binding === 'literal' && anim);
	return forceUniform
		? ensureFloatUniform(node, p, uniforms, animatedKeys)
		: literalParamGlsl(node, p);
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
