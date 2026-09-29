import type { NodeTypeDef } from '../../types.js';

export const feedback2dVec4Nodes: NodeTypeDef[] = [
	{
		id: 'vec4_const',
		label: 'RGBA constant',
		category: 'Buffer / feedback',
		inputs: [],
		outputs: [{ id: 'rgba', type: 'vec4', label: 'RGBA' }],
		params: [
			{ id: 'r', label: 'R', glslType: 'float', default: 1, min: -4, max: 4, step: 0.01, binding: 'uniform' },
			{ id: 'g', label: 'G', glslType: 'float', default: 1, min: -4, max: 4, step: 0.01, binding: 'uniform' },
			{ id: 'b', label: 'B', glslType: 'float', default: 1, min: -4, max: 4, step: 0.01, binding: 'uniform' },
			{ id: 'a', label: 'A', glslType: 'float', default: 1, min: -4, max: 4, step: 0.01, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}\nvec4 {{out:rgba}} = vec4(float({{param:r}}), float({{param:g}}), float({{param:b}}), float({{param:a}}));`,
	},
	{
		id: 'vec4_channels',
		label: 'Vec4 → floats',
		category: 'Buffer / feedback',
		description: 'Split `.x` `.y` `.z` `.w` into scalar outputs (no swizzle).',
		inputs: [{ id: 'rgba', type: 'vec4', label: 'RGBA' }],
		outputs: [
			{ id: 'x', type: 'float', label: 'x' },
			{ id: 'y', type: 'float', label: 'y' },
			{ id: 'z', type: 'float', label: 'z' },
			{ id: 'w', type: 'float', label: 'w' },
		],
		params: [],
		template: `// node: {{nodeId}}
float {{out:x}} = {{in:rgba}}.x;
float {{out:y}} = {{in:rgba}}.y;
float {{out:z}} = {{in:rgba}}.z;
float {{out:w}} = {{in:rgba}}.w;`,
	},
	{
		id: 'vec4_from_xyz_w',
		label: 'Vec4 (xyz + w)',
		category: 'Buffer / feedback',
		description: '`vec4(x, y, z, w)` with literal/composite **w** (default 0).',
		inputs: [
			{ id: 'x', type: 'float', label: 'x' },
			{ id: 'y', type: 'float', label: 'y' },
			{ id: 'z', type: 'float', label: 'z' },
		],
		outputs: [{ id: 'rgba', type: 'vec4', label: 'RGBA' }],
		params: [{ id: 'w', label: 'w', glslType: 'float', default: 0, min: -4, max: 4, step: 0.01, binding: 'literal' }],
		template: `// node: {{nodeId}}\nvec4 {{out:rgba}} = vec4({{in:x}}, {{in:y}}, {{in:z}}, float({{param:w}}));`,
	},
	{
		id: 'vec4_swizzle',
		label: 'Vec4 swizzle',
		category: 'Buffer / feedback',
		description: 'Compile-time swizzle on **v** (`.xyzw`, `.zxyw`, …).',
		inputs: [{ id: 'v', type: 'vec4', label: 'v' }],
		outputs: [{ id: 'out', type: 'vec4', label: 'Swizzled' }],
		params: [
			{
				id: 'pattern',
				label: 'Swizzle',
				glslType: 'float',
				default: 'xyzw',
				binding: 'literal',
				choices: [
					{ value: 'xyzw', label: 'xyzw' },
					{ value: 'zxyw', label: 'zxyw' },
					{ value: 'yzxw', label: 'yzxw' },
				],
			},
		],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = {{in:v}}.{{param:pattern}};`,
	},
	{
		id: 'vec4_add',
		label: 'Add vec4',
		category: 'Buffer / feedback',
		inputs: [
			{ id: 'a', type: 'vec4', label: 'a' },
			{ id: 'b', type: 'vec4', label: 'b' },
		],
		outputs: [{ id: 'out', type: 'vec4', label: 'a + b' }],
		params: [],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = {{in:a}} + {{in:b}};`,
	},
	{
		id: 'vec4_mul',
		label: 'Multiply vec4 (×)',
		category: 'Buffer / feedback',
		description: 'Component-wise multiply.',
		inputs: [
			{ id: 'a', type: 'vec4', label: 'a' },
			{ id: 'b', type: 'vec4', label: 'b' },
		],
		outputs: [{ id: 'out', type: 'vec4', label: 'a * b' }],
		params: [],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = {{in:a}} * {{in:b}};`,
	},
	{
		id: 'vec4_scale',
		label: 'Scale vec4',
		category: 'Buffer / feedback',
		inputs: [{ id: 'a', type: 'vec4', label: 'a' }],
		outputs: [{ id: 'out', type: 'vec4', label: 'a * s' }],
		params: [{ id: 's', label: 'Scale', glslType: 'float', default: 1, min: -4, max: 4, step: 0.001, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = {{in:a}} * float({{param:s}});`,
	},
	{
		id: 'vec4_mul_float',
		label: 'vec4 × float',
		category: 'Buffer / feedback',
		inputs: [
			{ id: 'a', type: 'vec4', label: 'a' },
			{ id: 's', type: 'float', label: 's' },
		],
		outputs: [{ id: 'out', type: 'vec4', label: 'a * s' }],
		params: [],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = {{in:a}} * {{in:s}};`,
	},
];

