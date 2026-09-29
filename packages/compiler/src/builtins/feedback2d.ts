import type { NodeTypeDef } from '../types.js';

/**
 * Pixel-accurate buffer ops: `texelFetch`, toroidal/clamp 3×3 stencils, vec4 combine — for reaction–diffusion,
 * CA, separable-ish neighbor kernels without `texture()` bilinear shifts.
 */
export const feedback2dNodes: NodeTypeDef[] = [
	{
		id: 'frag_coord_xy',
		label: 'Fragment pixel (xy)',
		category: 'Buffer / feedback',
		description:
			'`gl_FragCoord.xy` — integer-ish pixel coordinates for `texelFetch` / neighbor kernels (matches Shadertoy `fragCoord.xy`).',
		inputs: [],
		outputs: [{ id: 'xy', type: 'vec2', label: 'Pixel xy' }],
		params: [],
		template: `// node: {{nodeId}}\nvec2 {{out:xy}} = gl_FragCoord.xy;`,
	},
	{
		id: 'sample_channel_texel',
		label: 'Texel fetch iChannel',
		category: 'Buffer / feedback',
		description:
			'`texelFetch(iChannelK, ivec2(pixel.xy), 0)`. Use with `frag_coord_xy` or wrapped integer pixel coords.',
		inputs: [{ id: 'pixel', type: 'vec2', label: 'Pixel (→ ivec2)' }],
		outputs: [{ id: 'rgba', type: 'vec4', label: 'RGBA' }],
		params: [
			{
				id: 'channel',
				label: 'Channel 0–3',
				glslType: 'float',
				default: 0,
				min: 0,
				max: 3,
				step: 1,
				binding: 'literal',
			},
		],
		template: `// node: {{nodeId}}\nvec4 {{out:rgba}} = texelFetch({{iChannel:param:channel}}, ivec2({{in:pixel}}), 0);`,
	},
	{
		id: 'conv3x3_texel',
		label: '3×3 texel convolution',
		category: 'Buffer / feedback',
		description:
			'9-tap stencil with weights: center, 4 cardinals (|i−j|==1), 4 diagonals. Toroidal wrap matches classic Shadertoy `if/mod` screens; **clamp** clamps to the framebuffer.',
		inputs: [{ id: 'pixel', type: 'vec2', label: 'Base pixel (e.g. gl_FragCoord.xy)' }],
		outputs: [{ id: 'out', type: 'vec4', label: 'Sum' }],
		params: [
			{
				id: 'channel',
				label: 'Channel 0–3',
				glslType: 'float',
				default: 0,
				min: 0,
				max: 3,
				step: 1,
				binding: 'literal',
			},
			{
				id: 'wrapMode',
				label: 'Edge wrap',
				glslType: 'float',
				default: '0',
				binding: 'literal',
				choices: [
					{ value: '0', label: 'Torus (repeat)' },
					{ value: '1', label: 'Clamp' },
				],
			},
			{ id: 'wCenter', label: 'Weight center', glslType: 'float', default: -1, min: -4, max: 4, step: 0.01, binding: 'uniform' },
			{
				id: 'wCardinal',
				label: 'Weight cardinal',
				glslType: 'float',
				default: 0.2,
				min: -2,
				max: 2,
				step: 0.01,
				binding: 'uniform',
			},
			{
				id: 'wDiagonal',
				label: 'Weight diagonal',
				glslType: 'float',
				default: 0.05,
				min: -2,
				max: 2,
				step: 0.01,
				binding: 'uniform',
			},
		],
		template: `// node: {{nodeId}} — 3×3 texel stencil (center / cardinal / diagonal weights)
vec2 res3_{{ns}} = iResolution.xy;
vec2 pos3_{{ns}} = {{in:pixel}};
vec4 acc3_{{ns}} = vec4(0.0);
for (int j3_{{ns}} = -1; j3_{{ns}} <= 1; j3_{{ns}}++) {
  for (int i3_{{ns}} = -1; i3_{{ns}} <= 1; i3_{{ns}}++) {
    float wt3_{{ns}} = (i3_{{ns}} == 0 && j3_{{ns}} == 0)
      ? float({{param:wCenter}})
      : ((abs(i3_{{ns}} - j3_{{ns}}) == 1) ? float({{param:wCardinal}}) : float({{param:wDiagonal}}));
    vec2 np3_{{ns}} = pos3_{{ns}} + vec2(float(i3_{{ns}}), float(j3_{{ns}}));
    ivec2 ip3_{{ns}};
    if (float({{param:wrapMode}}) < 0.5) {
      vec2 wr3_{{ns}} = np3_{{ns}};
      wr3_{{ns}}.x = np3_{{ns}}.x > res3_{{ns}}.x ? mod(np3_{{ns}}.x, res3_{{ns}}.x) : (np3_{{ns}}.x < 0.0 ? res3_{{ns}}.x + np3_{{ns}}.x : np3_{{ns}}.x);
      wr3_{{ns}}.y = np3_{{ns}}.y > res3_{{ns}}.y ? mod(np3_{{ns}}.y, res3_{{ns}}.y) : (np3_{{ns}}.y < 0.0 ? res3_{{ns}}.y + np3_{{ns}}.y : np3_{{ns}}.y);
      ip3_{{ns}} = ivec2(wr3_{{ns}});
    } else {
      ip3_{{ns}} = clamp(ivec2(np3_{{ns}}), ivec2(0), max(ivec2(res3_{{ns}}) - ivec2(1), ivec2(0)));
    }
    acc3_{{ns}} += wt3_{{ns}} * texelFetch({{iChannel:param:channel}}, ip3_{{ns}}, 0);
  }
}
vec4 {{out:out}} = acc3_{{ns}};`,
	},
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
	{
		id: 'vec4_const',
		label: 'RGBA constant',
		category: 'Buffer / feedback',
		inputs: [],
		outputs: [{ id: 'rgba', type: 'vec4', label: 'RGBA' }],
		params: [
			{ id: 'r', label: 'R', glslType: 'float', default: 1, min: -4, max: 4, step: 0.01, binding: 'uniform' },
			{ id: 'g', label: 'G', glslType: 'float', default: 1, min: -4, max: 4, step: 0.01, binding: 'uniform' },
			{ id: 'b', label: 'B', glslType: 'float', default: 1, min: -4, max: 4, step: 0.01, binding: 'uniform' },
			{ id: 'a', label: 'A', glslType: 'float', default: 1, min: -4, max: 4, step: 0.01, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}\nvec4 {{out:rgba}} = vec4(float({{param:r}}), float({{param:g}}), float({{param:b}}), float({{param:a}}));`,
	},
	{
		id: 'vec4_channels',
		label: 'Vec4 → floats',
		category: 'Buffer / feedback',
		description: 'Split `.x` `.y` `.z` `.w` into scalar outputs (no swizzle).',
		inputs: [{ id: 'rgba', type: 'vec4', label: 'RGBA' }],
		outputs: [
			{ id: 'x', type: 'float', label: 'x' },
			{ id: 'y', type: 'float', label: 'y' },
			{ id: 'z', type: 'float', label: 'z' },
			{ id: 'w', type: 'float', label: 'w' },
		],
		params: [],
		template: `// node: {{nodeId}}
float {{out:x}} = {{in:rgba}}.x;
float {{out:y}} = {{in:rgba}}.y;
float {{out:z}} = {{in:rgba}}.z;
float {{out:w}} = {{in:rgba}}.w;`,
	},
	{
		id: 'vec4_from_xyz_w',
		label: 'Vec4 (xyz + w)',
		category: 'Buffer / feedback',
		description: '`vec4(x, y, z, w)` with literal/composite **w** (default 0).',
		inputs: [
			{ id: 'x', type: 'float', label: 'x' },
			{ id: 'y', type: 'float', label: 'y' },
			{ id: 'z', type: 'float', label: 'z' },
		],
		outputs: [{ id: 'rgba', type: 'vec4', label: 'RGBA' }],
		params: [{ id: 'w', label: 'w', glslType: 'float', default: 0, min: -4, max: 4, step: 0.01, binding: 'literal' }],
		template: `// node: {{nodeId}}\nvec4 {{out:rgba}} = vec4({{in:x}}, {{in:y}}, {{in:z}}, float({{param:w}}));`,
	},
	{
		id: 'vec4_swizzle',
		label: 'Vec4 swizzle',
		category: 'Buffer / feedback',
		description: 'Compile-time swizzle on **v** (`.xyzw`, `.zxyw`, …).',
		inputs: [{ id: 'v', type: 'vec4', label: 'v' }],
		outputs: [{ id: 'out', type: 'vec4', label: 'Swizzled' }],
		params: [
			{
				id: 'pattern',
				label: 'Swizzle',
				glslType: 'float',
				default: 'xyzw',
				binding: 'literal',
				choices: [
					{ value: 'xyzw', label: 'xyzw' },
					{ value: 'zxyw', label: 'zxyw' },
					{ value: 'yzxw', label: 'yzxw' },
				],
			},
		],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = {{in:v}}.{{param:pattern}};`,
	},
	{
		id: 'vec4_add',
		label: 'Add vec4',
		category: 'Buffer / feedback',
		inputs: [
			{ id: 'a', type: 'vec4', label: 'a' },
			{ id: 'b', type: 'vec4', label: 'b' },
		],
		outputs: [{ id: 'out', type: 'vec4', label: 'a + b' }],
		params: [],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = {{in:a}} + {{in:b}};`,
	},
	{
		id: 'vec4_mul',
		label: 'Multiply vec4 (×)',
		category: 'Buffer / feedback',
		description: 'Component-wise multiply.',
		inputs: [
			{ id: 'a', type: 'vec4', label: 'a' },
			{ id: 'b', type: 'vec4', label: 'b' },
		],
		outputs: [{ id: 'out', type: 'vec4', label: 'a * b' }],
		params: [],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = {{in:a}} * {{in:b}};`,
	},
	{
		id: 'vec4_scale',
		label: 'Scale vec4',
		category: 'Buffer / feedback',
		inputs: [{ id: 'a', type: 'vec4', label: 'a' }],
		outputs: [{ id: 'out', type: 'vec4', label: 'a * s' }],
		params: [{ id: 's', label: 'Scale', glslType: 'float', default: 1, min: -4, max: 4, step: 0.001, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = {{in:a}} * float({{param:s}});`,
	},
	{
		id: 'vec4_mul_float',
		label: 'vec4 × float',
		category: 'Buffer / feedback',
		inputs: [
			{ id: 'a', type: 'vec4', label: 'a' },
			{ id: 's', type: 'float', label: 's' },
		],
		outputs: [{ id: 'out', type: 'vec4', label: 'a * s' }],
		params: [],
		template: `// node: {{nodeId}}\nvec4 {{out:out}} = {{in:a}} * {{in:s}};`,
	},
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
