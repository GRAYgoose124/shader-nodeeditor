import type { NodeTypeDef } from '../types.js';

export const sdfNodesMain: NodeTypeDef[] = [
	{
		id: 'sdf_primitive',
		label: 'SDF primitive',
		category: 'SDF',
		description:
			'All-in-one distance field (shape dropdown). For clearer wiring use **SDF Sphere** / **SDF Box** / other atomic SDF nodes in this category.',
		docUrl: 'https://iquilezles.org/articles/distfunctions/',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [
			{
				id: 'shape',
				label: 'Shape',
				glslType: 'float',
				default: 'sphere',
				binding: 'literal',
				choices: [
					{ value: 'sphere', label: 'Sphere' },
					{ value: 'box', label: 'Box' },
					{ value: 'round_box', label: 'Round box' },
					{ value: 'plane', label: 'Plane' },
					{ value: 'octahedron', label: 'Octahedron' },
					{ value: 'torus', label: 'Torus (XZ ring)' },
					{ value: 'capped_cylinder_y', label: 'Capped cylinder (Y)' },
					{ value: 'cylinder_y', label: 'Infinite cylinder (Y)' },
					{ value: 'rounded_cylinder_y', label: 'Rounded cylinder (Y)' },
					{ value: 'capped_cone_y', label: 'Capped cone (Y)' },
					{ value: 'link_y', label: 'Link (chain)' },
					{ value: 'capsule_y', label: 'Capsule (Y)' },
					{ value: 'capsule_segment', label: 'Capsule (segment A→B)' },
					{ value: 'ellipsoid_bound', label: 'Ellipsoid (bound)' },
					{ value: 'hex_prism_y', label: 'Hex prism (Y extrusion)' },
					{ value: 'tri_prism_y', label: 'Tri prism (Y extrusion)' },
					{ value: 'rhombus', label: 'Rhombus' },
					{ value: 'death_star', label: 'Death star (approx)' },
					{ value: 'cone_inf_y', label: 'Infinite cone (Y)' },
					{ value: 'oriented_box', label: 'Oriented box (Euler XYZ)' },
				],
			},
			{
				id: 'r',
				label: 'Radius / minor r',
				glslType: 'float',
				default: 0.35,
				min: 0.02,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: {
					paramId: 'shape',
					values: ['sphere', 'cylinder_y', 'capped_cylinder_y', 'capsule_y', 'rounded_cylinder_y', 'torus'],
				},
			},
			{
				id: 'R',
				label: 'Torus major R / link R',
				glslType: 'float',
				default: 0.42,
				min: 0.02,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['torus', 'link_y'] },
			},
			{
				id: 'hx',
				label: 'Box half X',
				glslType: 'float',
				default: 0.3,
				min: 0.01,
				max: 5,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['box', 'round_box', 'oriented_box'] },
			},
			{
				id: 'hy',
				label: 'Box half Y',
				glslType: 'float',
				default: 0.3,
				min: 0.01,
				max: 5,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['box', 'round_box', 'oriented_box'] },
			},
			{
				id: 'hz',
				label: 'Box half Z',
				glslType: 'float',
				default: 0.3,
				min: 0.01,
				max: 5,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['box', 'round_box', 'oriented_box'] },
			},
			{
				id: 'round_r',
				label: 'Round box edge r',
				glslType: 'float',
				default: 0.05,
				min: 0.001,
				max: 1,
				step: 0.005,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['round_box'] },
			},
			{
				id: 'nx',
				label: 'Plane n.x',
				glslType: 'float',
				default: 0,
				min: -1,
				max: 1,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['plane'] },
			},
			{
				id: 'ny',
				label: 'Plane n.y',
				glslType: 'float',
				default: 1,
				min: -1,
				max: 1,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['plane'] },
			},
			{
				id: 'nz',
				label: 'Plane n.z',
				glslType: 'float',
				default: 0,
				min: -1,
				max: 1,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['plane'] },
			},
			{
				id: 'plane_h',
				label: 'Plane offset',
				glslType: 'float',
				default: 0.35,
				min: -5,
				max: 5,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['plane'] },
			},
			{
				id: 'oct_s',
				label: 'Octahedron size',
				glslType: 'float',
				default: 0.45,
				min: 0.05,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['octahedron'] },
			},
			{
				id: 'cone_h',
				label: 'Cone half height',
				glslType: 'float',
				default: 0.4,
				min: 0.05,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['capped_cone_y'] },
			},
			{
				id: 'cone_r1',
				label: 'Cone base R',
				glslType: 'float',
				default: 0.35,
				min: 0.02,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['capped_cone_y'] },
			},
			{
				id: 'cone_r2',
				label: 'Cone top R',
				glslType: 'float',
				default: 0.08,
				min: 0,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['capped_cone_y'] },
			},
			{
				id: 'rcyl_rb',
				label: 'Rounded cyl. bevel',
				glslType: 'float',
				default: 0.06,
				min: 0.01,
				max: 1,
				step: 0.005,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['rounded_cylinder_y'] },
			},
			{
				id: 'link_le',
				label: 'Link half length Y',
				glslType: 'float',
				default: 0.2,
				min: 0.02,
				max: 2,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['link_y'] },
			},
			{
				id: 'h',
				label: 'Half height (caps/cyl)',
				glslType: 'float',
				default: 0.36,
				min: 0.02,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: {
					paramId: 'shape',
					values: ['capped_cylinder_y', 'capsule_y', 'rounded_cylinder_y'],
				},
			},
			{
				id: 'cap_ax',
				label: 'Cap A.x',
				glslType: 'float',
				default: -0.22,
				min: -4,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['capsule_segment'] },
			},
			{
				id: 'cap_ay',
				label: 'Cap A.y',
				glslType: 'float',
				default: 0,
				min: -4,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['capsule_segment'] },
			},
			{
				id: 'cap_az',
				label: 'Cap A.z',
				glslType: 'float',
				default: 0,
				min: -4,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['capsule_segment'] },
			},
			{
				id: 'cap_bx',
				label: 'Cap B.x',
				glslType: 'float',
				default: 0.22,
				min: -4,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['capsule_segment'] },
			},
			{
				id: 'cap_by',
				label: 'Cap B.y',
				glslType: 'float',
				default: 0,
				min: -4,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['capsule_segment'] },
			},
			{
				id: 'cap_bz',
				label: 'Cap B.z',
				glslType: 'float',
				default: 0,
				min: -4,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['capsule_segment'] },
			},
			{
				id: 'cap_r',
				label: 'Cap radius',
				glslType: 'float',
				default: 0.12,
				min: 0.02,
				max: 2,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['capsule_segment'] },
			},
			{
				id: 'ell_rx',
				label: 'Ellipsoid rx',
				glslType: 'float',
				default: 0.35,
				min: 0.05,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['ellipsoid_bound'] },
			},
			{
				id: 'ell_ry',
				label: 'Ellipsoid ry',
				glslType: 'float',
				default: 0.28,
				min: 0.05,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['ellipsoid_bound'] },
			},
			{
				id: 'ell_rz',
				label: 'Ellipsoid rz',
				glslType: 'float',
				default: 0.22,
				min: 0.05,
				max: 4,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['ellipsoid_bound'] },
			},
			{
				id: 'hex_r',
				label: 'Hex prism R (XY)',
				glslType: 'float',
				default: 0.3,
				min: 0.05,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['hex_prism_y'] },
			},
			{
				id: 'hex_h',
				label: 'Hex prism half Z',
				glslType: 'float',
				default: 0.25,
				min: 0.02,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['hex_prism_y'] },
			},
			{
				id: 'tri_r',
				label: 'Tri prism R (XY)',
				glslType: 'float',
				default: 0.35,
				min: 0.05,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['tri_prism_y'] },
			},
			{
				id: 'tri_h',
				label: 'Tri prism half Z',
				glslType: 'float',
				default: 0.2,
				min: 0.02,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['tri_prism_y'] },
			},
			{
				id: 'rh_la',
				label: 'Rhombus la',
				glslType: 'float',
				default: 0.28,
				min: 0.05,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['rhombus'] },
			},
			{
				id: 'rh_lb',
				label: 'Rhombus lb',
				glslType: 'float',
				default: 0.36,
				min: 0.05,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['rhombus'] },
			},
			{
				id: 'rh_h',
				label: 'Rhombus half Z',
				glslType: 'float',
				default: 0.22,
				min: 0.02,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['rhombus'] },
			},
			{
				id: 'rh_ra',
				label: 'Rhombus round',
				glslType: 'float',
				default: 0.02,
				min: 0,
				max: 0.5,
				step: 0.005,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['rhombus'] },
			},
			{
				id: 'ds_R',
				label: 'Death star R',
				glslType: 'float',
				default: 0.45,
				min: 0.05,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['death_star'] },
			},
			{
				id: 'ds_r',
				label: 'Death star bite r',
				glslType: 'float',
				default: 0.38,
				min: 0.05,
				max: 3,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['death_star'] },
			},
			{
				id: 'ds_oz',
				label: 'Death star bite Z',
				glslType: 'float',
				default: -0.14,
				min: -1,
				max: 1,
				step: 0.01,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['death_star'] },
			},
			{
				id: 'cone_c',
				label: 'Cone slope (tan half)',
				glslType: 'float',
				default: 0.55,
				min: 0.1,
				max: 2,
				step: 0.02,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['cone_inf_y'] },
			},
			{
				id: 'ob_rx',
				label: 'OBox rot X rad',
				glslType: 'float',
				default: 0,
				min: -6.28,
				max: 6.28,
				step: 0.05,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['oriented_box'] },
			},
			{
				id: 'ob_ry',
				label: 'OBox rot Y rad',
				glslType: 'float',
				default: 0,
				min: -6.28,
				max: 6.28,
				step: 0.05,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['oriented_box'] },
			},
			{
				id: 'ob_rz',
				label: 'OBox rot Z rad',
				glslType: 'float',
				default: 0,
				min: -6.28,
				max: 6.28,
				step: 0.05,
				binding: 'uniform',
				visibleWhen: { paramId: 'shape', values: ['oriented_box'] },
			},
		],
		template: '',
	},
	{
		id: 'sdf_sphere',
		label: 'SDF Sphere',
		category: 'SDF',
		description: 'Composable sphere primitive (prefer over SDF primitive → sphere in new graphs).',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [{ id: 'r', label: 'Radius', glslType: 'float', default: 0.5, min: 0.001, max: 10, step: 0.01, binding: 'uniform' }],
		canvasParams: ['r'],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = length({{in:p}}) - float({{param:r}});`,
	},
	{
		id: 'sdf_octahedron',
		label: 'SDF Octahedron',
		category: 'SDF',
		description:
			'Composable octahedron (same as SDF primitive → octahedron). With `sdf_tessellate_feedback`, a direct `sdf_param_p → p` wire uses **scene** `p` in the motif (not the KIFS fold coordinate) so the cage stays world-fixed.',
		docUrl: 'https://iquilezles.org/articles/distfunctions/',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position', motifSampling: 'world' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [
			{ id: 'oct_s', label: 'Size', glslType: 'float', default: 0.45, min: 0.05, max: 4, step: 0.01, binding: 'uniform' },
		],
		canvasParams: ['oct_s'],
		template: `// node: {{nodeId}} — sdOctahedron / https://iquilezles.org/articles/distfunctions/
vec3 po_{{ns}} = abs({{in:p}});
float mo_{{ns}} = po_{{ns}}.x + po_{{ns}}.y + po_{{ns}}.z - float({{param:oct_s}});
float {{out:d}};
if (3.0 * po_{{ns}}.x >= mo_{{ns}} && 3.0 * po_{{ns}}.y >= mo_{{ns}} && 3.0 * po_{{ns}}.z >= mo_{{ns}}) {
	{{out:d}} = mo_{{ns}} * 0.57735027;
} else {
	vec3 qo_{{ns}};
	if (3.0 * po_{{ns}}.x < mo_{{ns}}) qo_{{ns}} = po_{{ns}}.xyz;
	else if (3.0 * po_{{ns}}.y < mo_{{ns}}) qo_{{ns}} = po_{{ns}}.yzx;
	else qo_{{ns}} = po_{{ns}}.zxy;
	float ko_{{ns}} = clamp(0.5 * (qo_{{ns}}.z - qo_{{ns}}.y + float({{param:oct_s}})), 0.0, float({{param:oct_s}}));
	{{out:d}} = length(vec3(qo_{{ns}}.x, qo_{{ns}}.y - float({{param:oct_s}}) + ko_{{ns}}, qo_{{ns}}.z - ko_{{ns}}));
}`,
	},
	{
		id: 'sdf_box',
		label: 'SDF Box',
		category: 'SDF',
		description: 'Composable axis-aligned box (prefer over SDF primitive → box).',
		inputs: [{ id: 'p', type: 'vec3' }],
		outputs: [{ id: 'd', type: 'float' }],
		params: [
			{ id: 'hx', label: 'Half X', glslType: 'float', default: 0.3, min: 0.01, max: 5, step: 0.01, binding: 'uniform' },
			{ id: 'hy', label: 'Half Y', glslType: 'float', default: 0.3, min: 0.01, max: 5, step: 0.01, binding: 'uniform' },
			{ id: 'hz', label: 'Half Z', glslType: 'float', default: 0.3, min: 0.01, max: 5, step: 0.01, binding: 'uniform' },
		],
		template:
			'// node: {{nodeId}}\nfloat {{out:d}} = length(max(abs({{in:p}}) - vec3(float({{param:hx}}), float({{param:hy}}), float({{param:hz}})), 0.0))' +
			' + min(max(abs({{in:p}}).x - float({{param:hx}}), max(abs({{in:p}}).y - float({{param:hy}}), abs({{in:p}}).z - float({{param:hz}}))), 0.0);',
	},
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
		id: 'op_union',
		label: 'Union',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = min({{in:a}}, {{in:b}});`,
	},
	{
		id: 'op_subtract',
		label: 'Subtract',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = max({{in:a}}, -{{in:b}});`,
	},
	{
		id: 'op_intersect',
		label: 'Intersect',
		category: 'SDF',
		inputs: [
			{ id: 'a', type: 'float' },
			{ id: 'b', type: 'float' },
		],
		outputs: [{ id: 'd', type: 'float' }],
		params: [],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = max({{in:a}}, {{in:b}});`,
	},
	{
		id: 'sdf_tessellate_feedback',
		label: 'SDF feedback tessellation',
		category: 'SDF',
		description:
			'Self-similar detail: KIFS-style fold+scale in a loop, unioning the **same** motif SDF at nested scales. Wire **distance** from the subgraph root (e.g. `intersect`). Primitives whose **`p`** port has **`motifSampling: world`** (see **SDF Octahedron**) are evaluated at **scene** `p` inside `motif(q, pScene)` so a clip cage stays fixed while the rest of the motif uses folded `q`. It emits a helper and evaluates at scene `p` and folded points (the incoming edge is not a raw GLSL variable name).',
		docUrl: 'https://iquilezles.org/articles/menger/',
		inputs: [{ id: 'd', type: 'float', label: 'Motif distance' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [
			{
				id: 'foldOx',
				label: 'Fold offset X',
				glslType: 'float',
				default: 0.28,
				min: 0,
				max: 2,
				step: 0.02,
				binding: 'uniform',
			},
			{
				id: 'foldOy',
				label: 'Fold offset Y',
				glslType: 'float',
				default: 0.28,
				min: 0,
				max: 2,
				step: 0.02,
				binding: 'uniform',
			},
			{
				id: 'foldOz',
				label: 'Fold offset Z',
				glslType: 'float',
				default: 0.28,
				min: 0,
				max: 2,
				step: 0.02,
				binding: 'uniform',
			},
			{
				id: 'scale',
				label: 'Domain scale / iter',
				glslType: 'float',
				default: 1.9,
				min: 1.05,
				max: 3.5,
				step: 0.02,
				binding: 'uniform',
			},
			{
				id: 'iters',
				label: 'Iterations',
				glslType: 'float',
				default: 3,
				min: 0,
				max: 8,
				step: 1,
				binding: 'literal',
			},
		],
		canvasParams: ['scale', 'foldOx'],
		template: '',
	},
	{
		id: 'sdf_torus',
		label: 'SDF Torus',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3' }],
		outputs: [{ id: 'd', type: 'float' }],
		params: [
			{ id: 'R', label: 'Major R', glslType: 'float', default: 0.35, min: 0.02, max: 3, step: 0.01, binding: 'uniform' },
			{ id: 'r', label: 'Minor r', glslType: 'float', default: 0.12, min: 0.02, max: 1.5, step: 0.01, binding: 'uniform' },
		],
		canvasParams: ['R', 'r'],
		template:
			'// node: {{nodeId}} — iq sdTorus\nfloat {{out:d}} = length(vec2(length({{in:p}}.xz) - float({{param:R}}), {{in:p}}.y)) - float({{param:r}});',
	},
	{
		id: 'domain_tessellate_hex_xz',
		label: 'Tessellate hex (XZ + Y)',
		category: 'SDF',
		description:
			'Honeycomb tiling in XZ (center spacing hexCell) with periodic Y. Maps world p into one motif cell for repeated SDFs. See IQ distance functions / repetition.',
		docUrl: 'https://iquilezles.org/articles/distfunctions/',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Cell-local p' }],
		params: [
			{
				id: 'hexCell',
				label: 'Hex center spacing X',
				glslType: 'float',
				default: 1.0,
				min: 0.15,
				max: 20,
				step: 0.02,
				binding: 'uniform',
			},
			{
				id: 'periodY',
				label: 'Y period',
				glslType: 'float',
				default: 1.0,
				min: 0.1,
				max: 20,
				step: 0.02,
				binding: 'uniform',
			},
			{
				id: 'yPhase',
				label: 'Y phase',
				glslType: 'float',
				default: 0,
				min: -20,
				max: 20,
				step: 0.02,
				binding: 'uniform',
			},
		],
		canvasParams: ['hexCell', 'periodY'],
		template: `// node: {{nodeId}} — hex XZ honeycomb + Y period
float dx_{{ns}} = float({{param:hexCell}});
float dz_{{ns}} = dx_{{ns}} * 0.8660254037844387;
vec2 xz_{{ns}} = {{in:p}}.xz;
float zi_{{ns}} = floor((xz_{{ns}}.y + dz_{{ns}} * 0.5) / dz_{{ns}});
float xOff_{{ns}} = mod(zi_{{ns}} + 131072.0, 2.0) * (dx_{{ns}} * 0.5);
float xi_{{ns}} = floor((xz_{{ns}}.x + xOff_{{ns}} + dx_{{ns}} * 0.5) / dx_{{ns}});
float cx_{{ns}} = xi_{{ns}} * dx_{{ns}} - xOff_{{ns}};
float cz_{{ns}} = zi_{{ns}} * dz_{{ns}};
vec2 locXZ_{{ns}} = xz_{{ns}} - vec2(cx_{{ns}}, cz_{{ns}});
float perY_{{ns}} = float({{param:periodY}});
float yy_{{ns}} = {{in:p}}.y + float({{param:yPhase}});
vec3 {{out:p}} = vec3(locXZ_{{ns}}.x, mod(yy_{{ns}} + 0.5 * perY_{{ns}}, perY_{{ns}}) - 0.5 * perY_{{ns}}, locXZ_{{ns}}.y);`,
	},
	{
		id: 'sdf_cylinder_y',
		label: 'SDF Cylinder (Y axis)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3' }],
		outputs: [{ id: 'd', type: 'float' }],
		params: [{ id: 'r', label: 'Radius', glslType: 'float', default: 0.25, min: 0.02, max: 3, step: 0.01, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = length({{in:p}}.xz) - float({{param:r}});`,
	},
	{
		id: 'sdf_capsule_y',
		label: 'SDF Capsule (Y)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3' }],
		outputs: [{ id: 'd', type: 'float' }],
		params: [
			{ id: 'r', label: 'Radius', glslType: 'float', default: 0.15, min: 0.02, max: 2, step: 0.01, binding: 'uniform' },
			{ id: 'h', label: 'Half height', glslType: 'float', default: 0.35, min: 0.02, max: 4, step: 0.01, binding: 'uniform' },
		],
		template:
			'// node: {{nodeId}}\nvec2 cap_{{ns}} = vec2(length({{in:p}}.xz) - float({{param:r}}), abs({{in:p}}.y) - float({{param:h}}));\n' +
			'float {{out:d}} = length(max(cap_{{ns}}, 0.0)) + min(max(cap_{{ns}}.x, cap_{{ns}}.y), 0.0);',
	},
	{
		id: 'domain_repeat_xyz',
		label: 'Repeat domain (XYZ)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Repeated p' }],
		params: [
			{ id: 'cx', label: 'Period X', glslType: 'float', default: 2, min: 0.2, max: 20, step: 0.05, binding: 'uniform' },
			{ id: 'cy', label: 'Period Y', glslType: 'float', default: 2, min: 0.2, max: 20, step: 0.05, binding: 'uniform' },
			{ id: 'cz', label: 'Period Z', glslType: 'float', default: 2, min: 0.2, max: 20, step: 0.05, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec3 per_{{ns}} = vec3(float({{param:cx}}), float({{param:cy}}), float({{param:cz}}));
vec3 {{out:p}} = mod({{in:p}} + 0.5 * per_{{ns}}, per_{{ns}}) - 0.5 * per_{{ns}};`,
	},
	{
		id: 'domain_repeat_limited_xyz',
		label: 'Repeat domain limited (XYZ)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Repeated p' }],
		params: [
			{ id: 'cx', label: 'Cell X', glslType: 'float', default: 2, min: 0.2, max: 20, step: 0.05, binding: 'uniform' },
			{ id: 'cy', label: 'Cell Y', glslType: 'float', default: 2, min: 0.2, max: 20, step: 0.05, binding: 'uniform' },
			{ id: 'cz', label: 'Cell Z', glslType: 'float', default: 2, min: 0.2, max: 20, step: 0.05, binding: 'uniform' },
			{ id: 'lx', label: 'Limit X (cells)', glslType: 'float', default: 3, min: 0, max: 20, step: 1, binding: 'uniform' },
			{ id: 'ly', label: 'Limit Y (cells)', glslType: 'float', default: 3, min: 0, max: 20, step: 1, binding: 'uniform' },
			{ id: 'lz', label: 'Limit Z (cells)', glslType: 'float', default: 3, min: 0, max: 20, step: 1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — opLimitedRep / https://iquilezles.org/articles/distfunctions/
vec3 cel_{{ns}} = vec3(float({{param:cx}}), float({{param:cy}}), float({{param:cz}}));
vec3 lim_{{ns}} = vec3(float({{param:lx}}), float({{param:ly}}), float({{param:lz}}));
vec3 {{out:p}} = {{in:p}} - cel_{{ns}} * clamp(round({{in:p}} / cel_{{ns}}), -lim_{{ns}}, lim_{{ns}});`,
	},
	{
		id: 'domain_rotate_euler',
		label: 'Rotate Euler (wired angles)',
		category: 'SDF',
		inputs: [
			{ id: 'p', type: 'vec3', label: 'Position' },
			{ id: 'rx', type: 'float', label: 'Angle X (rad)' },
			{ id: 'ry', type: 'float', label: 'Angle Y (rad)' },
			{ id: 'rz', type: 'float', label: 'Angle Z (rad)' },
		],
		outputs: [{ id: 'p', type: 'vec3', label: 'Rotated p' }],
		params: [],
		template: `// node: {{nodeId}} — apply Rx then Ry then Rz / https://iquilezles.org/articles/distfunctions/
float cx_{{ns}} = cos({{in:rx}}), sx_{{ns}} = sin({{in:rx}});
vec3 qe_{{ns}} = vec3({{in:p}}.x, cx_{{ns}} * {{in:p}}.y - sx_{{ns}} * {{in:p}}.z, sx_{{ns}} * {{in:p}}.y + cx_{{ns}} * {{in:p}}.z);
float cy_{{ns}} = cos({{in:ry}}), sy_{{ns}} = sin({{in:ry}});
vec3 re_{{ns}} = vec3(cy_{{ns}} * qe_{{ns}}.x + sy_{{ns}} * qe_{{ns}}.z, qe_{{ns}}.y, -sy_{{ns}} * qe_{{ns}}.x + cy_{{ns}} * qe_{{ns}}.z);
float cz_{{ns}} = cos({{in:rz}}), sz_{{ns}} = sin({{in:rz}});
vec3 {{out:p}} = vec3(cz_{{ns}} * re_{{ns}}.x - sz_{{ns}} * re_{{ns}}.y, sz_{{ns}} * re_{{ns}}.x + cz_{{ns}} * re_{{ns}}.y, re_{{ns}}.z);`,
	},
	{
		id: 'domain_rotate_euler_time',
		label: 'Rotate Euler + iTime scale',
		category: 'SDF',
		description:
			'Applies Rx·Ry·Rz to p with angles base + iTime×scale per axis. Typical first step after sdf_param_p for spinning scenes.',
		docUrl: 'https://iquilezles.org/articles/distfunctions/',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Rotated p' }],
		params: [
			{ id: 'rx', label: 'Base angle X (rad)', glslType: 'float', default: 0, min: -6.28, max: 6.28, step: 0.05, binding: 'uniform' },
			{ id: 'ry', label: 'Base angle Y (rad)', glslType: 'float', default: 0, min: -6.28, max: 6.28, step: 0.05, binding: 'uniform' },
			{ id: 'rz', label: 'Base angle Z (rad)', glslType: 'float', default: 0, min: -6.28, max: 6.28, step: 0.05, binding: 'uniform' },
			{ id: 'tx', label: 'Time scale X (rad/s)', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'ty', label: 'Time scale Y (rad/s)', glslType: 'float', default: 1, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tz', label: 'Time scale Z (rad/s)', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		canvasParams: ['rx', 'ry', 'rz', 'tx', 'ty', 'tz'],
		template: `// node: {{nodeId}} — Rx·Ry·Rz with angle = base + iTime*scale / https://iquilezles.org/articles/distfunctions/
float ax_{{ns}} = float({{param:rx}}) + iTime * float({{param:tx}});
float ay_{{ns}} = float({{param:ry}}) + iTime * float({{param:ty}});
float az_{{ns}} = float({{param:rz}}) + iTime * float({{param:tz}});
float cx_{{ns}} = cos(ax_{{ns}}), sx_{{ns}} = sin(ax_{{ns}});
vec3 qe_{{ns}} = vec3({{in:p}}.x, cx_{{ns}} * {{in:p}}.y - sx_{{ns}} * {{in:p}}.z, sx_{{ns}} * {{in:p}}.y + cx_{{ns}} * {{in:p}}.z);
float cy_{{ns}} = cos(ay_{{ns}}), sy_{{ns}} = sin(ay_{{ns}});
vec3 re_{{ns}} = vec3(cy_{{ns}} * qe_{{ns}}.x + sy_{{ns}} * qe_{{ns}}.z, qe_{{ns}}.y, -sy_{{ns}} * qe_{{ns}}.x + cy_{{ns}} * qe_{{ns}}.z);
float cz_{{ns}} = cos(az_{{ns}}), sz_{{ns}} = sin(az_{{ns}});
vec3 {{out:p}} = vec3(cz_{{ns}} * re_{{ns}}.x - sz_{{ns}} * re_{{ns}}.y, sz_{{ns}} * re_{{ns}}.x + cz_{{ns}} * re_{{ns}}.y, re_{{ns}}.z);`,
	},
	{
		id: 'domain_translate',
		label: 'Translate (p − center)',
		category: 'SDF',
		description: 'Shifts evaluation so primitives at the origin appear at (tx, ty, tz) in world space.',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Local p' }],
		params: [
			{ id: 'tx', label: 'Center X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'ty', label: 'Center Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tz', label: 'Center Z', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		canvasParams: ['tx', 'ty', 'tz'],
		template: `// node: {{nodeId}}
vec3 {{out:p}} = {{in:p}} - vec3(float({{param:tx}}), float({{param:ty}}), float({{param:tz}}));`,
	},
	{
		id: 'domain_twist',
		label: 'Twist (axis + time)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Twisted p' }],
		params: [
			{
				id: 'axis',
				label: 'Twist axis',
				glslType: 'float',
				default: '1',
				binding: 'literal',
				choices: [
					{ value: '0', label: 'X' },
					{ value: '1', label: 'Y' },
					{ value: '2', label: 'Z' },
				],
			},
			{ id: 'k', label: 'Twist k', glslType: 'float', default: 2, min: -12, max: 12, step: 0.1, binding: 'uniform' },
			{ id: 'timeScale', label: 'iTime scale', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — domain twist / https://iquilezles.org/articles/distfunctions/
float ax_{{ns}} = float({{param:axis}});
float tw_{{ns}} = float({{param:k}}) * (ax_{{ns}} < 0.5 ? {{in:p}}.x : (ax_{{ns}} < 1.5 ? {{in:p}}.y : {{in:p}}.z)) + iTime * float({{param:timeScale}});
float ct_{{ns}} = cos(tw_{{ns}});
float st_{{ns}} = sin(tw_{{ns}});
vec3 {{out:p}} = ax_{{ns}} < 0.5
  ? vec3({{in:p}}.x, ct_{{ns}} * {{in:p}}.y - st_{{ns}} * {{in:p}}.z, st_{{ns}} * {{in:p}}.y + ct_{{ns}} * {{in:p}}.z)
  : (ax_{{ns}} < 1.5
  ? vec3(ct_{{ns}} * {{in:p}}.x - st_{{ns}} * {{in:p}}.z, {{in:p}}.y, st_{{ns}} * {{in:p}}.x + ct_{{ns}} * {{in:p}}.z)
  : vec3(ct_{{ns}} * {{in:p}}.x - st_{{ns}} * {{in:p}}.y, st_{{ns}} * {{in:p}}.x + ct_{{ns}} * {{in:p}}.y, {{in:p}}.z));`,
	},
	{
		id: 'domain_twist_y',
		label: 'Twist around Y (legacy)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Twisted p' }],
		params: [{ id: 'k', label: 'Twist k', glslType: 'float', default: 2, min: -12, max: 12, step: 0.1, binding: 'uniform' }],
		template: `// node: {{nodeId}}
float ct_{{ns}} = cos(float({{param:k}}) * {{in:p}}.y);
float st_{{ns}} = sin(float({{param:k}}) * {{in:p}}.y);
vec3 {{out:p}} = vec3(ct_{{ns}} * {{in:p}}.x - st_{{ns}} * {{in:p}}.z, {{in:p}}.y, st_{{ns}} * {{in:p}}.x + ct_{{ns}} * {{in:p}}.z);`,
	},
	{
		id: 'domain_rotate_y',
		label: 'Rotate around Y (legacy, wired angle)',
		category: 'SDF',
		inputs: [
			{ id: 'p', type: 'vec3', label: 'Position' },
			{ id: 'angle', type: 'float', label: 'Angle (rad)' },
		],
		outputs: [{ id: 'p', type: 'vec3', label: 'Rotated p' }],
		params: [],
		template: `// node: {{nodeId}}
float cr_{{ns}} = cos({{in:angle}});
float sr_{{ns}} = sin({{in:angle}});
vec3 {{out:p}} = vec3(cr_{{ns}} * {{in:p}}.x + sr_{{ns}} * {{in:p}}.z, {{in:p}}.y, -sr_{{ns}} * {{in:p}}.x + cr_{{ns}} * {{in:p}}.z);`,
	},
	{
		id: 'domain_rotate_y_time',
		label: 'Rotate around Y (legacy, iTime)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Rotated p' }],
		params: [
			{ id: 'phase', label: 'Phase (rad)', glslType: 'float', default: 0, min: -6.28, max: 6.28, step: 0.05, binding: 'uniform' },
			{ id: 'speed', label: 'Speed (rad/s)', glslType: 'float', default: 1, min: -8, max: 8, step: 0.05, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
float ang_{{ns}} = float({{param:phase}}) + iTime * float({{param:speed}});
float cr_{{ns}} = cos(ang_{{ns}});
float sr_{{ns}} = sin(ang_{{ns}});
vec3 {{out:p}} = vec3(cr_{{ns}} * {{in:p}}.x + sr_{{ns}} * {{in:p}}.z, {{in:p}}.y, -sr_{{ns}} * {{in:p}}.x + cr_{{ns}} * {{in:p}}.z);`,
	},
	{
		id: 'domain_bend',
		label: 'Bend (axis + time)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Bent p' }],
		params: [
			{
				id: 'axis',
				label: 'Bend along',
				glslType: 'float',
				default: '0',
				binding: 'literal',
				choices: [
					{ value: '0', label: 'X (bend YZ)' },
					{ value: '1', label: 'Y (bend ZX)' },
					{ value: '2', label: 'Z (bend XY)' },
				],
			},
			{ id: 'k', label: 'Bend k', glslType: 'float', default: 1, min: -8, max: 8, step: 0.1, binding: 'uniform' },
			{ id: 'timeScale', label: 'iTime scale', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — domain bend / https://iquilezles.org/articles/distfunctions/
float bax_{{ns}} = float({{param:axis}});
float bd_{{ns}} = float({{param:k}}) * (bax_{{ns}} < 0.5 ? {{in:p}}.x : (bax_{{ns}} < 1.5 ? {{in:p}}.y : {{in:p}}.z)) + iTime * float({{param:timeScale}});
float cb_{{ns}} = cos(bd_{{ns}});
float sb_{{ns}} = sin(bd_{{ns}});
vec3 {{out:p}} = bax_{{ns}} < 0.5
  ? vec3({{in:p}}.x, cb_{{ns}} * {{in:p}}.y - sb_{{ns}} * {{in:p}}.z, sb_{{ns}} * {{in:p}}.y + cb_{{ns}} * {{in:p}}.z)
  : (bax_{{ns}} < 1.5
  ? vec3(cb_{{ns}} * {{in:p}}.x - sb_{{ns}} * {{in:p}}.z, {{in:p}}.y, sb_{{ns}} * {{in:p}}.x + cb_{{ns}} * {{in:p}}.z)
  : vec3(cb_{{ns}} * {{in:p}}.x - sb_{{ns}} * {{in:p}}.y, sb_{{ns}} * {{in:p}}.x + cb_{{ns}} * {{in:p}}.y, {{in:p}}.z));`,
	},
	{
		id: 'domain_bend_x',
		label: 'Bend along X (legacy)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Bent p' }],
		params: [{ id: 'k', label: 'Bend k', glslType: 'float', default: 1, min: -8, max: 8, step: 0.1, binding: 'uniform' }],
		template: `// node: {{nodeId}}
float cb_{{ns}} = cos(float({{param:k}}) * {{in:p}}.x);
float sb_{{ns}} = sin(float({{param:k}}) * {{in:p}}.x);
vec3 {{out:p}} = vec3({{in:p}}.x, cb_{{ns}} * {{in:p}}.y - sb_{{ns}} * {{in:p}}.z, sb_{{ns}} * {{in:p}}.y + cb_{{ns}} * {{in:p}}.z);`,
	},
	{
		id: 'domain_elongate',
		label: 'Elongate (clamp p)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Elongated p' }],
		params: [
			{ id: 'ex', label: 'Half X', glslType: 'float', default: 0.2, min: 0, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'ey', label: 'Half Y', glslType: 'float', default: 0.2, min: 0, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'ez', label: 'Half Z', glslType: 'float', default: 0.2, min: 0, max: 4, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec3 {{out:p}} = {{in:p}} - clamp({{in:p}}, -vec3(float({{param:ex}}), float({{param:ey}}), float({{param:ez}})), vec3(float({{param:ex}}), float({{param:ey}}), float({{param:ez}})));`,
	},
	{
		id: 'domain_noise_displace',
		label: 'Noise displace (hash)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Warped p' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 3, min: 0.1, max: 24, step: 0.1, binding: 'uniform' },
			{ id: 'amp', label: 'Amplitude', glslType: 'float', default: 0.08, min: 0, max: 0.5, step: 0.005, binding: 'uniform' },
			{ id: 'tsx', label: 'Time scroll X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsy', label: 'Time scroll Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsz', label: 'Time scroll Z', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_hash31 prelude / https://iquilezles.org/articles/morenoise/
vec3 pnd_{{ns}} = {{in:p}} + iTime * vec3(float({{param:tsx}}), float({{param:tsy}}), float({{param:tsz}}));
vec3 qnd_{{ns}} = pnd_{{ns}} * float({{param:freq}});
float nd0_{{ns}} = iq_hash31(qnd_{{ns}});
float nd1_{{ns}} = iq_hash31(qnd_{{ns}} + vec3(17.0, 31.0, 7.0));
float nd2_{{ns}} = iq_hash31(qnd_{{ns}} + vec3(43.0, 11.0, 23.0));
vec3 {{out:p}} = {{in:p}} + float({{param:amp}}) * (vec3(nd0_{{ns}}, nd1_{{ns}}, nd2_{{ns}}) - vec3(0.5));`,
	},
	{
		id: 'domain_fbm_displace',
		label: 'FBM displace (value noise)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Warped p' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 2, min: 0.1, max: 16, step: 0.1, binding: 'uniform' },
			{ id: 'lac', label: 'Lacunarity', glslType: 'float', default: 2.02, min: 1.5, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Gain', glslType: 'float', default: 0.5, min: 0.2, max: 0.9, step: 0.02, binding: 'uniform' },
			{ id: 'amp', label: 'Amplitude', glslType: 'float', default: 0.12, min: 0, max: 0.6, step: 0.005, binding: 'uniform' },
			{ id: 'tsx', label: 'Time scroll X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsy', label: 'Time scroll Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsz', label: 'Time scroll Z', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_fbm3 / https://iquilezles.org/articles/noise/
vec3 pfb_{{ns}} = {{in:p}} + iTime * vec3(float({{param:tsx}}), float({{param:tsy}}), float({{param:tsz}}));
vec3 qfb_{{ns}} = pfb_{{ns}} * float({{param:freq}});
float f0_{{ns}} = iq_fbm3(qfb_{{ns}}, float({{param:lac}}), float({{param:gain}}));
float f1_{{ns}} = iq_fbm3(qfb_{{ns}} + vec3(31.0, 17.0, 7.0), float({{param:lac}}), float({{param:gain}}));
float f2_{{ns}} = iq_fbm3(qfb_{{ns}} + vec3(9.0, 43.0, 19.0), float({{param:lac}}), float({{param:gain}}));
vec3 {{out:p}} = {{in:p}} + float({{param:amp}}) * (vec3(f0_{{ns}}, f1_{{ns}}, f2_{{ns}}) - vec3(0.5));`,
	},
	{
		id: 'sdf_fbm_offset',
		label: 'SDF + FBM offset',
		category: 'SDF',
		inputs: [
			{ id: 'p', type: 'vec3', label: 'Position' },
			{ id: 'd', type: 'float', label: 'Distance' },
		],
		outputs: [{ id: 'd', type: 'float', label: 'Displaced d' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 3, min: 0.2, max: 20, step: 0.1, binding: 'uniform' },
			{ id: 'lac', label: 'Lacunarity', glslType: 'float', default: 2.02, min: 1.5, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Gain', glslType: 'float', default: 0.5, min: 0.2, max: 0.9, step: 0.02, binding: 'uniform' },
			{ id: 'amp', label: 'Displacement', glslType: 'float', default: 0.06, min: 0, max: 0.4, step: 0.005, binding: 'uniform' },
			{ id: 'tsx', label: 'Time scroll X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsy', label: 'Time scroll Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsz', label: 'Time scroll Z', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec3 pfo_{{ns}} = {{in:p}} + iTime * vec3(float({{param:tsx}}), float({{param:tsy}}), float({{param:tsz}}));
float fbmOff_{{ns}} = iq_fbm3(pfo_{{ns}} * float({{param:freq}}), float({{param:lac}}), float({{param:gain}}));
float {{out:d}} = {{in:d}} + float({{param:amp}}) * (fbmOff_{{ns}} - 0.5) * 2.0;`,
	},
	{
		id: 'domain_grad_fbm_displace',
		label: 'Gradient FBM displace',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Warped p' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 1.5, min: 0.1, max: 12, step: 0.1, binding: 'uniform' },
			{ id: 'lac', label: 'Lacunarity', glslType: 'float', default: 2.02, min: 1.5, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Gain', glslType: 'float', default: 0.5, min: 0.2, max: 0.9, step: 0.02, binding: 'uniform' },
			{ id: 'amp', label: 'Amplitude', glslType: 'float', default: 0.1, min: 0, max: 0.5, step: 0.005, binding: 'uniform' },
			{ id: 'tsx', label: 'Time scroll X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsy', label: 'Time scroll Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsz', label: 'Time scroll Z', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_fbm3_grad_fd / https://iquilezles.org/articles/noise/
vec3 pgf_{{ns}} = {{in:p}} + iTime * vec3(float({{param:tsx}}), float({{param:tsy}}), float({{param:tsz}}));
vec3 gdf_{{ns}} = iq_fbm3_grad_fd(pgf_{{ns}} * float({{param:freq}}), float({{param:lac}}), float({{param:gain}}), 0.015);
vec3 {{out:p}} = {{in:p}} + float({{param:amp}}) * gdf_{{ns}};`,
	},
	{
		id: 'sdf_grad_fbm_bump',
		label: 'SDF + grad FBM bump',
		category: 'SDF',
		inputs: [
			{ id: 'p', type: 'vec3', label: 'Position' },
			{ id: 'd', type: 'float', label: 'Distance' },
		],
		outputs: [{ id: 'd', type: 'float', label: 'Bumped d' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 3, min: 0.2, max: 24, step: 0.1, binding: 'uniform' },
			{ id: 'lac', label: 'Lacunarity', glslType: 'float', default: 2.02, min: 1.5, max: 3, step: 0.02, binding: 'uniform' },
			{ id: 'gain', label: 'Gain', glslType: 'float', default: 0.5, min: 0.2, max: 0.9, step: 0.02, binding: 'uniform' },
			{ id: 'amp', label: 'Bump amp', glslType: 'float', default: 0.04, min: 0, max: 0.3, step: 0.002, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
vec3 gb_{{ns}} = iq_fbm3_grad_fd({{in:p}} * float({{param:freq}}), float({{param:lac}}), float({{param:gain}}), 0.02);
float {{out:d}} = {{in:d}} + float({{param:amp}}) * length(gb_{{ns}});`,
	},
	{
		id: 'domain_voronoi_warp',
		label: 'Voronoi warp (not SDF)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Warped p' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 3, min: 0.2, max: 24, step: 0.1, binding: 'uniform' },
			{ id: 'amp', label: 'Warp amp', glslType: 'float', default: 0.08, min: 0, max: 0.4, step: 0.005, binding: 'uniform' },
			{ id: 'tsx', label: 'Time scroll X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsy', label: 'Time scroll Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsz', label: 'Time scroll Z', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'warpU', label: 'Warp angle U (× vf.x)', glslType: 'float', default: 6.28318, min: 0, max: 24, step: 0.1, binding: 'uniform' },
			{ id: 'warpV', label: 'Warp angle V (× vf.y)', glslType: 'float', default: 6.28318, min: 0, max: 24, step: 0.1, binding: 'uniform' },
			{ id: 'warpW', label: 'Warp angle W (× vf.x+vf.y)', glslType: 'float', default: 3.14159, min: 0, max: 24, step: 0.1, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — iq_voronoi3_f12 / https://iquilezles.org/articles/voronoiline/
vec3 pvf_{{ns}} = {{in:p}} + iTime * vec3(float({{param:tsx}}), float({{param:tsy}}), float({{param:tsz}}));
vec2 vf_{{ns}} = iq_voronoi3_f12(pvf_{{ns}} * float({{param:freq}}));
vec3 {{out:p}} = {{in:p}} + float({{param:amp}}) * vec3(cos(vf_{{ns}}.x * float({{param:warpU}})), sin(vf_{{ns}}.y * float({{param:warpV}})), sin((vf_{{ns}}.x + vf_{{ns}}.y) * float({{param:warpW}})));`,
	},
	{
		id: 'sdf_voronoi_edge_metric',
		label: 'Voronoi edge metric (F2−F1)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'm', type: 'float', label: 'Metric' }],
		params: [
			{ id: 'freq', label: 'Frequency', glslType: 'float', default: 4, min: 0.2, max: 32, step: 0.1, binding: 'uniform' },
			{ id: 'scale', label: 'Output scale', glslType: 'float', default: 1, min: 0.1, max: 4, step: 0.05, binding: 'uniform' },
			{ id: 'tsx', label: 'Time scroll X', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsy', label: 'Time scroll Y', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
			{ id: 'tsz', label: 'Time scroll Z', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — cellular edge / https://iquilezles.org/articles/voronoiline/
vec3 pve_{{ns}} = {{in:p}} + iTime * vec3(float({{param:tsx}}), float({{param:tsy}}), float({{param:tsz}}));
vec2 ve_{{ns}} = iq_voronoi3_f12(pve_{{ns}} * float({{param:freq}}));
float {{out:m}} = (ve_{{ns}}.y - ve_{{ns}}.x) * float({{param:scale}});`,
	},
	{
		id: 'sdf_menger_sponge',
		label: 'Menger sponge',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [
			{ id: 'mScale', label: 'Scale', glslType: 'float', default: 1, min: 0.2, max: 4, step: 0.05, binding: 'uniform' },
			{ id: 'mIters', label: 'Iterations', glslType: 'float', default: 3, min: 1, max: 5, step: 1, binding: 'literal' },
		],
		template: `// node: {{nodeId}} — https://iquilezles.org/articles/menger/
vec3 mp_{{ns}} = {{in:p}} / float({{param:mScale}});
float md_{{ns}} = length(max(abs(mp_{{ns}}) - vec3(1.0), 0.0));
float ms_{{ns}} = 1.0;
for (int mi_{{ns}} = 0; mi_{{ns}} < 5; mi_{{ns}}++) {
  if (float(mi_{{ns}}) >= float({{param:mIters}})) break;
  vec3 ma_{{ns}} = mod(mp_{{ns}} * ms_{{ns}} + 1.0, 2.0) - 1.0;
  ms_{{ns}} *= 3.0;
  vec3 mr_{{ns}} = abs(1.0 - 3.0 * abs(ma_{{ns}}));
  float mda_{{ns}} = max(mr_{{ns}}.x, max(mr_{{ns}}.y, mr_{{ns}}.z));
  md_{{ns}} = max(md_{{ns}}, (mda_{{ns}} - 1.0) / ms_{{ns}});
}
float {{out:d}} = md_{{ns}} * float({{param:mScale}});`,
	},
	{
		id: 'sdf_param_p',
		label: 'Scene position p',
		category: 'SDF',
		description:
			'Root of the scene SDF subgraph: distance nodes consume this world position. Exactly one `sdf_param_p` feeds into shapes that merge into scene_sdf_sink.',
		docUrl: 'https://iquilezles.org/articles/raymarchingdf/',
		inputs: [],
		outputs: [{ id: 'p', type: 'vec3', label: 'World p' }],
		params: [],
		template: '',
	},
	{
		id: 'scene_sdf_sink',
		label: 'Scene SDF (return)',
		category: 'SDF',
		description:
			'Returns the final scene distance; raymarch_scene calls this function. Exactly one sink per pass that uses raymarch_scene.',
		docUrl: 'https://iquilezles.org/articles/raymarchingdf/',
		inputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		outputs: [],
		params: [],
		template: `// node: {{nodeId}}\nreturn {{in:d}};`,
	},
];
