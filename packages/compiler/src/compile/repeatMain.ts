import type { ExpandOpts } from './template.js';
import {
	clampPassSubsteps,
	getLiteralStringParam,
	literalParamGlsl,
	paramById,
} from './params.js';
import { BuiltinNodeId } from '../builtinIds.js';
import { outVar } from '../ident.js';
import { buildIncomingEdgeMap, topoOrder } from '../graphutil.js';
import type { BufferId, GraphEdge, GraphNode, NodeTypeDef } from '../types.js';

export type RepeatMainZonePlan = {
	endId: string;
	beginId: string;
	zoneKey: string;
	bodyIds: Set<string>;
	count: number;
	intVar: string;
	loopRepl: Record<string, string>;
	tailSourceId: string;
	tailSourceHandle: string;
};

function regId(registry: Map<string, NodeTypeDef>, typeId: string): string | undefined {
	return registry.get(typeId)?.id;
}

export function nodeUsesForbiddenSampling(n: GraphNode, def: NodeTypeDef): boolean {
	if (def.codegenKind === 'glsl_expr') {
		const ex = typeof n.data.expression === 'string' ? n.data.expression : '';
		return (
			/\btexelFetch\b/.test(ex) || /\btexture\s*\(/.test(ex) || /\biChannel\d*\b/.test(ex)
		);
	}
	const t = def.template;
	return /\btexelFetch\b/.test(t) || /\btexture\s*\(/.test(t) || /\{\{iChannel/.test(t);
}

/** Collect strict interior body nodes (backward from end’s `in` producer until begin, excluding both markers). */
export function collectRepeatBodyNodes(
	producerId: string,
	beginId: string,
	incomingByTarget: Map<string, GraphEdge[]>,
	mainReach: Set<string>,
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
		if (!mainReach.has(n)) return { ok: false, err: `Repeat zone: node ${n} is not in main graph` };
		if (body.has(n)) continue;
		body.add(n);
		for (const e of incomingByTarget.get(n) ?? []) {
			stack.push(e.source);
		}
	}
	if (!sawBegin) {
		return {
			ok: false,
			err: `Repeat zone: begin marker ${beginId} not reached going backward from loop tail (wire the zone begin upstream of the body)`,
		};
	}
	return { body, ok: true };
}

export function planRepeatMainZones(args: {
	pass: BufferId;
	passNodes: GraphNode[];
	nodesById: Map<string, GraphNode>;
	registry: Map<string, NodeTypeDef>;
	mainReach: Set<string>;
	pe: GraphEdge[];
}): { ok: true; zones: RepeatMainZonePlan[] } | { ok: false; errors: string[] } {
	const { pass, passNodes, nodesById, registry, mainReach, pe } = args;
	const errors: string[] = [];

	const ends = passNodes.filter((n) => regId(registry, n.typeId) === BuiltinNodeId.GlslRepeatEnd);
	if (ends.length === 0) return { ok: true, zones: [] };

	const begins = passNodes.filter((n) => regId(registry, n.typeId) === BuiltinNodeId.GlslRepeatBegin);
	const beginByKey = new Map<string, GraphNode>();
	for (const b of begins) {
		const def = registry.get(b.typeId);
		const zk = getLiteralStringParam(b, paramById(def!, 'zoneId'), 'z0');
		if (beginByKey.has(zk)) {
			errors.push(`Pass ${pass}: duplicate glsl_repeat_begin zone id "${zk}"`);
		} else {
			beginByKey.set(zk, b);
		}
	}

	const incoming = buildIncomingEdgeMap(pe);
	const globalClaimed = new Set<string>();
	const zones: RepeatMainZonePlan[] = [];

	for (const endNode of ends) {
		const endDef = registry.get(endNode.typeId)!;
		const zoneKey = getLiteralStringParam(endNode, paramById(endDef, 'zoneId'), 'z0');
		const beginNode = beginByKey.get(zoneKey);
		if (!beginNode) {
			errors.push(
				`Pass ${pass}: glsl_repeat_end ${endNode.id} has no matching glsl_repeat_begin for zone "${zoneKey}"`,
			);
			continue;
		}
		const inEdge = pe.find((e) => e.target === endNode.id && e.targetHandle === 'in');
		if (!inEdge) {
			errors.push(`Pass ${pass}: glsl_repeat_end ${endNode.id} missing input`);
			continue;
		}
		const producerId = inEdge.source;
		const bodyCol = collectRepeatBodyNodes(producerId, beginNode.id, incoming, mainReach);
		if (!bodyCol.ok) {
			errors.push(`Pass ${pass}: ${bodyCol.err}`);
			continue;
		}
		const body = bodyCol.body;
		if (body.has(endNode.id)) {
			errors.push(`Pass ${pass}: repeat zone "${zoneKey}" body includes end node (internal)`);
			continue;
		}
		let overlap = false;
		for (const nid of body) {
			if (globalClaimed.has(nid)) {
				errors.push(
					`Pass ${pass}: repeat zones overlap on node ${nid} (nested/overlapping zones not supported in v1)`,
				);
				overlap = true;
			}
		}
		if (overlap) continue;

		let samplingBad = false;
		for (const nid of body) {
			const n = nodesById.get(nid)!;
			const d = registry.get(n.typeId);
			if (!d) continue;
			if (nodeUsesForbiddenSampling(n, d)) {
				errors.push(
					`Pass ${pass}: repeat zone "${zoneKey}" contains ${n.id} (${d.id}) which may sample textures — use pass substeps for multi-step feedback, not glsl_repeat_*`,
				);
				samplingBad = true;
			}
		}
		if (samplingBad) continue;

		const topoBody = topoOrder(body, pe.filter((e) => body.has(e.source) && body.has(e.target)));
		if (!topoBody) {
			errors.push(`Pass ${pass}: repeat zone "${zoneKey}" has a cycle in body`);
			continue;
		}

		for (const nid of body) globalClaimed.add(nid);

		const beginDef = registry.get(beginNode.typeId)!;
		const count = clampPassSubsteps(
			Number(literalParamGlsl(beginNode, paramById(beginDef, 'count')!)),
		);
		const indexKey = getLiteralStringParam(beginNode, paramById(beginDef, 'indexName'), 'ri');
		const iv = `${indexKey}_${beginNode.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
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
			tailSourceHandle: inEdge.sourceHandle,
		});
	}

	if (errors.length > 0) return { ok: false, errors };
	return { ok: true, zones };
}

export function emitRepeatZoneBlock(args: {
	zone: RepeatMainZonePlan;
	topoBody: string[];
	expandNode: (nid: string, loopOpts: ExpandOpts) => string;
	tailAssign: string;
}): string {
	const { zone, topoBody, expandNode, tailAssign } = args;
	const lines: string[] = [];
	for (const nid of topoBody) {
		const code = expandNode(nid, { loopReplacements: zone.loopRepl });
		if (code.trim()) lines.push(code);
	}
	const inner = lines.join('\n');
	const maxI = 32;
	const cLit = `${zone.count}.0`;
	const indentedInner = inner
		.split('\n')
		.map((ln) => (ln.trim() ? `    ${ln}` : ln))
		.join('\n');
	const tailLine = tailAssign.trim() ? `    ${tailAssign.trim()}` : '';
	return `for (int ${zone.intVar} = 0; ${zone.intVar} < ${maxI}; ${zone.intVar}++) {
  if (float(${zone.intVar}) >= float(${cLit})) break;
  {
${indentedInner}
${tailLine}
  }
}`;
}

export function topoRepeatBody(body: Set<string>, pe: GraphEdge[]): string[] | null {
	const sub = pe.filter((e) => body.has(e.source) && body.has(e.target));
	return topoOrder(body, sub);
}
