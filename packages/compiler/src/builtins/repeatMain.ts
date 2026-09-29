import type { NodeTypeDef } from '../types.js';

/** Main-graph GLSL repeat zones (v1: float carry chain only). See ARCHITECTURE.md. */
export const repeatMainNodes: NodeTypeDef[] = [
	{
		id: 'glsl_repeat_begin',
		label: 'Repeat zone (begin)',
		category: 'Custom',
		description:
			'Marks the start of a compile-time for-loop over **float** nodes wired after this port. Pair with **Repeat zone (end)** (same zone id). No texture / iChannel inside the zone — use **Pass substeps** for reaction–diffusion.',
		inputs: [],
		outputs: [{ id: 'carry', type: 'float', label: 'Carry (float)' }],
		params: [
			{
				id: 'zoneId',
				label: 'Zone id',
				glslType: 'float',
				default: 'z0',
				binding: 'literal',
			},
			{
				id: 'count',
				label: 'Repeats',
				glslType: 'float',
				default: 4,
				min: 1,
				max: 32,
				step: 1,
				binding: 'literal',
			},
			{
				id: 'indexName',
				label: 'Loop key for {{loop:…}}',
				glslType: 'float',
				default: 'ri',
				binding: 'literal',
			},
		],
		template: '// node: {{nodeId}} — repeat zone begin\nfloat {{out:carry}} = 0.0;',
	},
	{
		id: 'glsl_repeat_end',
		label: 'Repeat zone (end)',
		category: 'Custom',
		description:
			'Closes a **Repeat zone (begin)** with matching **Zone id**. Input is the tail float of the repeated chain; **out** is that value after all iterations.',
		inputs: [{ id: 'in', type: 'float', label: 'In' }],
		outputs: [{ id: 'out', type: 'float', label: 'Out' }],
		params: [
			{
				id: 'zoneId',
				label: 'Zone id',
				glslType: 'float',
				default: 'z0',
				binding: 'literal',
			},
		],
		template: '',
	},
	{
		id: 'feedback_pass_substeps',
		label: 'Pass substeps / frame',
		category: 'Buffer / feedback',
		description:
			'Run this buffer pass N times per displayed frame (full draw + ping-pong flip each). Overrides **meta.passSubsteps** for this pass. Not valid on **image**. Required for honest multi-step feedback (e.g. Gray–Scott).',
		inputs: [],
		outputs: [],
		params: [
			{
				id: 'count',
				label: 'Substeps',
				glslType: 'float',
				default: 1,
				min: 1,
				max: 32,
				step: 1,
				binding: 'literal',
			},
		],
		template: '',
	},
];
