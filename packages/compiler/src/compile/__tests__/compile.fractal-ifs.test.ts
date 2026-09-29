import { describe, expect, it } from 'vitest';
import { compileGraph } from '../graph.js';
import type { GraphDocument } from '../../types.js';

describe('compileGraph', () => {
	it('fractal_color_ramp and ifs_to_rgb expose new uniforms', () => {
		const pass = 'image' as const;
		const docFr: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'f1', typeId: 'float_const', pass, position: { x: 0, y: 0 }, data: { value: 0.3 } },
				{ id: 'cr', typeId: 'fractal_color_ramp', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'f1', sourceHandle: 'v', target: 'cr', targetHandle: 't' },
				{ id: 'e2', source: 'cr', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e3', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const rFr = compileGraph(docFr);
		expect(rFr.errors).toEqual([]);
		expect(rFr.manifest.passes[0].uniforms.some((u) => u.nodeId === 'cr' && u.paramId === 'freq')).toBe(true);
		expect(rFr.passes.image!.fragmentSource).toContain('u_cr_b1');

		const docIfs: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'ir', typeId: 'ifs_to_rgb', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'ir', targetHandle: 'z' },
				{ id: 'e2', source: 'ir', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e3', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const rIfs = compileGraph(docIfs);
		expect(rIfs.errors).toEqual([]);
		expect(rIfs.manifest.passes[0].uniforms.some((u) => u.nodeId === 'ir' && u.paramId === 'gain')).toBe(true);
		expect(rIfs.passes.image!.fragmentSource).toContain('u_ir_bias');
	});

	it('julia_escape emits smooth log2(log2) normalization', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'j1', typeId: 'julia_escape', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'c1', typeId: 'fractal_color_ramp', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'j1', targetHandle: 'uv' },
				{ id: 'e2', source: 'j1', sourceHandle: 'esc', target: 'c1', targetHandle: 't' },
				{ id: 'e3', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e4', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toMatch(/log2\s*\(\s*log2\s*\(\s*z2j_/);
	});

	it('burning_ship_escape uses abs on cross term', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'b1', typeId: 'burning_ship_escape', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'c1', typeId: 'fractal_color_ramp', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'b1', targetHandle: 'uv' },
				{ id: 'e2', source: 'b1', sourceHandle: 'esc', target: 'c1', targetHandle: 't' },
				{ id: 'e3', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e4', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toMatch(/2\.0\s*\*\s*abs\s*\(\s*zbs_/);
	});

	it('mandelbrot_orbit_trap tracks dmin_ orbit distance', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 't1', typeId: 'mandelbrot_orbit_trap', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'c1', typeId: 'cosine_palette', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 't1', targetHandle: 'uv' },
				{ id: 'e2', source: 't1', sourceHandle: 'trap', target: 'c1', targetHandle: 't' },
				{ id: 'e3', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e4', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toContain('dmin_');
	});

	it('ifs_affine3 emits mat3 multiply and translation', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'v3', typeId: 'vec3_const', pass, position: { x: 0, y: 0 }, data: { r: 0.2, g: 0.2, b: 0.2 } },
				{ id: 'a3', typeId: 'ifs_affine3', pass, position: { x: 0, y: 0 }, data: { tx: 0.02, ty: -0.01, tz: 0.05 } },
				{ id: 'v4', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'v3', sourceHandle: 'rgb', target: 'a3', targetHandle: 'p' },
				{ id: 'e2', source: 'a3', sourceHandle: 'p', target: 'v4', targetHandle: 'rgb' },
				{ id: 'e3', source: 'v4', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain("column-major mat3");
		expect(fs).toMatch(/M3_\w+\s*\*/);
	});

	it('ifs_iterate3 emits fract lattice loop in scene_sdf', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'it3', typeId: 'ifs_iterate3', pass, position: { x: 0, y: 0 }, data: { iters: 4 } },
				{ id: 'sp', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.28 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r8', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'it3', targetHandle: 'p' },
				{ id: 'e1', source: 'it3', sourceHandle: 'p', target: 'sp', targetHandle: 'p' },
				{ id: 'e2', source: 'sp', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e3', source: 'u1', sourceHandle: 'uv', target: 'r8', targetHandle: 'uv' },
				{ id: 'e4', source: 'r8', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e5', source: 'r8', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e6', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('fract lattice (3D)');
		expect(fs).toMatch(/fract\s*\(\s*qi3_\w+/);
	});

	it('ifs_pick_shorter3 emits min-norm vec3 branch', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'v3', typeId: 'vec3_const', pass, position: { x: 0, y: 0 }, data: { r: 0.1, g: 0.1, b: 0.1 } },
				{ id: 'a1', typeId: 'ifs_affine3', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'a2', typeId: 'ifs_affine3', pass, position: { x: 0, y: 0 }, data: { m00: 0.4, m11: 0.4, m22: 0.4, tx: 0.1 } },
				{ id: 'p1', typeId: 'ifs_pick_shorter3', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v4', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'v3', sourceHandle: 'rgb', target: 'a1', targetHandle: 'p' },
				{ id: 'e2', source: 'v3', sourceHandle: 'rgb', target: 'a2', targetHandle: 'p' },
				{ id: 'e3', source: 'a1', sourceHandle: 'p', target: 'p1', targetHandle: 'a' },
				{ id: 'e4', source: 'a2', sourceHandle: 'p', target: 'p1', targetHandle: 'b' },
				{ id: 'e5', source: 'p1', sourceHandle: 'p', target: 'v4', targetHandle: 'rgb' },
				{ id: 'e6', source: 'v4', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toContain('min-norm branch vec3');
	});

	it('ifs_pick_shorter2 emits min-norm branch', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'a1', typeId: 'ifs_affine', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'a2', typeId: 'ifs_affine', pass, position: { x: 0, y: 0 }, data: { mxx: 0.5, tx: 0.1 } },
				{ id: 'p1', typeId: 'ifs_pick_shorter2', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'i1', typeId: 'ifs_to_rgb', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'u1', sourceHandle: 'uv', target: 'a1', targetHandle: 'z' },
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'a2', targetHandle: 'z' },
				{ id: 'e2', source: 'a1', sourceHandle: 'out', target: 'p1', targetHandle: 'a' },
				{ id: 'e3', source: 'a2', sourceHandle: 'out', target: 'p1', targetHandle: 'b' },
				{ id: 'e4', source: 'p1', sourceHandle: 'out', target: 'i1', targetHandle: 'z' },
				{ id: 'e5', source: 'i1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e6', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toContain('min-norm branch');
	});

	it('ifs_circle_inversion inverts about circle', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'inv', typeId: 'ifs_circle_inversion', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'i1', typeId: 'ifs_to_rgb', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'inv', targetHandle: 'z' },
				{ id: 'e2', source: 'inv', sourceHandle: 'out', target: 'i1', targetHandle: 'z' },
				{ id: 'e3', source: 'i1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e4', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('circle inversion');
		expect(fs).toMatch(/Rr_/);
		expect(r.manifest.passes[0].uniforms.some((u) => u.nodeId === 'inv' && u.paramId === 'R')).toBe(true);
	});

	it('ifs_sector_fold uses polar wedge', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'sec', typeId: 'ifs_sector_fold', pass, position: { x: 0, y: 0 }, data: { folds: 5 } },
				{ id: 'i1', typeId: 'ifs_to_rgb', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'sec', targetHandle: 'z' },
				{ id: 'e2', source: 'sec', sourceHandle: 'out', target: 'i1', targetHandle: 'z' },
				{ id: 'e3', source: 'i1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e4', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toContain('wedge / sector fold');
	});

	it('ifs_blur_step mixes two branches', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'a1', typeId: 'ifs_affine', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'a2', typeId: 'ifs_affine', pass, position: { x: 0, y: 0 }, data: { mxx: 0.4 } },
				{ id: 'bl', typeId: 'ifs_blur_step', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'i1', typeId: 'ifs_to_rgb', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'u1', sourceHandle: 'uv', target: 'a1', targetHandle: 'z' },
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'a2', targetHandle: 'z' },
				{ id: 'e2', source: 'a1', sourceHandle: 'out', target: 'bl', targetHandle: 'a' },
				{ id: 'e3', source: 'a2', sourceHandle: 'out', target: 'bl', targetHandle: 'b' },
				{ id: 'e4', source: 'bl', sourceHandle: 'out', target: 'i1', targetHandle: 'z' },
				{ id: 'e5', source: 'i1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e6', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.manifest.passes[0].uniforms.some((u) => u.nodeId === 'bl' && u.paramId === 't')).toBe(true);
		expect(r.passes.image!.fragmentSource).toMatch(/mix\s*\(/);
	});

	it('newton_escape exposes eps uniform and basin split', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'n1', typeId: 'newton_escape', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'c1', typeId: 'fractal_color_ramp', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'n1', targetHandle: 'uv' },
				{ id: 'e2', source: 'n1', sourceHandle: 'esc', target: 'c1', targetHandle: 't' },
				{ id: 'e3', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e4', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.manifest.passes[0].uniforms.some((u) => u.nodeId === 'n1' && u.paramId === 'eps')).toBe(true);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('Newton basins for z^3');
		expect(fs).toContain('r0b_');
	});

	it('ifs_affine emits mat2 Maf multiply', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'a1', typeId: 'ifs_affine', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'i1', typeId: 'ifs_to_rgb', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'v1', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'a1', targetHandle: 'z' },
				{ id: 'e2', source: 'a1', sourceHandle: 'out', target: 'i1', targetHandle: 'z' },
				{ id: 'e3', source: 'i1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
				{ id: 'e4', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toMatch(/mat2 Maf_/);
	});

	it('raymarch_scene surface iChannel triplanar uses texture at hit', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: { iChannels: { image: { 0: 'bufA' } } },
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'm1',
					typeId: 'raymarch_scene',
					pass,
					position: { x: 0, y: 0 },
					data: {
						surfTexOn: 1,
						surfTexChannel: 0,
						surfTexScale: 1.2,
						surfTexBlend: 0.9,
						surfTexMode: '0',
					},
				},
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
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
		expect(fs).toContain('texture(iChannel0');
		expect(fs).toMatch(/samX_m1|samX_\w+/);
		expect(fs).toMatch(/pmc_m1\.yz|pmc_\w+\.yz/);
		const imgPass = r.manifest.passes.find((p) => p.id === 'image');
   expect(imgPass?.channels.iChannel0).toEqual({ kind: 'buffer', bufferId: 'bufA' });
	});

	it('raymarch_scene surface cylindrical mapping uses atan on XZ', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: { iChannels: { image: { 0: 'bufA' } } },
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{
					id: 'm1',
					typeId: 'raymarch_scene',
					pass,
					position: { x: 0, y: 0 },
					data: {
						surfTexOn: 1,
						surfTexChannel: 0,
						surfTexScale: 1,
						surfTexBlend: 1,
						surfTexMode: '1',
					},
				},
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
				{ id: 'eb', source: 's1', sourceHandle: 'd', target: 'k1', targetHandle: 'd' },
				{ id: 'e1', source: 'u1', sourceHandle: 'uv', target: 'r1', targetHandle: 'uv' },
				{ id: 'e2', source: 'r1', sourceHandle: 'ro', target: 'm1', targetHandle: 'ro' },
				{ id: 'e3', source: 'r1', sourceHandle: 'rd', target: 'm1', targetHandle: 'rd' },
				{ id: 'e4', source: 'm1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		expect(r.passes.image!.fragmentSource).toMatch(/atan\s*\(\s*pmc_m1\.x\s*,\s*pmc_m1\.z\s*\)|atan\s*\(\s*pmc_\w+\.x\s*,\s*pmc_\w+\.z\s*\)/);
	});

	it('domain_rotate_y_time uses phase and speed uniforms', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'rot', typeId: 'domain_rotate_y_time', pass, position: { x: 0, y: 0 }, data: { speed: 0.5 } },
				{ id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.35 } },
				{ id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e0', source: 'p1', sourceHandle: 'p', target: 'rot', targetHandle: 'p' },
				{ id: 'ea', source: 'rot', sourceHandle: 'p', target: 's1', targetHandle: 'p' },
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
		expect(fs).toContain('u_rot_speed');
		expect(fs).toContain('ang_');
	});

});
