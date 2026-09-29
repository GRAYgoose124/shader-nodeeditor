import type { GraphDocument } from '@shadertoy/compiler';
import { bakedSelectionInputPortId, bakedSelectionOutputPortId, buildRegistry, compileGraph } from '@shadertoy/compiler';
import type { Edge } from '@xyflow/svelte';
import { describe, expect, it } from 'vitest';
import { docToFlowNodesAndEdges, flowToDoc } from '$lib/flowDoc.js';
import { tryBakeSelectionToCustomNode } from './bakeSelectionToCustomNode.js';

function colorChainDoc(): GraphDocument {
	return {
		version: 1,
		meta: { name: 'test-bake-selection' },
		nodes: [
			{ id: 't1', typeId: 'time', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			{ id: 'c1', typeId: 'sin_time_color', pass: 'image', position: { x: 10, y: 0 }, data: {} },
			{
				id: 'v1',
				typeId: 'vec4_from_vec3',
				pass: 'image',
				position: { x: 20, y: 0 },
				data: { a: 1 },
			},
			{ id: 'o1', typeId: 'frag_output', pass: 'image', position: { x: 30, y: 0 }, data: {} },
		],
		edges: [
			{ id: 'e1', source: 't1', sourceHandle: 't', target: 'c1', targetHandle: 't' },
			{ id: 'e2', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
			{ id: 'e3', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
		],
	};
}

describe('tryBakeSelectionToCustomNode', () => {
	it('replaces selection with one custom node and preserves boundary wiring', () => {
		const doc = colorChainDoc();
		const cr = compileGraph(doc);
		expect(cr.errors).toEqual([]);
		const registry = buildRegistry(doc.customNodeTypes ?? []);
		const { nodes, edges } = docToFlowNodesAndEdges(doc);

		const r = tryBakeSelectionToCustomNode({
			nodes,
			edges,
			selectedNodeIds: ['c1', 'v1'],
			activePass: 'image',
			compileResult: cr,
			registry,
			graphMetaName: doc.meta.name ?? null,
		});
		expect(r.ok).toBe(true);
		if (!r.ok) return;

		const shaderIds = r.nodes.filter((n) => n.type === 'shader').map((n) => n.id);
		expect(shaderIds).toContain('t1');
		expect(shaderIds).toContain('o1');
		expect(shaderIds).toContain(r.bakedNodeId);
		expect(shaderIds).not.toContain('c1');
		expect(shaderIds).not.toContain('v1');

		const inPid = bakedSelectionInputPortId('c1', 't');
		const outPid = bakedSelectionOutputPortId('v1', 'col');
		expect(r.def.inputs.map((p) => p.id)).toEqual([inPid]);
		expect(r.def.outputs.map((p) => p.id)).toEqual([outPid]);

		const eIn = r.edges.find((e: Edge) => e.source === 't1' && e.target === r.bakedNodeId) as Edge | undefined;
		expect(eIn?.sourceHandle).toBe('t');
		expect(eIn?.targetHandle).toBe(inPid);

		const eOut = r.edges.find((e: Edge) => e.source === r.bakedNodeId && e.target === 'o1') as Edge | undefined;
		expect(eOut?.sourceHandle).toBe(outPid);
		expect(eOut?.targetHandle).toBe('color');

		const doc2 = flowToDoc(r.nodes, r.edges, doc.meta, [r.def]);
		const cr2 = compileGraph(doc2);
		expect(cr2.errors).toEqual([]);
	});
});
