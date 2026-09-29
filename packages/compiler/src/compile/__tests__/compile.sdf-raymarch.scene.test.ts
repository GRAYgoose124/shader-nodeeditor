import { describe, expect, it } from 'vitest';
import { compileGraph } from '../graph.js';
import type { GraphDocument } from '../../types.js';
import { minimalColorGraph } from '../fixtures.js';

describe('compileGraph (SDF scene + raymarch)', () => {

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

	it('sdf_torus_knot compiles in scene + raymarch', () => {
		const pass = 'image' as const;
		const nUv = { id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} };
		const nRay = { id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: { fov: 60, camZ: 3 } };
		const nMarch = { id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} };
		const nOut = { id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} };
		const nP = { id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} };
		const nK = {
			id: 'knot1',
			typeId: 'sdf_torus_knot',
			pass,
			position: { x: 0, y: 0 },
			data: { R: 0.4, a: 0.2, r: 0.06, windP: 2, windQ: 3, samples: 32 },
		};
		const nSk = { id: 'sk1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} };
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [nUv, nRay, nMarch, nOut, nP, nK, nSk],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
				{ id: 'e5', source: 'p1', sourceHandle: 'p', target: 'knot1', targetHandle: 'p' },
				{ id: 'e6', source: 'knot1', sourceHandle: 'd', target: 'sk1', targetHandle: 'd' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('coarse t + Newton');
		expect(fs).toMatch(/float scene_sdf_image\s*\(\s*vec3 p\s*\)/);
	});

	it('stratified op_union + unionHitNormal emits scene_strand_* and winning-strand normal', () => {
		const pass = 'image' as const;
		const nUv = { id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} };
		const nRay = { id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: { fov: 60, camZ: 3 } };
		const nMarch = {
			id: 'm1',
			typeId: 'raymarch_scene',
			pass,
			position: { x: 0, y: 0 },
			data: { unionHitNormal: '1' },
		};
		const nOut = { id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} };
		const nP = { id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} };
		const nS0 = { id: 's0', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.25 } };
		const nS1 = { id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.25 } };
		const nU = { id: 'un', typeId: 'op_union', pass, position: { x: 0, y: 0 }, data: {} };
		const nSk = { id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} };
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [nUv, nRay, nMarch, nOut, nP, nS0, nS1, nU, nSk],
			edges: [
				{ id: 'e0', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e1', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e2', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e3', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
				{ id: 'e4', source: 'p1', sourceHandle: 'p', target: 's0', targetHandle: 'p' },
				{ id: 'e5', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e6', source: 's0', sourceHandle: 'd', target: 'un', targetHandle: 'a' },
				{ id: 'e7', source: 's1', sourceHandle: 'd', target: 'un', targetHandle: 'b' },
				{ id: 'e8', source: 'un', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('float scene_strand_0_image');
		expect(fs).toContain('float scene_strand_1_image');
		expect(fs).toContain('dsw0_m1');
		expect(fs).toContain('win_m1');
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

	it('sdf_albedo_scalar_mix with Shade On replaces {{sceneMatFn}} (no stray template in fragment)', () => {
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
		const nOrb = { id: 'orb', typeId: 'domain_kifs_orbit_min', pass, position: { x: 0, y: 0 }, data: { iters: 3 } };
		const nAl = { id: 'al', typeId: 'sdf_albedo_scalar_mix', pass, position: { x: 0, y: 0 }, data: {} };
		const nSk = { id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} };
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [nUv, nRay, nMarch, nOut, nP, nS, nOrb, nAl, nSk],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
				{ id: 'e5', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e6', source: 'p1', sourceHandle: 'p', target: 'orb', targetHandle: 'p' },
				{ id: 'e7', source: 's1', sourceHandle: 'd', target: 'al', targetHandle: 'd' },
				{ id: 'e8', source: 'orb', sourceHandle: 'm', target: 'al', targetHandle: 'h' },
				{ id: 'e9', source: 'al', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).not.toContain('{{sceneMatFn}}');
		expect(fs).toMatch(/vec3 scene_mat_image\s*\(\s*vec3 p\s*\)/);
		expect(fs).toContain('scene_mat_image(pmc_');
		const hitStart = fs.indexOf('void scene_hit_image');
		const hitEnd = fs.indexOf('\nvec3 scene_mat_image', hitStart);
		const hitBody = fs.slice(hitStart, hitEnd);
		// Template already declares g_al_mat in scene_hit; emitSceneNodeLine must not append a second vec3 g_al_mat in the same function.
		expect((hitBody.match(/\bvec3 g_al_mat\b/g) ?? []).length).toBe(1);
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
		const fsB = rb.passes.image!.fragmentSource;
		expect(fsB).toContain('bax_');
		// Axis 0 cheap bend: warps XY (cb*x - sb*y, sb*x + cb*y, z), not YZ twist.
		expect(fsB).toMatch(/cb_.*\.x.*sb_.*\.y[\s\S]*sb_.*\.x.*cb_.*\.y/s);
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
					data: { loopMode: 'kifs', foldOx: 0.22, foldOy: 0.22, foldOz: 0.22, scale: 1.85, iters: 3 },
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

	it('scene_sdf_zone_begin/end emits float helper and call in scene_sdf', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'zb',
					typeId: 'scene_sdf_zone_begin',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'cellA' },
				},
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.25 } },
				{
					id: 'ze',
					typeId: 'scene_sdf_zone_end',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'cellA' },
				},
				{ id: 's2', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } },
				{ id: 'un', typeId: 'op_union', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'zb', targetHandle: 'p' },
				{ id: 'e1', source: 'zb', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e2', source: 's1', sourceHandle: 'd', target: 'ze', targetHandle: 'd' },
				{ id: 'e3', source: 'ze', sourceHandle: 'd', target: 'un', targetHandle: 'a' },
				{ id: 'e4', source: 'p1', sourceHandle: 'p', target: 's2', targetHandle: 'p' },
				{ id: 'e5', source: 's2', sourceHandle: 'd', target: 'un', targetHandle: 'b' },
				{ id: 'e6', source: 'un', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'eu', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'er', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'es', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'eo', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('scene_sdf_zone_cellA_image');
		expect(fs).toMatch(/float scene_sdf_zone_cellA_image\s*\(\s*vec3 p\s*\)/);
		expect(fs).toContain('scene_sdf_zone_end');
		expect(fs).toContain('float scene_sdf_image');
	});

	it('rejects scene_sdf_zone_end with no matching begin', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.2 } },
				{
					id: 'ze',
					typeId: 'scene_sdf_zone_end',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'orphan' },
				},
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e1', source: 's1', sourceHandle: 'd', target: 'ze', targetHandle: 'd' },
				{ id: 'e2', source: 'ze', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'eu', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'er', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'es', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'eo', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors.some((e) => e.includes('no matching scene_sdf_zone_begin'))).toBe(true);
	});

	it('rejects scene SDF zone body leak to outside', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'zb',
					typeId: 'scene_sdf_zone_begin',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'z' },
				},
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.2 } },
				{
					id: 'ze',
					typeId: 'scene_sdf_zone_end',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'z' },
				},
				{ id: 'un', typeId: 'op_union', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'zb', targetHandle: 'p' },
				{ id: 'e1', source: 'zb', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e2', source: 's1', sourceHandle: 'd', target: 'ze', targetHandle: 'd' },
				{ id: 'e3', source: 's1', sourceHandle: 'd', target: 'un', targetHandle: 'a' },
				{ id: 'e4', source: 'ze', sourceHandle: 'd', target: 'un', targetHandle: 'b' },
				{ id: 'e5', source: 'un', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'eu', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'er', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'es', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'eo', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors.some((e) => e.includes('leaks from') && e.includes('scene SDF zone'))).toBe(true);
	});

	it('Union hit normal + scene SDF zones compiles (merged field / IQ normal on combined SDF)', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'zb',
					typeId: 'scene_sdf_zone_begin',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'z' },
				},
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.2 } },
				{
					id: 'ze',
					typeId: 'scene_sdf_zone_end',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'z' },
				},
				{ id: 's2', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.3 } },
				{ id: 'un', typeId: 'op_union', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'm1',
					typeId: 'raymarch_scene',
					pass,
					position: { x: 0, y: 0 },
					data: {
						maxSteps: 80,
						maxDist: 40,
						eps: 0.001,
						unionHitNormal: '1',
						ambR: 0.04,
						ambG: 0.05,
						ambB: 0.08,
					},
				},
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'zb', targetHandle: 'p' },
				{ id: 'e1', source: 'zb', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e2', source: 's1', sourceHandle: 'd', target: 'ze', targetHandle: 'd' },
				{ id: 'e3', source: 'ze', sourceHandle: 'd', target: 'un', targetHandle: 'a' },
				{ id: 'e4', source: 'p1', sourceHandle: 'p', target: 's2', targetHandle: 'p' },
				{ id: 'e5', source: 's2', sourceHandle: 'd', target: 'un', targetHandle: 'b' },
				{ id: 'e6', source: 'un', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'eu', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'er', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'es', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'eo', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('scene_sdf_zone_z_image');
		expect(fs).not.toMatch(/float scene_strand_0_image/);
	});

	it('allows fractal motif pullback with scene SDF zones when motif slice is disjoint from zones', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'zb',
					typeId: 'scene_sdf_zone_begin',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'z' },
				},
				{ id: 's0', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.15 } },
				{
					id: 'ze',
					typeId: 'scene_sdf_zone_end',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'z' },
				},
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.2 } },
				{
					id: 'fb',
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
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'zb', targetHandle: 'p' },
				{ id: 'e1', source: 'zb', sourceHandle: 'p', target: 's0', targetHandle: 'p' },
				{ id: 'e2', source: 's0', sourceHandle: 'd', target: 'ze', targetHandle: 'd' },
				{ id: 'e3', source: 'ze', sourceHandle: 'd', target: 'un', targetHandle: 'a' },
				{ id: 'e4', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'e5', source: 's1', sourceHandle: 'd', target: 'fb', targetHandle: 'd' },
				{ id: 'e6', source: 'fb', sourceHandle: 'd', target: 'un', targetHandle: 'b' },
				{ id: 'e7', source: 'un', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'eu', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'er', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'es', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'eo', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('scene_sdf_zone_z_image');
	});

	it('rejects fractal motif pullback when motif slice contains a scene SDF zone end marker', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'zb',
					typeId: 'scene_sdf_zone_begin',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'z' },
				},
				{ id: 's0', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.15 } },
				{
					id: 'ze',
					typeId: 'scene_sdf_zone_end',
					pass,
					position: { x: 0, y: 0 },
					data: { zoneId: 'z' },
				},
				{
					id: 'fb',
					typeId: 'sdf_tessellate_feedback',
					pass,
					position: { x: 0, y: 0 },
					data: { iters: 1, scale: 1.5 },
				},
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'zb', targetHandle: 'p' },
				{ id: 'e1', source: 'zb', sourceHandle: 'p', target: 's0', targetHandle: 'p' },
				{ id: 'e2', source: 's0', sourceHandle: 'd', target: 'ze', targetHandle: 'd' },
				{ id: 'e3', source: 'ze', sourceHandle: 'd', target: 'fb', targetHandle: 'd' },
				{ id: 'e4', source: 'fb', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'eu', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'er', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'es', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'eo', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(
			r.errors.some((e) => e.includes('fractal motif pullback conflicts with scene SDF zones/repeat')),
		).toBe(true);
	});
});
