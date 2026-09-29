import type { UniformManifestEntry } from '@shadertoy/compiler';
import type { ShadertoyRunner } from '@shadertoy/runner';

export function readUniformScalar(r: ShadertoyRunner | null, u: UniformManifestEntry): number {
	if (!r) {
		const d = u.default;
		return typeof d === 'number' ? d : Array.isArray(d) ? (d[0] ?? 0) : 0;
	}
	const v = r.getUniform(u.name);
	if (typeof v === 'number') return v;
	if (Array.isArray(v)) return v[0] ?? 0;
	const d = u.default;
	return typeof d === 'number' ? d : Array.isArray(d) ? (d[0] ?? 0) : 0;
}

export function setUniformScalarValue(
	r: ShadertoyRunner | null,
	u: UniformManifestEntry,
	v: number,
): void {
	r?.setUniform(u.name, u.type === 'int' ? Math.round(v) : v);
}

export function resetUniformToDefault(r: ShadertoyRunner | null, uniformName: string): void {
	r?.resetUniformToDefault(uniformName);
}
