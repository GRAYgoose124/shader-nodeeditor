import type { NodeTypeDef } from '../../types.js';

export const ifsControl2dNodes: NodeTypeDef[] = [
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
		id: 'ifs_blur_step',
		label: 'IFS branch average',
		category: 'IFS',
		description: 'Single relaxation step: blend two IFS branches (softer than `ifs_pick_shorter2`).',
		inputs: [
			{ id: 'a', type: 'vec2', label: 'Branch A' },
			{ id: 'b', type: 'vec2', label: 'Branch B' },
		],
		outputs: [{ id: 'out', type: 'vec2' }],
		params: [{ id: 't', label: 'Blend (B weight)', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.02, binding: 'uniform' }],
		template: `// node: {{nodeId}}
vec2 {{out:out}} = mix({{in:a}}, {{in:b}}, float({{param:t}}));`,
	},
];

