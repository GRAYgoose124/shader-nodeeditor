import { describe, expect, it } from 'vitest';
import { expandTemplate } from '../template.js';
import { buildRegistry } from '../../registry.js';
import type { GraphNode } from '../../types.js';

const inkExpr = `
// a = prev, b = laplacian, x = init mask
vec4 p = {{in:a}};
vec4 l = {{in:b}};
float m = clamp({{in:x}}, 0.0, 1.0);

// Gray-Scott-ish 2-channel update (R,G) + dye (B) + alpha hold
float u = clamp(p.x, 0.0, 1.0);
float v = clamp(p.y, 0.0, 1.0);
float du = 0.85;
float dv = 0.38;
float F = 0.034 + 0.01 * p.z;
float K = 0.062 + 0.01 * p.w;

float lapU = l.x;
float lapV = l.y;

float uvv = u * v * v;
u += du * lapU - uvv + F * (1.0 - u);
v += dv * lapV + uvv - (F + K) * v;

float dye = clamp(p.z + 0.18 * l.z, 0.0, 1.0);
float modA = clamp(p.w + 0.12 * l.w, 0.0, 1.0);

vec4 q = vec4(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0), dye, modA);

{{out:out}} = mix(q, vec4(1.0, 0.0, 0.0, 0.0), m * 0.02);
`;

describe('expandTemplate expr_vec4', () => {
	it('preserves ink diffusion Gray–Scott body (no accidental placeholder munch)', () => {
		const registry = buildRegistry([]);
		const def = registry.get('expr_vec4')!;
		const node: GraphNode = {
			id: 'ink_update',
			typeId: 'expr_vec4',
			pass: 'bufA',
			position: { x: 0, y: 0 },
			data: { expression: inkExpr },
		};
		const wm = new Map<string, string>([
			['a', 'g_ink_prev_rgba'],
			['b', 'g_ink_lap_out'],
			['c', 'vec4(0.0)'],
			['d', 'vec4(0.0)'],
			['x', 'g_ink_mask_init_m'],
		]);
		const code = expandTemplate(node, def, wm, [], 'bufA', new Set());
		expect(code).toContain('vec4 q = vec4');
		expect(code).toContain('Gray-Scott');
		expect(code).toContain('g_ink_update_out = mix(q');
		expect(code).toContain('lapU');
	});
});
