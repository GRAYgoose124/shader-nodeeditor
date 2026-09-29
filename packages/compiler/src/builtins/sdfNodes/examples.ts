import type { NodeTypeDef } from '../../types.js';

export const sdfExampleNodes: NodeTypeDef[] = [
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

