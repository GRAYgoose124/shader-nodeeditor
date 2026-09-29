import type { NodeTypeDef } from '../../types.js';

export const sdfVisualizeNodes: NodeTypeDef[] = [
	{
		id: 'sdf_visualize',
		label: 'SDF → color',
		category: 'SDF',
		inputs: [{ id: 'd', type: 'float' }],
		outputs: [{ id: 'rgb', type: 'vec3' }],
		params: [
			{ id: 'base', label: 'Base level', glslType: 'float', default: 0.55, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'amp', label: 'Contrast', glslType: 'float', default: 0.45, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'palScale', label: 'd → phase scale', glslType: 'float', default: 6.28318, min: 0, max: 40, step: 0.1, binding: 'uniform' },
			{ id: 'ph0', label: 'Phase R', glslType: 'float', default: 0, min: 0, max: 6.28, step: 0.05, binding: 'uniform' },
			{ id: 'ph1', label: 'Phase G', glslType: 'float', default: 2.1, min: 0, max: 6.28, step: 0.05, binding: 'uniform' },
			{ id: 'ph2', label: 'Phase B', glslType: 'float', default: 4.2, min: 0, max: 6.28, step: 0.05, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec3 {{out:rgb}} = float({{param:base}}) + float({{param:amp}}) * cos(vec3(float({{param:ph0}}), float({{param:ph1}}), float({{param:ph2}})) + {{in:d}} * float({{param:palScale}}));`,
	},
];

