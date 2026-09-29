import type { NodeTypeDef } from '../../types.js';

export const proc2dNoiseNodes: NodeTypeDef[] = [
	{
		id: 'proc2d_hash',
		label: '2D hash (scalar)',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/morenoise/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'h', type: 'float', label: 'Hash' }],
		params: [{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' }],
		template: `// node: {{nodeId}} — iq_hash31 / https://iquilezles.org/articles/morenoise/
float {{out:h}} = iq_hash31(vec3({{in:p}}, float({{param:z}})));`,
	},
	{
		id: 'proc2d_vnoise',
		label: '2D value noise',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/noise/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'n', type: 'float', label: 'Noise' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 1, min: 0.1, max: 32, step: 0.05, binding: 'uniform' },
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_vnoise / https://iquilezles.org/articles/noise/
float {{out:n}} = iq_vnoise(vec3({{in:p}} * float({{param:freq}}), float({{param:z}})));`,
	},
	{
		id: 'proc2d_gnoise',
		label: '2D gradient noise',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/gradientnoise/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'n', type: 'float', label: 'Noise' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 1, min: 0.1, max: 32, step: 0.05, binding: 'uniform' },
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_gnoise / https://iquilezles.org/articles/gradientnoise/
float {{out:n}} = iq_gnoise(vec3({{in:p}} * float({{param:freq}}), float({{param:z}})));`,
	},
	{
		id: 'proc2d_fbm',
		label: '2D FBM (value)',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/noise/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'n', type: 'float', label: 'FBM' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 1, min: 0.1, max: 16, step: 0.05, binding: 'uniform' },
			{ id: 'lac', label: 'Lacunarity', glslType: 'float', default: 2.02, min: 1.5, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Gain', glslType: 'float', default: 0.5, min: 0.2, max: 0.9, step: 0.02, binding: 'uniform' },
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_fbm3 / https://iquilezles.org/articles/noise/
vec3 qfb2_{{ns}} = vec3({{in:p}} * float({{param:freq}}), float({{param:z}}));
float {{out:n}} = iq_fbm3(qfb2_{{ns}}, float({{param:lac}}), float({{param:gain}}));`,
	},
	{
		id: 'proc2d_fbm_grad',
		label: '2D FBM (gradient noise)',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/gradientnoise/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'n', type: 'float', label: 'FBM' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 1, min: 0.1, max: 16, step: 0.05, binding: 'uniform' },
			{ id: 'lac', label: 'Lacunarity', glslType: 'float', default: 2.02, min: 1.5, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Gain', glslType: 'float', default: 0.5, min: 0.2, max: 0.9, step: 0.02, binding: 'uniform' },
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_fbm3_g / https://iquilezles.org/articles/gradientnoise/
vec3 qfg2_{{ns}} = vec3({{in:p}} * float({{param:freq}}), float({{param:z}}));
float {{out:n}} = iq_fbm3_g(qfg2_{{ns}}, float({{param:lac}}), float({{param:gain}}));`,
	},
	{
		id: 'proc2d_fbm_grad_vec',
		label: '2D FBM gradient (fd)',
		category: 'Procedural',
		description: 'Finite-difference gradient of value FBM; use .xy for 2D flow / warp.',
		docUrl: 'https://iquilezles.org/articles/noise/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'g', type: 'vec3', label: '∇fbm' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 1, min: 0.1, max: 16, step: 0.05, binding: 'uniform' },
			{ id: 'lac', label: 'Lacunarity', glslType: 'float', default: 2.02, min: 1.5, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Gain', glslType: 'float', default: 0.5, min: 0.2, max: 0.9, step: 0.02, binding: 'uniform' },
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
			{ id: 'epsilon', label: 'FD ε', glslType: 'float', default: 0.015, min: 0.001, max: 0.1, step: 0.001, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_fbm3_grad_fd / https://iquilezles.org/articles/noise/
vec3 qgv2_{{ns}} = vec3({{in:p}} * float({{param:freq}}), float({{param:z}}));
vec3 {{out:g}} = iq_fbm3_grad_fd(qgv2_{{ns}}, float({{param:lac}}), float({{param:gain}}), float({{param:epsilon}}));`,
	},
	{
		id: 'proc2d_voronoi_f12',
		label: '2D Voronoi F1/F2',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/voronoiline/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'f12', type: 'vec2', label: 'F1,F2 dist' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 4, min: 0.2, max: 32, step: 0.1, binding: 'uniform' },
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_voronoi3_f12 / https://iquilezles.org/articles/voronoiline/
vec3 qv2_{{ns}} = vec3({{in:p}} * float({{param:freq}}), float({{param:z}}));
vec2 {{out:f12}} = iq_voronoi3_f12(qv2_{{ns}});`,
	},
];

