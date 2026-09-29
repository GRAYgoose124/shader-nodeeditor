/** CSS background for preset cards when no `/presets/{id}.webp` image exists. */
export function presetCardGradient(seed: string): string {
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	const h1 = h >>> 0;
	const h2 = Math.imul(h1, 2246822519) >>> 0;
	const hueA = h1 % 360;
	const hueB = h2 % 360;
	return `linear-gradient(135deg, hsl(${hueA} 42% 20%), hsl(${hueB} 38% 12%) 55%, hsl(${(hueA + 40) % 360} 30% 8%))`;
}

export function builtinPresetThumbUrl(id: string): string {
	return `/presets/${id}.webp`;
}

/** Second fallback if `.webp` is missing (static gallery assets). */
export function builtinPresetThumbUrlPng(id: string): string {
	return `/presets/${id}.png`;
}
