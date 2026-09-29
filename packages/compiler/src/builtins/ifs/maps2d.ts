import type { NodeTypeDef } from '../../types.js';

export const ifsMaps2dNodes: NodeTypeDef[] = [
	{
		id: 'ifs_affine',
		label: 'IFS affine map',
		category: 'IFS',
		description: "z' = M·z + t — stack with folds / iterate.",
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
		id: 'ifs_circle_inversion',
		label: 'IFS circle inversion',
		category: 'IFS',
		description:
			"Inversion in a circle: z' = c + R² (z−c) / |z−c|². Pair with folds and affines for Doyle / circle-limit style graphs.",
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
];

