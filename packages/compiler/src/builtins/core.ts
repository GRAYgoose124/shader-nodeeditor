import type { NodeTypeDef } from '../types.js';

import { coreColorNodes } from './core/color.js';
import { coreIoNodes } from './core/io.js';
import { coreMathNodes } from './core/math.js';

export const coreNodes: NodeTypeDef[] = [
	...coreIoNodes,
	...coreMathNodes,
	...coreColorNodes,
	{
		id: 'sample_channel',
		label: 'Sample iChannel',
		category: 'Core',
		description:
			'Texture lookup from a linked buffer pass (`texture(iChannelK, uv)`). Configure buffers in `meta.iChannels` for this pass. Temporal feedback: map bufB ch0→bufB (ping-pong) and ch1→bufA, then two `sample_channel` + `mix_vec4` (history vs fresh).',
		inputs: [{ id: 'uv', type: 'vec2' }],
		outputs: [{ id: 'rgba', type: 'vec4' }],
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
		template: `// node: {{nodeId}}\nvec4 {{out:rgba}} = texture({{iChannel:param:channel}}, {{in:uv}});`,
	},
	{
		id: 'fresnel_schlick',
		label: 'Fresnel Schlick (float F₀)',
		category: 'Core',
		inputs: [{ id: 'vdh', type: 'float', label: 'V·H clamped' }],
		outputs: [{ id: 'f', type: 'float', label: 'Fresnel' }],
		params: [{ id: 'f0', label: 'F₀ (dielectric)', glslType: 'float', default: 0.04, min: 0, max: 1, step: 0.005, binding: 'uniform' }],
		template: `// node: {{nodeId}} — https://iquilezles.org/articles/outlighting/
float vdh_{{ns}} = clamp({{in:vdh}}, 0.0, 1.0);
float {{out:f}} = float({{param:f0}}) + (1.0 - float({{param:f0}})) * pow(1.0 - vdh_{{ns}}, 5.0);`,
	},
	{
		id: 'fresnel_schlick_rgb',
		label: 'Fresnel Schlick (vec3 F₀)',
		category: 'Core',
		inputs: [{ id: 'vdh', type: 'float', label: 'V·H clamped' }],
		outputs: [{ id: 'f', type: 'vec3', label: 'Fresnel RGB' }],
		params: [
			{ id: 'f0r', label: 'F₀ R', glslType: 'float', default: 0.92, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'f0g', label: 'F₀ G', glslType: 'float', default: 0.88, min: 0, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'f0b', label: 'F₀ B', glslType: 'float', default: 0.78, min: 0, max: 1, step: 0.01, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — https://iquilezles.org/articles/outlighting/
float vdhR_{{ns}} = clamp({{in:vdh}}, 0.0, 1.0);
vec3 F0_{{ns}} = vec3(float({{param:f0r}}), float({{param:f0g}}), float({{param:f0b}}));
vec3 {{out:f}} = F0_{{ns}} + (1.0 - F0_{{ns}}) * pow(1.0 - vdhR_{{ns}}, 5.0);`,
	},
	{
		id: 'metal_f0_rgb',
		label: 'Metal F₀ from albedo',
		category: 'Core',
		inputs: [{ id: 'albedo', type: 'vec3', label: 'Albedo' }],
		outputs: [{ id: 'f0', type: 'vec3', label: 'F₀' }],
		params: [{ id: 'metallic', label: 'Metallic', glslType: 'float', default: 0, min: 0, max: 1, step: 0.02, binding: 'uniform' }],
		template: `// node: {{nodeId}} — dielectric vs metal F₀ / https://iquilezles.org/articles/outlighting/
vec3 {{out:f0}} = mix(vec3(0.04), {{in:albedo}}, float({{param:metallic}}));`,
	},
	{
		id: 'rim_intensity',
		label: 'Rim intensity',
		category: 'Core',
		inputs: [
			{ id: 'n', type: 'vec3', label: 'Normal' },
			{ id: 'v', type: 'vec3', label: 'View' },
		],
		outputs: [{ id: 'rim', type: 'float', label: 'Rim' }],
		params: [
			{ id: 'pow', label: 'Exponent', glslType: 'float', default: 3, min: 0.5, max: 12, step: 0.1, binding: 'uniform' },
			{ id: 'str', label: 'Strength', glslType: 'float', default: 0.35, min: 0, max: 2, step: 0.02, binding: 'uniform' },
		],
		template: `// node: {{nodeId}} — rim from N·V / https://iquilezles.org/articles/outlighting/
float ndv_{{ns}} = max(dot(normalize({{in:n}}), normalize({{in:v}})), 0.0);
float {{out:rim}} = float({{param:str}}) * pow(1.0 - ndv_{{ns}}, float({{param:pow}}));`,
	},
	{
		id: 'vec3_add',
		label: 'Add vec3',
		category: 'Core',
		inputs: [
			{ id: 'a', type: 'vec3' },
			{ id: 'b', type: 'vec3' },
		],
		outputs: [{ id: 'out', type: 'vec3' }],
		params: [],
		template: `// node: {{nodeId}}\nvec3 {{out:out}} = {{in:a}} + {{in:b}};`,
	},
	{
		id: 'vec3_add3',
		label: 'Sum 3× vec3',
		category: 'Core',
		inputs: [
			{ id: 'a', type: 'vec3' },
			{ id: 'b', type: 'vec3' },
			{ id: 'c', type: 'vec3' },
		],
		outputs: [{ id: 'out', type: 'vec3' }],
		params: [],
		template: `// node: {{nodeId}} — combine lighting terms / https://iquilezles.org/articles/palettes/
vec3 {{out:out}} = {{in:a}} + {{in:b}} + {{in:c}};`,
	},
];
