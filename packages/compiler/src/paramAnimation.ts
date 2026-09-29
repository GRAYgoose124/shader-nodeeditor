import type { GraphMeta, ParamAnimationSpec, ParamDef } from './types.js';

/** Record separator — keys `meta.editor.paramAnimations`. */
export function paramAnimKey(nodeId: string, paramId: string): string {
	return `${nodeId}\x1e${paramId}`;
}

export function isParamAnimatable(p: ParamDef): boolean {
	return p.glslType === 'float' && !p.choices?.length;
}

export function paramAnimationKeysFromMeta(meta: GraphMeta | undefined): Set<string> {
	const raw = meta?.editor?.paramAnimations;
	if (!raw) return new Set();
	return new Set(Object.keys(raw));
}

export function defaultParamAnimationSpec(nodeId: string, paramId: string): ParamAnimationSpec {
	return {
		nodeId,
		paramId,
		curve: 'sine',
		speed: 0.25,
		phase: 0,
		depth: 1,
		offset: 0,
	};
}
