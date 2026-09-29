import type { NodeTypeDef } from '../../types.js';

export const sdfOpsNodes: NodeTypeDef[] = [
	{
		id: 'op_round_d',
		label: 'Round SDF',
		category: 'SDF',
		inputs: [{ id: 'd', type: 'float' }],
		outputs: [{ id: 'd', type: 'float' }],
		params: [{ id: 'rad', label: 'Round radius', glslType: 'float', default: 0.05, min: 0.001, max: 1, step: 0.005, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = {{in:d}} - float({{param:rad}});`,
	},
	{
		id: 'op_onion_d',
		label: 'Onion shell',
		category: 'SDF',
		inputs: [{ id: 'd', type: 'float' }],
		outputs: [{ id: 'd', type: 'float' }],
		params: [{ id: 'th', label: 'Thickness', glslType: 'float', default: 0.04, min: 0.005, max: 1, step: 0.005, binding: 'uniform' }],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = abs({{in:d}}) - float({{param:th}});`,
	},
];

