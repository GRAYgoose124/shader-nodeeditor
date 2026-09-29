import type { NodeTypeDef } from '../types.js';

export const ifsNodes: NodeTypeDef[] = [
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
		id: 'ifs_affine',
		label: 'IFS affine map',
		category: 'IFS',
		description: 'z\' = M·z + t — stack with folds / iterate.',
		inputs: [{ id: 'z', type: 'vec2' }],
		outputs: [{ id: 'out', type: 'vec2' }],
		params: [
			{ id: 'mxx', label: 'M (0,0)', glslType: 'float', default: 0.5, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'mxy', label: 'M (0,1)', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'myx', label: 'M (1,0)', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'myy', label: 'M (1,1)', glslType: 'float', default: 0.5, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'tx', label: 't.x', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'ty', label: 't.y', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
mat2 Maf_{{ns}} = mat2(float({{param:mxx}}), float({{param:mxy}}), float({{param:myx}}), float({{param:myy}}));
vec2 {{out:out}} = Maf_{{ns}} * {{in:z}} + vec2(float({{param:tx}}), float({{param:ty}}));`,
	},
	{
		id: 'ifs_iterate',
		label: 'IFS iterate',
		category: 'IFS',
		inputs: [{ id: 'z', type: 'vec2' }],
		outputs: [{ id: 'out', type: 'vec2' }],
		params: [
			{ id: 'scale', label: 'Scale', glslType: 'float', default: 1.5, min: 0.5, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'iters', label: 'Iterations', glslType: 'float', default: 8, min: 1, max: 24, step: 1, binding: 'literal' },
		],
		template: `// node: {{nodeId}}
  vec2 zi_{{ns}} = {{in:z}};
  for (int ii_{{ns}} = 0; ii_{{ns}} < 32; ii_{{ns}}++) {
    if (float(ii_{{ns}}) >= float({{param:iters}})) break;
    zi_{{ns}} = fract(zi_{{ns}} * float({{param:scale}})) - 0.5;
  }
  vec2 {{out:out}} = zi_{{ns}};`,
	},
	{
		id: 'ifs_to_rgb',
		label: 'IFS → RGB',
		category: 'IFS',
		inputs: [{ id: 'z', type: 'vec2' }],
		outputs: [{ id: 'rgb', type: 'vec3' }],
		params: [
			{ id: 'bias', label: 'Level', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'amp', label: 'Amplitude', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Input gain (tanh)', glslType: 'float', default: 1, min: 0.1, max: 4, step: 0.05, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec3 {{out:rgb}} = vec3(
  float({{param:bias}}) + float({{param:amp}}) * tanh({{in:z}}.x * float({{param:gain}})),
  float({{param:bias}}) + float({{param:amp}}) * tanh({{in:z}}.y * float({{param:gain}})),
  float({{param:bias}}) + float({{param:amp}}) * tanh(length({{in:z}}) * float({{param:gain}})));`,
	},
	{
		id: 'ifs_pick_shorter2',
		label: 'IFS pick shorter (2)',
		category: 'IFS',
		description:
			'Chooses the branch with smaller |z|². Fan-out one `proc2d_domain` / fold output into two `ifs_affine` chains, wire both here for chaos-game / Hutchinson-style min maps.',
		inputs: [
			{ id: 'a', type: 'vec2', label: 'Branch A' },
			{ id: 'b', type: 'vec2', label: 'Branch B' },
		],
		outputs: [{ id: 'out', type: 'vec2' }],
		params: [],
		template: `// node: {{nodeId}} — min-norm branch (two parallel maps from shared z)
vec2 {{out:out}} = dot({{in:a}}, {{in:a}}) <= dot({{in:b}}, {{in:b}}) ? {{in:a}} : {{in:b}};`,
	},
	{
		id: 'ifs_circle_inversion',
		label: 'IFS circle inversion',
		category: 'IFS',
		description:
			'Inversion in a circle: z\' = c + R² (z−c) / |z−c|². Pair with folds and affines for Doyle / circle-limit style graphs.',
		inputs: [{ id: 'z', type: 'vec2' }],
		outputs: [{ id: 'out', type: 'vec2' }],
		params: [
			{ id: 'cx', label: 'Center X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'cy', label: 'Center Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'R', label: 'Radius R', glslType: 'float', default: 0.35, min: 0.02, max: 3, step: 0.01, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — circle inversion
vec2 dv_{{ns}} = {{in:z}} - vec2(float({{param:cx}}), float({{param:cy}}));
float dsq_{{ns}} = dot(dv_{{ns}}, dv_{{ns}});
float Rr_{{ns}} = float({{param:R}});
vec2 {{out:out}} = (dsq_{{ns}} > 1e-10) ? (vec2(float({{param:cx}}), float({{param:cy}})) + (Rr_{{ns}} * Rr_{{ns}} / dsq_{{ns}}) * dv_{{ns}}) : {{in:z}};`,
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
	{
		id: 'ifs_blur_step',
		label: 'IFS branch average',
		category: 'IFS',
		description: 'Single relaxation step: blend two IFS branches (softer than `ifs_pick_shorter2`).',
		inputs: [
			{ id: 'a', type: 'vec2', label: 'Branch A' },
			{ id: 'b', type: 'vec2', label: 'Branch B' },
		],
		outputs: [{ id: 'out', type: 'vec2' }],
		params: [
			{ id: 't', label: 'Blend (B weight)', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec2 {{out:out}} = mix({{in:a}}, {{in:b}}, float({{param:t}}));`,
	},
	{
		id: 'ifs_fold_abs3d',
		label: 'IFS fold abs 3D',
		category: 'IFS',
		inputs: [{ id: 'p', type: 'vec3' }],
		outputs: [{ id: 'p', type: 'vec3' }],
		params: [
			{ id: 'ox', label: 'Offset X', glslType: 'float', default: 1, min: 0, max: 3, step: 0.05, binding: 'uniform' },
			{ id: 'oy', label: 'Offset Y', glslType: 'float', default: 1, min: 0, max: 3, step: 0.05, binding: 'uniform' },
			{ id: 'oz', label: 'Offset Z', glslType: 'float', default: 1, min: 0, max: 3, step: 0.05, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — KIFS-style fold / https://iquilezles.org/articles/menger/
vec3 {{out:p}} = abs({{in:p}}) - vec3(float({{param:ox}}), float({{param:oy}}), float({{param:oz}}));`,
	},
	{
		id: 'ifs_kifs_iterate3d',
		label: 'KIFS iterate 3D',
		category: 'IFS',
		inputs: [{ id: 'p', type: 'vec3' }],
		outputs: [{ id: 'p', type: 'vec3' }],
		params: [
			{ id: 'ox', label: 'Fold off X', glslType: 'float', default: 1, min: 0, max: 3, step: 0.05, binding: 'uniform' },
			{ id: 'oy', label: 'Fold off Y', glslType: 'float', default: 1, min: 0, max: 3, step: 0.05, binding: 'uniform' },
			{ id: 'oz', label: 'Fold off Z', glslType: 'float', default: 1, min: 0, max: 3, step: 0.05, binding: 'uniform' },
			{ id: 'scale', label: 'Scale', glslType: 'float', default: 2.02, min: 1.2, max: 3.5, step: 0.02, binding: 'uniform' },
			{ id: 'iters', label: 'Iterations', glslType: 'float', default: 4, min: 1, max: 12, step: 1, binding: 'literal' },
		],
		template: `// node: {{nodeId}} — bounded fold+scale / https://iquilezles.org/articles/menger/
vec3 qk_{{ns}} = {{in:p}};
for (int ik_{{ns}} = 0; ik_{{ns}} < 12; ik_{{ns}}++) {
  if (float(ik_{{ns}}) >= float({{param:iters}})) break;
  qk_{{ns}} = abs(qk_{{ns}}) - vec3(float({{param:ox}}), float({{param:oy}}), float({{param:oz}}));
  qk_{{ns}} *= float({{param:scale}});
}
vec3 {{out:p}} = qk_{{ns}};`,
	},
];
