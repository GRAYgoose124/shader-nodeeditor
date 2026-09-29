import { describe, expect, it } from 'vitest';
import { expandTemplate } from '../template.js';
import { buildRegistry } from '../../registry.js';
import type { GraphNode } from '../../types.js';

describe('expandTemplate conv3x3_texel', () => {
	it('keeps if/else wrap and closes for loops', () => {
		const registry = buildRegistry([]);
		const def = registry.get('conv3x3_texel')!;
		const node: GraphNode = {
			id: 'ink_lap',
			typeId: 'conv3x3_texel',
			pass: 'bufA',
			position: { x: 0, y: 0 },
			data: { channel: 0, wrapMode: '0', wCenter: -1, wCardinal: 0.2, wDiagonal: 0.05 },
		};
		const wm = new Map<string, string>([['pixel', 'g_ink_pix_xy']]);
		const code = expandTemplate(node, def, wm, [], 'bufA', new Set());
		expect(code).toContain('if (float(0.0) < 0.5)');
		expect(code).toContain('} else {');
		const openFor = (code.match(/\bfor\s*\(/g) ?? []).length;
		const closeBrace = (code.match(/^\s*\}\s*$/gm) ?? []).length;
		expect(openFor).toBeGreaterThanOrEqual(2);
		expect(code).toContain('vec4 g_ink_lap_out');
	});
});
