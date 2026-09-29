import type { NodeTypeDef } from '../../types.js';

export const sdfMaterialNodes: NodeTypeDef[] = [
	{
		id: 'sdf_albedo',
		label: 'SDF albedo (per-object)',
		category: 'SDF',
		description:
			'Assigns a constant RGB **material** to the distance field wired through it. Merge with union / smooth-min etc. On **Raymarch scene**, enable **Shade with SDF albedo** (literal) to multiply primary-hit texture by this color (adds GPU cost). When that toggle is Off, nodes only pass distance through (no extra cost).',
		inputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		outputs: [
			{ id: 'd', type: 'float', label: 'Distance' },
			{ id: 'mat', type: 'vec3', label: 'Albedo' },
		],
		params: [
			{ id: 'r', label: 'R', glslType: 'float', default: 0.85, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'g', label: 'G', glslType: 'float', default: 0.82, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'b', label: 'B', glslType: 'float', default: 0.78, min: 0, max: 1, step: 0.01, binding: 'uniform' },
		],
		canvasParams: ['r', 'g', 'b'],
		template: `// node: {{nodeId}}
float {{out:d}} = {{in:d}};
vec3 {{out:mat}} = vec3(float({{param:r}}), float({{param:g}}), float({{param:b}}));`,
	},
	{
		id: 'sdf_albedo_scalar_mix',
		label: 'SDF albedo from scalar',
		category: 'SDF',
		description:
			'Passes distance through and builds albedo by **smoothstep**-mixing low/high RGB from a scalar (e.g. **KIFS orbit min |q|**). Wire **Shade with SDF albedo** on Raymarch to see it.',
		inputs: [
			{ id: 'd', type: 'float', label: 'Distance' },
			{ id: 'h', type: 'float', label: 'Scalar (orbit, noise, …)' },
		],
		outputs: [
			{ id: 'd', type: 'float', label: 'Distance' },
			{ id: 'mat', type: 'vec3', label: 'Albedo' },
		],
		params: [
			{ id: 'e0', label: 'Edge low', glslType: 'float', default: 0, min: 0, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'e1', label: 'Edge high', glslType: 'float', default: 0.45, min: 0, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'r0', label: 'Low R', glslType: 'float', default: 0.04, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'g0', label: 'Low G', glslType: 'float', default: 0.05, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'b0', label: 'Low B', glslType: 'float', default: 0.08, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'r1', label: 'High R', glslType: 'float', default: 0.95, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'g1', label: 'High G', glslType: 'float', default: 0.55, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'b1', label: 'High B', glslType: 'float', default: 0.25, min: 0, max: 1, step: 0.01, binding: 'uniform' },
		],
		canvasParams: ['e0', 'e1'],
		template: `// node: {{nodeId}} — SDF albedo from scalar
float {{out:d}} = {{in:d}};
float tw_{{ns}} = smoothstep(float({{param:e0}}), float({{param:e1}}), {{in:h}});
vec3 {{out:mat}} = mix(vec3(float({{param:r0}}), float({{param:g0}}), float({{param:b0}})), vec3(float({{param:r1}}), float({{param:g1}}), float({{param:b1}})), tw_{{ns}});`,
	},
];

