import type { NodeTypeDef } from '../../types.js';

export const fractalColorNodes: NodeTypeDef[] = [
	{
		id: 'fractal_color_ramp',
		label: 'Fractal color ramp',
		category: 'Fractal',
		inputs: [{ id: 't', type: 'float' }],
		outputs: [{ id: 'rgb', type: 'vec3' }],
		params: [
			{ id: 'freq', label: 'Phase scale', glslType: 'float', default: 12.56637, min: 0, max: 80, step: 0.1, binding: 'uniform' },
			{ id: 'b0', label: 'Band R', glslType: 'float', default: 0, min: 0, max: 3, step: 0.05, binding: 'uniform' },
			{ id: 'b1', label: 'Band G', glslType: 'float', default: 0.6, min: 0, max: 3, step: 0.05, binding: 'uniform' },
			{ id: 'b2', label: 'Band B', glslType: 'float', default: 1, min: 0, max: 3, step: 0.05, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec3 {{out:rgb}} = 0.5 + 0.5 * cos(vec3(float({{param:b0}}), float({{param:b1}}), float({{param:b2}})) + {{in:t}} * float({{param:freq}}));`,
	},
];

