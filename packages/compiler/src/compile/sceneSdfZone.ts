import { BuiltinNodeId } from '../builtinIds.js';
import { indentBlock } from '../glslPrelude.js';
import { outVar } from '../ident.js';
import type { BufferId, GraphEdge, GraphNode, NodeTypeDef, UniformManifestEntry } from '../types.js';
import { buildIncomingEdgeMap, sceneFnSuffix, topoOrder } from '../graphutil.js';
import { sanitizeNodeId } from '../ident.js';
import { getLiteralStringParam, paramById } from './params.js';
import { nodeUsesForbiddenSampling } from './repeatMain.js';
import { sanitizeExportFnBase } from './frameFnExport.js';
import { emitSceneNodeLine, wireMapForNode } from './scene.js';
import { isMotifPullbackBuiltin } from './motifPullback.js';

function regId(registry: Map<string, NodeTypeDef>, typeId: string): string | undefined {
	return registry.get(typeId)?.id;
}

export type SceneSdfZonePlan = {
	beginId: string;
	endId: string;
	zoneKey: string;
	bodyIds: Set<string>;
	tailSourceId: string;
	tailSourceHandle: string;
	fnName: string;
};

/** Backward slice from distance producer until begin (excludes begin and end). */
export function collectSceneSdfZoneBody(
	producerId: string,
	beginId: string,
	incomingByTarget: Map<string, GraphEdge[]>,
	sceneReach: Set<string>,
	label = 'Scene SDF zone',
):
	| { ok: true; body: Set<string> }
	| { ok: false; err: string } {
	const body = new Set<string>();
	let sawBegin = false;
	const stack = [producerId];
	while (stack.length > 0) {
		const n = stack.pop()!;
		if (n === beginId) {
			sawBegin = true;
			continue;
		}
		if (!sceneReach.has(n)) {
			return { ok: false, err: `${label}: node ${n} is not in scene SDF graph` };
		}
		if (body.has(n)) continue;
		body.add(n);
		for (const e of incomingByTarget.get(n) ?? []) {
			stack.push(e.source);
		}
	}
	if (!sawBegin) {
		return {
			ok: false,
			err: `${label}: begin marker ${beginId} not reached going backward from tail (wire begin upstream of the body)`,
		};
	}
	return { ok: true, body };
}

export function planSceneSdfZones(args: {
	pass: BufferId;
	passNodes: GraphNode[];
	nodesById: Map<string, GraphNode>;
	registry: Map<string, NodeTypeDef>;
	sceneReach: Set<string>;
	pe: GraphEdge[];
	peScene: GraphEdge[];
}): { ok: true; zones: SceneSdfZonePlan[] } | { ok: false; errors: string[] } {
	const { pass, passNodes, nodesById, registry, sceneReach, pe, peScene } = args;
	const errors: string[] = [];

	const ends = passNodes.filter(
		(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === BuiltinNodeId.SceneSdfZoneEnd,
	);
	if (ends.length === 0) {
		const orphanBegins = passNodes.filter(
			(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === BuiltinNodeId.SceneSdfZoneBegin,
		);
		if (orphanBegins.length > 0) {
			for (const b of orphanBegins) {
				errors.push(
					`Pass ${pass}: scene_sdf_zone_begin ${b.id} has no matching scene_sdf_zone_end (same zone id)`,
				);
			}
			return { ok: false, errors };
		}
		return { ok: true, zones: [] };
	}

	const begins = passNodes.filter(
		(n) => sceneReach.has(n.id) && regId(registry, n.typeId) === BuiltinNodeId.SceneSdfZoneBegin,
	);
	const beginByKey = new Map<string, GraphNode>();
	for (const b of begins) {
		const def = registry.get(b.typeId);
		const zk = getLiteralStringParam(b, paramById(def!, 'zoneId'), 'z0');
		if (beginByKey.has(zk)) {
			errors.push(`Pass ${pass}: duplicate scene_sdf_zone_begin zone id "${zk}"`);
		} else {
			beginByKey.set(zk, b);
		}
	}

	const incoming = buildIncomingEdgeMap(pe);
	const globalClaimed = new Set<string>();
	const zones: SceneSdfZonePlan[] = [];
	const passSfx = sceneFnSuffix(args.pass);
	const seenEndZoneKeys = new Set<string>();

	for (const endNode of ends) {
		const endDef = registry.get(endNode.typeId)!;
		const zoneKey = getLiteralStringParam(endNode, paramById(endDef, 'zoneId'), 'z0');
		if (seenEndZoneKeys.has(zoneKey)) {
			errors.push(
				`Pass ${pass}: duplicate scene_sdf_zone_end for zone id "${zoneKey}" (at most one end per zone)`,
			);
			continue;
		}
		seenEndZoneKeys.add(zoneKey);

		const beginNode = beginByKey.get(zoneKey);
		if (!beginNode) {
			errors.push(
				`Pass ${pass}: scene_sdf_zone_end ${endNode.id} has no matching scene_sdf_zone_begin for zone "${zoneKey}"`,
			);
			continue;
		}

		const dEdge = pe.find((e) => e.target === endNode.id && e.targetHandle === 'd');
		if (!dEdge) {
			errors.push(`Pass ${pass}: scene_sdf_zone_end ${endNode.id} missing distance input`);
			continue;
		}

		const producerId = dEdge.source;
		const bodyCol = collectSceneSdfZoneBody(producerId, beginNode.id, incoming, sceneReach);
		if (!bodyCol.ok) {
			errors.push(`Pass ${pass}: ${bodyCol.err}`);
			continue;
		}
		const body = bodyCol.body;

		if (body.has(endNode.id)) {
			errors.push(`Pass ${pass}: scene SDF zone "${zoneKey}" body includes end node (invalid wiring)`);
			continue;
		}

		let overlap = false;
		for (const nid of body) {
			if (globalClaimed.has(nid)) {
				errors.push(
					`Pass ${pass}: scene SDF zones overlap on node ${nid} (nested/overlapping zone bodies not supported in v1)`,
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
					`Pass ${pass}: scene SDF zone "${zoneKey}" leaks from ${nid} (${e.sourceHandle}) to ${e.target} (only in-zone nodes or the zone end may consume body outputs)`,
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
					`Pass ${pass}: scene SDF zone "${zoneKey}" contains ${n.id} (${d.id}) which may sample textures — zones cannot include texture fetches in v1`,
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
			errors.push(`Pass ${pass}: scene SDF zone "${zoneKey}" has a cycle in zone body`);
			continue;
		}

		for (const nid of body) globalClaimed.add(nid);

		const fnBase = sanitizeExportFnBase(zoneKey);
		let fnName = `scene_sdf_zone_${fnBase}_${passSfx}`;
		const usedFn = new Set(zones.map((z) => z.fnName));
		if (usedFn.has(fnName)) {
			fnName = `scene_sdf_zone_${fnBase}_${sanitizeNodeId(endNode.id)}_${passSfx}`;
		}

		zones.push({
			beginId: beginNode.id,
			endId: endNode.id,
			zoneKey,
			bodyIds: body,
			tailSourceId: producerId,
			tailSourceHandle: dEdge.sourceHandle,
			fnName,
		});
	}

	const keysWithZone = new Set(zones.map((z) => z.zoneKey));
	for (const b of begins) {
		const def = registry.get(b.typeId)!;
		const zk = getLiteralStringParam(b, paramById(def, 'zoneId'), 'z0');
		if (!keysWithZone.has(zk)) {
			errors.push(
				`Pass ${pass}: scene_sdf_zone_begin ${b.id} has no matching scene_sdf_zone_end for zone "${zk}"`,
			);
		}
	}

	if (errors.length > 0) return { ok: false, errors };
	return { ok: true, zones };
}

export function sortSceneSdfZonesByTopo(zones: SceneSdfZonePlan[], topoScene: string[]): SceneSdfZonePlan[] {
	const idx = new Map(topoScene.map((id, i) => [id, i]));
	return [...zones].sort((a, b) => (idx.get(a.endId) ?? 0) - (idx.get(b.endId) ?? 0));
}

export function emitSceneSdfZoneHelperGlsl(args: {
	zone: SceneSdfZonePlan;
	peScene: GraphEdge[];
	pe: GraphEdge[];
	sceneReach: Set<string>;
	paramPId: string | null;
	registry: Map<string, NodeTypeDef>;
	nodesById: Map<string, GraphNode>;
	passUniforms: UniformManifestEntry[];
	pass: BufferId;
	hasSceneAlbedoNodes: boolean;
	emitHitBody: boolean;
	motifSkip: Set<string>;
	exportedInteriorSkip: Set<string>;
	animatedKeys: Set<string>;
}): string {
	const {
		zone,
		peScene,
		pe,
		sceneReach,
		paramPId,
		registry,
		nodesById,
		passUniforms,
		pass,
		hasSceneAlbedoNodes,
		emitHitBody,
		motifSkip,
		exportedInteriorSkip,
		animatedKeys,
	} = args;

	const emitSet = new Set<string>([...zone.bodyIds, zone.beginId]);
	const topoHelper = topoOrder(
		emitSet,
		peScene.filter((e) => emitSet.has(e.source) && emitSet.has(e.target)),
	);
	if (!topoHelper) {
		return `// internal: zone ${zone.zoneKey} topo failed`;
	}

	const passthroughAlbedo = hasSceneAlbedoNodes && (!emitHitBody || !false);
	const acc: string[] = [];
	for (const nid of topoHelper) {
		const node = nodesById.get(nid)!;
		const def = registry.get(node.typeId);
		if (!def) continue;
		if (def.id === BuiltinNodeId.SdfParamP) continue;
		if (motifSkip.has(nid)) continue;
		if (isMotifPullbackBuiltin(def.id)) continue;
		if (exportedInteriorSkip.has(nid)) continue;
		if (def.id === BuiltinNodeId.SceneSdfZoneEnd) continue;

		const wm = wireMapForNode(nid, pe, sceneReach, paramPId);
		const code = emitSceneNodeLine(
			nid,
			node,
			def,
			pe,
			sceneReach,
			wm,
			registry,
			nodesById,
			passUniforms,
			pass,
			false,
			passthroughAlbedo,
			paramPId,
			null,
			animatedKeys,
		);
		if (code.trim()) acc.push(code);
	}

	const retV = outVar(zone.tailSourceId, zone.tailSourceHandle);
	const inner = indentBlock(acc.join('\n'), '  ');
	return `float ${zone.fnName}(vec3 p) {\n${inner}\n  return ${retV};\n}`;
}

export function sceneSdfZoneSkipSet(zones: SceneSdfZonePlan[]): Set<string> {
	const s = new Set<string>();
	for (const z of zones) {
		s.add(z.beginId);
		for (const id of z.bodyIds) s.add(id);
	}
	return s;
}

export function sceneSdfZoneEndFnMap(zones: SceneSdfZonePlan[]): Map<string, string> {
	const m = new Map<string, string>();
	for (const z of zones) m.set(z.endId, z.fnName);
	return m;
}

export function sceneSdfZoneHitFnName(distanceFnName: string): string {
	return `${distanceFnName}_hit`;
}

/** `void <fnName>_hit(vec3 p, out float o_d, out vec3 o_mat)` for scene_hit / albedo when zones are used. */
export function emitSceneSdfZoneHitHelperGlsl(args: {
	zone: SceneSdfZonePlan;
	peScene: GraphEdge[];
	pe: GraphEdge[];
	sceneReach: Set<string>;
	paramPId: string | null;
	registry: Map<string, NodeTypeDef>;
	nodesById: Map<string, GraphNode>;
	passUniforms: UniformManifestEntry[];
	pass: BufferId;
	motifSkip: Set<string>;
	exportedInteriorSkip: Set<string>;
	animatedKeys: Set<string>;
}): string {
	const {
		zone,
		peScene,
		pe,
		sceneReach,
		paramPId,
		registry,
		nodesById,
		passUniforms,
		pass,
		motifSkip,
		exportedInteriorSkip,
		animatedKeys,
	} = args;

	const emitSet = new Set<string>([...zone.bodyIds, zone.beginId]);
	const topoHelper = topoOrder(
		emitSet,
		peScene.filter((e) => emitSet.has(e.source) && emitSet.has(e.target)),
	);
	if (!topoHelper) {
		return `// internal: zone ${zone.zoneKey} hit topo failed`;
	}

	const hitName = sceneSdfZoneHitFnName(zone.fnName);
	const acc: string[] = [];
	for (const nid of topoHelper) {
		const node = nodesById.get(nid)!;
		const def = registry.get(node.typeId);
		if (!def) continue;
		if (def.id === BuiltinNodeId.SdfParamP) continue;
		if (motifSkip.has(nid)) continue;
		if (isMotifPullbackBuiltin(def.id)) continue;
		if (exportedInteriorSkip.has(nid)) continue;
		if (def.id === BuiltinNodeId.SceneSdfZoneEnd) continue;

		const wm = wireMapForNode(nid, pe, sceneReach, paramPId);
		const code = emitSceneNodeLine(
			nid,
			node,
			def,
			pe,
			sceneReach,
			wm,
			registry,
			nodesById,
			passUniforms,
			pass,
			true,
			false,
			paramPId,
			null,
			animatedKeys,
		);
		if (code.trim()) acc.push(code);
	}

	const retV = outVar(zone.tailSourceId, zone.tailSourceHandle);
	const tailMat = outVar(zone.tailSourceId, 'mat');
	const inner = indentBlock(acc.join('\n'), '  ');
	return `void ${hitName}(vec3 p, out float o_d, out vec3 o_mat) {\n${inner}\n  o_d = ${retV};\n  o_mat = ${tailMat};\n}`;
}
