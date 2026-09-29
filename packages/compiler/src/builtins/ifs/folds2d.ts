import type { NodeTypeDef } from '../../types.js';

export const ifsFold2dNodes: NodeTypeDef[] = [
	{
		id: 'ifs_linear_fold',
		label: 'IFS linear fold',
		category: 'IFS',
		inputs: [{ id: 'z', type: 'vec2' }],
		outputs: [{ id: 'out', type: 'vec2' }],
		params: [
			{ id: 'angle', label: 'Fold angle°', glslType: 'float', default: 90, min: 0, max: 180, step: 1, binding: 'uniform' },
			{ id: 'shift', label: 'Shift', glslType: 'float', default: 1, min: -2, max: 2, step: 0.05, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
  float a_{{ns}} = radians(float({{param:angle}}));
  mat2 R_{{ns}} = mat2(cos(a_{{ns}}), -sin(a_{{ns}}), sin(a_{{ns}}), cos(a_{{ns}}));
  vec2 zf_{{ns}} = R_{{ns}} * {{in:z}};
  zf_{{ns}} = abs(zf_{{ns}}) - float({{param:shift}});
  vec2 {{out:out}} = zf_{{ns}};`,
	},
	{
		id: 'ifs_sector_fold',
		label: 'IFS sector fold',
		category: 'IFS',
		description:
			'N-fold polar symmetry: fold angle into [-π/N, π/N]. Add `proc2d_domain` upstream; combine with `ifs_affine` and `ifs_pick_shorter2`.',
		inputs: [{ id: 'z', type: 'vec2' }],
		outputs: [{ id: 'out', type: 'vec2' }],
		params: [
			{
				id: 'folds',
				label: 'Fold count N',
				glslType: 'float',
				default: 3,
				min: 2,
				max: 12,
				step: 1,
				binding: 'literal',
			},
		],
		template: `// node: {{nodeId}} — wedge / sector fold
float rad_{{ns}} = length({{in:z}});
float ang_{{ns}} = atan({{in:z}}.y, {{in:z}}.x);
float Nf_{{ns}} = float({{param:folds}});
float w_{{ns}} = 6.28318530718 / Nf_{{ns}};
float a_{{ns}} = abs(mod(ang_{{ns}} + 0.5 * w_{{ns}}, w_{{ns}}) - 0.5 * w_{{ns}});
vec2 {{out:out}} = rad_{{ns}} * vec2(cos(a_{{ns}}), sin(a_{{ns}}));`,
	},
];

