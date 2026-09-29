import type { BufferId, CompileResult } from '@shadertoy/compiler';

const NODE_MARKER = /^\/\/ node: ([^\s]+)/;

/** 1-based line → graph node id for fragment shaders with `// node: id` markers. */
export function buildGlslLineToNodeMap(source: string): Map<number, string> {
	const map = new Map<number, string>();
	const lines = source.split('\n');
	let current: string | undefined;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const m = line.match(NODE_MARKER);
		if (m?.[1]) {
			current = m[1];
			map.set(i + 1, current);
		} else if (current) {
			map.set(i + 1, current);
		}
	}
	return map;
}

/** Map WebGL shader compile log lines to node ids using a line→node map. */
export function parseGpuErrorNodeIds(log: string, lineMap: Map<number, string>): Set<string> {
	const out = new Set<string>();
	for (const m of log.matchAll(/ERROR:\s*\d+:(\d+):/g)) {
		const line = parseInt(m[1]!, 10);
		if (!Number.isFinite(line)) continue;
		const nid = lineMap.get(line);
		if (nid) out.add(nid);
	}
	return out;
}

export function parseGpuPassPrefix(log: string): BufferId | null {
	const m = log.match(/Pass (image|bufA|bufB|bufC|bufD):/);
	if (!m?.[1]) return null;
	return m[1] as BufferId;
}

export type ValidateAnchors = {
	nodeIds: Set<string>;
	edgeIds: Set<string>;
	portsByNode: Map<string, { inputs: Set<string>; outputs: Set<string> }>;
};

function portMapGet(m: Map<string, { inputs: Set<string>; outputs: Set<string> }>, nodeId: string) {
	let e = m.get(nodeId);
	if (!e) {
		e = { inputs: new Set(), outputs: new Set() };
		m.set(nodeId, e);
	}
	return e;
}

/**
 * Extract node/edge/port hints from graph validation errors (string format from validate.ts).
 * If `knownNodeIds` is set, only keep ids that exist in the graph.
 */
export function parseValidateAnchors(errors: string[], knownNodeIds?: Set<string>): ValidateAnchors {
	const nodeIds = new Set<string>();
	const edgeIds = new Set<string>();
	const portsByNode = new Map<string, { inputs: Set<string>; outputs: Set<string> }>();

	const keep = (id: string) => !knownNodeIds || knownNodeIds.has(id);

	const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

	function addEdgeIdsFromSuffix(errLine: string): void {
		const semi = errLine.lastIndexOf(';');
		if (semi < 0) return;
		const tail = errLine.slice(semi + 1).trim();
		const listM = tail.match(/^edges\s+(.+)$/i);
		if (listM?.[1]) {
			uuidRe.lastIndex = 0;
			let um: RegExpExecArray | null;
			while ((um = uuidRe.exec(listM[1])) !== null) {
				edgeIds.add(um[0]!);
			}
			return;
		}
		const oneM = tail.match(/^edge\s+([0-9a-f-]{36})$/i);
		if (oneM?.[1]) edgeIds.add(oneM[1]);
	}

	for (const err of errors) {
		let m: RegExpMatchArray | null;

		addEdgeIdsFromSuffix(err);

		m = err.match(/^Node ([^\s]+) /);
		if (m?.[1] && keep(m[1])) nodeIds.add(m[1]);

		m = err.match(/^Edge ([^:]+):/);
		if (m?.[1]) edgeIds.add(m[1]);

		m = err.match(/^Pass [^:]+: node ([^\s]+) missing input "([^"]+)"/);
		if (m?.[1] && m[2] && keep(m[1])) {
			nodeIds.add(m[1]);
			portMapGet(portsByNode, m[1]).inputs.add(m[2]);
		}

		m = err.match(/^Pass [^:]+: scene node ([^\s]+) input "([^"]+)"/);
		if (m?.[1] && m[2] && keep(m[1])) {
			nodeIds.add(m[1]);
			portMapGet(portsByNode, m[1]).inputs.add(m[2]);
		}

		m = err.match(/^Pass [^:]+: node ([^\s]+) input "([^"]+)"/);
		if (m?.[1] && m[2] && keep(m[1])) {
			nodeIds.add(m[1]);
			portMapGet(portsByNode, m[1]).inputs.add(m[2]);
		}

		m = err.match(/^Pass [^:]+: fractal motif pullback \([^)]+\) motif is wired to ([^\s]+) outside/);
		if (m?.[1] && keep(m[1])) nodeIds.add(m[1]);

		m = err.match(/Unknown node type: [^(]+\(([^)]+)\)/);
		if (m?.[1] && keep(m[1])) nodeIds.add(m[1]);

		m = err.match(/^([a-f0-9-]{36}): /);
		if (m?.[1] && keep(m[1])) nodeIds.add(m[1]);
	}

	return { nodeIds, edgeIds, portsByNode };
}

export type MergedDiagnostics = {
	errorNodeIds: Set<string>;
	errorEdgeIds: Set<string>;
	errorPortsByNode: Map<string, { inputs: Set<string>; outputs: Set<string> }>;
};

export function mergeDiagnostics(
	validate: ValidateAnchors,
	gpuNodeIds: Set<string>,
): MergedDiagnostics {
	const errorNodeIds = new Set([...validate.nodeIds, ...gpuNodeIds]);
	const errorEdgeIds = new Set(validate.edgeIds);
	const errorPortsByNode = new Map(validate.portsByNode);
	return { errorNodeIds, errorEdgeIds, errorPortsByNode };
}

/** GPU log + fragment sources: collect node ids from line mapping for the failing pass. */
export function gpuErrorRelatedNodeIds(
	gpuLog: string | null,
	compileResult: CompileResult | null,
): Set<string> {
	const out = new Set<string>();
	if (!gpuLog?.trim() || !compileResult?.passes) return out;

	const passId = parseGpuPassPrefix(gpuLog);
	const frag =
		(passId && compileResult.passes[passId]?.fragmentSource) ??
		compileResult.passes.image?.fragmentSource;
	if (!frag) return out;

	const lineMap = buildGlslLineToNodeMap(frag);
	return parseGpuErrorNodeIds(gpuLog, lineMap);
}
