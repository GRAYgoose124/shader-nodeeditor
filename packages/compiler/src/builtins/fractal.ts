import type { NodeTypeDef } from '../types.js';

export const fractalNodes: NodeTypeDef[] = [
	{
		id: 'mandelbrot_escape',
		label: 'Mandelbrot escape',
		category: 'Fractal',
		inputs: [{ id: 'uv', type: 'vec2', label: 'UV → complex plane' }],
		outputs: [
			{ id: 'esc', type: 'float', label: 'Normalized escape' },
			{ id: 'z2', type: 'float', label: '|z|² (last)' },
		],
		params: [
			{ id: 'cx', label: 'Center X', glslType: 'float', default: -0.5, min: -2, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'cy', label: 'Center Y', glslType: 'float', default: 0, min: -1.5, max: 1.5, step: 0.01, binding: 'uniform' },
			{ id: 'scale', label: 'Zoom', glslType: 'float', default: 2.5, min: 0.1, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'maxIter', label: 'Max iter', glslType: 'float', default: 80, min: 8, max: 512, step: 1, binding: 'literal' },
		],
		template: `// node: {{nodeId}}
  vec2 c_{{ns}} = ({{in:uv}} - 0.5) * float({{param:scale}}) + vec2(float({{param:cx}}), float({{param:cy}}));
  vec2 z_{{ns}} = vec2(0.0);
  float esc_{{ns}} = 0.0;
  float z2_{{ns}} = 0.0;
  for (int i_{{ns}} = 0; i_{{ns}} < 512; i_{{ns}}++) {
    if (float(i_{{ns}}) >= float({{param:maxIter}})) break;
    z_{{ns}} = vec2(z_{{ns}}.x * z_{{ns}}.x - z_{{ns}}.y * z_{{ns}}.y, 2.0 * z_{{ns}}.x * z_{{ns}}.y) + c_{{ns}};
    z2_{{ns}} = dot(z_{{ns}}, z_{{ns}});
    if (z2_{{ns}} > 4.0) { esc_{{ns}} = (float(i_{{ns}}) + 1.0 - log2(log2(z2_{{ns}}) * 0.5)) / float({{param:maxIter}}); break; }
  }
  float {{out:esc}} = esc_{{ns}};
  float {{out:z2}} = z2_{{ns}};`,
	},
	{
		id: 'julia_escape',
		label: 'Julia escape',
		category: 'Fractal',
		inputs: [{ id: 'uv', type: 'vec2' }],
		outputs: [
			{ id: 'esc', type: 'float', label: 'Normalized escape' },
			{ id: 'z2', type: 'float', label: '|z|² (last)' },
		],
		params: [
			{ id: 'jx', label: 'Julia Re', glslType: 'float', default: -0.8, min: -2, max: 2, step: 0.01, binding: 'uniform' },
			{ id: 'jy', label: 'Julia Im', glslType: 'float', default: 0.156, min: -2, max: 2, step: 0.01, binding: 'uniform' },
			{ id: 'scale', label: 'Zoom', glslType: 'float', default: 2.2, min: 0.1, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'maxIter', label: 'Max iter', glslType: 'float', default: 96, min: 8, max: 512, step: 1, binding: 'literal' },
		],
		template: `// node: {{nodeId}} — smooth iteration / https://iquilezles.org/articles/mset_smooth/
  vec2 zj_{{ns}} = ({{in:uv}} - 0.5) * float({{param:scale}});
  vec2 cj_{{ns}} = vec2(float({{param:jx}}), float({{param:jy}}));
  float escj_{{ns}} = 0.0;
  float z2j_{{ns}} = 0.0;
  for (int ij_{{ns}} = 0; ij_{{ns}} < 512; ij_{{ns}}++) {
    if (float(ij_{{ns}}) >= float({{param:maxIter}})) break;
    zj_{{ns}} = vec2(zj_{{ns}}.x * zj_{{ns}}.x - zj_{{ns}}.y * zj_{{ns}}.y, 2.0 * zj_{{ns}}.x * zj_{{ns}}.y) + cj_{{ns}};
    z2j_{{ns}} = dot(zj_{{ns}}, zj_{{ns}});
    if (z2j_{{ns}} > 4.0) { escj_{{ns}} = (float(ij_{{ns}}) + 1.0 - log2(log2(z2j_{{ns}}) * 0.5)) / float({{param:maxIter}}); break; }
  }
  float {{out:esc}} = escj_{{ns}};
  float {{out:z2}} = z2j_{{ns}};`,
	},
	{
		id: 'burning_ship_escape',
		label: 'Burning Ship escape',
		category: 'Fractal',
		inputs: [{ id: 'uv', type: 'vec2', label: 'UV → complex plane' }],
		outputs: [
			{ id: 'esc', type: 'float', label: 'Normalized escape' },
			{ id: 'z2', type: 'float', label: '|z|² (last)' },
		],
		params: [
			{ id: 'cx', label: 'Center X', glslType: 'float', default: -1.75, min: -3, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'cy', label: 'Center Y', glslType: 'float', default: -0.02, min: -2, max: 2, step: 0.01, binding: 'uniform' },
			{ id: 'scale', label: 'Zoom', glslType: 'float', default: 2.8, min: 0.1, max: 12, step: 0.05, binding: 'uniform' },
			{ id: 'maxIter', label: 'Max iter', glslType: 'float', default: 96, min: 8, max: 512, step: 1, binding: 'literal' },
		],
		template: `// node: {{nodeId}} — Burning Ship / https://en.wikipedia.org/wiki/Burning_Ship_fractal
  vec2 cbs_{{ns}} = ({{in:uv}} - 0.5) * float({{param:scale}}) + vec2(float({{param:cx}}), float({{param:cy}}));
  vec2 zbs_{{ns}} = vec2(0.0);
  float escbs_{{ns}} = 0.0;
  float z2bs_{{ns}} = 0.0;
  for (int ibs_{{ns}} = 0; ibs_{{ns}} < 512; ibs_{{ns}}++) {
    if (float(ibs_{{ns}}) >= float({{param:maxIter}})) break;
    zbs_{{ns}} = vec2(zbs_{{ns}}.x * zbs_{{ns}}.x - zbs_{{ns}}.y * zbs_{{ns}}.y, 2.0 * abs(zbs_{{ns}}.x * zbs_{{ns}}.y)) + cbs_{{ns}};
    z2bs_{{ns}} = dot(zbs_{{ns}}, zbs_{{ns}});
    if (z2bs_{{ns}} > 4.0) { escbs_{{ns}} = (float(ibs_{{ns}}) + 1.0 - log2(log2(z2bs_{{ns}}) * 0.5)) / float({{param:maxIter}}); break; }
  }
  float {{out:esc}} = escbs_{{ns}};
  float {{out:z2}} = z2bs_{{ns}};`,
	},
	{
		id: 'mandelbrot_orbit_trap',
		label: 'Mandelbrot orbit trap',
		category: 'Fractal',
		description: 'Min distance from orbit (z) to a trap point while iterating.',
		inputs: [{ id: 'uv', type: 'vec2', label: 'UV → complex plane' }],
		outputs: [
			{ id: 'trap', type: 'float', label: 'Norm. trap dist' },
			{ id: 'esc', type: 'float', label: 'Escape (smooth)' },
		],
		params: [
			{ id: 'cx', label: 'Center X', glslType: 'float', default: -0.5, min: -2, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'cy', label: 'Center Y', glslType: 'float', default: 0, min: -1.5, max: 1.5, step: 0.01, binding: 'uniform' },
			{ id: 'scale', label: 'Zoom', glslType: 'float', default: 2.5, min: 0.1, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'tx', label: 'Trap X', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'ty', label: 'Trap Y', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'trapScale', label: 'Trap scale', glslType: 'float', default: 4, min: 0.5, max: 24, step: 0.1, binding: 'uniform' },
			{ id: 'maxIter', label: 'Max iter', glslType: 'float', default: 80, min: 8, max: 512, step: 1, binding: 'literal' },
		],
		template: `// node: {{nodeId}} — orbit trap / https://iquilezles.org/articles/fractalsorbittraps/
  vec2 cot_{{ns}} = ({{in:uv}} - 0.5) * float({{param:scale}}) + vec2(float({{param:cx}}), float({{param:cy}}));
  vec2 zot_{{ns}} = vec2(0.0);
  vec2 totr_{{ns}} = vec2(float({{param:tx}}), float({{param:ty}}));
  float dmin_{{ns}} = 1e10;
  float escot_{{ns}} = 0.0;
  float z2ot_{{ns}} = 0.0;
  for (int iot_{{ns}} = 0; iot_{{ns}} < 512; iot_{{ns}}++) {
    if (float(iot_{{ns}}) >= float({{param:maxIter}})) break;
    zot_{{ns}} = vec2(zot_{{ns}}.x * zot_{{ns}}.x - zot_{{ns}}.y * zot_{{ns}}.y, 2.0 * zot_{{ns}}.x * zot_{{ns}}.y) + cot_{{ns}};
    z2ot_{{ns}} = dot(zot_{{ns}}, zot_{{ns}});
    dmin_{{ns}} = min(dmin_{{ns}}, length(zot_{{ns}} - totr_{{ns}}));
    if (z2ot_{{ns}} > 4.0) { escot_{{ns}} = (float(iot_{{ns}}) + 1.0 - log2(log2(z2ot_{{ns}}) * 0.5)) / float({{param:maxIter}}); break; }
  }
  float {{out:trap}} = clamp(sqrt(dmin_{{ns}}) * float({{param:trapScale}}), 0.0, 1.0);
  float {{out:esc}} = escot_{{ns}};`,
	},
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
