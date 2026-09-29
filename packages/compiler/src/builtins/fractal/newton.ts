import type { NodeTypeDef } from '../../types.js';

export const fractalNewtonNodes: NodeTypeDef[] = [
	{
		id: 'newton_escape',
		label: 'Newton z³−1 basins',
		category: 'Fractal',
		description:
			'Newton–Raphson for z³−1 on the complex plane. Wire `esc` into `fractal_color_ramp`, or add `basin` (0…1 step) for root hue.',
		inputs: [{ id: 'uv', type: 'vec2', label: 'UV → complex plane' }],
		outputs: [
			{ id: 'esc', type: 'float', label: 'Norm. iterations' },
			{ id: 'basin', type: 'float', label: 'Root index / 3' },
		],
		params: [
			{ id: 'cx', label: 'Center X', glslType: 'float', default: 0, min: -2, max: 2, step: 0.01, binding: 'uniform' },
			{ id: 'cy', label: 'Center Y', glslType: 'float', default: 0, min: -2, max: 2, step: 0.01, binding: 'uniform' },
			{ id: 'scale', label: 'Zoom', glslType: 'float', default: 3, min: 0.15, max: 10, step: 0.05, binding: 'uniform' },
			{ id: 'eps', label: 'Converge ε', glslType: 'float', default: 0.004, min: 1e-5, max: 0.1, step: 0.0005, binding: 'uniform' },
			{ id: 'maxIter', label: 'Max iter', glslType: 'float', default: 48, min: 4, max: 256, step: 1, binding: 'literal' },
		],
		template: `// node: {{nodeId}} — Newton basins for z^3 - 1
  vec2 znw_{{ns}} = ({{in:uv}} - 0.5) * float({{param:scale}}) + vec2(float({{param:cx}}), float({{param:cy}}));
  float escnw_{{ns}} = 1.0;
  float eps2_{{ns}} = float({{param:eps}}) * float({{param:eps}});
  for (int inw_{{ns}} = 0; inw_{{ns}} < 256; inw_{{ns}}++) {
    if (float(inw_{{ns}}) >= float({{param:maxIter}})) break;
    vec2 z2n_{{ns}} = vec2(znw_{{ns}}.x * znw_{{ns}}.x - znw_{{ns}}.y * znw_{{ns}}.y, 2.0 * znw_{{ns}}.x * znw_{{ns}}.y);
    vec2 fz_{{ns}} = vec2(z2n_{{ns}}.x * znw_{{ns}}.x - z2n_{{ns}}.y * znw_{{ns}}.y - 1.0, z2n_{{ns}}.x * znw_{{ns}}.y + z2n_{{ns}}.y * znw_{{ns}}.x);
    float fz2_{{ns}} = dot(fz_{{ns}}, fz_{{ns}});
    if (fz2_{{ns}} < eps2_{{ns}}) {
      escnw_{{ns}} = (float(inw_{{ns}}) + 1.0) / float({{param:maxIter}});
      break;
    }
    vec2 fp_{{ns}} = 3.0 * z2n_{{ns}};
    float fp2_{{ns}} = dot(fp_{{ns}}, fp_{{ns}});
    if (fp2_{{ns}} < 1e-14) break;
    znw_{{ns}} -= vec2(dot(fz_{{ns}}, fp_{{ns}}), fz_{{ns}}.y * fp_{{ns}}.x - fz_{{ns}}.x * fp_{{ns}}.y) / fp2_{{ns}};
  }
  vec2 r0b_{{ns}} = vec2(1.0, 0.0);
  vec2 r1b_{{ns}} = vec2(-0.5, 0.86602540378);
  vec2 r2b_{{ns}} = vec2(-0.5, -0.86602540378);
  float d0b_{{ns}} = length(znw_{{ns}} - r0b_{{ns}});
  float d1b_{{ns}} = length(znw_{{ns}} - r1b_{{ns}});
  float d2b_{{ns}} = length(znw_{{ns}} - r2b_{{ns}});
  float basnw_{{ns}} = (d0b_{{ns}} < d1b_{{ns}} && d0b_{{ns}} < d2b_{{ns}}) ? 0.0 : ((d1b_{{ns}} < d2b_{{ns}}) ? (1.0 / 3.0) : (2.0 / 3.0));
  float {{out:esc}} = escnw_{{ns}};
  float {{out:basin}} = basnw_{{ns}};`,
	},
];

