import type { NodeTypeDef } from './types.js';
import { coreNodes } from './builtins/core.js';
import { procedural2dNodes } from './builtins/procedural2d.js';
import { sdfNodes } from './builtins/sdf.js';
import { fractalNodes } from './builtins/fractal.js';
import { ifsNodes } from './builtins/ifs.js';
import { customNodes } from './builtins/custom.js';
import { feedback2dNodes } from './builtins/feedback2d.js';

export const allBuiltinNodes: NodeTypeDef[] = [
	...coreNodes,
	...procedural2dNodes,
	...feedback2dNodes,
	...sdfNodes,
	...fractalNodes,
	...ifsNodes,
	...customNodes,
];

export function buildRegistry(extra: NodeTypeDef[] = []): Map<string, NodeTypeDef> {
	const m = new Map<string, NodeTypeDef>();
	for (const n of allBuiltinNodes) {
		m.set(n.id, n);
	}
	for (const n of extra) {
		m.set(n.id, n);
	}
	return m;
}

export function parseNodeTypeDefsJson(json: string): { ok: true; defs: NodeTypeDef[] } | { ok: false; error: string } {
	try {
		const raw = JSON.parse(json) as unknown;
		if (!Array.isArray(raw)) return { ok: false, error: 'Expected JSON array of node definitions' };
		const defs: NodeTypeDef[] = [];
		for (const item of raw) {
			if (typeof item !== 'object' || item === null) return { ok: false, error: 'Invalid entry' };
			const o = item as Record<string, unknown>;
			if (typeof o.id !== 'string' || typeof o.template !== 'string') {
				return { ok: false, error: 'Each node def needs id and template' };
			}
			defs.push(item as NodeTypeDef);
		}
		return { ok: true, defs };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}
