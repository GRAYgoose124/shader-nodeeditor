import type { NodeTypeDef } from '../../types.js';

export const ifsKifs3dNodes: NodeTypeDef[] = [
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
	{
		id: 'ifs_iterate3',
		label: 'IFS iterate (3D)',
		category: 'IFS',
		description:
			'3D analog of **`ifs_iterate`**: repeated `fract(scale·p) − 0.5` folds space into a bounded lattice; stack before primitives or folds. Different kernel than **`ifs_kifs_iterate3d`** (no abs-offset fold).',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Mapped p' }],
		params: [
			{
				id: 'scale',
				label: 'Scale',
				glslType: 'float',
				default: 1.6,
				min: 0.6,
				max: 3.5,
				step: 0.02,
				binding: 'uniform',
			},
			{
				id: 'iters',
				label: 'Iterations',
				glslType: 'float',
				default: 6,
				min: 1,
				max: 16,
				step: 1,
				binding: 'literal',
			},
		],
		canvasParams: ['scale'],
		template: `// node: {{nodeId}} — fract lattice (3D), cf. ifs_iterate (2D)
vec3 qi3_{{ns}} = {{in:p}};
for (int ii3_{{ns}} = 0; ii3_{{ns}} < 16; ii3_{{ns}}++) {
  if (float(ii3_{{ns}}) >= float({{param:iters}})) break;
  qi3_{{ns}} = fract(qi3_{{ns}} * float({{param:scale}})) - 0.5;
}
vec3 {{out:p}} = qi3_{{ns}};`,
	},
];

