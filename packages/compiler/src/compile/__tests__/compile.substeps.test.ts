import { describe, expect, it } from 'vitest';
import { compileGraph } from '../graph.js';
import type { GraphDocument } from '../../types.js';

describe('pass substeps manifest', () => {
	it('defaults substeps to 1 for buffer passes', () => {
		const pass = 'bufA' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: { name: 't', iChannels: { bufA: { 0: 'bufA' } } },
			nodes: [
				{ id: 'fc', typeId: 'frag_coord_xy', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'tf', typeId: 'sample_channel_texel', pass, position: { x: 0, y: 0 }, data: { channel: 0 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'fc', sourceHandle: 'xy', target: 'tf', targetHandle: 'pixel' },
				{ id: 'e2', source: 'tf', sourceHandle: 'rgba', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.manifest.passes.find((p) => p.id === 'bufA')?.substeps).toBe(1);
	});

	it('sets substeps from meta.passSubsteps', () => {
		const pass = 'bufA' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: { name: 't', iChannels: { bufA: { 0: 'bufA' } }, passSubsteps: { bufA: 4 } },
			nodes: [
				{ id: 'fc', typeId: 'frag_coord_xy', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'tf', typeId: 'sample_channel_texel', pass, position: { x: 0, y: 0 }, data: { channel: 0 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'fc', sourceHandle: 'xy', target: 'tf', targetHandle: 'pixel' },
				{ id: 'e2', source: 'tf', sourceHandle: 'rgba', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.manifest.passes.find((p) => p.id === 'bufA')?.substeps).toBe(4);
	});

	it('feedback_pass_substeps overrides meta for that pass', () => {
		const pass = 'bufA' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: { name: 't', iChannels: { bufA: { 0: 'bufA' } }, passSubsteps: { bufA: 2 } },
			nodes: [
				{ id: 'sub', typeId: 'feedback_pass_substeps', pass, position: { x: 0, y: 0 }, data: { count: 7 } },
				{ id: 'fc', typeId: 'frag_coord_xy', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'tf', typeId: 'sample_channel_texel', pass, position: { x: 0, y: 0 }, data: { channel: 0 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'fc', sourceHandle: 'xy', target: 'tf', targetHandle: 'pixel' },
				{ id: 'e2', source: 'tf', sourceHandle: 'rgba', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.manifest.passes.find((p) => p.id === 'bufA')?.substeps).toBe(7);
	});

	it('image pass substeps stay 1', () => {
		const doc: GraphDocument = {
			version: 1,
			meta: { name: 't', passSubsteps: { image: 9 } as Record<string, number> },
			nodes: [
				{ id: 'c4', typeId: 'vec4_const', pass: 'image', position: { x: 0, y: 0 }, data: { r: 0, g: 0, b: 0, a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			],
			edges: [{ id: 'e1', source: 'c4', sourceHandle: 'rgba', target: 'o1', targetHandle: 'color' }],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.manifest.passes.find((p) => p.id === 'image')?.substeps).toBe(1);
	});
});
