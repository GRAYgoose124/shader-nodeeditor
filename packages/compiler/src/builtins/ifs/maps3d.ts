import type { NodeTypeDef } from '../../types.js';

/** 3D analogs of 2D IFS control maps for stacking on `vec3` scene / domain chains (raymarch SDF). */

export const ifsMaps3dNodes: NodeTypeDef[] = [
	{
		id: 'ifs_affine3',
		label: 'IFS affine map 3D',
		category: 'IFS',
		description:
			"p' = M·p + t with row–column–indexed uniforms (M stored column-major for GLSL mat3). Stack with folds, `ifs_pick_shorter3`, and scene primitives.",
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Mapped p' }],
		params: [
			{ id: 'm00', label: 'M (0,0)', glslType: 'float', default: 0.5, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'm01', label: 'M (0,1)', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'm02', label: 'M (0,2)', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'm10', label: 'M (1,0)', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'm11', label: 'M (1,1)', glslType: 'float', default: 0.5, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'm12', label: 'M (1,2)', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'm20', label: 'M (2,0)', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'm21', label: 'M (2,1)', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'm22', label: 'M (2,2)', glslType: 'float', default: 0.5, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'tx', label: 't.x', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'ty', label: 't.y', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'tz', label: 't.z', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
		],
		canvasParams: ['m00', 'm11', 'm22', 'tx', 'ty', 'tz'],
		template: `// node: {{nodeId}} — p' = M*p + t (column-major mat3)
mat3 M3_{{ns}} = mat3(
  float({{param:m00}}), float({{param:m10}}), float({{param:m20}}),
  float({{param:m01}}), float({{param:m11}}), float({{param:m21}}),
  float({{param:m02}}), float({{param:m12}}), float({{param:m22}}));
vec3 {{out:p}} = M3_{{ns}} * {{in:p}} + vec3(float({{param:tx}}), float({{param:ty}}), float({{param:tz}}));`,
	},
	{
		id: 'ifs_pick_shorter3',
		label: 'IFS pick shorter (3)',
		category: 'IFS',
		description:
			'**One branch per point** (smaller |p|²), not a union of both attractor pieces. Fan-out `vec3` into two parallel `ifs_affine3` (or domain) chains, then merge — lightweight asymmetric warp. For visible KIFS folds use **`ifs_kifs_iterate3d`** / **`ifs_iterate3`** or **`sdf_tessellate_feedback`** on a motif.',
		inputs: [
			{ id: 'a', type: 'vec3', label: 'Branch A' },
			{ id: 'b', type: 'vec3', label: 'Branch B' },
		],
		outputs: [{ id: 'p', type: 'vec3', label: 'Shorter branch' }],
		params: [],
		template: `// node: {{nodeId}} — min-norm branch vec3
vec3 {{out:p}} = dot({{in:a}}, {{in:a}}) <= dot({{in:b}}, {{in:b}}) ? {{in:a}} : {{in:b}};`,
	},
	{
		id: 'ifs_blur_step3',
		label: 'IFS branch average 3D',
		category: 'IFS',
		description: 'Single relaxation step: blend two IFS branches in R³ (softer than pick shorter).',
		inputs: [
			{ id: 'a', type: 'vec3', label: 'Branch A' },
			{ id: 'b', type: 'vec3', label: 'Branch B' },
		],
		outputs: [{ id: 'p', type: 'vec3', label: 'Blended p' }],
		params: [
			{
				id: 't',
				label: 'Blend (B weight)',
				glslType: 'float',
				default: 0.5,
				min: 0,
				max: 1,
				step: 0.02,
				binding: 'uniform',
			},
		],
		template: `// node: {{nodeId}}
vec3 {{out:p}} = mix({{in:a}}, {{in:b}}, float({{param:t}}));`,
	},
];
