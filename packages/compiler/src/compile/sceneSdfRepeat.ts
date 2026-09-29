import { BuiltinNodeId } from '../builtinIds.js';
import { outVar } from '../ident.js';
import type { BufferId, GraphEdge, GraphNode, NodeTypeDef } from '../types.js';
import { buildIncomingEdgeMap, topoOrder } from '../graphutil.js';
import {
	clampPassSubsteps,
	getLiteralStringParam,
	literalParamGlsl,
	paramById,
} from './params.js';
import { nodeUsesForbiddenSampling } from './repeatMain.js';
import { collectSceneSdfZoneBody } from './sceneSdfZone.js';
import type { ExpandOpts } from './template.js';

function regId(registry: Map<string, NodeTypeDef>, typeId: string): string | undefined {
	return registry.get(typeId)?.id;
}

export type SceneSdfRepeatZonePlan = {
	beginId: string;
	endId: string;
	zoneKey: string;
	bodyIds: Set<string>;
	count: number;
	intVar: string;
	loopRepl: Record<string, string>;
	tailSourceId: string;
	tailSourceHandle: string;
};

export function planSceneSdfRepeatZones(args: {
	pass: BufferId;
	passNodes: GraphNode[];
	nodesById: Map<string, GraphNode>;
	registry: Map<string, NodeTypeDef>;
	sceneReach: Set<string>;
	pe: GraphEdge[];
	peScene: GraphEdge[];
}): { ok: true; zones: SceneSdfRepeatZonePlan[] } | { ok: false; errors: string[] } {
	const { pass, passNodes, nodesById, registry, sceneReach, pe, peScene } = args;
	const errors: string[] = [];

	const ends = passNodes.filter(
		(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === BuiltinNodeId.SceneSdfRepeatEnd,
	);
	if (ends.length === 0) {
		const orphanBegins = passNodes.filter(
			(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === BuiltinNodeId.SceneSdfRepeatBegin,
		);
		if (orphanBegins.length > 0) {
			for (const b of orphanBegins) {
				errors.push(
					`Pass ${pass}: scene_sdf_repeat_begin ${b.id} has no matching scene_sdf_repeat_end (same zone id)`,
				);
			}
			return { ok: false, errors };
		}
		return { ok: true, zones: [] };
	}

	const begins = passNodes.filter(
		(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === BuiltinNodeId.SceneSdfRepeatBegin,
	);
	const beginByKey = new Map<string, GraphNode>();
	for (const b of begins) {
		const def = registry.get(b.typeId);
		const zk = getLiteralStringParam(b, paramById(def!, 'zoneId'), 'z0');
		if (beginByKey.has(zk)) {
			errors.push(`Pass ${pass}: duplicate scene_sdf_repeat_begin zone id "${zk}"`);
		} else {
			beginByKey.set(zk, b);
		}
	}

	const incoming = buildIncomingEdgeMap(pe);
	const globalClaimed = new Set<string>();
	const zones: SceneSdfRepeatZonePlan[] = [];
	const seenEndZoneKeys = new Set<string>();

	for (const endNode of ends) {
		const endDef = registry.get(endNode.typeId)!;
		const zoneKey = getLiteralStringParam(endNode, paramById(endDef, 'zoneId'), 'z0');
		if (seenEndZoneKeys.has(zoneKey)) {
			errors.push(
				`Pass ${pass}: duplicate scene_sdf_repeat_end for zone id "${zoneKey}" (at most one end per zone)`,
			);
			continue;
		}
		seenEndZoneKeys.add(zoneKey);

		const beginNode = beginByKey.get(zoneKey);
		if (!beginNode) {
			errors.push(
				`Pass ${pass}: scene_sdf_repeat_end ${endNode.id} has no matching scene_sdf_repeat_begin for zone "${zoneKey}"`,
			);
			continue;
		}

		const dEdge = pe.find((e) => e.target === endNode.id && e.targetHandle === 'd');
		if (!dEdge) {
			errors.push(`Pass ${pass}: scene_sdf_repeat_end ${endNode.id} missing distance input`);
			continue;
		}

		const producerId = dEdge.source;
		const bodyCol = collectSceneSdfZoneBody(
			producerId,
			beginNode.id,
			incoming,
			sceneReach,
			'Scene SDF repeat',
		);
		if (!bodyCol.ok) {
			errors.push(`Pass ${pass}: ${bodyCol.err}`);
			continue;
		}
		const body = bodyCol.body;

		if (body.has(endNode.id)) {
			errors.push(`Pass ${pass}: scene SDF repeat "${zoneKey}" body includes end node (invalid wiring)`);
			continue;
		}

		let overlap = false;
		for (const nid of body) {
			if (globalClaimed.has(nid)) {
				errors.push(
					`Pass ${pass}: scene SDF repeat zones overlap on node ${nid} (nested/overlapping repeat bodies not supported in v1)`,
				);
				overlap = true;
			}
		}
		if (overlap) continue;

		let zoneLeak = false;
		for (const nid of body) {
			for (const e of pe) {
				if (e.source !== nid) continue;
				if (!sceneReach.has(e.target)) continue;
				if (body.has(e.target) || e.target === endNode.id) continue;
				errors.push(
					`Pass ${pass}: scene SDF repeat "${zoneKey}" leaks from ${nid} (${e.sourceHandle}) to ${e.target} (only in-repeat nodes or the repeat end may consume body outputs)`,
				);
				zoneLeak = true;
			}
		}
		if (zoneLeak) continue;

		let samplingBad = false;
		for (const nid of body) {
			const n = nodesById.get(nid)!;
			const d = registry.get(n.typeId);
			if (!d) continue;
			if (nodeUsesForbiddenSampling(n, d)) {
				errors.push(
					`Pass ${pass}: scene SDF repeat "${zoneKey}" contains ${n.id} (${d.id}) which may sample textures — use pass substeps instead`,
				);
				samplingBad = true;
			}
		}
		if (samplingBad) continue;

		const emitCheck = new Set<string>([...body, beginNode.id]);
		const topoHelps = topoOrder(
			emitCheck,
			peScene.filter((e) => emitCheck.has(e.source) && emitCheck.has(e.target)),
		);
		if (!topoHelps) {
			errors.push(`Pass ${pass}: scene SDF repeat "${zoneKey}" has a cycle in repeat body`);
			continue;
		}

		for (const nid of body) globalClaimed.add(nid);

		const beginDef = registry.get(beginNode.typeId)!;
		const count = clampPassSubsteps(Number(literalParamGlsl(beginNode, paramById(beginDef, 'count')!)));
		const indexKey = getLiteralStringParam(beginNode, paramById(beginDef, 'indexName'), 'ri');
		const iv = `sr_${indexKey}_${beginNode.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
		const loopRepl: Record<string, string> = { [indexKey]: `float(${iv})` };

		zones.push({
			endId: endNode.id,
			beginId: beginNode.id,
			zoneKey,
			bodyIds: body,
			count,
			intVar: iv,
			loopRepl,
			tailSourceId: producerId,
			tailSourceHandle: dEdge.sourceHandle,
		});
	}

	const keysWithZone = new Set(zones.map((z) => z.zoneKey));
	for (const b of begins) {
		const def = registry.get(b.typeId)!;
		const zk = getLiteralStringParam(b, paramById(def, 'zoneId'), 'z0');
		if (!keysWithZone.has(zk)) {
			errors.push(
				`Pass ${pass}: scene_sdf_repeat_begin ${b.id} has no matching scene_sdf_repeat_end for zone "${zk}"`,
			);
		}
	}

	if (errors.length > 0) return { ok: false, errors };
	return { ok: true, zones };
}

export function sortSceneSdfRepeatZonesByTopo(
	zones: SceneSdfRepeatZonePlan[],
	topoScene: string[],
): SceneSdfRepeatZonePlan[] {
	const idx = new Map(topoScene.map((id, i) => [id, i]));
	return [...zones].sort((a, b) => (idx.get(a.endId) ?? 0) - (idx.get(b.endId) ?? 0));
}

export function sceneSdfRepeatSkipSet(zones: SceneSdfRepeatZonePlan[]): Set<string> {
	const s = new Set<string>();
	for (const z of zones) {
		s.add(z.beginId);
		for (const id of z.bodyIds) s.add(id);
	}
	return s;
}

export function sceneSdfRepeatEndPlanMap(zones: SceneSdfRepeatZonePlan[]): Map<string, SceneSdfRepeatZonePlan> {
	const m = new Map<string, SceneSdfRepeatZonePlan>();
	for (const z of zones) m.set(z.endId, z);
	return m;
}

export function emitSceneSdfRepeatMinBlock(args: {
	zone: SceneSdfRepeatZonePlan;
	topoBody: string[];
	emitLine: (nid: string, loopOpts: ExpandOpts) => string;
	accVar: string;
	tailDExpr: string;
}): string {
	const { zone, topoBody, emitLine, accVar, tailDExpr } = args;
	const maxI = 32;
	const cLit = `${zone.count}.0`;
	const innerLines: string[] = [];
	for (const nid of topoBody) {
		const code = emitLine(nid, { loopReplacements: zone.loopRepl });
		if (code.trim()) innerLines.push(code);
	}
	innerLines.push(`${accVar} = min(${accVar}, ${tailDExpr});`);
	const indented = innerLines
		.join('\n')
		.split('\n')
		.map((ln) => (ln.trim() ? `    ${ln}` : ln))
		.join('\n');
	return `for (int ${zone.intVar} = 0; ${zone.intVar} < ${maxI}; ${zone.intVar}++) {
  if (float(${zone.intVar}) >= float(${cLit})) break;
  {
${indented}
  }
}`;
}

export function sceneRepeatTopoBody(zone: SceneSdfRepeatZonePlan, peScene: GraphEdge[]): string[] | null {
	const emitSet = new Set<string>([...zone.bodyIds, zone.beginId]);
	return topoOrder(
		emitSet,
		peScene.filter((e) => emitSet.has(e.source) && emitSet.has(e.target)),
	);
}

/** True if any scene SDF repeat marker appears in the scene subgraph. */
export function sceneReachHasSdfRepeatMarkers(
	sceneReach: Set<string>,
	passNodes: GraphNode[],
	registry: Map<string, NodeTypeDef>,
): boolean {
	return passNodes.some(
		(n) =>
			sceneReach.has(n.id) &&
			(regId(registry, n.typeId) === BuiltinNodeId.SceneSdfRepeatBegin ||
				regId(registry, n.typeId) === BuiltinNodeId.SceneSdfRepeatEnd),
	);
}

export function zonesAndRepeatsOverlap(
	sdfZones: { beginId: string; endId: string; bodyIds: Set<string> }[],
	repeatZones: { beginId: string; endId: string; bodyIds: Set<string> }[],
): boolean {
	for (const z of sdfZones) {
		const zNodes = new Set([z.beginId, z.endId, ...z.bodyIds]);
		for (const r of repeatZones) {
			const rNodes = new Set([r.beginId, r.endId, ...r.bodyIds]);
			for (const id of zNodes) {
				if (rNodes.has(id)) return true;
			}
		}
	}
	return false;
}

/** Motif slice M intersects any SDF zone or repeat body/marker. */
export function motifSliceConflictsWithZonesOrRepeats(
	M: Set<string>,
	sdfZones: { beginId: string; endId: string; bodyIds: Set<string> }[],
	repeatZones: { beginId: string; endId: string; bodyIds: Set<string> }[],
): { conflict: true; detail: string } | { conflict: false } {
	for (const z of sdfZones) {
		if (M.has(z.beginId) || M.has(z.endId)) {
			return { conflict: true, detail: 'scene SDF zone marker lies in motif slice' };
		}
		for (const bid of z.bodyIds) {
			if (M.has(bid)) {
				return { conflict: true, detail: `zone body node ${bid} lies in motif slice` };
			}
		}
	}
	for (const r of repeatZones) {
		if (M.has(r.beginId) || M.has(r.endId)) {
			return { conflict: true, detail: `repeat marker ${r.beginId} / end lies in motif slice` };
		}
		for (const bid of r.bodyIds) {
			if (M.has(bid)) {
				return { conflict: true, detail: `repeat body node ${bid} lies in motif slice` };
			}
		}
	}
	return { conflict: false };
}
