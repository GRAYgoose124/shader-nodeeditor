import { outVar } from '../ident.js';
import type { GlslType, GraphEdge, GraphNode, NodeTypeDef, UniformManifestEntry } from '../types.js';

export function pushWireProbeUniforms(passUniforms: UniformManifestEntry[]): void {
	const nodeId = '__dbg_wire__';
	passUniforms.push({
		name: 'u_dbg_wire_on',
		type: 'float',
		nodeId,
		paramId: 'wire_on',
		default: 0,
		min: 0,
		max: 1,
		step: 1,
		label: 'Debug: wire probe on',
	});
}

function outputPortType(
	registry: Map<string, NodeTypeDef>,
	nodesById: Map<string, GraphNode>,
	sourceNodeId: string,
	sourceHandle: string,
): GlslType | undefined {
	const n = nodesById.get(sourceNodeId);
	if (!n) return undefined;
	const def = registry.get(n.typeId);
	const po = def?.outputs.find((o) => o.id === sourceHandle);
	return po?.type;
}

function exprToFragColor(expr: string, ty: GlslType): string {
	switch (ty) {
		case 'float':
			return `vec4(vec3(clamp(0.5 + 0.5 * tanh(${expr}), 0.0, 1.0)), 1.0)`;
		case 'vec2':
			return `vec4(clamp(${expr}, vec2(0.0), vec2(1.0)), 0.0, 1.0)`;
		case 'vec3':
			return `vec4(clamp(${expr}, vec3(0.0), vec3(1.0)), 1.0)`;
		case 'vec4':
			return `vec4(clamp(${expr}.rgb, 0.0, 1.0), 1.0)`;
		case 'int':
			return `vec4(vec3(float(${expr})), 1.0)`;
		default:
			return `vec4(1.0, 0.0, 1.0, 1.0)`;
	}
}

/**
 * Appends to the end of `main()` so it runs after `fragColor` is set; overwrites when enabled.
 * Skips edges whose source output type is not scalar/vector-friendly.
 */
export function emitWireProbeTail(
	targetNodeId: string,
	peMain: GraphEdge[],
	registry: Map<string, NodeTypeDef>,
	nodesById: Map<string, GraphNode>,
): string | null {
	const incoming = peMain.filter((e) => e.target === targetNodeId);
	const preferredHandles = ['col', 'color', 'rd', 'ro', 'uv', 'p', 'd'];

	function tryPick(
		predicate: (e: GraphEdge) => boolean,
	): { e: GraphEdge; ty: GlslType } | undefined {
		for (const e of incoming) {
			if (!predicate(e)) continue;
			const t = outputPortType(registry, nodesById, e.source, e.sourceHandle);
			if (!t || t === 'mat4' || t === 'sampler2D') continue;
			return { e, ty: t };
		}
		return undefined;
	}

	let picked: GraphEdge | undefined;
	let ty: GlslType | undefined;
	for (const h of preferredHandles) {
		const got = tryPick((e) => e.sourceHandle === h);
		if (got) {
			picked = got.e;
			ty = got.ty;
			break;
		}
	}
	if (!picked || !ty) {
		for (const e of incoming) {
			const t = outputPortType(registry, nodesById, e.source, e.sourceHandle);
			if (!t || t === 'mat4' || t === 'sampler2D') continue;
			picked = e;
			ty = t;
			break;
		}
	}
	if (!picked || !ty) return null;

	const ex = outVar(picked.source, picked.sourceHandle);
	const fc = exprToFragColor(ex, ty);
	const note = `wire ${picked.source}.${picked.sourceHandle} → ${targetNodeId}`;
	return `if (u_dbg_wire_on > 0.5) {
  // debug: ${note}
  fragColor = ${fc};
}
`;
}
