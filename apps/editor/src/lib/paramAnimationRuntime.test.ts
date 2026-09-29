import { describe, expect, it } from 'vitest';
import { sampleParamAnimationValue } from './paramAnimationRuntime.js';
import type { ParamAnimationSpec } from '@shadertoy/compiler';

const base = (): ParamAnimationSpec => ({
	nodeId: 'n',
	paramId: 'p',
	curve: 'sine',
	speed: 1,
	phase: 0,
	depth: 1,
});

describe('sampleParamAnimationValue', () => {
	it('uses depth × (max−min) when range is omitted', () => {
		const spec = { ...base(), depth: 0.5 };
		const t = 0; // sine => w = 0.5 at t=0
		expect(sampleParamAnimationValue(spec, t, 5, 0, 10)).toBeCloseTo(5, 5);
	});

	it('uses explicit peak-to-peak range when set', () => {
		const spec = { ...base(), depth: 0.1, range: 4 };
		const t = 0;
		// w=0.5 → center
		expect(sampleParamAnimationValue(spec, t, 5, 0, 10)).toBeCloseTo(5, 5);
	});

	it('applies offset before clamp', () => {
		const spec = { ...base(), range: 0, offset: 2 };
		const t = 0;
		expect(sampleParamAnimationValue(spec, t, 5, 0, 10)).toBe(7);
	});
});
