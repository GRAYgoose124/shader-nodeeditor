import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/svelte';
import type { FlowNodeAny } from '$lib/flowDoc.js';
import {
	SUBGRAPH_CLIPBOARD_KIND,
	SUBGRAPH_CLIPBOARD_VERSION,
	mergeSubgraphV1IntoFlow,
	parseSubgraphClipboardV1,
} from './subgraphClipboard.js';

describe('parseSubgraphClipboardV1', () => {
	it('returns null for wrong kind or version', () => {
		expect(parseSubgraphClipboardV1(null)).toBeNull();
		expect(parseSubgraphClipboardV1({ kind: 'x', version: 1, nodes: [] })).toBeNull();
		expect(
			parseSubgraphClipboardV1({ kind: SUBGRAPH_CLIPBOARD_KIND, version: 0, nodes: [] }),
		).toBeNull();
	});

	it('accepts v1 payload with nodes array', () => {
		const parsed = parseSubgraphClipboardV1({
			kind: SUBGRAPH_CLIPBOARD_KIND,
			version: SUBGRAPH_CLIPBOARD_VERSION,
			nodes: [
				{
					id: 'n1',
					typeId: 'src_f',
					pass: 'image',
					position: { x: 0, y: 0 },
					data: {},
				},
			],
		});
		expect(parsed).not.toBeNull();
		expect(parsed!.edges).toEqual([]);
		expect(parsed!.nodes).toHaveLength(1);
	});
});

describe('mergeSubgraphV1IntoFlow', () => {
	it('appends pasted nodes and preserves graph meta', () => {
		const baseNode: FlowNodeAny = {
			id: 'base',
			type: 'shader',
			position: { x: 10, y: 20 },
			data: {
				graphNode: {
					id: 'base',
					typeId: 'src_f',
					pass: 'image',
					position: { x: 10, y: 20 },
					data: {},
				},
			},
		};
		const ctx = {
			nodes: [baseNode],
			edges: [] as Edge[],
			graphMeta: { name: 'doc-a' },
			customNodeTypes: [],
		};
		const payload = {
			kind: SUBGRAPH_CLIPBOARD_KIND,
			version: SUBGRAPH_CLIPBOARD_VERSION,
			nodes: [
				{
					id: 'p1',
					typeId: 'dst_f',
					pass: 'image',
					position: { x: 100, y: 100 },
					data: {},
				},
			],
			edges: [] as { id: string; source: string; target: string; sourceHandle: string; targetHandle: string }[],
		};
		const out = mergeSubgraphV1IntoFlow(ctx, payload, { packOverlap: false });
		expect(out.nodes).toHaveLength(2);
		expect(out.graphMeta.name).toBe('doc-a');
		expect(out.nodes.some((n) => n.id === 'base')).toBe(true);
		expect(out.nodes.some((n) => n.id === 'p1')).toBe(false);
		const pasted = out.nodes.find(
			(n): n is typeof baseNode => n.type === 'shader' && n.id !== 'base',
		);
		expect(pasted?.data.graphNode.typeId).toBe('dst_f');
	});
});
