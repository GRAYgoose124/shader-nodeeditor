import type { NodeTypeDef } from '../types.js';

/** User `data.expression` supplies the body; uses {{in:a}}, {{in:b}}, {{in:c}} */
export const customNodes: NodeTypeDef[] = [
	{
		id: 'expr_float',
		label: 'GLSL expr → float',
		category: 'Custom',
		codegenKind: 'glsl_expr',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
			{ id: 'c', type: 'float' },
		],
		outputs: [{ id: 'out', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:out}} = ( {{body}} );`,
	},
	{
		id: 'expr_vec3',
		label: 'GLSL expr → vec3',
		category: 'Custom',
		codegenKind: 'glsl_expr',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'out', type: 'vec3' }],
		params: [],
		template: `// node: {{nodeId}}\nvec3 {{out:out}} = ( {{body}} );`,
	},
	{
		id: 'expr_vec4',
		label: 'GLSL expr → vec4',
		category: 'Custom',
		description:
			'GLSL **statements** (not a single parenthesized expr): use `{{in:a}}`…`{{in:d}}` (vec4) and `{{in:x}}` (float), then assign the result to `{{out:out}}`. (GLSL has no `({ … })` statement expressions — use this block form.)',
		codegenKind: 'glsl_expr',
		inputs: [
			{ id: 'a', type: 'vec4', label: 'a' },
			{ id: 'b', type: 'vec4', label: 'b' },
			{ id: 'c', type: 'vec4', label: 'c' },
			{ id: 'd', type: 'vec4', label: 'd' },
			{ id: 'x', type: 'float', label: 'x' },
		],
		outputs: [{ id: 'out', type: 'vec4' }],
		params: [],
		template: `// node: {{nodeId}}\nvec4 {{out:out}};\n{\n{{body}}\n}`,
	},
];
