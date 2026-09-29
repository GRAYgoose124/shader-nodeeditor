import { describe, expect, it } from 'vitest';
import { compileGraph } from '../graph.js';
import type { GraphDocument } from '../../types.js';
import { paramAnimKey } from '../../paramAnimation.js';
import { PARAM_GRAPH_BYPASS_DATA_KEY, paramWirePortId } from '../../paramWire.js';

describe('param graph wire (optional float override)', () => {
	const pass = 'image' as const;

	function baseSceneDoc(overrides?: { sphereData?: Record<string, unknown>; extraEdges?: GraphDocument['edges'] }) {
		const nUv = { id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} };
		const nRay = { id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: { fov: 60, camZ: 3 } };
		const nMarch = { id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} };
		const nOut = { id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} };
		const nP = { id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} };
		const nS = {
			id: 's1',
			typeId: 'sdf_sphere',
			pass,
			position: { x: 0, y: 0 },
			data: { r: 0.4, ...(overrides?.sphereData ?? {}) },
		};
		const nSk = { id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} };
		const nLen = { id: 'L1', typeId: 'proc2d_length', pass, position: { x: 0, y: 0 }, data: {} };
		const edges: GraphDocument['edges'] = [
			{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
			{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
			{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
			{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			{ id: 'e5', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
			{ id: 'e6', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			{ id: 'e7', source: 'u1', sourceHandle: 'uv', target: 'L1', targetHandle: 'p' },
			{
				id: 'e8',
				source: 'L1',
				sourceHandle: 'r',
				target: 's1',
				targetHandle: paramWirePortId('r'),
			},
			...(overrides?.extraEdges ?? []),
		];
		return {
			version: 1 as const,
			meta: {},
			nodes: [nUv, nRay, nMarch, nOut, nP, nS, nSk, nLen],
			edges,
		};
	}

	it('inlines wired float param and omits uniform from manifest', () => {
		const doc = baseSceneDoc();
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const uniforms = r.manifest.passes.find((p) => p.id === 'image')!.uniforms;
		expect(uniforms.some((u) => u.nodeId === 's1' && u.paramId === 'r')).toBe(false);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toMatch(/length\([^)]+\)\s*-\s*float\(\s*g_L1_r\s*\)/);
		expect(fs).not.toContain('u_s1_r');
	});

	it('bypass restores uniform path for wired param', () => {
		const doc = baseSceneDoc({
			sphereData: { [PARAM_GRAPH_BYPASS_DATA_KEY]: { r: true } },
		});
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const uniforms = r.manifest.passes.find((p) => p.id === 'image')!.uniforms;
		const u = uniforms.find((x) => x.nodeId === 's1' && x.paramId === 'r');
		expect(u).toBeDefined();
		expect(u?.name).toBe('u_s1_r');
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('u_s1_r');
	});

	it('graph drive drops paramAnimation driver for that param', () => {
		const key = paramAnimKey('s1', 'r');
		const doc: GraphDocument = {
			...baseSceneDoc(),
			meta: {
				editor: {
					paramAnimations: {
						[key]: {
							nodeId: 's1',
							paramId: 'r',
							curve: 'sine',
							speed: 1,
							phase: 0,
							depth: 1,
						},
					},
				},
			},
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const uniforms = r.manifest.passes.find((p) => p.id === 'image')!.uniforms;
		const u = uniforms.find((x) => x.nodeId === 's1' && x.paramId === 'r');
		expect(u).toBeUndefined();
	});
});
