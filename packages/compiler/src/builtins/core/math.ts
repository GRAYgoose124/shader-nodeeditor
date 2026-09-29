import type { NodeTypeDef } from '../../types.js';

export const coreMathNodes: NodeTypeDef[] = [
	{
		id: 'float_const',
		label: 'Float',
		category: 'Core',
		inputs: [],
		outputs: [{ id: 'v', type: 'float' }],
		params: [{ id: 'value', label: 'Value', glslType: 'float', default: 0.5, min: -10, max: 10, step: 0.01, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nfloat {{out:v}} = float({{param:value}});`,
	},
	{
		id: 'float_cos',
		label: 'cos',
		category: 'Core',
		inputs: [{ id: 'x', type: 'float', label: 'x' }],
		outputs: [{ id: 'out', type: 'float', label: 'cos(x)' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:out}} = cos({{in:x}});`,
	},
	{
		id: 'float_sin',
		label: 'sin',
		category: 'Core',
		inputs: [{ id: 'x', type: 'float', label: 'x' }],
		outputs: [{ id: 'out', type: 'float', label: 'sin(x)' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:out}} = sin({{in:x}});`,
	},
	{
		id: 'float_add',
		label: 'Add float',
		category: 'Core',
		inputs: [
			{ id: 'a', type: 'float', label: 'a' },
			{ id: 'b', type: 'float', label: 'b' },
		],
		outputs: [{ id: 'out', type: 'float', label: 'a + b' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:out}} = {{in:a}} + {{in:b}};`,
	},
	{
		id: 'float_sub',
		label: 'Subtract float',
		category: 'Core',
		inputs: [
			{ id: 'a', type: 'float', label: 'a' },
			{ id: 'b', type: 'float', label: 'b' },
		],
		outputs: [{ id: 'out', type: 'float', label: 'a − b' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:out}} = {{in:a}} - {{in:b}};`,
	},
	{
		id: 'float_mul',
		label: 'Multiply float',
		category: 'Core',
		inputs: [
			{ id: 'a', type: 'float', label: 'a' },
			{ id: 'b', type: 'float', label: 'b' },
		],
		outputs: [{ id: 'out', type: 'float', label: 'a * b' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:out}} = {{in:a}} * {{in:b}};`,
	},
	{
		id: 'vec3_const',
		label: 'RGB',
		category: 'Core',
		inputs: [],
		outputs: [{ id: 'rgb', type: 'vec3' }],
		params: [
			{ id: 'r', label: 'R', glslType: 'float', default: 1, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'g', label: 'G', glslType: 'float', default: 1, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'b', label: 'B', glslType: 'float', default: 1, min: 0, max: 1, step: 0.01, binding: 'uniform' },
		],
		template:
			'// node: {{nodeId}}\nvec3 {{out:rgb}} = vec3(float({{param:r}}), float({{param:g}}), float({{param:b}}));',
	},
	{
		id: 'mix_vec3',
		label: 'Mix vec3',
		category: 'Core',
		inputs: [
			{ id: 'a', type: 'vec3' },
			{ id: 'b', type: 'vec3' },
		],
		outputs: [{ id: 'out', type: 'vec3' }],
		params: [{ id: 't', label: 'Mix', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.01, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nvec3 {{out:out}} = mix({{in:a}}, {{in:b}}, float({{param:t}}));`,
	},
	{
		id: 'mix_vec4',
		label: 'Mix vec4',
		category: 'Core',
		description:
			'Linear blend of two RGBA values. Use with two `sample_channel` nodes to composite buffers (e.g. feedback: mix(previous, fresh, t)).',
		inputs: [
			{ id: 'a', type: 'vec4' },
			{ id: 'b', type: 'vec4' },
		],
		outputs: [{ id: 'out', type: 'vec4' }],
		params: [{ id: 't', label: 'Mix', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.01, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = mix({{in:a}}, {{in:b}}, clamp(float({{param:t}}), 0.0, 1.0));`,
	},
	{
		id: 'vec4_from_vec3',
		label: 'Vec4 (vec3 + A)',
		category: 'Core',
		inputs: [{ id: 'rgb', type: 'vec3' }],
		outputs: [{ id: 'col', type: 'vec4' }],
		params: [{ id: 'a', label: 'Alpha', glslType: 'float', default: 1, min: 0, max: 1, step: 0.01, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nvec4 {{out:col}} = vec4({{in:rgb}}, float({{param:a}}));`,
	},
];

