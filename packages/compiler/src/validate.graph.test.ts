import { describe, expect, it } from 'vitest';
import { buildRegistry } from './registry.js';
import { validateGraph } from './validate.js';
import type { GraphDocument } from './types.js';

describe('validateGraph (unit)', () => {
	it('rejects unknown node type', () => {
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [{ id: 'n1', typeId: 'definitely_not_real', pass: 'image', position: { x: 0, y: 0 }, data: {} }],
			edges: [],
		};
		const r = validateGraph(doc, buildRegistry([]));
		expect(r.ok).toBe(false);
		expect(r.errors.join('\n')).toContain('Unknown node type');
	});

	it('requires exactly one frag_output per pass', () => {
		const doc0: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [{ id: 't1', typeId: 'time', pass: 'image', position: { x: 0, y: 0 }, data: {} }],
			edges: [],
		};
		const r0 = validateGraph(doc0, buildRegistry([]));
		expect(r0.ok).toBe(false);
		expect(r0.errors.some((e) => e.includes('need exactly one Fragment output'))).toBe(true);

		const doc2: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'o1', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{ id: 'o2', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			],
			edges: [],
		};
		const r2 = validateGraph(doc2, buildRegistry([]));
		expect(r2.ok).toBe(false);
		expect(r2.errors.some((e) => e.includes('need exactly one Fragment output'))).toBe(true);
	});

	it('requires raymarch_scene and scene_sdf_sink to appear together', () => {
		const pass = 'image' as const;

		const docNoSink: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const rNoSink = validateGraph(docNoSink, buildRegistry([]));
		expect(rNoSink.ok).toBe(false);
		expect(rNoSink.errors.join('\n')).toContain('requires exactly one "Scene SDF (return)" node');

		const docNoMarch: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'ea', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'eb', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const rNoMarch = validateGraph(docNoMarch, buildRegistry([]));
		expect(rNoMarch.ok).toBe(false);
		expect(rNoMarch.errors.join('\n')).toContain('requires a "Raymarch scene SDF" node');
	});

	it('rejects nodes not connected to frag_output or scene_sdf_sink', () => {
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'o1', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{ id: 'dead', typeId: 'time', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			],
			edges: [],
		};
		const r = validateGraph(doc, buildRegistry([]));
		expect(r.ok).toBe(false);
		expect(r.errors.some((e) => e.includes('not connected'))).toBe(true);
	});

	it('requires exactly one sdf_param_p in the scene graph', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'p2', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e2', source: 'p2', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e3', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e4', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e5', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e6', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e7', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = validateGraph(doc, buildRegistry([]));
		expect(r.ok).toBe(false);
		expect(r.errors.join('\n')).toContain('scene graph needs exactly one "Scene position p" node');
	});

	it('rejects unionHitNormal when scene is not a stratifiable op_union tree', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'm1',
					typeId: 'raymarch_scene',
					pass,
					position: { x: 0, y: 0 },
					data: { unionHitNormal: '1' },
				},
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
				{ id: 'e5', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e6', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const r = validateGraph(doc, buildRegistry([]));
		expect(r.ok).toBe(false);
		expect(r.errors.some((e) => e.includes('Union hit normal'))).toBe(true);
	});
});

