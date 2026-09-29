import type { GraphDocument } from '../types.js';

export function minimalColorGraph(): GraphDocument {
	return {
		version: 1,
		meta: { name: 'test' },
		nodes: [
			{ id: 't1', typeId: 'time', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			{ id: 'c1', typeId: 'sin_time_color', pass: 'image', position: { x: 0, y: 0 }, data: {} },
			{ id: 'v1', typeId: 'vec4_from_vec3', pass: 'image', position: { x: 0, y: 0 }, data: { a: 1 } },
			{ id: 'o1', typeId: 'frag_output', pass: 'image', position: { x: 0, y: 0 }, data: {} },
		],
		edges: [
			{ id: 'e1', source: 'c1', sourceHandle: 'rgb', target: 'v1', targetHandle: 'rgb' },
			{ id: 'e2', source: 'v1', sourceHandle: 'col', target: 'o1', targetHandle: 'color' },
			{ id: 'e3', source: 't1', sourceHandle: 't', target: 'c1', targetHandle: 't' },
		],
	};
}
