import type { BufferId, GraphMeta } from '@shadertoy/compiler';

const RE_ICH = /\biChannel([0-3])\b/g;

/** Indices 0–3 referenced in GLSL source for this pass. */
export function referencedIChannelIndices(fragmentSource: string): Set<number> {
	const s = new Set<number>();
	let m: RegExpExecArray | null;
	const r = new RegExp(RE_ICH.source, 'g');
	while ((m = r.exec(fragmentSource)) !== null) {
		s.add(Number(m[1]));
	}
	return s;
}

/**
 * Channels sampled in the fragment but not listed under `meta.iChannels[pass]`.
 * Runner may bind a black texture; results look empty or unlit.
 */
export function missingIChannelBindingsForPass(
	pass: BufferId,
	meta: GraphMeta | undefined,
	fragmentSource: string | undefined,
): number[] {
	if (!fragmentSource) return [];
	const refs = referencedIChannelIndices(fragmentSource);
	const map = meta?.iChannels?.[pass] ?? {};
	const miss: number[] = [];
	for (const k of refs) {
		if (map[k as 0 | 1 | 2 | 3] === undefined) miss.push(k);
	}
	return miss.sort((a, b) => a - b);
}
