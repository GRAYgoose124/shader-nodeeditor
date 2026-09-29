import type { NodeTypeDef } from '../../types.js';

/** Flame-style nonlinear maps on `vec3` for domain repetition / IFS-style stacking (deterministic raymarch). */

export const sdfDomainVariationNodes: NodeTypeDef[] = [
	{
		id: 'domain_kifs_orbit_min',
		label: 'KIFS orbit min |q|',
		category: 'SDF',
		description:
			'Along a KIFS-style fold+scale orbit starting from **p**, tracks the minimum |q| (hull / attractor proximity metric). Use with **SDF albedo from scalar** or palette nodes for flame-like glow.',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'm', type: 'float', label: 'Min length' }],
		params: [
			{ id: 'ox', label: 'Fold off X', glslType: 'float', default: 0.25, min: 0, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'oy', label: 'Fold off Y', glslType: 'float', default: 0.25, min: 0, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'oz', label: 'Fold off Z', glslType: 'float', default: 0.25, min: 0, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'scale', label: 'Scale / iter', glslType: 'float', default: 1.85, min: 1.05, max: 3.5, step: 0.02, binding: 'uniform' },
			{ id: 'iters', label: 'Iterations', glslType: 'float', default: 5, min: 1, max: 12, step: 1, binding: 'literal' },
		],
		canvasParams: ['scale', 'ox'],
		template: `// node: {{nodeId}} — min |q| over KIFS-style orbit
vec3 qom_{{ns}} = {{in:p}};
float mom_{{ns}} = length(qom_{{ns}});
for (int iom_{{ns}} = 0; iom_{{ns}} < 12; iom_{{ns}}++) {
  if (float(iom_{{ns}}) >= float({{param:iters}})) break;
  qom_{{ns}} = abs(qom_{{ns}}) - vec3(float({{param:ox}}), float({{param:oy}}), float({{param:oz}}));
  qom_{{ns}} *= float({{param:scale}});
  mom_{{ns}} = min(mom_{{ns}}, length(qom_{{ns}}));
}
float {{out:m}} = mom_{{ns}};`,
	},
	{
		id: 'domain_variation_spherical',
		label: 'Variation spherical (3D)',
		category: 'SDF',
		description:
			'p′ = p / (r² + ε), r² = |p|² — 3D analog of Apophysis “spherical”. Large |p| contracts toward origin; use small ε for stability.',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Mapped p' }],
		params: [
			{
				id: 'eps',
				label: 'ε (stability)',
				glslType: 'float',
				default: 0.0001,
				min: 1e-6,
				max: 0.01,
				step: 1e-5,
				binding: 'uniform',
			},
		],
		template: `// node: {{nodeId}} — spherical variation (3D)
float r2vs_{{ns}} = dot({{in:p}}, {{in:p}});
float divvs_{{ns}} = r2vs_{{ns}} + float({{param:eps}});
vec3 {{out:p}} = {{in:p}} / max(divvs_{{ns}}, 1e-10);`,
	},
	{
		id: 'domain_variation_swirl',
		label: 'Variation swirl (axis Z)',
		category: 'SDF',
		description: 'XY rotation by k·|p|² around Z (Apophysis-style swirl in the plane).',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Swirled p' }],
		params: [
			{
				id: 'k',
				label: 'Swirl strength',
				glslType: 'float',
				default: 0.35,
				min: -2,
				max: 2,
				step: 0.02,
				binding: 'uniform',
			},
		],
		canvasParams: ['k'],
		template: `// node: {{nodeId}} — swirl (Z axis)
float r2sw_{{ns}} = dot({{in:p}}, {{in:p}});
float angsw_{{ns}} = float({{param:k}}) * r2sw_{{ns}};
float csw_{{ns}} = cos(angsw_{{ns}}), ssw_{{ns}} = sin(angsw_{{ns}});
vec3 {{out:p}} = vec3(csw_{{ns}} * {{in:p}}.x - ssw_{{ns}} * {{in:p}}.y, ssw_{{ns}} * {{in:p}}.x + csw_{{ns}} * {{in:p}}.y, {{in:p}}.z);`,
	},
	{
		id: 'domain_variation_sinusoidal',
		label: 'Variation sinusoidal',
		category: 'SDF',
		description: 'p′ = sin(scale ⊙ p) component-wise — bounded warp; pair with `domain_translate` to center.',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Warped p' }],
		params: [
			{ id: 'sx', label: 'Scale X', glslType: 'float', default: 1.5, min: 0.1, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'sy', label: 'Scale Y', glslType: 'float', default: 1.5, min: 0.1, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'sz', label: 'Scale Z', glslType: 'float', default: 1.5, min: 0.1, max: 8, step: 0.05, binding: 'uniform' },
		],
		canvasParams: ['sx', 'sy', 'sz'],
		template: `// node: {{nodeId}} — sinusoidal
vec3 {{out:p}} = sin(vec3(float({{param:sx}}), float({{param:sy}}), float({{param:sz}})) * {{in:p}});`,
	},
	{
		id: 'domain_variation_horseshoe',
		label: 'Variation horseshoe (XZ)',
		category: 'SDF',
		description:
			'Polar warp in XZ: (r, θ) → r·(cos(2θ), sin(2θ)) with Y preserved — classic flame distortion in the horizontal plane.',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Warped p' }],
		params: [
			{
				id: 'eps',
				label: 'ε (pole)',
				glslType: 'float',
				default: 0.0001,
				min: 1e-6,
				max: 0.01,
				step: 1e-5,
				binding: 'uniform',
			},
		],
		template: `// node: {{nodeId}} — horseshoe in XZ
float rxz_{{ns}} = length({{in:p}}.xz);
float th_{{ns}} = atan({{in:p}}.z, {{in:p}}.x);
float rSafe_{{ns}} = max(rxz_{{ns}}, float({{param:eps}}));
float c2_{{ns}} = cos(2.0 * th_{{ns}}), s2_{{ns}} = sin(2.0 * th_{{ns}});
vec3 {{out:p}} = vec3(rSafe_{{ns}} * c2_{{ns}}, {{in:p}}.y, rSafe_{{ns}} * s2_{{ns}});`,
	},
	{
		id: 'domain_variation_bubble3d',
		label: 'Variation bubble (3D)',
		category: 'SDF',
		description: 'p′ = p / (r⁴ + ε) — stronger inward pull than spherical; use sparingly with small ε.',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Mapped p' }],
		params: [
			{
				id: 'eps',
				label: 'ε (stability)',
				glslType: 'float',
				default: 0.001,
				min: 1e-6,
				max: 0.05,
				step: 0.0005,
				binding: 'uniform',
			},
		],
		template: `// node: {{nodeId}} — bubble (3D)
float r2bb_{{ns}} = dot({{in:p}}, {{in:p}});
float r4bb_{{ns}} = r2bb_{{ns}} * r2bb_{{ns}};
float dvbb_{{ns}} = r4bb_{{ns}} + float({{param:eps}});
vec3 {{out:p}} = {{in:p}} / max(dvbb_{{ns}}, 1e-10);`,
	},
];
