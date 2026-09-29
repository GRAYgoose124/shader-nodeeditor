import type { NodeTypeDef } from '../types.js';

/**
 * Pixel-accurate buffer ops: `texelFetch`, toroidal/clamp 3×3 stencils, vec4 combine — for reaction–diffusion,
 * CA, separable-ish neighbor kernels without `texture()` bilinear shifts.
 */
import { feedback2dTexelNodes } from './feedback2d/texel.js';
import { feedback2dVec4Nodes } from './feedback2d/vec4.js';

export const feedback2dNodes: NodeTypeDef[] = [
	...feedback2dTexelNodes,
	{
		id: 'vec2_sub',
		label: 'Subtract vec2',
		category: 'Buffer / feedback',
		inputs: [
			{ id: 'a', type: 'vec2', label: 'a' },
			{ id: 'b', type: 'vec2', label: 'b' },
		],
		outputs: [{ id: 'out', type: 'vec2', label: 'a − b' }],
		params: [],
		template: `// node: {{nodeId}}\nvec2 {{out:out}} = {{in:a}} - {{in:b}};`,
	},
	...feedback2dVec4Nodes,
	{
		id: 'splat_uv_disk_vec4',
		label: 'UV disk → vec4',
		category: 'Buffer / feedback',
		description: '`length(uv − center) < r ? color : 0` — seed spots in 0–1 UV space (L∞-style via step on length).',
		inputs: [{ id: 'uv', type: 'vec2', label: 'UV' }],
		outputs: [{ id: 'out', type: 'vec4', label: 'Contribution' }],
		params: [
			{ id: 'cx', label: 'Center U', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'cy', label: 'Center V', glslType: 'float', default: 0.5, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'radius', label: 'Radius', glslType: 'float', default: 0.05, min: 0.001, max: 0.5, step: 0.005, binding: 'uniform' },
			{ id: 'r', label: 'Fill R', glslType: 'float', default: 1, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'g', label: 'Fill G', glslType: 'float', default: 1, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'b', label: 'Fill B', glslType: 'float', default: 1, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'alpha', label: 'Fill A', glslType: 'float', default: 1, min: 0, max: 1, step: 0.01, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec2 du_{{ns}} = {{in:uv}} - vec2(float({{param:cx}}), float({{param:cy}}));
float inD_{{ns}} = 1.0 - step(float({{param:radius}}), length(du_{{ns}}));
vec4 {{out:out}} = inD_{{ns}} * vec4(float({{param:r}}), float({{param:g}}), float({{param:b}}), float({{param:alpha}}));`,
	},
	{
		id: 'mask_frame_below',
		label: 'Mask: frame < N',
		category: 'Buffer / feedback',
		description: '`1` while `frame < edge`, else `0` — `1.0 - step(edge, frame)`.',
		inputs: [{ id: 'frame', type: 'float', label: 'Frame (float)' }],
		outputs: [{ id: 'm', type: 'float', label: 'Mask' }],
		params: [
			{ id: 'edge', label: 'Edge frame', glslType: 'float', default: 100, min: 0, max: 1e4, step: 1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}\nfloat {{out:m}} = 1.0 - step(float({{param:edge}}), {{in:frame}});`,
	},
];
