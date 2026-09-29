import type { NodeTypeDef } from '../../types.js';

export const sdfCsgSmoothNodes: NodeTypeDef[] = [
	{
		id: 'smin_float',
		label: 'Smooth min',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [
			{
				id: 'k',
				label: 'Smooth (radius)',
				glslType: 'float',
				default: 0.12,
				min: 0.02,
				max: 2,
				step: 0.01,
				binding: 'uniform',
			},
		],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = smin({{in:a}}, {{in:b}}, float({{param:k}}));`,
	},
	{
		id: 'smin_exp_float',
		label: 'Smooth min (exp)',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [{ id: 'k', label: 'Sharpness k', glslType: 'float', default: 8, min: 0.5, max: 40, step: 0.5, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = smin_exp({{in:a}}, {{in:b}}, float({{param:k}}));`,
	},
	{
		id: 'smax_float',
		label: 'Smooth max',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [{ id: 'k', label: 'Smooth (radius)', glslType: 'float', default: 0.12, min: 0.02, max: 2, step: 0.01, binding: 'uniform' }],
		template: `// node: {{nodeId}} — smax / https://iquilezles.org/articles/distfunctions/\nfloat {{out:d}} = smax({{in:a}}, {{in:b}}, float({{param:k}}));`,
	},
	{
		id: 'smax_exp_float',
		label: 'Smooth max (exp)',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [{ id: 'k', label: 'Sharpness k', glslType: 'float', default: 8, min: 0.5, max: 40, step: 0.5, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = smax_exp({{in:a}}, {{in:b}}, float({{param:k}}));`,
	},
	{
		id: 'smin_smooth_sub_float',
		label: 'Smooth subtract (A cut B)',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [{ id: 'k', label: 'Smooth (radius)', glslType: 'float', default: 0.12, min: 0.02, max: 2, step: 0.01, binding: 'uniform' }],
		template: `// node: {{nodeId}} — smin(a,-b) / https://iquilezles.org/articles/distfunctions/\nfloat {{out:d}} = smin({{in:a}}, -{{in:b}}, float({{param:k}}));`,
	},
];

export const sdfCsgHardNodes: NodeTypeDef[] = [
	{
		id: 'op_union',
		label: 'Union',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = min({{in:a}}, {{in:b}});`,
	},
	{
		id: 'op_subtract',
		label: 'Subtract',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = max({{in:a}}, -{{in:b}});`,
	},
	{
		id: 'op_intersect',
		label: 'Intersect',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = max({{in:a}}, {{in:b}});`,
	},
];

