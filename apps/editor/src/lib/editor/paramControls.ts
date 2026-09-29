import type { GlslType, ParamDef, UniformManifestEntry } from '@shadertoy/compiler';

export type ScalarUiBounds = { min: number; max: number; step: number; isInt: boolean };

export function boundsFromParamDef(p: Pick<ParamDef, 'min' | 'max' | 'step' | 'glslType'>): ScalarUiBounds {
	const isInt = p.glslType === 'int';
	return {
		min: p.min ?? 0,
		max: p.max ?? 1,
		step: p.step ?? (isInt ? 1 : 0.01),
		isInt,
	};
}

export function boundsFromUniform(u: Pick<UniformManifestEntry, 'min' | 'max' | 'step' | 'type'>): ScalarUiBounds {
	const isInt = u.type === 'int';
	return {
		min: u.min ?? 0,
		max: u.max ?? 1,
		step: u.step ?? (isInt ? 1 : 0.01),
		isInt,
	};
}

export function clampScalar(v: number, min: number, max: number, isInt: boolean): number {
	if (!Number.isFinite(v)) return min;
	let x = Math.min(max, Math.max(min, v));
	if (isInt) x = Math.round(x);
	return x;
}

export function readParamNumber(data: Record<string, unknown>, p: ParamDef, bounds: ScalarUiBounds): number {
	const raw = data[p.id];
	if (typeof raw === 'number' && Number.isFinite(raw)) {
		return clampScalar(raw, bounds.min, bounds.max, bounds.isInt);
	}
	if (typeof p.default === 'number' && Number.isFinite(p.default)) {
		return clampScalar(p.default, bounds.min, bounds.max, bounds.isInt);
	}
	return clampScalar(0, bounds.min, bounds.max, bounds.isInt);
}
