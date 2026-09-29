import { describe, expect, it } from 'vitest';
import { compileGraph } from '../graph.js';
import { extractNodeGlslBlock, buildBakedSceneSdfCustomType } from '../../glslExtract.js';
import type { GraphDocument } from '../../types.js';
import { minimalColorGraph } from '../fixtures.js';
import { allBuiltinNodes } from '../../registry.js';

describe('compileGraph', () => {
	it('builtin SDF order: scene_sdf_sink before raymarch_scene before smin_float', () => {
		const ids = allBuiltinNodes.map((n) => n.id);
		const iSink = ids.indexOf('scene_sdf_sink');
		const iRm = ids.indexOf('raymarch_scene');
		const iSmin = ids.indexOf('smin_float');
		expect(iSink).toBeGreaterThan(-1);
		expect(iRm).toBeGreaterThan(-1);
		expect(iSmin).toBeGreaterThan(-1);
		expect(iSink).toBeLessThan(iRm);
		expect(iRm).toBeLessThan(iSmin);
	});

	it('extractNodeGlslBlock and buildBakedSceneSdfCustomType', () => {
		const doc = minimalColorGraph();
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		const block = extractNodeGlslBlock(fs, 'c1');
		expect(block).toBeTruthy();
		expect(block!).toContain('cos');
		expect(buildBakedSceneSdfCustomType(fs, 'image', 'x')).toBeNull();
	});

	it('compiles a minimal image pass', () => {
		const r = compileGraph(minimalColorGraph());
		expect(r.errors).toEqual([]);
		expect(r.passes.image?.fragmentSource).toContain('fragColor');
		expect(r.passes.image?.fragmentSource).toContain('// node: o1');
		expect(r.manifest.passes.some((p) => p.id === 'image')).toBe(true);
		const imgU = r.manifest.passes.find((p) => p.id === 'image')!.uniforms;
		expect(imgU.some((u) => u.nodeId === 'c1' && u.paramId === 'freq')).toBe(true);
		expect(r.passes.image?.fragmentSource).toContain('u_c1_freq');
	});

	it('raymarch_sphere output stays in main() scope for downstream nodes', () => {
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'n1', typeId: 'uv', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{ id: 'n2', typeId: 'raymarch_sphere', pass: 'image', position: { x: 0, y: 0 }, data: { r: 0.45, fov: 60, camZ: 3, maxSteps: 96 } },
				{ id: 'n3', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'uv', targetHandle: 'uv' },
				{ id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'col', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('vec4 g_n2_col');
		expect(fs).toContain('fragColor = g_n2_col');
		const colDecl = fs.indexOf('vec4 g_n2_col');
		const fragAssign = fs.indexOf('fragColor = g_n2_col');
		expect(fragAssign).toBeGreaterThan(colDecl);
	});

	it('sdf_primitive torus uses IQ XZ ring (length(p.xz), p.y)', () => {
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
					data: { shape: 'torus', R: 0.4, r: 0.1 },
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
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('length(p.xz)');
		expect(fs).toMatch(/length\(vec2\(length\(p\.xz\)/);
	});

	it('sdf_primitive infinite Y cylinder and capped cylinder', () => {
		const pass = 'image' as const;
		const docInf: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 's1',
					typeId: 'sdf_primitive',
					pass,
					position: { x: 0, y: 0 },
					data: { shape: 'cylinder_y', r: 0.2 },
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
		const rInf = compileGraph(docInf);
		expect(rInf.errors).toEqual([]);
		expect(rInf.passes.image!.fragmentSource).toContain('length(p.xz)');

		const docCap: GraphDocument = {
			...docInf,
			nodes: docInf.nodes.map((n) =>
				n.id === 's1' ? { ...n, data: { shape: 'capped_cylinder_y', r: 0.25, h: 0.35 } } : n,
			),
		};
		const rCap = compileGraph(docCap);
		expect(rCap.errors).toEqual([]);
		expect(rCap.passes.image!.fragmentSource).toContain('abs(vec2(length(p.xz)');
	});

	it('raymarch_scene emits IQ-style gradient normals and shadow sampling', () => {
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
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('raymarchingdf');
		expect(fs).toContain('rmimprovement');
		expect(fs).toMatch(/scene_sdf_image\([^\)]+\s*\+\s*ve_/);
		expect(fs).toContain('sha_');
		expect(fs).toContain('occ_');
		expect(fs).toContain('stepScale');
		expect(fs).toContain('distTrust');
		expect(fs).toContain('minStep');
		expect(fs).toContain('fogDensity');
		expect(fs).toContain('relHitEps');
		expect(fs).toContain('shadowHitEps');
		expect(fs).not.toContain('giAcc_');
	});

	it('raymarch_scene emits diffuse GI block when giOn', () => {
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
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('giAcc_');
		expect(fs).toContain('gl_FragCoord');
	});

	it('sdf_primitive capsule_segment emits sdCapsule-style code', () => {
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
					data: { shape: 'capsule_segment', cap_ax: -0.2, cap_bx: 0.2, cap_r: 0.1 },
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
		expect(r.passes.image!.fragmentSource).toContain('capPa_');
	});

	it('domain_repeat_limited compiles opLimitedRep', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'domain_repeat_limited_xyz', pass, position: { x: 0, y: 0 }, data: { cx: 2, cy: 2, cz: 2, lx: 2, ly: 2, lz: 2 } },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.3 } },
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
		expect(r.passes.image!.fragmentSource).toMatch(/clamp\s*\(\s*round\(/);
	});

	it('prelude includes smax and iq_fbm3', () => {
		const doc = minimalColorGraph();
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('float smax(');
		expect(fs).toContain('iq_fbm3');
	});

	it('domain_fbm_displace uses iq_fbm3', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'domain_fbm_displace', pass, position: { x: 0, y: 0 }, data: { freq: 2, lac: 2, gain: 0.5, amp: 0.05 } },
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
		expect(r.passes.image!.fragmentSource).toContain('iq_fbm3');
	});

	it('domain_noise_displace uses iq_hash31 prelude', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'domain_noise_displace', pass, position: { x: 0, y: 0 }, data: { freq: 2, amp: 0.05 } },
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
		expect(fs).toContain('iq_hash31');
		expect(fs).toContain('pnd_');
		expect(fs).toContain('iTime');
	});

});
