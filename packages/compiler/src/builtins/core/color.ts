import type { NodeTypeDef } from '../../types.js';

export const coreColorNodes: NodeTypeDef[] = [
	{
		id: 'sin_time_color',
		label: 'Sin palette (demo)',
		category: 'Core',
		inputs: [{ id: 't', type: 'float' }],
		outputs: [{ id: 'rgb', type: 'vec3' }],
		params: [{ id: 'freq', label: 'Phase scale', glslType: 'float', default: 2, min: 0, max: 16, step: 0.05, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nvec3 {{out:rgb}} = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.189) + {{in:t}} * float({{param:freq}}));`,
	},
	{
		id: 'cosine_palette',
		label: 'Cosine palette',
		category: 'Core',
		inputs: [{ id: 't', type: 'float', label: 'Phase' }],
		outputs: [{ id: 'rgb', type: 'vec3', label: 'RGB' }],
		params: [
			{ id: 'aR', label: 'A R', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'aG', label: 'A G', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'aB', label: 'A B', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'bR', label: 'B R', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'bG', label: 'B G', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'bB', label: 'B B', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'cR', label: 'C R', glslType: 'float', default: 1, min: 0, max: 2, step: 0.05, binding: 'uniform' },
			{ id: 'cG', label: 'C G', glslType: 'float', default: 1, min: 0, max: 2, step: 0.05, binding: 'uniform' },
			{ id: 'cB', label: 'C B', glslType: 'float', default: 1, min: 0, max: 2, step: 0.05, binding: 'uniform' },
			{ id: 'dR', label: 'D R', glslType: 'float', default: 0, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'dG', label: 'D G', glslType: 'float', default: 0.33, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'dB', label: 'D B', glslType: 'float', default: 0.67, min: 0, max: 1, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — https://iquilezles.org/articles/palettes/
vec3 {{out:rgb}} = vec3(float({{param:aR}}), float({{param:aG}}), float({{param:aB}}))
  + vec3(float({{param:bR}}), float({{param:bG}}), float({{param:bB}})) * cos(6.28318 * (vec3(float({{param:cR}}), float({{param:cG}}), float({{param:cB}})) * {{in:t}} + vec3(float({{param:dR}}), float({{param:dG}}), float({{param:dB}}))));`,
	},
];

