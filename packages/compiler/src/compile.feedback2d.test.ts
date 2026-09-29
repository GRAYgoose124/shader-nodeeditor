import { describe, expect, it } from 'vitest';
import { compileGraph } from './compile.js';
import type { GraphDocument } from './types.js';
import { suesqueSandboxFieldGraphDocument } from './presets/suesqueSandboxField.js';

describe('compileGraph', () => {
	it('feedback2d: texel + 3×3 conv + expr_vec4 reaction step compiles (bufA self ping-pong)', () => {
		const pass = 'bufA' as const;
		const chg = `
  vec4 c_ = {{in:a}};
  float r = c_.x, g = c_.y, b = c_.z;
  float mu = {{in:x}};
  vec4 S1 = {{in:b}}, S2 = {{in:c}}, S3 = {{in:d}};
  float bcr = b * cos(r) + b * sin(g);
  float rgr = r * cos(g) + r * sin(b);
  float gbr = g * cos(b) + g * sin(r);
  float P1 = bcr - (rgr * mu);
  float P2 = rgr - (gbr * mu);
  float P3 = gbr - (bcr * mu);
  vec4 BRCHG = vec4(P1, P2, P3, 0.0).zxyw * S1;
  vec4 RGCHG = vec4(P1, P2, P3, 0.0).xyzw * S2;
  vec4 GBCHG = vec4(P1, P2, P3, 0.0).yzxw * S3;
  {{out:out}} = BRCHG + RGCHG + GBCHG;
`;
		const doc: GraphDocument = {
			version: 1,
			meta: { name: 'suesque-pilot-test', iChannels: { bufA: { 0: 'bufA' } } },
			nodes: [
				{ id: 'fc', typeId: 'frag_coord_xy', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'tf', typeId: 'sample_channel_texel', pass, position: { x: 0, y: 0 }, data: { channel: 0 } },
				{
					id: 'cv',
					typeId: 'conv3x3_texel',
					pass,
					position: { x: 0, y: 0 },
					data: { channel: 0, wrapMode: '0', wCenter: -1, wCardinal: 0.2, wDiagonal: 0.05 },
				},
				{ id: 'sc', typeId: 'vec4_scale', pass, position: { x: 0, y: 0 }, data: { s: 1.12 } },
				{ id: 'ad', typeId: 'vec4_add', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'vec4_const', pass, position: { x: 0, y: 0 }, data: { r: 0.87, g: 0.87, b: 0.87, a: 0 } },
				{ id: 's2', typeId: 'vec4_const', pass, position: { x: 0, y: 0 }, data: { r: 0.13, g: 0.13, b: 0.13, a: 0 } },
				{ id: 's3', typeId: 'vec4_const', pass, position: { x: 0, y: 0 }, data: { r: 0.13, g: 0.13, b: 0.13, a: 0 } },
				{ id: 'mu', typeId: 'float_const', pass, position: { x: 0, y: 0 }, data: { value: 0.33 } },
				{ id: 'ex', typeId: 'expr_vec4', pass, position: { x: 0, y: 0 }, data: { expression: chg } },
				{ id: 'ad2', typeId: 'vec4_add', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'de', typeId: 'vec4_scale', pass, position: { x: 0, y: 0 }, data: { s: 0.9812 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'fc', sourceHandle: 'xy', target: 'tf', targetHandle: 'pixel' },
				{ id: 'e2', source: 'fc', sourceHandle: 'xy', target: 'cv', targetHandle: 'pixel' },
				{ id: 'e3', source: 'cv', sourceHandle: 'out', target: 'sc', targetHandle: 'a' },
				{ id: 'e4', source: 'tf', sourceHandle: 'rgba', target: 'ad', targetHandle: 'a' },
				{ id: 'e5', source: 'sc', sourceHandle: 'out', target: 'ad', targetHandle: 'b' },
				{ id: 'e6', source: 'ad', sourceHandle: 'out', target: 'ex', targetHandle: 'a' },
				{ id: 'e7', source: 's1', sourceHandle: 'rgba', target: 'ex', targetHandle: 'b' },
				{ id: 'e8', source: 's2', sourceHandle: 'rgba', target: 'ex', targetHandle: 'c' },
				{ id: 'e9', source: 's3', sourceHandle: 'rgba', target: 'ex', targetHandle: 'd' },
				{ id: 'e10', source: 'mu', sourceHandle: 'v', target: 'ex', targetHandle: 'x' },
				{ id: 'e11', source: 'ad', sourceHandle: 'out', target: 'ad2', targetHandle: 'a' },
				{ id: 'e12', source: 'ex', sourceHandle: 'out', target: 'ad2', targetHandle: 'b' },
				{ id: 'e13', source: 'ad2', sourceHandle: 'out', target: 'de', targetHandle: 'a' },
				{ id: 'e14', source: 'de', sourceHandle: 'out', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.bufA!.fragmentSource;
		expect(fs).toContain('gl_FragCoord.xy');
		expect(fs).toContain('texelFetch(iChannel0');
		expect(fs).toContain('3×3 texel stencil');
		const manifest = r.manifest.passes.find((p) => p.id === 'bufA');
		expect(manifest?.pingPong).toBe(true);
	});

	it('vec4_channels + float trig + vec4_swizzle compile (image)', () => {
		const pass = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: {},
			nodes: [
				{ id: 'c4', typeId: 'vec4_const', pass, position: { x: 0, y: 0 }, data: { r: 0.1, g: 0.2, b: 0.3, a: 1 } },
				{ id: 'sp', typeId: 'vec4_channels', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'fc', typeId: 'float_cos', pass, position: { x: 0, y: 0 }, data: {} },
				{ id: 'p3', typeId: 'vec4_from_xyz_w', pass, position: { x: 0, y: 0 }, data: { w: 0 } },
				{ id: 'sw', typeId: 'vec4_swizzle', pass, position: { x: 0, y: 0 }, data: { pattern: 'zxyw' } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'c4', sourceHandle: 'rgba', target: 'sp', targetHandle: 'rgba' },
				{ id: 'e2', source: 'sp', sourceHandle: 'x', target: 'fc', targetHandle: 'x' },
				{ id: 'e3', source: 'fc', sourceHandle: 'out', target: 'p3', targetHandle: 'x' },
				{ id: 'e4', source: 'sp', sourceHandle: 'y', target: 'p3', targetHandle: 'y' },
				{ id: 'e5', source: 'sp', sourceHandle: 'z', target: 'p3', targetHandle: 'z' },
				{ id: 'e6', source: 'p3', sourceHandle: 'rgba', target: 'sw', targetHandle: 'v' },
				{ id: 'e7', source: 'sw', sourceHandle: 'out', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('.zxyw');
		expect(fs).toMatch(/cos\(/);
	});

	it('feedback2d: suesque sandbox field graph (full preset shape) compiles', () => {
		const doc = structuredClone(suesqueSandboxFieldGraphDocument());
		doc.meta = { ...doc.meta, name: 'suesque-graph-test' };
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const bufA = r.manifest.passes.find((p) => p.id === 'bufA');
		const fs = r.passes.bufA!.fragmentSource;
		expect(fs).toContain('u_sq_de_s');
		const decayU = bufA?.uniforms.find((u) => u.nodeId === 'sq-de' && u.paramId === 's');
		expect(decayU?.default).toBe(0.9812);
		expect(fs).toContain('.zxyw');
		expect(fs).toMatch(/cos\(/);
		expect(fs).toMatch(/sin\(/);
		expect(fs).toContain('// node: sq-spl');
		expect(fs).toContain('u_sq_d1_radius');
		const rD1 = bufA?.uniforms.find((u) => u.nodeId === 'sq-d1' && u.paramId === 'radius');
		expect(rD1?.default).toBe(0.005);
		expect(r.passes.image!.fragmentSource).toContain('texelFetch(iChannel0');
		expect(bufA?.pingPong).toBe(true);
	});
});
