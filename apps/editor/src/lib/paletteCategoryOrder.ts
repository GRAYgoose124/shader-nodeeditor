/** Curated palette order (learning path); unknown categories sort after these, alphabetically. */
export const PALETTE_CATEGORY_ORDER = [
	'Core',
	'Procedural',
	'Buffer / feedback',
	'Fractal',
	'IFS',
	'SDF',
	'Custom',
	'Other',
] as const;

function categoryRank(cat: string): number {
	const i = (PALETTE_CATEGORY_ORDER as readonly string[]).indexOf(cat);
	return i === -1 ? 999 : i;
}

export function comparePaletteCategories(a: string, b: string): number {
	const ra = categoryRank(a);
	const rb = categoryRank(b);
	if (ra !== rb) return ra - rb;
	return a.localeCompare(b);
}
