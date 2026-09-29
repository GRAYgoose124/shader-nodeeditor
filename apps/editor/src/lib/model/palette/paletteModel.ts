import type { NodeTypeDef } from '@shadertoy/compiler';
import { comparePaletteCategories } from '$lib/paletteCategoryOrder.js';

export function buildPaletteByCategory(types: NodeTypeDef[]): Map<string, NodeTypeDef[]> {
	const m = new Map<string, NodeTypeDef[]>();
	for (const t of types) {
		const c = t.category ?? 'Other';
		const arr = m.get(c) ?? [];
		arr.push(t);
		m.set(c, arr);
	}
	for (const [c, arr] of m) {
		arr.sort((a, b) => a.label.localeCompare(b.label));
		m.set(c, arr);
	}
	return m;
}

/** Sorted category entries (learning-path order), optionally filtered by search query. */
export function buildFilteredPaletteEntries(types: NodeTypeDef[], query: string): [string, NodeTypeDef[]][] {
	const palette = buildPaletteByCategory(types);
	const q = query.trim().toLowerCase();
	const entries = [...palette.entries()].sort((a, b) => comparePaletteCategories(a[0], b[0])) as [
		string,
		NodeTypeDef[],
	][];
	if (!q) return entries;
	const out: [string, NodeTypeDef[]][] = [];
	for (const [cat, tys] of entries) {
		const filtered = tys.filter(
			(t) =>
				t.label.toLowerCase().includes(q) ||
				t.id.toLowerCase().includes(q) ||
				(t.category ?? '').toLowerCase().includes(q) ||
				(t.description ?? '').toLowerCase().includes(q),
		);
		if (filtered.length) out.push([cat, filtered]);
	}
	return out;
}

