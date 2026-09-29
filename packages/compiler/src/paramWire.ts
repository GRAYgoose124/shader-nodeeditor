import type { GraphNode, NodeTypeDef, ParamDef } from './types.js';
import { isParamAnimatable } from './paramAnimation.js';

/** `GraphNode.data` key for per-param bypass map (`true` = ignore graph wire). */
export const PARAM_GRAPH_BYPASS_DATA_KEY = 'paramGraphBypass';

/**
 * `GraphNode.data` key: param ids to show as slider + graph handle on the node.
 * When the key is **missing**, {@link effectiveParamNodePins} falls back to {@link NodeTypeDef.canvasParams}
 * (slider-eligible only). When present (including `[]`), that list is authoritative.
 */
export const PARAM_NODE_PINS_DATA_KEY = 'paramNodePins';

/** Prefix + double underscore so param ids like `a` never collide ambiguously. */
export function paramWirePortId(paramId: string): string {
	return `paramWire__${paramId}`;
}

/** Params that get an optional graph wire + on-node slider row (float scalars, no enum). */
export function isParamSliderDriver(p: ParamDef): boolean {
	if (p.glslType !== 'float' || (p.choices?.length ?? 0) > 0) return false;
	return p.binding === 'uniform' || isParamAnimatable(p);
}

/** Slider-eligible ids from a node type's `canvasParams` (for defaults / new nodes). */
export function sliderPinsFromNodeTypeCanvas(def: NodeTypeDef | undefined): string[] {
	if (!def?.canvasParams?.length) return [];
	const out: string[] = [];
	for (const pid of def.canvasParams) {
		const p = def.params.find((x) => x.id === pid);
		if (p && isParamSliderDriver(p)) out.push(pid);
	}
	return out;
}

/** `undefined` = property absent (use canvas fallback in {@link effectiveParamNodePins}). */
export function getExplicitParamNodePins(data: GraphNode['data']): string[] | undefined {
	if (!Object.prototype.hasOwnProperty.call(data, PARAM_NODE_PINS_DATA_KEY)) return undefined;
	const raw = data[PARAM_NODE_PINS_DATA_KEY];
	if (!Array.isArray(raw)) return [];
	return raw.filter((x): x is string => typeof x === 'string');
}

export function effectiveParamNodePins(data: GraphNode['data'], def: NodeTypeDef | undefined): string[] {
	const ex = getExplicitParamNodePins(data);
	if (ex !== undefined) return ex;
	return sliderPinsFromNodeTypeCanvas(def);
}

/** `true` means ignore the wire and use slider / animation. */
export function isParamGraphBypassed(data: GraphNode['data'], paramId: string): boolean {
	const raw = data[PARAM_GRAPH_BYPASS_DATA_KEY];
	if (!raw || typeof raw !== 'object') return false;
	return (raw as Record<string, unknown>)[paramId] === true;
}

export function isParamGraphDriveActive(
	node: GraphNode,
	p: ParamDef,
	wm: Map<string, string>,
): boolean {
	const hid = paramWirePortId(p.id);
	if (!wm.has(hid)) return false;
	if (isParamGraphBypassed(node.data, p.id)) return false;
	return true;
}

/** Preview / inspector: graph drives the param when an edge hits the param wire and bypass is off. */
export function isParamGraphDriveFromEdges(
	edges: Iterable<{ target: string; targetHandle?: string | null }>,
	node: GraphNode,
	paramId: string,
): boolean {
	const hid = paramWirePortId(paramId);
	for (const e of edges) {
		if (e.target === node.id && e.targetHandle === hid) {
			return !isParamGraphBypassed(node.data, paramId);
		}
	}
	return false;
}
