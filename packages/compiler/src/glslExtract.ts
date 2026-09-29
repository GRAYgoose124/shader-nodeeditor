import { outVar, sanitizeNodeId } from './ident.js';
import { sceneFnSuffix } from './graphutil.js';
import type { BufferId, GlslType, NodeTypeDef } from './types.js';

const GLSL_ASSIGN_WITH_TYPE_RE =
	/^\s*((?:float|vec2|vec3|vec4|int|uint|bool|mat4)\s+)(g_[a-zA-Z0-9_]+)\s*=\s*(.+);?\s*$/;

function glslRefsInExpr(expr: string): string[] {
	const refs: string[] = [];
	const re = /\b(g_[a-zA-Z0-9_]+)\b/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(expr)) !== null) refs.push(m[1]!);
	return refs;
}

/**
 * Moderate cleanup: drop simple `TYPE g_* = …;` lines not needed for `rootVars`, then compact blanks.
 * Only single-line assignments are analyzed (keeps multi-line / control flow intact).
 */
export function optimizeBakedSelectionGlslKernel(body: string, rootVars: Set<string>): string {
	const lines = body.replace(/\r\n/g, '\n').split('\n');
	const kept: string[] = [];
	const assignRows: { idx: number; lhs: string; rhs: string }[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const m = line.match(GLSL_ASSIGN_WITH_TYPE_RE);
		if (m) {
			assignRows.push({ idx: i, lhs: m[2]!, rhs: m[3]!.trim() });
		}
	}
	/** Backward liveness: start from values read at outputs; pull prerequisite `g_*` refs. */
	let needed = new Set<string>(rootVars);
	let changed = true;
	while (changed) {
		changed = false;
		for (let r = assignRows.length - 1; r >= 0; r--) {
			const { lhs, rhs } = assignRows[r]!;
			if (!needed.has(lhs)) continue;
			for (const ref of glslRefsInExpr(rhs)) {
				if (!needed.has(ref)) {
					needed.add(ref);
					changed = true;
				}
			}
		}
	}
	const dropIdx = new Set<number>();
	for (const ar of assignRows) {
		if (!needed.has(ar.lhs)) dropIdx.add(ar.idx);
	}
	for (let i = 0; i < lines.length; i++) {
		if (!dropIdx.has(i)) kept.push(lines[i]!);
	}
	let out = kept.join('\n');
	out = out.replace(/\n{3,}/g, '\n\n');
	return out.replace(/[ \t]+$/gm, '').trim();
}

export function bakedSelectionInputPortId(targetNodeId: string, targetHandle: string): string {
	return `i_${sanitizeNodeId(targetNodeId)}_${sanitizeNodeId(targetHandle)}`;
}

export function bakedSelectionOutputPortId(sourceNodeId: string, sourceHandle: string): string {
	return `o_${sanitizeNodeId(sourceNodeId)}_${sanitizeNodeId(sourceHandle)}`;
}

export type BakedSelectionBoundaryWire = {
	sourceNodeId: string;
	sourceHandle: string;
	targetNodeId: string;
	targetHandle: string;
};

export type BakedSelectionBoundaryIn = BakedSelectionBoundaryWire & { glslType: GlslType };
export type BakedSelectionBoundaryOut = BakedSelectionBoundaryWire & { glslType: GlslType };

/**
 * Build a custom `NodeTypeDef` from compiled per-node GLSL blocks (see `extractNodeGlslBlock`) plus boundary aliases.
 */
/** Remap `u_<old>_` uniform prefixes so baked node id owns uniforms without collisions between merged nodes. */
export function remapBakedSelectionUniforms(glsl: string, bakedNodeId: string, sourceNodeIds: string[]): string {
	let s = glsl;
	for (const oid of sourceNodeIds) {
		const from = `u_${sanitizeNodeId(oid)}_`;
		const to = `u_${sanitizeNodeId(bakedNodeId)}_${sanitizeNodeId(oid)}_`;
		s = s.split(from).join(to);
	}
	return s;
}

export function buildBakedSelectionCustomType(args: {
	fragmentSource: string;
	orderedNodeIds: string[];
	boundaryIn: BakedSelectionBoundaryIn[];
	boundaryOut: BakedSelectionBoundaryOut[];
	label: string;
	/** When set, rewrite uniform prefixes from source node ids to this node id (avoids stale ids in baked custom defs). */
	bakedNodeIdForUniforms?: string;
}): NodeTypeDef | null {
	const { fragmentSource, orderedNodeIds, boundaryIn, boundaryOut, label, bakedNodeIdForUniforms } = args;
	if (orderedNodeIds.length === 0 || boundaryOut.length === 0) return null;

	const blocksRaw: string[] = [];
	for (const nid of orderedNodeIds) {
		const b = extractNodeGlslBlock(fragmentSource, nid);
		if (!b) return null;
		blocksRaw.push(b);
	}
	const merged = blocksRaw.join('\n\n');
	const roots = new Set<string>(
		boundaryOut.map((w) => outVar(w.sourceNodeId, w.sourceHandle)),
	);
	let kernel = optimizeBakedSelectionGlslKernel(merged, roots);
	if (bakedNodeIdForUniforms) {
		kernel = remapBakedSelectionUniforms(kernel, bakedNodeIdForUniforms, orderedNodeIds);
	}

	const aliasLines = boundaryIn.map((w) => {
		const pid = bakedSelectionInputPortId(w.targetNodeId, w.targetHandle);
		return `${w.glslType} ${outVar(w.sourceNodeId, w.sourceHandle)} = {{in:${pid}}};`;
	});
	const outLines = boundaryOut.map((w) => {
		const pid = bakedSelectionOutputPortId(w.sourceNodeId, w.sourceHandle);
		return `${w.glslType} {{out:${pid}}} = ${outVar(w.sourceNodeId, w.sourceHandle)};`;
	});

	const body = [...aliasLines, '', kernel, '', ...outLines].join('\n');
	const id = `baked_sel_${Math.random().toString(36).slice(2, 10)}`;
	const desc = bakedNodeIdForUniforms
		? 'Baked subgraph from a successful compile of the selected nodes. Scalar uniform names are namespaced under this node id.'
		: 'Baked subgraph from a successful compile of the selected nodes. Uniforms may still reference original node ids from bake time.';
	return {
		id,
		label: label.trim() || 'Baked selection',
		category: 'Custom',
		description: desc,
		inputs: boundaryIn.map((w) => ({
			id: bakedSelectionInputPortId(w.targetNodeId, w.targetHandle),
			type: w.glslType,
			label: `← ${w.sourceHandle}`,
		})),
		outputs: boundaryOut.map((w) => ({
			id: bakedSelectionOutputPortId(w.sourceNodeId, w.sourceHandle),
			type: w.glslType,
			label: `→ ${w.sourceHandle}`,
		})),
		params: [],
		template: `// node: {{nodeId}} — baked selection\n${body}`,
	};
}

/** Extract the GLSL block emitted for one graph node (between `// node: id` markers). */
export function extractNodeGlslBlock(fragmentSource: string, nodeId: string): string | null {
	const needle = '// node: ' + nodeId + '\n';
	const i = fragmentSource.indexOf(needle);
	if (i === -1) return null;
	const start = i + needle.length;
	const rest = fragmentSource.slice(start);
	const stops = ['\n// node: ', '\nfloat scene_sdf_', '\nvoid scene_hit_', '\nvoid main('] as const;
	let end = rest.length;
	for (const s of stops) {
		const j = rest.indexOf(s);
		if (j !== -1) end = Math.min(end, j);
	}
	return rest.slice(0, end).trim();
}

/**
 * Build a custom `NodeTypeDef` from the compiled `scene_sdf_<pass>()` body for this pass.
 * `fnName` is alphanumeric (from pass id); safe to embed in RegExp.
 */
export function buildBakedSceneSdfCustomType(
	fragmentSource: string,
	pass: BufferId,
	label: string,
): NodeTypeDef | null {
	const sfx = sceneFnSuffix(pass);
	const fnName = `scene_sdf_${sfx}`;
	if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fnName)) return null;
	const re = new RegExp(`float\\s+${fnName}\\s*\\(\\s*vec3\\s+p\\s*\\)\\s*\\{([\\s\\S]*?)\\n\\}\\s*`);
	const m = fragmentSource.match(re);
	if (!m) return null;
	let body = m[1].trim().replace(/\r\n/g, '\n');
	body = body.replace(/\n\s*return\s+([^;]+);\s*$/, '\nfloat {{out:d}} = $1;');
	if (!body.includes('{{out:d}}')) {
		body = body.replace(/^\s*return\s+([^;]+);\s*$/, 'float {{out:d}} = $1;');
	}
	if (!body.includes('{{out:d}}')) return null;
	const id = `baked_sdf_${sfx}_${Math.random().toString(36).slice(2, 10)}`;
	return {
		id,
		label: label.trim() || `Baked SDF (${pass})`,
		category: 'Custom',
		description:
			'Baked scene distance field from a full compile. Uniforms still use the original node ids from bake time.',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [],
		template: `// node: {{nodeId}} — baked from ${fnName}\nvec3 p = {{in:p}};\n${body}`,
	};
}
