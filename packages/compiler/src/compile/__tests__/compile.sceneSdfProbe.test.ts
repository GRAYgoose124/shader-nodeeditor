import { describe, expect, it } from 'vitest';
import { compileGraph } from '../graph.js';
import type { GraphDocument } from '../../types.js';

function minimalRaymarchSceneDoc(): GraphDocument {
	const pass = 'image' as const;
	const nUv = { id: 'u1', typeId: 'uv', pass, position: { x: 0, y: 0 }, data: {} };
	const nRay = { id: 'r1', typeId: 'ray_from_uv', pass, position: { x: 0, y: 0 }, data: { fov: 60, camZ: 3 } };
	const nMarch = { id: 'm1', typeId: 'raymarch_scene', pass, position: { x: 0, y: 0 }, data: {} };
	const nOut = { id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} };
	const nP = { id: 'p1', typeId: 'sdf_param_p', pass, position: { x: 0, y: 0 }, data: {} };
	const nS = { id: 's1', typeId: 'sdf_sphere', pass, position: { x: 0, y: 0 }, data: { r: 0.4 } };
	const nSk = { id: 'k1', typeId: 'scene_sdf_sink', pass, position: { x: 0, y: 0 }, data: {} };
	return {
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
}

describe('compileGraph scene SDF probe debug', () => {
	it('injects early-out, uniforms, and scene_sdf_image call for image pass', () => {
		const doc = minimalRaymarchSceneDoc();
		const r = compileGraph(doc, {
			sceneSdfProbe: { pass: 'image', visualization: 'distance_rgb' },
		});
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('uniform float u_dbg_scene_on');
		expect(fs).toContain('uniform vec3 u_dbg_scene_p');
		expect(fs).toContain('uniform float u_dbg_scene_slice');
		expect(fs).toContain('v_uv');
		expect(fs).toContain('if (u_dbg_scene_on > 0.5)');
		expect(fs).toMatch(/float d_dbg = scene_sdf_image\(p_dbg\)/);
		expect(fs).toContain('tanh(d_dbg * u_dbg_scene_scale)');
		expect(fs).toContain('return;');
		const imgPass = r.manifest.passes.find((p) => p.id === 'image');
		expect(imgPass?.supportsSceneSdfProbe).toBe(true);
	});

	it('gradient visualization emits finite-difference block', () => {
		const doc = minimalRaymarchSceneDoc();
		const r = compileGraph(doc, {
			sceneSdfProbe: { pass: 'image', visualization: 'gradient_mag' },
		});
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('dx_dbg');
		expect(fs).toContain('gm_dbg');
	});

	it('does not inject probe when debug targets another pass', () => {
		const doc = minimalRaymarchSceneDoc();
		const r = compileGraph(doc, {
			sceneSdfProbe: { pass: 'bufA', visualization: 'distance_rgb' },
		});
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).not.toContain('u_dbg_scene_on');
	});

	it('wire probe on raymarch node overwrites fragColor tail', () => {
		const doc = minimalRaymarchSceneDoc();
		const r = compileGraph(doc, {
			wireProbe: { pass: 'image', targetNodeId: 'm1' },
		});
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('uniform float u_dbg_wire_on');
		expect(fs).toContain('if (u_dbg_wire_on > 0.5)');
		expect(fs).toContain('g_r1_rd');
		const imgPass = r.manifest.passes.find((p) => p.id === 'image');
		expect(imgPass?.supportsWireProbe).toBe(true);
	});
});
