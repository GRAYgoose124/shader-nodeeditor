import type { ParamAnimationSpec } from '@shadertoy/compiler';

function fract01(x: number): number {
	return x - Math.floor(x);
}

/** 0..1 waveform from spec and shader time. */
export function sampleParamAnimation01(spec: ParamAnimationSpec, iTimeSec: number): number {
	const t = spec.speed * (iTimeSec + spec.phase);
	const u = fract01(t);
	switch (spec.curve) {
		case 'saw':
			return u;
		case 'triangle':
			return 1 - 2 * Math.abs(u - 0.5);
		case 'smooth': {
			return u * u * (3 - 2 * u);
		}
		case 'sine':
		default:
			return 0.5 + 0.5 * Math.sin(2 * Math.PI * t);
	}
}

/** Oscillate around `center`, then apply offset; clamp to [min, max]. */
export function sampleParamAnimationValue(
	spec: ParamAnimationSpec,
	iTimeSec: number,
	center: number,
	min: number,
	max: number,
): number {
	const w = sampleParamAnimation01(spec, iTimeSec);
	const depth = Math.max(0, Math.min(1, spec.depth));
	const span =
		spec.range !== undefined && Number.isFinite(spec.range)
			? Math.max(0, spec.range)
			: (max - min) * depth;
	const off = spec.offset !== undefined && Number.isFinite(spec.offset) ? spec.offset : 0;
	const v = center + (w - 0.5) * span + off;
	return Math.min(max, Math.max(min, v));
}
