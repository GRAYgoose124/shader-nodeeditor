import type { NodeTypeDef } from '../../types.js';

export const sdfNodesMainInline: NodeTypeDef[] = [
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
		canvasParams: ['k', 'timeScale'],
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
		canvasParams: ['k', 'timeScale'],
		description:
			'Inigo Quilez cheap bend (`opCheapBend`): phase along the axis warps XY / YZ / ZX respectively—not the same as Twist (helical). Use Twist for perpendicular-plane rotation.',
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
					{ value: '0', label: 'Along X (warp XY)' },
					{ value: '1', label: 'Along Y (warp YZ)' },
					{ value: '2', label: 'Along Z (warp ZX)' },
				],
			},
			{ id: 'k', label: 'Bend k', glslType: 'float', default: 1, min: -8, max: 8, step: 0.1, binding: 'uniform' },
			{ id: 'timeScale', label: 'iTime scale', glslType: 'float', default: 0, min: -4, max: 4, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — opCheapBend / https://iquilezles.org/articles/distfunctions/
float bax_{{ns}} = float({{param:axis}});
float bd_{{ns}} = float({{param:k}}) * (bax_{{ns}} < 0.5 ? {{in:p}}.x : (bax_{{ns}} < 1.5 ? {{in:p}}.y : {{in:p}}.z)) + iTime * float({{param:timeScale}});
float cb_{{ns}} = cos(bd_{{ns}});
float sb_{{ns}} = sin(bd_{{ns}});
vec3 {{out:p}} = bax_{{ns}} < 0.5
  ? vec3(cb_{{ns}} * {{in:p}}.x - sb_{{ns}} * {{in:p}}.y, sb_{{ns}} * {{in:p}}.x + cb_{{ns}} * {{in:p}}.y, {{in:p}}.z)
  : (bax_{{ns}} < 1.5
  ? vec3({{in:p}}.x, cb_{{ns}} * {{in:p}}.y - sb_{{ns}} * {{in:p}}.z, sb_{{ns}} * {{in:p}}.y + cb_{{ns}} * {{in:p}}.z)
  : vec3(cb_{{ns}} * {{in:p}}.x - sb_{{ns}} * {{in:p}}.z, {{in:p}}.y, sb_{{ns}} * {{in:p}}.x + cb_{{ns}} * {{in:p}}.z));`,
	},
	{
		id: 'domain_bend_x',
		label: 'Bend along X (legacy)',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Bent p' }],
		params: [{ id: 'k', label: 'Bend k', glslType: 'float', default: 1, min: -8, max: 8, step: 0.1, binding: 'uniform' }],
		template: `// node: {{nodeId}} — opCheapBend phase x / https://iquilezles.org/articles/distfunctions/
float cb_{{ns}} = cos(float({{param:k}}) * {{in:p}}.x);
float sb_{{ns}} = sin(float({{param:k}}) * {{in:p}}.x);
vec3 {{out:p}} = vec3(cb_{{ns}} * {{in:p}}.x - sb_{{ns}} * {{in:p}}.y, sb_{{ns}} * {{in:p}}.x + cb_{{ns}} * {{in:p}}.y, {{in:p}}.z);`,
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
		id: 'domain_call_exported_vec3',
		label: 'Call exported frame (vec3)',
		category: 'SDF',
		description:
			'Applies a `vec3(vec3)` function emitted from an editor frame with **exportVec3Fn** set (see graph meta → frame). **fnBase** must match the sanitized export name.',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'p', type: 'vec3', label: 'Transformed p' }],
		params: [
			{
				id: 'fnBase',
				label: 'Export name',
				glslType: 'float',
				default: 'my_xform',
				binding: 'literal',
			},
		],
		template: '// expanded in compiler for domain_call_exported_vec3',
	},
	{
		id: 'domain_call_exported_sdf',
		label: 'Call exported frame (SDF)',
		category: 'SDF',
		description:
			'Samples a `float(vec3)` distance function emitted from an editor frame with **exportSdfFn** set. **fnBase** must match the sanitized export name.',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [
			{
				id: 'fnBase',
				label: 'Export name',
				glslType: 'float',
				default: 'my_sdf',
				binding: 'literal',
			},
		],
		template: '// expanded in compiler for domain_call_exported_sdf',
	},
	{
		id: 'sdf_repeat_exported_min',
		label: 'Repeat exported SDF (min)',
		category: 'SDF',
		description:
			'Finite `min` over `fnBase(p + i * spacing * axis)` for i = 0 … count−1. **fnBase** must match a frame **exportSdfFn** (same pass). Count is a compile-time literal (max 16).',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [
			{
				id: 'fnBase',
				label: 'Export name',
				glslType: 'float',
				default: 'my_sdf',
				binding: 'literal',
			},
			{
				id: 'count',
				label: 'Copies',
				glslType: 'float',
				default: 4,
				min: 1,
				max: 16,
				step: 1,
				binding: 'literal',
			},
			{
				id: 'axis',
				label: 'Axis',
				glslType: 'float',
				default: 'x',
				binding: 'literal',
				choices: [
					{ value: 'x', label: 'X' },
					{ value: 'y', label: 'Y' },
					{ value: 'z', label: 'Z' },
				],
			},
			{
				id: 'spacing',
				label: 'Spacing',
				glslType: 'float',
				default: 0.25,
				min: -20,
				max: 20,
				step: 0.01,
				binding: 'uniform',
			},
		],
		template: '// expanded in compiler for sdf_repeat_exported_min',
	},
];
