import { describe, expect, it } from 'vitest';
import type { NodeTypeDef } from './types.js';
import {
	effectiveParamNodePins,
	getExplicitParamNodePins,
	PARAM_NODE_PINS_DATA_KEY,
	sliderPinsFromNodeTypeCanvas,
} from './paramWire.js';

const stubDef: NodeTypeDef = {
	id: 'x',
	label: 'X',
	inputs: [],
	outputs: [],
	params: [
		{ id: 'r', glslType: 'float', default: 1, binding: 'uniform', min: 0, max: 2, step: 0.1 },
		{ id: 'mode', glslType: 'float', default: '0', binding: 'literal', choices: [{ value: '0', label: 'A' }] },
	],
	template: '',
	canvasParams: ['r'],
};

describe('paramNodePins', () => {
	it('falls back to canvasParams when key absent', () => {
		expect(effectiveParamNodePins({}, stubDef)).toEqual(['r']);
		expect(getExplicitParamNodePins({})).toBeUndefined();
	});

	it('uses explicit list when key present', () => {
		const d = { [PARAM_NODE_PINS_DATA_KEY]: ['r', 'extra'] };
		expect(effectiveParamNodePins(d, stubDef)).toEqual(['r', 'extra']);
		expect(getExplicitParamNodePins(d)).toEqual(['r', 'extra']);
	});

	it('empty explicit overrides canvas', () => {
		const d = { [PARAM_NODE_PINS_DATA_KEY]: [] };
		expect(effectiveParamNodePins(d, stubDef)).toEqual([]);
	});

	it('sliderPinsFromNodeTypeCanvas skips non-slider params', () => {
		const def: NodeTypeDef = {
			...stubDef,
			canvasParams: ['r', 'mode'],
		};
		expect(sliderPinsFromNodeTypeCanvas(def)).toEqual(['r']);
	});
});
