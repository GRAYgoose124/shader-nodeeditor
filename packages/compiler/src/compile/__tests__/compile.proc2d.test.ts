import { describe, expect, it } from 'vitest';
import { compileGraph } from '../graph.js';
import type { GraphDocument } from '../../types.js';

describe('compileGraph', () => {
	it('proc2d_domain + proc2d_fbm + cosine_palette emits iq_fbm3 in main', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'proc2d_domain', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'f1', typeId: 'proc2d_fbm', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'c1', typeId: 'cosine_palette', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'd1', targetHandle: 'uv' },
				{ id: 'e2', source: 'd1', sourceHandle: 'out', target: 'f1', targetHandle: 'p' },
				{ id: 'e3', source: 'f1', sourceHandle: 'n', target: 'c1', targetHandle: 't' },
				{ id: 'e4', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e5', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('iq_fbm3');
		expect(fs).toContain('qfb2_');
	});

	it('proc2d_warp_fbm uses iq_fbm3 for warp then iq_vnoise', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'proc2d_domain', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'w1', typeId: 'proc2d_warp_fbm', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'f1', typeId: 'proc2d_vnoise', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'c1', typeId: 'cosine_palette', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'd1', targetHandle: 'uv' },
				{ id: 'e2', source: 'd1', sourceHandle: 'out', target: 'w1', targetHandle: 'p' },
				{ id: 'e3', source: 'w1', sourceHandle: 'out', target: 'f1', targetHandle: 'p' },
				{ id: 'e4', source: 'f1', sourceHandle: 'n', target: 'c1', targetHandle: 't' },
				{ id: 'e5', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e6', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('iq_vnoise');
		expect(fs).toContain('w0_');
	});

	it('proc2d_hash emits iq_hash31 in main', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'proc2d_domain', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'h1', typeId: 'proc2d_hash', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'c1', typeId: 'cosine_palette', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'd1', targetHandle: 'uv' },
				{ id: 'e2', source: 'd1', sourceHandle: 'out', target: 'h1', targetHandle: 'p' },
				{ id: 'e3', source: 'h1', sourceHandle: 'h', target: 'c1', targetHandle: 't' },
				{ id: 'e4', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e5', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('// node: h1');
		expect(fs).toContain('iq_hash31(vec3(');
	});

	it('proc2d_voronoi_f12 + ifs_to_rgb emits iq_voronoi3_f12 in main', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'proc2d_domain', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'vo1', typeId: 'proc2d_voronoi_f12', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'rgb1', typeId: 'ifs_to_rgb', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'd1', targetHandle: 'uv' },
				{ id: 'e2', source: 'd1', sourceHandle: 'out', target: 'vo1', targetHandle: 'p' },
				{
					id: 'e3',
					source: 'vo1',
					sourceHandle: 'f12',
					target: 'rgb1',
					targetHandle: 'z',
				},
				{ id: 'e4', source: 'rgb1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e5', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('// node: vo1');
		expect(fs).toContain('iq_voronoi3_f12');
		expect(fs).toContain('qv2_');
	});

	it('proc2d_fbm_grad_vec + vec3_add doubles gradient for color', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'proc2d_domain', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'g1', typeId: 'proc2d_fbm_grad_vec', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'sum1', typeId: 'vec3_add', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'd1', targetHandle: 'uv' },
				{ id: 'e2', source: 'd1', sourceHandle: 'out', target: 'g1', targetHandle: 'p' },
				{ id: 'e3', source: 'g1', sourceHandle: 'g', target: 'sum1', targetHandle: 'a' },
				{ id: 'e4', source: 'g1', sourceHandle: 'g', target: 'sum1', targetHandle: 'b' },
				{ id: 'e5', source: 'sum1', sourceHandle: 'out', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e6', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('iq_fbm3_grad_fd');
		expect(fs).toContain('qgv2_');
	});

	it('proc2d_ridged_fbm shapes ridge from iq_fbm3', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'proc2d_domain', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'proc2d_ridged_fbm', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'c1', typeId: 'cosine_palette', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'd1', targetHandle: 'uv' },
				{ id: 'e2', source: 'd1', sourceHandle: 'out', target: 'r1', targetHandle: 'p' },
				{ id: 'e3', source: 'r1', sourceHandle: 'n', target: 'c1', targetHandle: 't' },
				{ id: 'e4', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e5', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('qrg_');
		expect(fs).toContain('pow(1.0 - abs(2.0 *');
	});

	it('proc2d_warp_voronoi then vnoise uses iq_voronoi3_f12 warp', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'd1', typeId: 'proc2d_domain', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'w1', typeId: 'proc2d_warp_voronoi', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'f1', typeId: 'proc2d_vnoise', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'c1', typeId: 'cosine_palette', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'd1', targetHandle: 'uv' },
				{ id: 'e2', source: 'd1', sourceHandle: 'out', target: 'w1', targetHandle: 'p' },
				{ id: 'e3', source: 'w1', sourceHandle: 'out', target: 'f1', targetHandle: 'p' },
				{ id: 'e4', source: 'f1', sourceHandle: 'n', target: 'c1', targetHandle: 't' },
				{ id: 'e5', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e6', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('vfvv_');
		expect(fs).toContain('iq_voronoi3_f12');
	});

	it('proc2d bufA procedural + image sample_channel compiles both passes', () => {
		const doc: GraphDocument = {
			version: 1,
			meta: { iChannels: { image: { 0: 'bufA' } } },
			nodes: [
				{ id: 'uA', typeId: 'uv', pass: 'bufA', position: { x: 0, y: 0 }, data: {} },
				{ id: 'dA', typeId: 'proc2d_domain', pass: 'bufA', position: { x: 0, y: 0 }, data: { scale: 2 } },
				{
					id: 'wA',
					typeId: 'proc2d_warp_voronoi',
					pass: 'bufA',
					position: { x: 0, y: 0 },
					data: { freq: 2.5, amp: 0.08 },
				},
				{ id: 'fA', typeId: 'proc2d_fbm_grad', pass: 'bufA', position: { x: 0, y: 0 }, data: { freq: 1.8 } },
				{ id: 'cA', typeId: 'cosine_palette', pass: 'bufA', position: { x: 0, y: 0 }, data: {} },
				{ id: 'vA', typeId: 'vec4_from_vec3', pass: 'bufA', position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'oA', typeId: 'frag_output', pass: 'bufA', position: { x: 0, y: 0 }, data: {} },
				{ id: 'uI', typeId: 'uv', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{ id: 'sI', typeId: 'sample_channel', pass: 'image', position: { x: 0, y: 0 }, data: { channel: 0 } },
				{ id: 'oI', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'a1', source: 'uA', sourceHandle: 'uv', target: 'dA', targetHandle: 'uv' },
				{ id: 'a2', source: 'dA', sourceHandle: 'out', target: 'wA', targetHandle: 'p' },
				{ id: 'a3', source: 'wA', sourceHandle: 'out', target: 'fA', targetHandle: 'p' },
				{ id: 'a4', source: 'fA', sourceHandle: 'n', target: 'cA', targetHandle: 't' },
				{ id: 'a5', source: 'cA', sourceHandle: 'rgb', target: 'vA', targetHandle: 'rgb' },
				{ id: 'a6', source: 'vA', sourceHandle: 'col', target: 'oA', targetHandle: 'color' },
				{ id: 'i1', source: 'uI', sourceHandle: 'uv', target: 'sI', targetHandle: 'uv' },
				{ id: 'i2', source: 'sI', sourceHandle: 'rgba', target: 'oI', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.bufA?.fragmentSource).toContain('iq_fbm3_g');
		expect(r.passes.image?.fragmentSource).toContain('texture(');
		const imgPass = r.manifest.passes.find((p) => p.id === 'image');
   expect(imgPass?.channels.iChannel0).toEqual({ kind: 'buffer', bufferId: 'bufA' });
	});

	it('bufB ping-pong + bufA inject: mix_vec4 compiles and manifest pingPong true', () => {
		const doc: GraphDocument = {
			version: 1,
			meta: {
				iChannels: {
					bufB: { 0: 'bufB', 1: 'bufA' },
					image: { 0: 'bufB' },
				},
			},
			nodes: [
				{ id: 'tA', typeId: 'time', pass: 'bufA', position: { x: 0, y: 0 }, data: {} },
				{ id: 'cA', typeId: 'cosine_palette', pass: 'bufA', position: { x: 0, y: 0 }, data: {} },
				{ id: 'vA', typeId: 'vec4_from_vec3', pass: 'bufA', position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'oA', typeId: 'frag_output', pass: 'bufA', position: { x: 0, y: 0 }, data: {} },
				{ id: 'uB', typeId: 'uv', pass: 'bufB', position: { x: 0, y: 0 }, data: {} },
				{ id: 'sB0', typeId: 'sample_channel', pass: 'bufB', position: { x: 0, y: 0 }, data: { channel: 0 } },
				{ id: 'sB1', typeId: 'sample_channel', pass: 'bufB', position: { x: 0, y: 0 }, data: { channel: 1 } },
				{ id: 'mB', typeId: 'mix_vec4', pass: 'bufB', position: { x: 0, y: 0 }, data: { t: 0.1 } },
				{ id: 'oB', typeId: 'frag_output', pass: 'bufB', position: { x: 0, y: 0 }, data: {} },
				{ id: 'uI', typeId: 'uv', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{ id: 'sI', typeId: 'sample_channel', pass: 'image', position: { x: 0, y: 0 }, data: { channel: 0 } },
				{ id: 'oI', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'a1', source: 'tA', sourceHandle: 't', target: 'cA', targetHandle: 't' },
				{ id: 'a2', source: 'cA', sourceHandle: 'rgb', target: 'vA', targetHandle: 'rgb' },
				{ id: 'a3', source: 'vA', sourceHandle: 'col', target: 'oA', targetHandle: 'color' },
				{ id: 'b1', source: 'uB', sourceHandle: 'uv', target: 'sB0', targetHandle: 'uv' },
				{ id: 'b2', source: 'uB', sourceHandle: 'uv', target: 'sB1', targetHandle: 'uv' },
				{ id: 'b3', source: 'sB0', sourceHandle: 'rgba', target: 'mB', targetHandle: 'a' },
				{ id: 'b4', source: 'sB1', sourceHandle: 'rgba', target: 'mB', targetHandle: 'b' },
				{ id: 'b5', source: 'mB', sourceHandle: 'out', target: 'oB', targetHandle: 'color' },
				{ id: 'i1', source: 'uI', sourceHandle: 'uv', target: 'sI', targetHandle: 'uv' },
				{ id: 'i2', source: 'sI', sourceHandle: 'rgba', target: 'oI', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fsB = r.passes.bufB!.fragmentSource;
		expect(fsB).toContain('texture(iChannel0');
		expect(fsB).toContain('texture(iChannel1');
		expect(fsB).toMatch(/mix\s*\(/);
		const bufBPass = r.manifest.passes.find((p) => p.id === 'bufB');
		expect(bufBPass?.pingPong).toBe(true);
   expect(bufBPass?.channels.iChannel0).toEqual({ kind: 'buffer', bufferId: 'bufB' });
   expect(bufBPass?.channels.iChannel1).toEqual({ kind: 'buffer', bufferId: 'bufA' });
	});
});
