import { describe, expect, it } from 'vitest';
import { compileGraph } from '../graph.js';
import type { GraphDocument } from '../../types.js';
import { minimalColorGraph } from '../fixtures.js';

function normalizeSnapshotText(s: string): string {
	// Keep snapshots stable across OS line endings.
	return s.replace(/\r\n/g, '\n');
}

describe('compileGraph (golden GLSL snapshots)', () => {
	it('minimal image pass fragmentSource', () => {
		const r = compileGraph(minimalColorGraph());
		expect(r.errors).toEqual([]);
		const fs = normalizeSnapshotText(r.passes.image!.fragmentSource);
		expect(fs).toMatchSnapshot();
	});

	it('raymarch_scene (sphere) fragmentSource', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: { fov: 60, camZ: 3 } },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'ea', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'eb', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = normalizeSnapshotText(r.passes.image!.fragmentSource);
		expect(fs).toMatchSnapshot();
	});

	it('raymarch_scene (sphere + GI on) fragmentSource', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: { fov: 60, camZ: 3 } },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: { giOn: 1, giStr: 0.15 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'ea', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'eb', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = normalizeSnapshotText(r.passes.image!.fragmentSource);
		expect(fs).toMatchSnapshot();
	});
});

