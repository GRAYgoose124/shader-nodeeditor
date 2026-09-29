import type { BufferId, GraphDocument } from './types.js';
import { DEFAULT_PASS_ORDER } from './types.js';

const PASS_RANK: Record<BufferId, number> = { bufA: 0, bufB: 1, bufC: 2, bufD: 3, image: 4 };

export function orderedPasses(doc: GraphDocument): BufferId[] {
	const inUse = new Set(doc.nodes.map((n) => n.pass));
	const base = doc.meta.passOrder ?? DEFAULT_PASS_ORDER;
	const seen = new Set<BufferId>();
	const out: BufferId[] = [];
	for (const p of base) {
		if (inUse.has(p) && !seen.has(p)) {
			out.push(p);
			seen.add(p);
		}
	}
	for (const p of DEFAULT_PASS_ORDER) {
		if (inUse.has(p) && !seen.has(p)) {
			out.push(p);
			seen.add(p);
		}
	}
	return out.sort((a, b) => PASS_RANK[a] - PASS_RANK[b]);
}
