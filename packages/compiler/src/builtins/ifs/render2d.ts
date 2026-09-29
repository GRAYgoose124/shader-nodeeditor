import type { NodeTypeDef } from '../../types.js';

export const ifsRender2dNodes: NodeTypeDef[] = [
	{
		id: 'ifs_to_rgb',
		label: 'IFS → RGB',
		category: 'IFS',
		inputs: [{ id: 'z', type: 'vec2' }],
		outputs: [{ id: 'rgb', type: 'vec3' }],
		params: [
			{ id: 'bias', label: 'Level', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'amp', label: 'Amplitude', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Input gain (tanh)', glslType: 'float', default: 1, min: 0.1, max: 4, step: 0.05, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec3 {{out:rgb}} = vec3(
  float({{param:bias}}) + float({{param:amp}}) * tanh({{in:z}}.x * float({{param:gain}})),
  float({{param:bias}}) + float({{param:amp}}) * tanh({{in:z}}.y * float({{param:gain}})),
  float({{param:bias}}) + float({{param:amp}}) * tanh(length({{in:z}}) * float({{param:gain}})));`,
	},
];

