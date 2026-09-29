import { describe, expect, it } from 'vitest';
import { isParamVisible, resolveParamChoice } from './paramVisibility.js';
import type { ParamDef } from './types.js';

describe('isParamVisible', () => {
	const pShape: ParamDef = {
		id: 'shape',
		label: 'Shape',
		glslType: 'float',
		default: 'sphere',
		binding: 'literal',
		choices: [{ value: 'sphere', label: 'S' }],
	};
	const pR: ParamDef = {
		id: 'r',
		label: 'r',
		glslType: 'float',
		default: 0.5,
		binding: 'uniform',
		visibleWhen: { paramId: 'shape', values: ['sphere'] },
	};

	it('shows param without visibleWhen', () => {
		expect(isParamVisible(pShape, { shape: 'sphere' })).toBe(true);
	});

	it('shows when shape matches', () => {
		expect(isParamVisible(pR, { shape: 'sphere' })).toBe(true);
	});

	it('hides when shape does not match', () => {
		expect(isParamVisible(pR, { shape: 'box' })).toBe(false);
	});

	it('shows when controlling value missing (inspector fallback)', () => {
		expect(isParamVisible(pR, {})).toBe(true);
	});

	it('numericEquals shows when toggle matches', () => {
		const pTex: ParamDef = {
			id: 'surfTexScale',
			label: 'scale',
			glslType: 'float',
			default: 1,
			binding: 'uniform',
			visibleWhen: { paramId: 'surfTexOn', numericEquals: [1] },
		};
		expect(isParamVisible(pTex, { surfTexOn: 1 })).toBe(true);
		expect(isParamVisible(pTex, { surfTexOn: 0 })).toBe(false);
		expect(isParamVisible(pTex, {})).toBe(false);
	});
});

describe('resolveParamChoice', () => {
	const pOnOff: ParamDef = {
		id: 'giOn',
		label: 'GI',
		glslType: 'float',
		default: '0',
		binding: 'literal',
		choices: [
			{ value: '0', label: 'Off' },
			{ value: '1', label: 'On' },
		],
	};

	it('returns string choice when stored as string', () => {
		expect(resolveParamChoice({ giOn: '1' }, pOnOff, 'x')).toBe('1');
	});

	it('maps numeric preset values to choice strings', () => {
		expect(resolveParamChoice({ giOn: 1 }, pOnOff, 'x')).toBe('1');
		expect(resolveParamChoice({ giOn: 0 }, pOnOff, 'x')).toBe('0');
	});

	it('uses fallback when param has no choices', () => {
		const pUniform: ParamDef = {
			id: 'x',
			label: 'x',
			glslType: 'float',
			default: 0,
			binding: 'uniform',
		};
		expect(resolveParamChoice({}, pUniform, 'fb')).toBe('fb');
	});
});
