import type { BufferId, GraphEdge, GraphNode, NodeTypeDef } from '../types.js';
import { sceneFnSuffix } from '../graphutil.js';

export type StratifiedStrand = {
	/** Topo-ordered scene node ids for this strand (excludes sdf_param_p and scene_sdf_sink). */
	nodes: string[];
	/** Node whose `d` output is the leaf of the union tree for this strand. */
	terminalId: string;
};

export type StratifyUnionResult =
	| { ok: true; strands: StratifiedStrand[]; passSfx: string }
	| { ok: false; reason: string };

function defId(registry: Map<string, NodeTypeDef>, n: GraphNode | undefined): string | undefined {
	if (!n) return undefined;
	return registry.get(n.typeId)?.id;
}

/** Upstream closure in the scene subgraph (reverse edges), including seed. */
function upstreamInScene(seed: string, peScene: GraphEdge[], sceneReach: Set<string>): Set<string> {
	const S = new Set<string>();
	const st = [seed];
	while (st.length) {
		const u = st.pop()!;
		if (S.has(u)) continue;
		S.add(u);
		for (const e of peScene) {
			if (e.target !== u) continue;
			if (!sceneReach.has(e.source)) continue;
			st.push(e.source);
		}
	}
	return S;
}

/**
 * If the scene SDF is a recursive **op_union** tree with K≥2 leaves, and strand subgraphs
 * are pairwise disjoint except for `sdf_param_p`, returns strand partitions for per-strand
 * function emission.
 */
export function tryStratifyUnionScene(args: {
	pass: BufferId;
	sceneSinkId: string;
	sceneReach: Set<string>;
	peScene: GraphEdge[];
	nodesById: Map<string, GraphNode>;
	registry: Map<string, NodeTypeDef>;
	paramPId: string | null;
	topoScene: string[];
	hasFractalFeedback: boolean;
	emitSceneHitBody: boolean;
	/** When set, per-strand op_union emission is disabled (use non-stratified scene_sdf path). */
	hasSceneSdfZoneMarkers: boolean;
	/** Scene SDF compile-time repeat markers — same as zones for stratify. */
	hasSceneSdfRepeatMarkers: boolean;
}): StratifyUnionResult {
	const {
		pass,
		sceneSinkId,
		sceneReach,
		peScene,
		nodesById,
		registry,
		paramPId,
		topoScene,
		hasFractalFeedback,
		emitSceneHitBody,
		hasSceneSdfZoneMarkers,
		hasSceneSdfRepeatMarkers,
	} = args;

	if (!paramPId) return { ok: false, reason: 'missing sdf_param_p' };
	if (hasFractalFeedback) return { ok: false, reason: 'fractal motif pullback (tessellate / iterate) present' };
	if (hasSceneSdfZoneMarkers) return { ok: false, reason: 'scene SDF zone markers present' };
	if (hasSceneSdfRepeatMarkers) return { ok: false, reason: 'scene SDF repeat markers present' };
	if (emitSceneHitBody) return { ok: false, reason: 'scene_hit / Shade with SDF albedo' };

	const sinkEdge = peScene.find((e) => e.target === sceneSinkId && e.targetHandle === 'd');
	if (!sinkEdge) return { ok: false, reason: 'scene_sdf_sink has no distance input' };

	function collectTerminals(nodeId: string): string[] {
		const n = nodesById.get(nodeId);
		if (!n) return [];
		const did = defId(registry, n);
		if (did === 'op_union') {
			const ea = peScene.find((e) => e.target === nodeId && e.targetHandle === 'a');
			const eb = peScene.find((e) => e.target === nodeId && e.targetHandle === 'b');
			if (!ea || !eb) return [];
			return [...collectTerminals(ea.source), ...collectTerminals(eb.source)];
		}
		return [nodeId];
	}

	const terminals = collectTerminals(sinkEdge.source);
	if (terminals.length < 2) return { ok: false, reason: 'need nested op_union to the sink (fewer than 2 leaves)' };
	if (terminals.length > 4) return { ok: false, reason: 'at most 4 union strands supported' };

	const strandSets = terminals.map((t) => upstreamInScene(t, peScene, sceneReach));

	for (let i = 0; i < strandSets.length; i++) {
		for (let j = i + 1; j < strandSets.length; j++) {
			const Ai = strandSets[i]!;
			const Aj = strandSets[j]!;
			for (const x of Ai) {
				if (x === paramPId) continue;
				if (Aj.has(x)) {
					return {
						ok: false,
						reason: `strands share node ${x}; duplicate domain nodes per branch or wire each strand separately`,
					};
				}
			}
		}
	}

	const strands: StratifiedStrand[] = terminals.map((term, idx) => {
		const set = strandSets[idx]!;
		const nodes = topoScene.filter(
			(nid) => set.has(nid) && nid !== paramPId && nid !== sceneSinkId,
		);
		return { nodes, terminalId: term };
	});

	return { ok: true, strands, passSfx: sceneFnSuffix(pass) };
}

export function sceneStrandFnName(strandIndex: number, passSfx: string): string {
	return `scene_strand_${strandIndex}_${passSfx}`;
}
