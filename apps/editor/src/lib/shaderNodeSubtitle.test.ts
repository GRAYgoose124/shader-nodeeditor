import type { NodeTypeDef } from '@shadertoy/compiler';
import { describe, expect, it } from 'vitest';
import { getShaderNodeSubtitle, truncateSubtitleLine } from './shaderNodeSubtitle.js';

const exprVec3Def = {
	id: 'expr_vec3',
	codegenKind: 'glsl_expr' as const,
	inputs: [],
	outputs: [],
	params: [],
	template: '',
} as unknown as NodeTypeDef;

describe('getShaderNodeSubtitle', () => {
	it('shows truncated one-line GLSL for glsl_expr', () => {
		const s = getShaderNodeSubtitle(exprVec3Def, {
			expression: 'vec3(1.0,\n2.0,  foo(a,b))',
		});
		expect(s).toContain('vec3');
		expect(s).not.toContain('\n');
	});

	it('formats float and vec constants', () => {
		const floatDef = {
			id: 'float_const',
			inputs: [],
			outputs: [],
			params: [],
			template: '',
		} as unknown as NodeTypeDef;
		expect(getShaderNodeSubtitle(floatDef, { value: 1.25 })).toBe('1.25');

		const v3 = {
			id: 'vec3_const',
			inputs: [],
			outputs: [],
			params: [],
			template: '',
		} as unknown as NodeTypeDef;
		expect(getShaderNodeSubtitle(v3, { r: 1, g: 0, b: 0.5 })).toBe('1, 0, 0.5');
	});
});

describe('truncateSubtitleLine', () => {
	it('collapses whitespace', () => {
		expect(truncateSubtitleLine('  a  \n  b  ', 10)).toBe('a b');
	});
});
