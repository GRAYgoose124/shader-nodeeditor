import type { NodeTypeDef } from '../types.js';

export const sdfNodesTail: NodeTypeDef[] = [
	{
		id: 'smin_float',
		label: 'Smooth min',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [{ id: 'k', label: 'Smooth (radius)', glslType: 'float', default: 0.12, min: 0.02, max: 2, step: 0.01, binding: 'uniform' }],
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
	{
		id: 'op_round_d',
		label: 'Round SDF',
		category: 'SDF',
		inputs: [{ id: 'd', type: 'float' }],
		outputs: [{ id: 'd', type: 'float' }],
		params: [{ id: 'rad', label: 'Round radius', glslType: 'float', default: 0.05, min: 0.001, max: 1, step: 0.005, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = {{in:d}} - float({{param:rad}});`,
	},
	{
		id: 'op_onion_d',
		label: 'Onion shell',
		category: 'SDF',
		inputs: [{ id: 'd', type: 'float' }],
		outputs: [{ id: 'd', type: 'float' }],
		params: [{ id: 'th', label: 'Thickness', glslType: 'float', default: 0.04, min: 0.005, max: 1, step: 0.005, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = abs({{in:d}}) - float({{param:th}});`,
	},
	{
		id: 'ray_lookat_from_uv',
		label: 'Ray look-at from UV',
		category: 'SDF',
		inputs: [{ id: 'uv', type: 'vec2' }],
		outputs: [
			{ id: 'ro', type: 'vec3', label: 'Origin' },
			{ id: 'rd', type: 'vec3', label: 'Dir' },
		],
		params: [
			{ id: 'ex', label: 'Eye X', glslType: 'float', default: 0, min: -8, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'ey', label: 'Eye Y', glslType: 'float', default: 0, min: -8, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'ez', label: 'Eye Z', glslType: 'float', default: 3.2, min: 0.5, max: 20, step: 0.05, binding: 'uniform' },
			{ id: 'tx', label: 'Target X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.05, binding: 'uniform' },
			{ id: 'ty', label: 'Target Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.05, binding: 'uniform' },
			{ id: 'tz', label: 'Target Z', glslType: 'float', default: 0, min: -4, max: 4, step: 0.05, binding: 'uniform' },
			{ id: 'ux', label: 'Up X', glslType: 'float', default: 0, min: -1, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'uy', label: 'Up Y', glslType: 'float', default: 1, min: -1, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'uz', label: 'Up Z', glslType: 'float', default: 0, min: -1, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'fov', label: 'FOV deg', glslType: 'float', default: 58, min: 10, max: 120, step: 1, binding: 'uniform' },
			{ id: 'jx', label: 'Jitter X (UV)', glslType: 'float', default: 0, min: -0.01, max: 0.01, step: 0.0001, binding: 'uniform' },
			{ id: 'jy', label: 'Jitter Y (UV)', glslType: 'float', default: 0, min: -0.01, max: 0.01, step: 0.0001, binding: 'uniform' },
		],
		canvasParams: ['fov', 'ex', 'ey', 'ez'],
		template: `// node: {{nodeId}} — camera / https://iquilezles.org/articles/raymarchingdf/
vec2 ndcL_{{ns}} = {{in:uv}} * 2.0 - 1.0;
ndcL_{{ns}} += vec2(float({{param:jx}}), float({{param:jy}}));
float aspL_{{ns}} = iResolution.x / max(iResolution.y, 1.0);
ndcL_{{ns}}.x *= aspL_{{ns}};
vec3 roL_{{ns}} = vec3(float({{param:ex}}), float({{param:ey}}), float({{param:ez}}));
vec3 taL_{{ns}} = vec3(float({{param:tx}}), float({{param:ty}}), float({{param:tz}}));
vec3 upL_{{ns}} = vec3(float({{param:ux}}), float({{param:uy}}), float({{param:uz}}));
vec3 wwL_{{ns}} = normalize(taL_{{ns}} - roL_{{ns}});
vec3 uuL_{{ns}} = normalize(cross(upL_{{ns}}, wwL_{{ns}}));
vec3 vvL_{{ns}} = cross(wwL_{{ns}}, uuL_{{ns}});
float flL_{{ns}} = tan(radians(float({{param:fov}})) * 0.5);
vec3 {{out:ro}} = roL_{{ns}};
vec3 {{out:rd}} = normalize(flL_{{ns}} * (ndcL_{{ns}}.x * uuL_{{ns}} + ndcL_{{ns}}.y * vvL_{{ns}}) + wwL_{{ns}});`,
	},
	{
		id: 'ray_ortho_from_uv',
		label: 'Ray ortho from UV',
		category: 'SDF',
		inputs: [{ id: 'uv', type: 'vec2' }],
		outputs: [
			{ id: 'ro', type: 'vec3', label: 'Origin' },
			{ id: 'rd', type: 'vec3', label: 'Dir' },
		],
		params: [
			{ id: 'scale', label: 'Half-extent', glslType: 'float', default: 1.2, min: 0.1, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'camZ', label: 'Plane Z', glslType: 'float', default: 3, min: 0.5, max: 20, step: 0.05, binding: 'uniform' },
			{ id: 'jx', label: 'Jitter X', glslType: 'float', default: 0, min: -0.01, max: 0.01, step: 0.0001, binding: 'uniform' },
			{ id: 'jy', label: 'Jitter Y', glslType: 'float', default: 0, min: -0.01, max: 0.01, step: 0.0001, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — orthographic / https://iquilezles.org/articles/raymarchingdf/
vec2 ndcO_{{ns}} = {{in:uv}} * 2.0 - 1.0;
ndcO_{{ns}} += vec2(float({{param:jx}}), float({{param:jy}}));
float aspO_{{ns}} = iResolution.x / max(iResolution.y, 1.0);
ndcO_{{ns}}.x *= aspO_{{ns}};
vec3 {{out:ro}} = vec3(ndcO_{{ns}} * float({{param:scale}}), float({{param:camZ}}));
vec3 {{out:rd}} = vec3(0.0, 0.0, -1.0);`,
	},
	{
		id: 'ray_rd_fwidth',
		label: 'Ray dir screen width',
		category: 'SDF',
		inputs: [{ id: 'rd', type: 'vec3', label: 'Ray dir' }],
		outputs: [{ id: 'w', type: 'float', label: 'fwidth |rd|' }],
		params: [],
		template: `// node: {{nodeId}} — experimental ray differentials (cone width hint) / https://iquilezles.org/articles/raymarchingdf/
float {{out:w}} = length(fwidth({{in:rd}}));`,
	},
	{
		id: 'ray_from_uv',
		label: 'Ray from UV (persp.)',
		category: 'SDF',
		inputs: [{ id: 'uv', type: 'vec2' }],
		outputs: [
			{ id: 'ro', type: 'vec3', label: 'Origin' },
			{ id: 'rd', type: 'vec3', label: 'Dir' },
		],
		params: [
			{ id: 'fov', label: 'FOV deg', glslType: 'float', default: 60, min: 10, max: 120, step: 1, binding: 'uniform' },
			{ id: 'camZ', label: 'Camera Z', glslType: 'float', default: 3, min: 0.5, max: 20, step: 0.05, binding: 'uniform' },
		],
		canvasParams: ['fov', 'camZ'],
		template: `// node: {{nodeId}} — https://iquilezles.org/articles/raymarchingdf/
vec2 ndc_{{ns}} = {{in:uv}} * 2.0 - 1.0;
float asp_{{ns}} = iResolution.x / max(iResolution.y, 1.0);
ndc_{{ns}}.x *= asp_{{ns}};
float fov_{{ns}} = radians(float({{param:fov}}));
vec3 {{out:ro}} = vec3(0.0, 0.0, float({{param:camZ}}));
vec3 {{out:rd}} = normalize(vec3(ndc_{{ns}} * tan(fov_{{ns}} * 0.5), -1.0));`,
	},
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
	{
		id: 'raymarch_sphere',
		label: 'Raymarch sphere (2D frag)',
		category: 'SDF',
		inputs: [{ id: 'uv', type: 'vec2' }],
		outputs: [{ id: 'col', type: 'vec4' }],
		params: [
			{ id: 'r', label: 'Radius', glslType: 'float', default: 0.45, min: 0.05, max: 2, step: 0.01, binding: 'uniform' },
			{ id: 'fov', label: 'FOV deg', glslType: 'float', default: 60, min: 20, max: 100, step: 1, binding: 'uniform' },
			{ id: 'camZ', label: 'Camera Z', glslType: 'float', default: 3, min: 1, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'maxSteps', label: 'Max steps', glslType: 'float', default: 96, min: 16, max: 128, step: 1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
  vec2 ndc_rm_{{ns}} = {{in:uv}} * 2.0 - 1.0;
  float fov_rm_{{ns}} = radians(float({{param:fov}}));
  vec3 ro_rm_{{ns}} = vec3(0.0, 0.0, float({{param:camZ}}));
  vec3 rd_rm_{{ns}} = normalize(vec3(ndc_rm_{{ns}} * tan(fov_rm_{{ns}} * 0.5), -1.0));
  float t_rm_{{ns}} = 0.0;
  vec3 col_rm_{{ns}} = vec3(0.02, 0.03, 0.06);
  for (int i_rm_{{ns}} = 0; i_rm_{{ns}} < 128; i_rm_{{ns}}++) {
    if (float(i_rm_{{ns}}) >= float({{param:maxSteps}})) break;
    vec3 p_rm_{{ns}} = ro_rm_{{ns}} + t_rm_{{ns}} * rd_rm_{{ns}};
    float d_rm_{{ns}} = length(p_rm_{{ns}}) - float({{param:r}});
    if (d_rm_{{ns}} < 0.0008) {
      vec3 n_rm_{{ns}} = normalize(p_rm_{{ns}});
      col_rm_{{ns}} = 0.5 + 0.5 * n_rm_{{ns}};
      break;
    }
    t_rm_{{ns}} += d_rm_{{ns}};
    if (t_rm_{{ns}} > 40.0) break;
  }
  vec4 {{out:col}} = vec4(col_rm_{{ns}}, 1.0);`,
	},
];
