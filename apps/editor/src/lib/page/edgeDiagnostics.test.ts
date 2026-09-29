import type { Edge } from '@xyflow/svelte';
import { describe, expect, it } from 'vitest';
import { applyDiagnosticEdgeStyles } from './edgeDiagnostics.js';

describe('applyDiagnosticEdgeStyles', () => {
	it('returns unchanged when set empty', () => {
		const edges = [{ id: 'a', type: 'shaderWire' } as Edge];
		const { next, changed } = applyDiagnosticEdgeStyles(edges, new Set());
		expect(changed).toBe(false);
		expect(next).toEqual(edges);
	});

	it('tags bad edges', () => {
		const edges = [{ id: 'x', type: 'shaderWire' } as Edge];
		const { next, changed } = applyDiagnosticEdgeStyles(edges, new Set(['x']));
		expect(changed).toBe(true);
		expect(next[0]?.class).toBe('edge-error');
		expect(String(next[0]?.style)).toContain('#ff6666');
	});
});
