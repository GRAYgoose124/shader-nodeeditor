import type { NodeTypeDef } from '../../types.js';

export const proc2dWarpNodes: NodeTypeDef[] = [
	{
		id: 'proc2d_warp_fbm',
		label: '2D domain warp (FBM)',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/noise/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'out', type: 'vec2', label: 'Warped p' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 2, min: 0.1, max: 16, step: 0.1, binding: 'uniform' },
			{ id: 'lac', label: 'Lacunarity', glslType: 'float', default: 2.02, min: 1.5, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Gain', glslType: 'float', default: 0.5, min: 0.2, max: 0.9, step: 0.02, binding: 'uniform' },
			{ id: 'amp', label: 'Amplitude', glslType: 'float', default: 0.12, min: 0, max: 0.6, step: 0.005, binding: 'uniform' },
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
			{ id: 'tsx', label: 'Time scroll X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsy', label: 'Time scroll Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_fbm3 warp / https://iquilezles.org/articles/noise/
vec2 pw_{{ns}} = {{in:p}} + iTime * vec2(float({{param:tsx}}), float({{param:tsy}}));
vec3 qw_{{ns}} = vec3(pw_{{ns}} * float({{param:freq}}), float({{param:z}}));
float w0_{{ns}} = iq_fbm3(qw_{{ns}}, float({{param:lac}}), float({{param:gain}}));
float w1_{{ns}} = iq_fbm3(qw_{{ns}} + vec3(31.0, 17.0, 7.0), float({{param:lac}}), float({{param:gain}}));
vec2 {{out:out}} = {{in:p}} + float({{param:amp}}) * (vec2(w0_{{ns}}, w1_{{ns}}) - vec2(0.5));`,
	},
];

