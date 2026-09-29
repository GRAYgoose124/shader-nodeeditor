import type { NodeTypeDef } from '../../types.js';

export const feedback2dTexelNodes: NodeTypeDef[] = [
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
		description: '`texelFetch(iChannelK, ivec2(pixel.xy), 0)`. Use with `frag_coord_xy` or wrapped integer pixel coords.',
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
			{ id: 'wCardinal', label: 'Weight cardinal', glslType: 'float', default: 0.2, min: -2, max: 2, step: 0.01, binding: 'uniform' },
			{ id: 'wDiagonal', label: 'Weight diagonal', glslType: 'float', default: 0.05, min: -2, max: 2, step: 0.01, binding: 'uniform' },
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
];

