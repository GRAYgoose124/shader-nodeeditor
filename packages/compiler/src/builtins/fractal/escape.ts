import type { NodeTypeDef } from '../../types.js';

export const fractalEscapeNodes: NodeTypeDef[] = [
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
];

