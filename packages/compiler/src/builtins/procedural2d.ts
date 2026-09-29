import type { NodeTypeDef } from '../types.js';

/** 2D procedural nodes: UV / vec2 domains + IQ noise preludes from compile.ts FRAG_HEADER. */

export const procedural2dNodes: NodeTypeDef[] = [
	{
		id: 'proc2d_domain',
		label: '2D domain (scale · rotate · offset)',
		category: 'Procedural',
		description: 'Center UV, scale, rotate, then offset in pattern space.',
		docUrl: 'https://iquilezles.org/articles/uv/',
		inputs: [{ id: 'uv', type: 'vec2', label: 'UV' }],
		outputs: [{ id: 'out', type: 'vec2', label: 'p' }],
		params: [
			{ id: 'scale', label: 'Scale', glslType: 'float', default: 1, min: 0.01, max: 16, step: 0.05, binding: 'uniform' },
			{ id: 'ox', label: 'Offset X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'oy', label: 'Offset Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'angle', label: 'Rotate °', glslType: 'float', default: 0, min: -180, max: 180, step: 1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec2 xdom_{{ns}} = ({{in:uv}} - vec2(0.5)) * float({{param:scale}});
float rad_{{ns}} = radians(float({{param:angle}}));
mat2 Rdom_{{ns}} = mat2(cos(rad_{{ns}}), -sin(rad_{{ns}}), sin(rad_{{ns}}), cos(rad_{{ns}}));
xdom_{{ns}} = Rdom_{{ns}} * xdom_{{ns}};
vec2 {{out:out}} = xdom_{{ns}} + vec2(float({{param:ox}}), float({{param:oy}}));`,
	},
	{
		id: 'proc2d_hash',
		label: '2D hash (scalar)',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/morenoise/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'h', type: 'float', label: 'Hash' }],
		params: [
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
		],
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
	{
		id: 'proc2d_repeat_xy',
		label: '2D repeat (tile)',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/distfunctions/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'out', type: 'vec2', label: 'Tiled p' }],
		params: [
			{ id: 'cx', label: 'Period X', glslType: 'float', default: 1.2, min: 0.05, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'cy', label: 'Period Y', glslType: 'float', default: 1.2, min: 0.05, max: 8, step: 0.05, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec2 crep_{{ns}} = vec2(float({{param:cx}}), float({{param:cy}}));
vec2 {{out:out}} = mod({{in:p}} + 0.5 * crep_{{ns}}, crep_{{ns}}) - 0.5 * crep_{{ns}};`,
	},
	{
		id: 'proc2d_mirror_xy',
		label: '2D mirror (abs fold)',
		category: 'Procedural',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'out', type: 'vec2', label: 'Folded p' }],
		params: [
			{ id: 'ox', label: 'Center X', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'oy', label: 'Center Y', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec2 {{out:out}} = abs({{in:p}} - vec2(float({{param:ox}}), float({{param:oy}})));`,
	},
	{
		id: 'proc2d_kaleidoscope',
		label: '2D kaleidoscope (N-fold)',
		category: 'Procedural',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'out', type: 'vec2', label: 'Folded p' }],
		params: [
			{ id: 'sides', label: 'Sides', glslType: 'float', default: 6, min: 2, max: 24, step: 1, binding: 'literal' },
		],
		template: `// node: {{nodeId}}
vec2 pk_{{ns}} = {{in:p}};
float rk_{{ns}} = length(pk_{{ns}});
float ak_{{ns}} = atan(pk_{{ns}}.y, pk_{{ns}}.x);
float nk_{{ns}} = max(float({{param:sides}}), 2.0);
float sk_{{ns}} = 6.2831853 / nk_{{ns}};
ak_{{ns}} = mod(ak_{{ns}} + 0.5 * sk_{{ns}}, sk_{{ns}}) - 0.5 * sk_{{ns}};
ak_{{ns}} = abs(ak_{{ns}});
vec2 {{out:out}} = rk_{{ns}} * vec2(cos(ak_{{ns}}), sin(ak_{{ns}}));`,
	},
	{
		id: 'proc2d_polar',
		label: '2D → polar (r, θ)',
		category: 'Procedural',
		inputs: [{ id: 'p', type: 'vec2', label: 'XY' }],
		outputs: [{ id: 'rt', type: 'vec2', label: 'r,θ' }],
		params: [],
		template: `// node: {{nodeId}}
vec2 {{out:rt}} = vec2(length({{in:p}}), atan({{in:p}}.y, {{in:p}}.x));`,
	},
	{
		id: 'proc2d_from_polar',
		label: 'Polar → XY',
		category: 'Procedural',
		inputs: [{ id: 'rt', type: 'vec2', label: 'r,θ' }],
		outputs: [{ id: 'out', type: 'vec2', label: 'p' }],
		params: [],
		template: `// node: {{nodeId}}
vec2 {{out:out}} = {{in:rt}}.x * vec2(cos({{in:rt}}.y), sin({{in:rt}}.y));`,
	},
	{
		id: 'proc2d_ridged_fbm',
		label: '2D ridged FBM',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/morenoise/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'n', type: 'float', label: 'Ridge' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 1, min: 0.1, max: 16, step: 0.05, binding: 'uniform' },
			{ id: 'lac', label: 'Lacunarity', glslType: 'float', default: 2.02, min: 1.5, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Gain', glslType: 'float', default: 0.5, min: 0.2, max: 0.9, step: 0.02, binding: 'uniform' },
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
			{ id: 'sharp', label: 'Ridge sharp', glslType: 'float', default: 1, min: 0.2, max: 4, step: 0.05, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — ridged / iq_fbm3 / https://iquilezles.org/articles/morenoise/
vec3 qrg_{{ns}} = vec3({{in:p}} * float({{param:freq}}), float({{param:z}}));
float nr_{{ns}} = iq_fbm3(qrg_{{ns}}, float({{param:lac}}), float({{param:gain}}));
float {{out:n}} = pow(1.0 - abs(2.0 * nr_{{ns}} - 1.0), float({{param:sharp}}));`,
	},
	{
		id: 'proc2d_warp_voronoi',
		label: '2D Voronoi warp',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/voronoiline/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'out', type: 'vec2', label: 'Warped p' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 3, min: 0.2, max: 24, step: 0.1, binding: 'uniform' },
			{ id: 'amp', label: 'Warp amp', glslType: 'float', default: 0.1, min: 0, max: 0.5, step: 0.005, binding: 'uniform' },
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
			{ id: 'tsx', label: 'Time scroll X', glslType: 'float', default: 0.08, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsy', label: 'Time scroll Y', glslType: 'float', default: 0.06, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'warpU', label: 'Warp U (×F1)', glslType: 'float', default: 6.28318, min: 0, max: 24, step: 0.1, binding: 'uniform' },
			{ id: 'warpV', label: 'Warp V (×F2)', glslType: 'float', default: 6.28318, min: 0, max: 24, step: 0.1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_voronoi3_f12 / https://iquilezles.org/articles/voronoiline/
vec2 pvv_{{ns}} = {{in:p}} + iTime * vec2(float({{param:tsx}}), float({{param:tsy}}));
vec2 vfvv_{{ns}} = iq_voronoi3_f12(vec3(pvv_{{ns}} * float({{param:freq}}), float({{param:z}})));
vec2 {{out:out}} = {{in:p}} + float({{param:amp}}) * vec2(cos(vfvv_{{ns}}.x * float({{param:warpU}})), sin(vfvv_{{ns}}.y * float({{param:warpV}})));`,
	},
	{
		id: 'proc2d_voronoi_edge',
		label: '2D Voronoi edge (F2−F1)',
		category: 'Procedural',
		docUrl: 'https://iquilezles.org/articles/voronoiline/',
		inputs: [{ id: 'p', type: 'vec2', label: 'Position' }],
		outputs: [{ id: 'e', type: 'float', label: 'Edge' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 5, min: 0.2, max: 32, step: 0.1, binding: 'uniform' },
			{ id: 'scale', label: 'Scale', glslType: 'float', default: 1.5, min: 0.1, max: 6, step: 0.05, binding: 'uniform' },
			{ id: 'z', label: 'Z slice', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — F2−F1 / https://iquilezles.org/articles/voronoiline/
vec2 qve_{{ns}} = iq_voronoi3_f12(vec3({{in:p}} * float({{param:freq}}), float({{param:z}})));
float {{out:e}} = (qve_{{ns}}.y - qve_{{ns}}.x) * float({{param:scale}});`,
	},
	{
		id: 'proc2d_mix_float',
		label: 'Mix floats',
		category: 'Procedural',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
			{ id: 't', type: 'float' },
		],
		outputs: [{ id: 'out', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:out}} = mix({{in:a}}, {{in:b}}, clamp({{in:t}}, 0.0, 1.0));`,
	},
	{
		id: 'proc2d_mul_float',
		label: 'Multiply floats',
		category: 'Procedural',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'out', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:out}} = {{in:a}} * {{in:b}};`,
	},
	{
		id: 'proc2d_add_float',
		label: 'Add floats',
		category: 'Procedural',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'out', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:out}} = {{in:a}} + {{in:b}};`,
	},
	{
		id: 'proc2d_length',
		label: 'Length(vec2)',
		category: 'Procedural',
		inputs: [{ id: 'p', type: 'vec2', label: 'p' }],
		outputs: [{ id: 'r', type: 'float', label: '|p|' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:r}} = length({{in:p}});`,
	},
	{
		id: 'proc2d_saturate',
		label: 'Saturate float',
		category: 'Procedural',
		inputs: [{ id: 'x', type: 'float' }],
		outputs: [{ id: 'out', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:out}} = clamp({{in:x}}, 0.0, 1.0);`,
	},
	{
		id: 'proc2d_time_z',
		label: 'Time → Z slice',
		category: 'Procedural',
		description: 'iTime × speed + offset for animating noise Z params (use as mix/combo input).',
		inputs: [],
		outputs: [{ id: 'z', type: 'float', label: 'z' }],
		params: [
			{ id: 'speed', label: 'Speed', glslType: 'float', default: 0.15, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'offset', label: 'Offset', glslType: 'float', default: 0, min: -64, max: 64, step: 0.1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}\nfloat {{out:z}} = iTime * float({{param:speed}}) + float({{param:offset}});`,
	},
];
