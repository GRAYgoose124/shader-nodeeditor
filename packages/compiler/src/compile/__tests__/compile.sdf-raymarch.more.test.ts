import { describe, expect, it } from 'vitest';
import { compileGraph } from '../graph.js';
import type { GraphDocument } from '../../types.js';

describe('compileGraph (SDF raymarch continued)', () => {

	it('rejects duplicate wires into the same input (avoids undeclared motif distance on scene_sdf_sink)', () => {
		const pass = 'image' as const;
		const paramP = 'p0000000-0000-4000-8000-000000000001';
		const rot = 'r0000000-0000-4000-8000-000000000002';
		const torus = 't0000000-0000-4000-8000-000000000003';
		const oct = 'o0000000-0000-4000-8000-000000000004';
		const isect = '47c2ddab-a127-43c1-9b76-575972584718';
		const fb = 'f0000000-0000-4000-8000-000000000006';
		const sink = 'k0000000-0000-4000-8000-000000000007';
		const uv = 'u0000000-0000-4000-8000-000000000008';
		const ray = 'r1111111-1111-4111-8111-111111111118';
		const march = 'm0000000-0000-4000-8000-000000000009';
		const fragOut = 'o1111111-1111-4111-8111-111111111119';

		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: uv, typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: ray, typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: { fov: 58, camZ: 3.5 } },
				{
					id: march,
					typeId: 'raymarch_scene',
					pass,
					position: { x: 0, y: 0 },
					data: { maxSteps: 140, maxDist: 56, eps: 0.001, ambR: 0.04, ambG: 0.05, ambB: 0.08 },
				},
				{ id: fragOut, typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: paramP, typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: rot,
					typeId: 'domain_rotate_euler_time',
					pass,
					position: { x: 0, y: 0 },
					data: { tx: 0, ty: 0.28, tz: 0, rx: 0, ry: 0, rz: 0 },
				},
				{ id: torus, typeId: 'sdf_torus', pass, position: { x: 0, y: 0 }, data: { R: 0.271, r: 0.158 } },
				{ id: oct, typeId: 'sdf_octahedron', pass, position: { x: 0, y: 0 }, data: { oct_s: 0.42 } },
				{ id: isect, typeId: 'op_intersect', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: fb,
					typeId: 'sdf_tessellate_feedback',
					pass,
					position: { x: 0, y: 0 },
					data: { foldOx: 0.22, foldOy: 0.22, foldOz: 0.22, scale: 1.85, iters: 3 },
				},
				{ id: sink, typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'ea', source: uv, sourceHandle: 'uv', target: ray, targetHandle: 'uv' },
				{ id: 'eb', source: ray, sourceHandle: 'ro', target: march, targetHandle: 'ro' },
				{ id: 'ec', source: ray, sourceHandle: 'rd', target: march, targetHandle: 'rd' },
				{ id: 'ed', source: march, sourceHandle: 'col', target: fragOut, targetHandle: 'color' },
				{ id: 'e0', source: paramP, sourceHandle: 'p', target: rot, targetHandle: 'p' },
				{ id: 'e1', source: rot, sourceHandle: 'p', target: torus, targetHandle: 'p' },
				{ id: 'e2', source: paramP, sourceHandle: 'p', target: oct, targetHandle: 'p' },
				{ id: 'e3', source: torus, sourceHandle: 'd', target: isect, targetHandle: 'a' },
				{ id: 'e4', source: oct, sourceHandle: 'd', target: isect, targetHandle: 'b' },
				{ id: 'e5', source: isect, sourceHandle: 'd', target: fb, targetHandle: 'd' },
				{ id: 'e6', source: fb, sourceHandle: 'd', target: sink, targetHandle: 'd' },
				// XYFlow allows a second connection to the same handle; last wire wins in codegen → return g_isect_d with no declaration.
				{ id: 'e7dup', source: isect, sourceHandle: 'd', target: sink, targetHandle: 'd' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors.some((e) => e.includes('multiple wires into input') && e.includes(sink))).toBe(true);
	});

	it('exportVec3Fn emits vec3 helper and domain_call_exported_vec3 invokes it', () => {
		const pass = 'image' as const;
		const fr = 'f1111111-1111-4111-8111-111111111111';
		const doc: GraphDocument = {
			version: 1,
			meta: {
				editor: {
					frames: [{ id: fr, x: 0, y: 0, width: 400, height: 200, exportVec3Fn: 'shift_em' }],
				},
			},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'tr',
					typeId: 'domain_translate',
					pass,
					position: { x: 0, y: 0 },
					data: { tx: 0.18, ty: 0, tz: 0 },
					parentId: fr,
				},
				{ id: 'ce', typeId: 'domain_call_exported_vec3', pass, position: { x: 0, y: 0 }, data: { fnBase: 'shift_em' } },
				{ id: 'sp', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.32 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r88', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'a0h', source: 'p1', sourceHandle: 'p', target: 'tr', targetHandle: 'p' },
				{ id: 'a0i', source: 'tr', sourceHandle: 'p', target: 'ce', targetHandle: 'p' },
				{ id: 'a0j', source: 'ce', sourceHandle: 'p', target: 'sp', targetHandle: 'p' },
				{ id: 'a0k', source: 'sp', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'a0u', source: 'u1', sourceHandle: 'uv', target: 'r88', targetHandle: 'uv' },
				{ id: 'a0v', source: 'r88', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'a0w', source: 'r88', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'a0x', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('vec3 shift_em(vec3 p)');
		expect(fs).toMatch(/shift_em\s*\(\s*p\s*\)/);
		expect(fs).not.toMatch(/scene_sdf_image\([\s\S]*\/\/ node: tr/);
		expect(fs).toContain('g_ce_p = shift_em(');
	});

	it('rejects motif pullback distance wired from the pullback node itself', () => {
		const pass = 'image' as const;
		const fbn = 'fbself0000-0000-4000-8000-000000000001';
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.3 } },
				{
					id: fbn,
					typeId: 'sdf_tessellate_feedback',
					pass,
					position: { x: 0, y: 0 },
					data: { iters: 1, scale: 1.5 },
				},
				{ id: 'un', typeId: 'op_union', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e1', source: 's1', sourceHandle: 'd', target: 'un', targetHandle: 'a' },
				{ id: 'eself', source: fbn, sourceHandle: 'd', target: fbn, targetHandle: 'd' },
				{ id: 'e2', source: fbn, sourceHandle: 'd', target: 'un', targetHandle: 'b' },
				{ id: 'e3', source: 'un', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'eu', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'er', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'es', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'eo', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(
			r.errors.some(
				(e) =>
					e.includes('pullback') &&
					e.includes('not from the pullback node itself'),
			),
		).toBe(true);
	});

	it('rejects editor frame with both exportVec3Fn and exportSdfFn', () => {
		const pass = 'image' as const;
		const fr = 'frdual0000-0000-4000-8000-000000000002';
		const doc: GraphDocument = {
			version: 1,
			meta: {
				editor: {
					frames: [
						{
							id: fr,
							x: 0,
							y: 0,
							width: 200,
							height: 120,
							exportVec3Fn: 'a',
							exportSdfFn: 'b',
						},
					],
				},
			},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.3 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e1', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'eu', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'er', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'es', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'eo', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors.some((e) => e.includes('cannot set both exportVec3Fn and exportSdfFn'))).toBe(true);
	});

	it('exportSdfFn emits float helper and domain_call_exported_sdf invokes it', () => {
		const pass = 'image' as const;
		const fr = 'f2222222-2222-4222-8222-222222222222';
		const doc: GraphDocument = {
			version: 1,
			meta: {
				editor: {
					frames: [{ id: fr, x: 0, y: 0, width: 400, height: 200, exportSdfFn: 'ball_fn' }],
				},
			},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'tr',
					typeId: 'domain_translate',
					pass,
					position: { x: 0, y: 0 },
					data: { tx: 0.1, ty: 0, tz: 0 },
					parentId: fr,
				},
				{ id: 'sp', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.28 }, parentId: fr },
				{ id: 'dc', typeId: 'domain_call_exported_sdf', pass, position: { x: 0, y: 0 }, data: { fnBase: 'ball_fn' } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r88', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'b0', source: 'p1', sourceHandle: 'p', target: 'tr', targetHandle: 'p' },
				{ id: 'b1', source: 'tr', sourceHandle: 'p', target: 'sp', targetHandle: 'p' },
				{ id: 'b2', source: 'p1', sourceHandle: 'p', target: 'dc', targetHandle: 'p' },
				{ id: 'b3', source: 'dc', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'b4', source: 'u1', sourceHandle: 'uv', target: 'r88', targetHandle: 'uv' },
				{ id: 'b5', source: 'r88', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'b6', source: 'r88', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'b7', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('float ball_fn(vec3 p)');
		expect(fs).toMatch(/g_dc_d = ball_fn\(/);
	});

	it('sdf_repeat_exported_min compiles min loop over exported SDF', () => {
		const pass = 'image' as const;
		const fr = 'f3333333-3333-4333-8333-333333333333';
		const doc: GraphDocument = {
			version: 1,
			meta: {
				editor: {
					frames: [{ id: fr, x: 0, y: 0, width: 400, height: 200, exportSdfFn: 'cell_sdf' }],
				},
			},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'sp', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.2 }, parentId: fr },
				{
					id: 'rp',
					typeId: 'sdf_repeat_exported_min',
					pass,
					position: { x: 0, y: 0 },
					data: { fnBase: 'cell_sdf', count: 3, axis: 'x', spacing: 0.4 },
				},
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r88', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'c0', source: 'p1', sourceHandle: 'p', target: 'sp', targetHandle: 'p' },
				{ id: 'c1', source: 'p1', sourceHandle: 'p', target: 'rp', targetHandle: 'p' },
				{ id: 'c2', source: 'rp', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'c3', source: 'u1', sourceHandle: 'uv', target: 'r88', targetHandle: 'uv' },
				{ id: 'c4', source: 'r88', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'c5', source: 'r88', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'c6', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('float cell_sdf(vec3 p)');
		expect(fs).toMatch(/for \(int irp_rp/);
		expect(fs).toContain('cell_sdf(');
	});

	it('domain_kifs_orbit_min and sdf_albedo_scalar_mix compile in scene', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'orb', typeId: 'domain_kifs_orbit_min', pass, position: { x: 0, y: 0 }, data: { iters: 4 } },
				{ id: 'sp', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
				{ id: 'al', typeId: 'sdf_albedo_scalar_mix', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r88', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'b0', source: 'p1', sourceHandle: 'p', target: 'orb', targetHandle: 'p' },
				{ id: 'b1', source: 'p1', sourceHandle: 'p', target: 'sp', targetHandle: 'p' },
				{ id: 'b2', source: 'sp', sourceHandle: 'd', target: 'al', targetHandle: 'd' },
				{ id: 'b3', source: 'orb', sourceHandle: 'm', target: 'al', targetHandle: 'h' },
				{ id: 'b4', source: 'al', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'b5', source: 'u1', sourceHandle: 'uv', target: 'r88', targetHandle: 'uv' },
				{ id: 'b6', source: 'r88', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'b7', source: 'r88', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'b8', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('min |q| over KIFS-style orbit');
		expect(fs).toContain('SDF albedo from scalar');
	});

	it('domain_variation_spherical emits in scene_sdf before primitive', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'domain_variation_spherical', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.3 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'ry', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'v1', targetHandle: 'p' },
				{ id: 'e1', source: 'v1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e2', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e3', source: 'u1', sourceHandle: 'uv', target: 'ry', targetHandle: 'uv' },
				{ id: 'e4', source: 'ry', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e5', source: 'ry', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e6', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toContain('spherical variation (3D)');
	});

	it('ifs_affine3 and ifs_pick_shorter3 compile inside scene_sdf', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'domain_rotate_euler_time', pass, position: { x: 0, y: 0 }, data: { tx: 0, ty: 0.2, tz: 0 } },
				{ id: 'a1', typeId: 'ifs_affine3', pass, position: { x: 0, y: 0 }, data: { m00: 0.45, m11: 0.45, m22: 0.45 } },
				{ id: 'a2', typeId: 'ifs_affine3', pass, position: { x: 0, y: 0 }, data: { m00: 0.38, m11: 0.42, m22: 0.4, tx: 0.08 } },
				{ id: 'pk', typeId: 'ifs_pick_shorter3', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.32 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'ry', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'r1', targetHandle: 'p' },
				{ id: 'e1', source: 'r1', sourceHandle: 'p', target: 'a1', targetHandle: 'p' },
				{ id: 'e2', source: 'r1', sourceHandle: 'p', target: 'a2', targetHandle: 'p' },
				{ id: 'e3', source: 'a1', sourceHandle: 'p', target: 'pk', targetHandle: 'a' },
				{ id: 'e4', source: 'a2', sourceHandle: 'p', target: 'pk', targetHandle: 'b' },
				{ id: 'e5', source: 'pk', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e6', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e7', source: 'u1', sourceHandle: 'uv', target: 'ry', targetHandle: 'uv' },
				{ id: 'e8', source: 'ry', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e9', source: 'ry', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'ea', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('min-norm branch vec3');
		expect(fs).toContain('column-major mat3');
	});

	it('sdf_iterate_pullback scale_only emits scaled motif union without abs-fold', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
				{
					id: 'ip1',
					typeId: 'sdf_iterate_pullback',
					pass,
					position: { x: 0, y: 0 },
					data: { loopMode: 'scale_only', foldOx: 0.2, foldOy: 0.2, foldOz: 0.2, scale: 1.85, iters: 2 },
				},
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e1', source: 's1', sourceHandle: 'd', target: 'ip1', targetHandle: 'd' },
				{ id: 'e2', source: 'ip1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e3', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e4', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e5', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e6', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('float motif_ip1');
		expect(fs).toContain('SDF iterate pullback (scale_only)');
		expect(fs).toMatch(/qtf_ip1 \*= float/);
		expect(fs).not.toMatch(/abs\s*\(\s*qtf_ip1/);
	});

	it('sdf_tessellate_feedback emits motif helper and KIFS union loop (explicit)', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
				{
					id: 'fb1',
					typeId: 'sdf_tessellate_feedback',
					pass,
					position: { x: 0, y: 0 },
					data: { loopMode: 'kifs', foldOx: 0.2, foldOy: 0.2, foldOz: 0.2, scale: 2.0, iters: 2 },
				},
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e1', source: 's1', sourceHandle: 'd', target: 'fb1', targetHandle: 'd' },
				{ id: 'e2', source: 'fb1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e3', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e4', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e5', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e6', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('float motif_fb1');
		expect(fs).toContain('SDF feedback tessellation (kifs)');
		expect(fs).toContain('return g_s1_d');
		expect(fs).toMatch(/float g_fb1_d = motif_fb1\(p\)/);
	});

	it('sdf_tessellate_feedback default loopMode=scale_only emits scaled motif union without abs-fold', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
				{
					id: 'fb1',
					typeId: 'sdf_tessellate_feedback',
					pass,
					position: { x: 0, y: 0 },
					data: { foldOx: 0.2, foldOy: 0.2, foldOz: 0.2, scale: 1.85, iters: 2 },
				},
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e1', source: 's1', sourceHandle: 'd', target: 'fb1', targetHandle: 'd' },
				{ id: 'e2', source: 'fb1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e3', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e4', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e5', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e6', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('SDF feedback tessellation (scale_only)');
		expect(fs).toMatch(/qtf_fb1 \*= float/);
		expect(fs).not.toMatch(/abs\s*\(\s*qtf_fb1/);
	});

	it('sdf_tessellate_feedback distanceNorm=raw avoids /wtf division in scale modes', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
				{
					id: 'fb1',
					typeId: 'sdf_tessellate_feedback',
					pass,
					position: { x: 0, y: 0 },
					data: {
						loopMode: 'kifs',
						distanceNorm: 'raw',
						foldOx: 0.2,
						foldOy: 0.2,
						foldOz: 0.2,
						scale: 2.0,
						iters: 2,
					},
				},
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e1', source: 's1', sourceHandle: 'd', target: 'fb1', targetHandle: 'd' },
				{ id: 'e2', source: 'fb1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e3', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e4', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e5', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e6', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('SDF feedback tessellation (kifs)');
		expect(fs).toContain('wtf_fb1 *= float');
		expect(fs).not.toMatch(/\/\s*wtf_fb1/);
	});

	it('sdf_tessellate_feedback combineMode=smin emits polynomial smooth min merge', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
				{
					id: 'fb1',
					typeId: 'sdf_tessellate_feedback',
					pass,
					position: { x: 0, y: 0 },
					data: {
						loopMode: 'kifs',
						combineMode: 'smin',
						combineK: 0.08,
						foldOx: 0.2,
						foldOy: 0.2,
						foldOz: 0.2,
						scale: 2.0,
						iters: 2,
					},
				},
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e1', source: 's1', sourceHandle: 'd', target: 'fb1', targetHandle: 'd' },
				{ id: 'e2', source: 'fb1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e3', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e4', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e5', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e6', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toMatch(/float ka_fb1 = max\(float\(/);
		expect(fs).toMatch(/float ha_fb1 = clamp/);
		expect(fs).toMatch(/g_fb1_d = mix\(/);
	});

	it('raymarch_scene emits per-step caps when maxStepAbs / maxStepRelT are set (primary + optional sky march)', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'm1',
					typeId: 'raymarch_scene',
					pass,
					position: { x: 0, y: 0 },
					data: { maxStepAbs: 0.15, maxStepRelT: 0.08, skyBounceOn: 1 },
				},
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
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('uniform float u_m1_maxStepAbs');
		expect(fs).toContain('uniform float u_m1_maxStepRelT');
		expect(fs).toMatch(/if \(float\(u_m1_maxStepAbs\) > 0\.0\) dtMc_m1 = min\(dtMc_m1, float\(u_m1_maxStepAbs\)\)/);
		expect(fs).toMatch(
			/if \(float\(u_m1_maxStepRelT\) > 0\.0\) dtMc_m1 = min\(dtMc_m1, float\(u_m1_maxStepRelT\) \* max\(tmc_m1, 1e-4\)\)/,
		);
		expect(fs).toMatch(/if \(float\(u_m1_maxStepAbs\) > 0\.0\) dtSk_m1 = min\(dtSk_m1, float\(u_m1_maxStepAbs\)\)/);
	});

	it('raymarch_scene near-miss recovery block references bisection temps when surfaceRecoverOn is On', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'm1',
					typeId: 'raymarch_scene',
					pass,
					position: { x: 0, y: 0 },
					data: { surfaceRecoverOn: '1', recoverBand: 10 },
				},
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
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toMatch(/if \(hitMc_m1 < 0\.5 && float\(1\.0\) > 0\.5\)/);
		expect(fs).toMatch(/for \(int irb_m1 = 0; irb_m1 < 12; irb_m1\+\+\)/);
		expect(fs).toContain('tLoRB_m1');
		expect(fs).toContain('uniform float u_m1_recoverBand');
	});

	it('raymarch_scene supports tetrahedron normals and sky bounce (phase 7E)', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'm1',
					typeId: 'raymarch_scene',
					pass,
					position: { x: 0, y: 0 },
					data: { nTetra: 1, iqNormal: 0, skyBounceOn: 1 },
				},
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
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('normalsSDF');
		expect(fs).toContain('te_');
		expect(fs).toContain('missS_');
		expect(fs).toContain('curvAmp');
	});

	it('domain_voronoi_warp and sdf_menger_sponge compile', () => {
		const pass = 'image' as const;
		const base = [
			{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
			{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
			{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
			{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
			{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
		] as const;
		const edgesBase = [
			{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
			{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
			{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
			{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
		] as const;

		const docV: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				...base,
				{ id: 'd1', typeId: 'domain_voronoi_warp', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.3 } },
			],
			edges: [
				...edgesBase,
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'd1', targetHandle: 'p' },
				{ id: 'ea', source: 'd1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'eb', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const rv = compileGraph(docV);
		expect(rv.errors).toEqual([]);
		const fsv = rv.passes.image!.fragmentSource;
		expect(fsv).toContain('voronoiline');
		expect(fsv).toContain('pvf_');
		expect(fsv).toContain('u_d1_warpU');

		const docM: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				...base,
				{ id: 's1', typeId: 'sdf_menger_sponge', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				...edgesBase,
				{ id: 'ea', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'eb', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const rm = compileGraph(docM);
		expect(rm.errors).toEqual([]);
		expect(rm.passes.image!.fragmentSource).toContain('articles/menger');

		const docK: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				...base,
				{ id: 'd1', typeId: 'ifs_kifs_iterate3d', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.25 } },
			],
			edges: [
				...edgesBase,
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'd1', targetHandle: 'p' },
				{ id: 'ea', source: 'd1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'eb', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const rk = compileGraph(docK);
		expect(rk.errors).toEqual([]);
		expect(rk.passes.image!.fragmentSource).toContain('qk_');
	});

	it('sdf_primitive rhombus expands glslRhombus', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 's1',
					typeId: 'sdf_primitive',
					pass,
					position: { x: 0, y: 0 },
					data: { shape: 'rhombus', rh_la: 0.25, rh_lb: 0.35, rh_h: 0.08, rh_ra: 0.02 },
				},
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
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
		expect(r.passes.image!.fragmentSource).toContain('rhP_');
	});

	it('domain_grad_fbm_displace uses iq_fbm3_grad_fd', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'domain_grad_fbm_displace', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.32 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'd1', targetHandle: 'p' },
				{ id: 'ea', source: 'd1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'eb', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toContain('iq_fbm3_grad_fd');
	});

	it('cosine_palette compiles with IQ palettes URL', () => {
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 't1', typeId: 'time', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{ id: 'c1', typeId: 'cosine_palette', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass: 'image', position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 't1', sourceHandle: 't', target: 'c1', targetHandle: 't' },
				{ id: 'e2', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e3', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toContain('articles/palettes');
	});

	it('fresnel_schlick compiles on path to frag_output', () => {
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'f1', typeId: 'float_const', pass: 'image', position: { x: 0, y: 0 }, data: { value: 0.85 } },
				{ id: 'fr', typeId: 'fresnel_schlick', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{ id: 'vis', typeId: 'sdf_visualize', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass: 'image', position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'f1', sourceHandle: 'v', target: 'fr', targetHandle: 'vdh' },
				{ id: 'e2', source: 'fr', sourceHandle: 'f', target: 'vis', targetHandle: 'd' },
				{ id: 'e3', source: 'vis', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e4', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('outlighting');
		expect(fs).toMatch(/pow\s*\(\s*1\.0\s*-\s*vdh_/);
		expect(fs).toContain('u_vis_palScale');
	});
});
