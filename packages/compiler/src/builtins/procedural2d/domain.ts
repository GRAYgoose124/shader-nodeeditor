import type { NodeTypeDef } from '../../types.js';

export const proc2dDomainNodes: NodeTypeDef[] = [
	{
		id: 'proc2d_domain',
		label: '2D domain (scale · rotate · offset)',
		category: 'Procedural',
		description: 'Center UV, scale, rotate, then offset in pattern space.',
		docUrl: 'https://iquilezles.org/articles/uv/',
		inputs: [{ id: 'uv', type: 'vec2', label: 'UV' }],
		outputs: [{ id: 'out', type: 'vec2', label: 'p' }],
		params: [
			{ id: 'scale', label: 'Scale', glslType: 'float', default: 1, min: 0.01, max: 16, step: 0.05, binding: 'uniform' },
			{ id: 'ox', label: 'Offset X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'oy', label: 'Offset Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'angle', label: 'Rotate °', glslType: 'float', default: 0, min: -180, max: 180, step: 1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec2 xdom_{{ns}} = ({{in:uv}} - vec2(0.5)) * float({{param:scale}});
float rad_{{ns}} = radians(float({{param:angle}}));
mat2 Rdom_{{ns}} = mat2(cos(rad_{{ns}}), -sin(rad_{{ns}}), sin(rad_{{ns}}), cos(rad_{{ns}}));
xdom_{{ns}} = Rdom_{{ns}} * xdom_{{ns}};
vec2 {{out:out}} = xdom_{{ns}} + vec2(float({{param:ox}}), float({{param:oy}}));`,
	},
];

