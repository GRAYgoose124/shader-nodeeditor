import { describe, expect, it } from 'vitest';
import { compileGraph } from '../graph.js';
import { validateGraph } from '../../validate.js';
import { buildRegistry } from '../../registry.js';
import type { GraphDocument } from '../../types.js';

describe('glsl_repeat_* zones (main graph)', () => {
	it('compiles a float repeat zone on image', () => {
		const p = 'image' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: { name: 'rz' },
			nodes: [
				{
					id: 'rb',
					typeId: 'glsl_repeat_begin',
					pass: p,
					position: { x: 0, y: 0 },
					data: { zoneId: 'z', count: 3, indexName: 'k' },
				},
				{
					id: 'ex',
					typeId: 'expr_float',
					pass: p,
					position: { x: 0, y: 0 },
					data: { expression: '0.0 + {{loop:k}}' },
				},
				{ id: 're', typeId: 'glsl_repeat_end', pass: p, position: { x: 0, y: 0 }, data: { zoneId: 'z' } },
				{
					id: 'c3',
					typeId: 'expr_vec3',
					pass: p,
					position: { x: 0, y: 0 },
					data: { expression: 'vec3({{in:a}}, {{in:b}}, 0.5)' },
				},
				{ id: 'v4', typeId: 'vec4_from_vec3', pass: p, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass: p, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'rb', sourceHandle: 'carry', target: 'ex', targetHandle: 'a' },
				{ id: 'e2', source: 'ex', sourceHandle: 'out', target: 're', targetHandle: 'in' },
				{ id: 'e3', source: 're', sourceHandle: 'out', target: 'c3', targetHandle: 'a' },
				{ id: 'e4', source: 're', sourceHandle: 'out', target: 'c3', targetHandle: 'b' },
				{ id: 'e5', source: 'c3', sourceHandle: 'out', target: 'v4', targetHandle: 'rgb' },
				{ id: 'e6', source: 'v4', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('for (int k_rb');
		expect(fs).toMatch(/float\s*\(\s*k_rb\s*\)/);
		expect(fs).toContain('glsl_repeat zone "z"');
	});

	it('rejects texture sampling inside a repeat zone (expr body)', () => {
		const pass = 'bufA' as const;
		const doc: GraphDocument = {
			version: 1,
			meta: { name: 'bad', iChannels: { bufA: { 0: 'bufA' } } },
			nodes: [
				{ id: 'rb', typeId: 'glsl_repeat_begin', pass, position: { x: 0, y: 0 }, data: { zoneId: 'z', count: 2 } },
				{
					id: 'ex',
					typeId: 'expr_float',
					pass,
					position: { x: 0, y: 0 },
					data: { expression: 'float(texelFetch(iChannel0, ivec2(0), 0).x)' },
				},
				{ id: 're', typeId: 'glsl_repeat_end', pass, position: { x: 0, y: 0 }, data: { zoneId: 'z' } },
				{
					id: 'c3',
					typeId: 'expr_vec3',
					pass,
					position: { x: 0, y: 0 },
					data: { expression: 'vec3({{in:a}}, {{in:b}}, 0.5)' },
				},
				{ id: 'v4', typeId: 'vec4_from_vec3', pass, position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass, position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'e1', source: 'rb', sourceHandle: 'carry', target: 'ex', targetHandle: 'a' },
				{ id: 'e2', source: 'ex', sourceHandle: 'out', target: 're', targetHandle: 'in' },
				{ id: 'e3', source: 're', sourceHandle: 'out', target: 'c3', targetHandle: 'a' },
				{ id: 'e4', source: 're', sourceHandle: 'out', target: 'c3', targetHandle: 'b' },
				{ id: 'e5', source: 'c3', sourceHandle: 'out', target: 'v4', targetHandle: 'rgb' },
				{ id: 'e6', source: 'v4', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const reg = buildRegistry();
		const v = validateGraph(doc, reg);
		expect(v.ok).toBe(false);
		expect(v.errors.some((e) => e.includes('sample textures'))).toBe(true);
	});
});
