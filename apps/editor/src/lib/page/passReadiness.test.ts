import type { GraphNode } from '@shadertoy/compiler';
import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/svelte';
import { computePassReadiness } from './passReadiness.js';

function gn(id: string, typeId: string): GraphNode {
	return { id, typeId, pass: 'image', position: { x: 0, y: 0 }, data: {} };
}

describe('computePassReadiness', () => {
	it('detects frag output wired to color', () => {
		const nodes = [gn('out1', 'frag_output'), gn('src', 'sdf_sphere')];
		const edges: Edge[] = [
			{
				id: 'e1',
				source: 'src',
				target: 'out1',
				sourceHandle: 'd',
				targetHandle: 'color',
				type: 'shaderWire',
			} as Edge,
		];
		const r = computePassReadiness(nodes, edges, 0);
		expect(r.fragOut).toBe(true);
		expect(r.fragWired).toBe(true);
		expect(r.hasRaymarch).toBe(false);
		expect(r.raymarchOk).toBe(true);
		expect(r.compileOk).toBe(true);
	});

	it('requires sink when raymarch is present', () => {
		const nodes = [gn('m', 'raymarch_scene')];
		const r = computePassReadiness(nodes, [], 0);
		expect(r.hasRaymarch).toBe(true);
		expect(r.raymarchOk).toBe(false);
	});

	it('marks compileOk false when errors > 0', () => {
		const r = computePassReadiness([], [], 2);
		expect(r.compileOk).toBe(false);
	});
});
