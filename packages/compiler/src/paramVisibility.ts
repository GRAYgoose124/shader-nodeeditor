import type { GraphNode, ParamDef } from './types.js';

/**
 * Resolved stored value for a choice param (matches compiler `compile.ts` / GLSL literals).
 * Use in the inspector so numeric preset values (e.g. `giOn: 1`) show the correct option.
 */
export function resolveParamChoice(
	nodeData: GraphNode['data'],
	p: ParamDef | undefined,
	fallbackWhenNoChoices: string,
): string {
	if (!p?.choices?.length) return fallbackWhenNoChoices;
	const vals = p.choices.map((c) => c.value);
	const raw = nodeData[p.id];
	if (typeof raw === 'string' && vals.includes(raw)) return raw;
	if (typeof raw === 'number' && Number.isFinite(raw)) {
		const s = String(Math.round(raw));
		if (vals.includes(s)) return s;
	}
	if (typeof p.default === 'string' && vals.includes(p.default)) return p.default;
	return p.choices[0]!.value;
}

/** Whether a param should appear in the inspector for the given node `data`. */
export function isParamVisible(p: ParamDef, nodeData: GraphNode['data']): boolean {
	const w = p.visibleWhen;
	if (!w) return true;
	const raw = nodeData[w.paramId];

	if (w.values?.length) {
		const cur = typeof raw === 'string' ? raw : undefined;
		if (cur === undefined) return true;
		return w.values.includes(cur);
	}

	if (w.numericEquals?.length) {
		let n = 0;
		if (typeof raw === 'number' && Number.isFinite(raw)) n = raw;
		else if (typeof raw === 'string' && raw.trim() !== '') {
			const parsed = Number(raw);
			if (Number.isFinite(parsed)) n = parsed;
		}
		return w.numericEquals.includes(n);
	}

	return true;
}
