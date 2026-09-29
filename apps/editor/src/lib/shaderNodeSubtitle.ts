import type { NodeTypeDef } from '@shadertoy/compiler';

/** Extra vertical space under the title when a subtitle line is shown (matches `.sub` in ShaderNode). */
export const SHADER_NODE_SUBTITLE_EXTRA_H = 18;

function fmtFloatLike(v: unknown): string {
	if (typeof v === 'number' && Number.isFinite(v)) {
		if (Number.isInteger(v)) return String(v);
		const s = v.toFixed(4);
		return s.replace(/\.?0+$/, '') || '0';
	}
	if (typeof v === 'string' && v.trim()) {
		const n = Number(v);
		if (Number.isFinite(n)) return fmtFloatLike(n);
		return v.length > 24 ? `${v.slice(0, 24)}…` : v;
	}
	return '—';
}

function literalChoiceLabel(def: NodeTypeDef, paramId: string, raw: unknown): string | null {
	const p = def.params.find((x) => x.id === paramId);
	if (!p?.choices?.length) return null;
	const key = String(raw ?? '');
	const c = p.choices.find((ch) => ch.value === key);
	return c?.label ?? (key ? key : null);
}

/** Single-line preview for graph canvas; ellipsis for long GLSL. */
export function truncateSubtitleLine(s: string, maxLen = 56): string {
	const one = s.replace(/\s+/g, ' ').trim();
	if (one.length <= maxLen) return one;
	return `${one.slice(0, maxLen - 1)}…`;
}

/**
 * Short value/expression line for shader nodes (constants, expressions, a few key params).
 * Used on-canvas and for height estimation in `shaderNodeLayout.ts`.
 */
export function getShaderNodeSubtitle(def: NodeTypeDef | undefined, data: Record<string, unknown>): string | null {
	if (!def) return null;

	if (def.codegenKind === 'glsl_expr') {
		const ex = data['expression'];
		if (typeof ex !== 'string' || !ex.trim()) return 'expr…';
		return truncateSubtitleLine(ex);
	}

	if (def.id === 'sdf_primitive') {
		const raw = data['shape'];
		if (typeof raw !== 'string') return null;
		const p = def.params.find((x) => x.id === 'shape');
		const c = p?.choices?.find((ch) => ch.value === raw);
		return c?.label ?? raw;
	}

	switch (def.id) {
		case 'float_const':
			return fmtFloatLike(data['value']);
		case 'vec3_const':
			return `${fmtFloatLike(data['r'])}, ${fmtFloatLike(data['g'])}, ${fmtFloatLike(data['b'])}`;
		case 'vec4_const':
			return `${fmtFloatLike(data['r'])}, ${fmtFloatLike(data['g'])}, ${fmtFloatLike(data['b'])}, ${fmtFloatLike(data['a'])}`;
		case 'mix_vec3':
		case 'mix_vec4':
			return `t=${fmtFloatLike(data['t'])}`;
		case 'vec4_from_vec3':
			return `α=${fmtFloatLike(data['a'])}`;
		case 'sin_time_color':
			return `freq=${fmtFloatLike(data['freq'])}`;
		case 'sample_channel': {
			const ch = data['channel'];
			const lit = literalChoiceLabel(def, 'channel', ch);
			return lit !== null ? `ch ${lit}` : `ch ${fmtFloatLike(ch)}`;
		}
		case 'vec4_from_xyz_w':
			return `w=${fmtFloatLike(data['w'])}`;
		case 'vec4_swizzle': {
			const pat = data['pattern'];
			return typeof pat === 'string' && pat.trim() ? `.${pat.trim()}` : null;
		}
		default:
			break;
	}

	return null;
}
