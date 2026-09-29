import type { Edge, Node } from '@xyflow/svelte';
import { describe, expect, it } from 'vitest';
import type { ShaderNodeData } from '$lib/flowDoc.js';
import { alignSelectedShaderNodes } from './flowOps.js';
import { estimateShaderFlowNodeHeight } from '$lib/shaderNodeLayout.js';

function shaderNode(id: string, typeId: string, x: number, y: number): Node<ShaderNodeData, 'shader'> {
	return {
		id,
		type: 'shader',
		position: { x, y },
		data: {
			graphNode: {
				id,
				typeId,
				pass: 'image',
				position: { x, y },
				data: {},
			},
		},
	};
}

describe('alignSelectedShaderNodes', () => {
	it('places child to the right and aligns vertical centers with a single parent', () => {
		const a = shaderNode('a', 'uv', 0, 100);
		const b = shaderNode('b', 'frag_output', 400, 0);
		const edges: Edge[] = [
			{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'uv', targetHandle: 'uv' } as Edge,
		];
		const out = alignSelectedShaderNodes([a, b], edges, ['a', 'b'], []);
		const outA = out.find((n) => n.id === 'a') as Node<ShaderNodeData, 'shader'>;
		const outB = out.find((n) => n.id === 'b') as Node<ShaderNodeData, 'shader'>;
		expect(outB.position.x).toBeGreaterThan(outA.position.x);
		const ha = estimateShaderFlowNodeHeight(outA, []);
		const hb = estimateShaderFlowNodeHeight(outB, []);
		const ca = outA.position.y + ha * 0.5;
		const cb = outB.position.y + hb * 0.5;
		expect(Math.abs(cb - ca)).toBeLessThan(24);
	});

	it('does not row-align a merge node with both unrelated parents', () => {
		const a = shaderNode('a', 'uv', 0, 0);
		const c = shaderNode('c', 'uv', 0, 240);
		const b = shaderNode('b', 'frag_output', 0, 0);
		const edges: Edge[] = [
			{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'uv', targetHandle: 'uv' } as Edge,
			{ id: 'e2', source: 'c', target: 'b', sourceHandle: 'uv', targetHandle: 'uv' } as Edge,
		];
		const out = alignSelectedShaderNodes([a, b, c], edges, ['a', 'b', 'c'], []);
		const outA = out.find((n) => n.id === 'a') as Node<ShaderNodeData, 'shader'>;
		const outB = out.find((n) => n.id === 'b') as Node<ShaderNodeData, 'shader'>;
		const outC = out.find((n) => n.id === 'c') as Node<ShaderNodeData, 'shader'>;
		const sameAllThreeY =
			outA.position.y === outB.position.y && outB.position.y === outC.position.y;
		expect(sameAllThreeY).toBe(false);
	});
});
