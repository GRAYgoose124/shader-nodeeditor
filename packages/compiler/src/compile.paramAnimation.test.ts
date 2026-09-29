import { describe, expect, it } from 'vitest';
import { compileGraph } from './compile.js';
import { minimalColorGraph } from './compile.fixtures.js';
import { paramAnimKey } from './paramAnimation.js';
import type { GraphDocument } from './types.js';

describe('paramAnimations (meta.editor.paramAnimations)', () => {
	it('tags uniform manifest when animation enabled', () => {
		const doc = minimalColorGraph();
		const key = paramAnimKey('c1', 'freq');
		doc.meta = {
			...doc.meta,
			editor: {
				paramAnimations: {
					[key]: { nodeId: 'c1', paramId: 'freq', curve: 'sine', speed: 1, phase: 0, depth: 1 },
				},
			},
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const u = r.manifest.passes.find((p) => p.id === 'image')!.uniforms.find((x) => x.paramId === 'freq');
		expect(u?.driver).toBe('paramAnimation');
		expect(r.passes.image?.fragmentSource).toContain('u_c1_freq');
	});

	it('promotes literal float param to uniform and emits uniform name in GLSL', () => {
		const doc: GraphDocument = {
			version: 1,
			meta: {
				editor: {
					paramAnimations: {
						[paramAnimKey('k1', 'sides')]: {
							nodeId: 'k1',
							paramId: 'sides',
							curve: 'saw',
							speed: 0.2,
							phase: 0,
							depth: 1,
						},
					},
				},
			},
			nodes: [
				{ id: 'u1', typeId: 'uv', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{
					id: 'k1',
					typeId: 'proc2d_kaleidoscope',
					pass: 'image',
					position: { x: 0, y: 0 },
					data: { sides: 5 },
				},
				{ id: 'l1', typeId: 'proc2d_length', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{ id: 's1', typeId: 'proc2d_saturate', pass: 'image', position: { x: 0, y: 0 }, data: {} },
				{
					id: 'e1',
					typeId: 'expr_vec3',
					pass: 'image',
					position: { x: 0, y: 0 },
					data: { expression: 'vec3({{in:a}}, {{in:b}}, 0.25)' },
				},
				{ id: 'v1', typeId: 'vec4_from_vec3', pass: 'image', position: { x: 0, y: 0 }, data: { a: 1 } },
				{ id: 'o1', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			],
			edges: [
				{ id: 'ea', source: 'u1', sourceHandle: 'uv', target: 'k1', targetHandle: 'p' },
				{ id: 'eb', source: 'k1', sourceHandle: 'out', target: 'l1', targetHandle: 'p' },
				{ id: 'ec', source: 'l1', sourceHandle: 'r', target: 's1', targetHandle: 'x' },
				{ id: 'ed', source: 's1', sourceHandle: 'out', target: 'e1', targetHandle: 'a' },
				{ id: 'ee', source: 's1', sourceHandle: 'out', target: 'e1', targetHandle: 'b' },
				{ id: 'ef', source: 'e1', sourceHandle: 'out', target: 'v1', targetHandle: 'rgb' },
				{ id: 'eg', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			],
		};
		const r = compileGraph(doc);
		expect(r.errors).toEqual([]);
		const fs = r.passes.image!.fragmentSource;
		expect(fs).toContain('u_k1_sides');
		expect(fs).not.toMatch(/max\(float\(5/);
		const u = r.manifest.passes.find((p) => p.id === 'image')!.uniforms.find((x) => x.nodeId === 'k1');
		expect(u?.driver).toBe('paramAnimation');
	});
});
