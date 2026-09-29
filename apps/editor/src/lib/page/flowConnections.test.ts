import type { NodeTypeDef } from '@shadertoy/compiler';
import type { Node } from '@xyflow/svelte';
import { describe, expect, it } from 'vitest';
import type { ShaderNodeData } from '$lib/flowDoc.js';
import { isValidShaderConnection } from './flowConnections.js';

const tmpl = '//';

function def(
	id: string,
	io: { inputs: NodeTypeDef['inputs']; outputs: NodeTypeDef['outputs'] },
): NodeTypeDef {
	return {
		id,
		label: id,
		inputs: io.inputs,
		outputs: io.outputs,
		params: [],
		template: tmpl,
	};
}

const registry = new Map<string, NodeTypeDef>([
	['src_f', def('src_f', { inputs: [], outputs: [{ id: 'out', type: 'float' }] })],
	['dst_f', def('dst_f', { inputs: [{ id: 'in', type: 'float' }], outputs: [] })],
	['dst_v3', def('dst_v3', { inputs: [{ id: 'in', type: 'vec3' }], outputs: [] })],
]);

function shaderNode(
	id: string,
	typeId: string,
	pass: 'image' | 'bufA',
): Node<ShaderNodeData, 'shader'> {
	return {
		id,
		type: 'shader',
		position: { x: 0, y: 0 },
		data: {
			graphNode: {
				id,
				typeId,
				pass,
				position: { x: 0, y: 0 },
				data: {},
			},
		},
	};
}

describe('isValidShaderConnection', () => {
	it('allows matching float port types on the same pass', () => {
		const nodes = [shaderNode('a', 'src_f', 'image'), shaderNode('b', 'dst_f', 'image')];
		expect(
			isValidShaderConnection(
				{ source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'in' },
				nodes,
				registry,
			),
		).toBe(true);
	});

	it('rejects different passes', () => {
		const nodes = [shaderNode('a', 'src_f', 'image'), shaderNode('b', 'dst_f', 'bufA')];
		expect(
			isValidShaderConnection(
				{ source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'in' },
				nodes,
				registry,
			),
		).toBe(false);
	});

	it('rejects port type mismatch', () => {
		const nodes = [shaderNode('a', 'src_f', 'image'), shaderNode('b', 'dst_v3', 'image')];
		expect(
			isValidShaderConnection(
				{ source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'in' },
				nodes,
				registry,
			),
		).toBe(false);
	});

	it('rejects unknown handles', () => {
		const nodes = [shaderNode('a', 'src_f', 'image'), shaderNode('b', 'dst_f', 'image')];
		expect(
			isValidShaderConnection(
				{ source: 'a', target: 'b', sourceHandle: 'nope', targetHandle: 'in' },
				nodes,
				registry,
			),
		).toBe(false);
	});
});
