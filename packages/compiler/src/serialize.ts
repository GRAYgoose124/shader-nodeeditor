import type { GraphDocument } from './types.js';

export function parseGraphDocument(json: string): { ok: true; doc: GraphDocument } | { ok: false; error: string } {
	try {
		const raw = JSON.parse(json) as unknown;
		if (typeof raw !== 'object' || raw === null) {
			return { ok: false, error: 'Root must be an object' };
		}
		const o = raw as Record<string, unknown>;
		if (o.version !== 1) {
			return { ok: false, error: 'Unsupported graph version' };
		}
		if (!Array.isArray(o.nodes) || !Array.isArray(o.edges)) {
			return { ok: false, error: 'nodes and edges must be arrays' };
		}
		const doc = raw as GraphDocument;
		for (const n of doc.nodes) {
			if (!n.pass) {
				(n as GraphNodeLoose).pass = 'image';
			}
		}
		return { ok: true, doc };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

type GraphNodeLoose = { pass?: import('./types.js').BufferId };

export function stringifyGraphDocument(doc: GraphDocument, space?: number): string {
	return JSON.stringify(doc, null, space);
}
