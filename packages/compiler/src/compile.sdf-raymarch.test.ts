import { describe, expect, it } from 'vitest';
import { compileGraph } from './compile.js';
import type { GraphDocument } from './types.js';
import { minimalColorGraph } from './compile.fixtures.js';

describe('compileGraph', () => {

	it('emits scene_sdf_* and wires raymarch_scene to it', () => {
		const pass = 'image' as const;
		const nUv = { id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} };
		const nRay = { id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: { fov: 60, camZ: 3 } };
		const nMarch = { id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} };
		const nOut = { id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} };
		const nP = { id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} };
		const nS = { id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } };
		const nSk = { id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} };
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [nUv, nRay, nMarch, nOut, nP, nS, nSk],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
				{ id: 'e5', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e6', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toMatch(/float scene_sdf_image\s*\(\s*vec3 p\s*\)/);
		expect(fs).toContain('scene_sdf_image(pmc_');
		expect(fs).toContain('fragColor = g_m1_col');
		const fnIdx = fs.indexOf('float scene_sdf_image');
		const mainIdx = fs.indexOf('void main()');
		expect(fnIdx).toBeGreaterThan(-1);
		expect(mainIdx).toBeGreaterThan(fnIdx);
	});

	it('emits scene_hit_* and scene_mat_* when sdf_albedo is in the scene graph', () => {
		const pass = 'image' as const;
		const nUv = { id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} };
		const nRay = { id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: { fov: 60, camZ: 3 } };
		const nMarch = {
			id: 'm1',
			typeId: 'raymarch_scene',
			pass,
			position: { x: 0, y: 0 },
			data: { sdfAlbedoShadeOn: '1' },
		};
		const nOut = { id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} };
		const nP = { id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} };
		const nS = { id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } };
		const nA = { id: 'a1', typeId: 'sdf_albedo', pass, position: { x: 0, y: 0 }, data: { r: 0.2, g: 0.8, b: 0.3 } };
		const nSk = { id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} };
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [nUv, nRay, nMarch, nOut, nP, nS, nA, nSk],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
				{ id: 'e5', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e6', source: 's1', sourceHandle: 'd', target: 'a1', targetHandle: 'd' },
				{ id: 'e7', source: 'a1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toMatch(/void scene_hit_image\s*\(\s*vec3 p\s*,\s*out float o_scened\s*,\s*out vec3 o_scenemat\s*\)/);
		expect(fs).toMatch(/vec3 scene_mat_image\s*\(\s*vec3 p\s*\)/);
		expect(fs).toContain('scene_mat_image(pmc_');
		expect(fs).toContain('o_scened =');
		const sdfStart = fs.indexOf('float scene_sdf_image');
		const sdfEnd = fs.indexOf('\n}\nvoid scene_hit_image', sdfStart);
		expect(sdfStart).toBeGreaterThan(-1);
		expect(sdfEnd).toBeGreaterThan(sdfStart);
		expect(fs.slice(sdfStart, sdfEnd)).not.toContain('scene_hit_image');
	});

	it('does not emit scene_hit when sdf_albedo is present but Shade with SDF albedo is Off', () => {
		const pass = 'image' as const;
		const nUv = { id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} };
		const nRay = { id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: { fov: 60, camZ: 3 } };
		const nMarch = { id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: { sdfAlbedoShadeOn: '0' } };
		const nOut = { id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} };
		const nP = { id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} };
		const nS = { id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } };
		const nA = { id: 'a1', typeId: 'sdf_albedo', pass, position: { x: 0, y: 0 }, data: { r: 0.2, g: 0.8, b: 0.3 } };
		const nSk = { id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} };
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [nUv, nRay, nMarch, nOut, nP, nS, nA, nSk],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
				{ id: 'e5', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e6', source: 's1', sourceHandle: 'd', target: 'a1', targetHandle: 'd' },
				{ id: 'e7', source: 'a1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).not.toContain('void scene_hit_image');
		expect(fs).toContain('float g_a1_d = g_s1_d');
	});

	it('records uniform manifest for uniform params', () => {
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'a', typeId: 'vec3_const', pass: 'image', position: { x: 0, y: 0 }, data: { r: 1, g: 0, b: 0 } },
				{ id: 'b', typeId: 'vec3_const', pass: 'image', position: { x: 0, y: 0 }, data: { r: 0, g: 0, b: 1 } },
				{ id: 'm1', typeId: 'mix_vec3', pass: 'image', position: { x: 0, y: 0 }, data: { t: 0.25 } },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass: 'image', position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'a', sourceHandle: 'rgb', target: 'm1', targetHandle: 'a' },
				{ id: 'e2', source: 'b', sourceHandle: 'rgb', target: 'm1', targetHandle: 'b' },
				{ id: 'e3', source: 'm1', sourceHandle: 'out', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e4', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const img = r.manifest.passes.find((p) => p.id === 'image');
		expect(img?.uniforms.some((u) => u.paramId === 't')).toBe(true);
	});

	it('domain_rotate_euler_time compiles with per-axis iTime scale', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'domain_rotate_euler_time', pass, position: { x: 0, y: 0 }, data: { ty: 1, tx: 0, tz: 0 } },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
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
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toMatch(/iTime \* float\(/);
		expect(fs).toContain('ay_');
	});

	it('domain_rotate_euler compiles with wired angles', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'z1', typeId: 'float_const', pass, position: { x: 0, y: 0 }, data: { value: 0 } },
				{ id: 'z2', typeId: 'float_const', pass, position: { x: 0, y: 0 }, data: { value: 0 } },
				{ id: 'z3', typeId: 'float_const', pass, position: { x: 0, y: 0 }, data: { value: 0 } },
				{ id: 'd1', typeId: 'domain_rotate_euler', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.3 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'd1', targetHandle: 'p' },
				{ id: 'e0a', source: 'z1', sourceHandle: 'v', target: 'd1', targetHandle: 'rx' },
				{ id: 'e0b', source: 'z2', sourceHandle: 'v', target: 'd1', targetHandle: 'ry' },
				{ id: 'e0c', source: 'z3', sourceHandle: 'v', target: 'd1', targetHandle: 'rz' },
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
		expect(r.passes.image!.fragmentSource).toContain('qe_');
	});

	it('domain_twist and domain_bend compile with literal axis', () => {
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

		const docT: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				...base,
				{ id: 'd1', typeId: 'domain_twist', pass, position: { x: 0, y: 0 }, data: { axis: '1' } },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.28 } },
			],
			edges: [
				...edgesBase,
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'd1', targetHandle: 'p' },
				{ id: 'ea', source: 'd1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'eb', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		expect(compileGraph(docT).errors).toEqual([]);

		const docB: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				...base,
				{ id: 'd1', typeId: 'domain_bend', pass, position: { x: 0, y: 0 }, data: { axis: '0' } },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.28 } },
			],
			edges: [
				...edgesBase,
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'd1', targetHandle: 'p' },
				{ id: 'ea', source: 'd1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'eb', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const rb = compileGraph(docB);
		expect(rb.errors).toEqual([]);
		expect(rb.passes.image!.fragmentSource).toContain('bax_');
	});

	it('prelude includes iq_voronoi3_f12 and iq_gnoise (phase 7)', () => {
		const r = compileGraph(minimalColorGraph());
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('iq_voronoi3_f12');
		expect(fs).toContain('iq_gnoise');
		expect(fs).toContain('iq_fbm3_g');
	});

	it('ray_lookat_from_uv compiles with look-at basis', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_lookat_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e1', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e2', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e3', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
				{ id: 'e4', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e5', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('raymarchingdf');
		expect(fs).toContain('cross(upL_');
		// Perspective: tan(halfFov) scales the image plane (uu/vv), not the forward axis (ww).
		expect(fs).toContain('normalize(flL_r1 * (ndcL_r1.x * uuL_r1 + ndcL_r1.y * vvL_r1) + wwL_r1)');
	});

	it('domain_tessellate_hex_xz and sdf_octahedron compile in raymarch graph', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'hex1', typeId: 'domain_tessellate_hex_xz', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'oct1', typeId: 'sdf_octahedron', pass, position: { x: 0, y: 0 }, data: { oct_s: 0.4 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'hex1', targetHandle: 'p' },
				{ id: 'e1', source: 'hex1', sourceHandle: 'p', target: 'oct1', targetHandle: 'p' },
				{ id: 'e2', source: 'oct1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e3', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e4', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e5', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e6', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('hex XZ honeycomb');
		expect(fs).toContain('0.8660254037844387');
		expect(fs).toContain('mo_oct1');
	});

	it('torus ∩ octa + sdf_tessellate_feedback preset topology compiles (regression)', () => {
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
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain(`return g_${isect.replace(/[^a-zA-Z0-9_]/g, '_')}_d`);
		expect(fs).toMatch(/float motif_f0000000_0000_4000_8000_000000000006\(vec3 q, vec3 pScene\)/);
		expect(fs).toMatch(/float g_f0000000_0000_4000_8000_000000000006_d = motif_f0000000_0000_4000_8000_000000000006\(p, p\)/);
		expect(fs).toMatch(/motif_f0000000_0000_4000_8000_000000000006\(qtf_f0000000_0000_4000_8000_000000000006, p\)/);
	});

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

	it('sdf_tessellate_feedback emits motif helper and KIFS union loop', () => {
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
					data: { foldOx: 0.2, foldOy: 0.2, foldOz: 0.2, scale: 2.0, iters: 2 },
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
		expect(fs).toContain('SDF feedback tessellation (KIFS union of motif)');
		expect(fs).toContain('return g_s1_d');
		expect(fs).toMatch(/float g_fb1_d = motif_fb1\(p\)/);
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
