import { BuiltinNodeId } from '../builtinIds.js';
import { indentBlock } from '../glslPrelude.js';
import { outVar } from '../ident.js';
import { computeFrameBoundaryPorts } from '../subgraphContract.js';
import type { BufferId, GraphDocument, GraphEdge, GraphNode, NodeTypeDef, UniformManifestEntry } from '../types.js';
import { topoOrder } from '../graphutil.js';
import { emitSceneNodeLine } from './scene.js';
import { getLiteralStringParam, paramById } from './params.js';

/** Node ids inside frames that declare `exportVec3Fn` or `exportSdfFn` (same pass) — emitted only in exported helpers, not inlined in scene_sdf. */
export function collectExportedFrameInteriorNodeIds(doc: GraphDocument, pass: BufferId): Set<string> {
	const out = new Set<string>();
	for (const fr of doc.meta.editor?.frames ?? []) {
		if (!fr.exportVec3Fn?.trim() && !fr.exportSdfFn?.trim()) continue;
		for (const n of doc.nodes) {
			if (n.parentId === fr.id && n.pass === pass) out.add(n.id);
		}
	}
	return out;
}

/** GLSL-safe identifier from a user-provided export name. */
export function sanitizeExportFnBase(name: string): string {
	const t = name
		.trim()
		.replace(/[^a-zA-Z0-9_]/g, '_')
		.replace(/^([0-9])/, '_$1');
	return t.length > 0 ? t : 'fn_vec3';
}

function regId(registry: Map<string, NodeTypeDef>, typeId: string): string | undefined {
	return registry.get(typeId)?.id;
}

function wireMapExportedInterior(
	targetId: string,
	pe: GraphEdge[],
	inside: Set<string>,
	boundaryInNode: string,
	boundaryInHandle: string,
): Map<string, string> {
	const wm = new Map<string, string>();
	for (const e of pe) {
		if (e.target !== targetId) continue;
		if (inside.has(e.source) && inside.has(e.target)) {
			wm.set(e.targetHandle, outVar(e.source, e.sourceHandle));
		} else if (e.target === boundaryInNode && e.targetHandle === boundaryInHandle) {
			wm.set(e.targetHandle, 'p');
		}
	}
	return wm;
}

type ExportKind = 'vec3' | 'sdf';

function emitOneSceneExportFrame(args: {
	kind: ExportKind;
	frame: { id: string };
	fnBase: string;
	pass: BufferId;
	registry: Map<string, NodeTypeDef>;
	nodesById: Map<string, GraphNode>;
	sceneReach: Set<string>;
	pe: GraphEdge[];
	passUniforms: UniformManifestEntry[];
	animatedKeys: Set<string>;
	doc: GraphDocument;
	insideIds: Set<string>;
	errors: string[];
}): string {
	const {
		kind,
		frame,
		fnBase,
		pass,
		registry,
		nodesById,
		sceneReach,
		pe,
		passUniforms,
		animatedKeys,
		doc,
		insideIds,
		errors,
	} = args;

	const crossings = computeFrameBoundaryPorts(doc, frame.id);
	const ins = crossings.filter((c) => c.kind === 'in');
	const outs = crossings.filter((c) => c.kind === 'out');
	const sdfNoOut = kind === 'sdf' && outs.length === 0;
	if (ins.length !== 1 || (!sdfNoOut && outs.length !== 1)) {
		errors.push(
			`Pass ${pass}: frame export "${fnBase}" needs exactly one boundary in${kind === 'sdf' ? ' (SDF may omit boundary out if interior ends in float d)' : ''} and one out (found in=${ins.length} out=${outs.length})`,
		);
		return '';
	}

	const bin = ins[0]!;
	const bout = outs[0];
	const defIn = registry.get(nodesById.get(bin.nodeId)!.typeId);
	const portIn = defIn?.inputs.find((i) => i.id === bin.handleId);
	const wantIn = 'vec3' as const;
	if (!portIn || portIn.type !== wantIn) {
		errors.push(
			`Pass ${pass}: frame export "${fnBase}" boundary in must be vec3 (got ${portIn?.type})`,
		);
		return '';
	}
	if (kind === 'vec3') {
		const defOut = registry.get(nodesById.get(bout!.nodeId)!.typeId);
		const portOut = defOut?.outputs.find((o) => o.id === bout!.handleId);
		if (!portOut || portOut.type !== 'vec3') {
			errors.push(`Pass ${pass}: frame export "${fnBase}" boundary out must be vec3`);
			return '';
		}
	} else if (bout) {
		const defOut = registry.get(nodesById.get(bout.nodeId)!.typeId);
		const portOut = defOut?.outputs.find((o) => o.id === bout.handleId);
		if (!portOut || portOut.type !== 'float') {
			errors.push(`Pass ${pass}: frame export "${fnBase}" boundary out must be float`);
			return '';
		}
	}

	let boundaryErr = false;
	for (const e of pe) {
		if (!insideIds.has(e.source) && insideIds.has(e.target)) {
			if (!(e.target === bin.nodeId && e.targetHandle === bin.handleId)) {
				errors.push(
					`Pass ${pass}: frame export "${fnBase}" has extra inbound edge into ${e.target}.${e.targetHandle} (only one boundary in allowed)`,
				);
				boundaryErr = true;
			}
		}
		if (insideIds.has(e.source) && !insideIds.has(e.target)) {
			if (sdfNoOut) {
				errors.push(
					`Pass ${pass}: frame export "${fnBase}" (SDF, no boundary out) must not have edges from frame interior to outside`,
				);
				boundaryErr = true;
			} else if (!(e.source === bout!.nodeId && e.sourceHandle === bout.handleId)) {
				errors.push(
					`Pass ${pass}: frame export "${fnBase}" has extra outbound edge from ${e.source}.${e.sourceHandle} (only one boundary out allowed)`,
				);
				boundaryErr = true;
			}
		}
	}
	if (boundaryErr) return '';

	const peInside = pe.filter((e) => insideIds.has(e.source) && insideIds.has(e.target));
	const topo = topoOrder(insideIds, peInside);
	if (!topo) {
		errors.push(`Pass ${pass}: frame export "${fnBase}" interior has a cycle`);
		return '';
	}

	let retV: string;
	if (kind === 'vec3') {
		retV = outVar(bout!.nodeId, bout!.handleId);
	} else if (bout) {
		retV = outVar(bout.nodeId, bout.handleId);
	} else {
		let lastD: { id: string } | null = null;
		for (let i = topo.length - 1; i >= 0; i--) {
			const nid = topo[i]!;
			const defN = registry.get(nodesById.get(nid)!.typeId);
			const po = defN?.outputs.find((o) => o.id === 'd');
			if (po?.type === 'float') {
				lastD = { id: nid };
				break;
			}
		}
		if (!lastD) {
			errors.push(
				`Pass ${pass}: frame export "${fnBase}" (SDF) needs a boundary float out or an interior node with float output "d"`,
			);
			return '';
		}
		retV = outVar(lastD.id, 'd');
	}

	const lines: string[] = [];
	for (const nid of topo) {
		const node = nodesById.get(nid)!;
		const def = registry.get(node.typeId);
		if (!def) continue;
		const wm = wireMapExportedInterior(nid, pe, insideIds, bin.nodeId, bin.handleId);
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
			false,
			null,
			null,
			animatedKeys,
		);
		if (code.trim()) lines.push(code);
	}

	const body = indentBlock(lines.join('\n'), '  ');
	if (kind === 'vec3') {
		return `// frame export: ${fnBase} (${frame.id})\nvec3 ${fnBase}(vec3 p) {\n${body}\n  return ${retV};\n}\n\n`;
	}
	return `// frame export SDF: ${fnBase} (${frame.id})\nfloat ${fnBase}(vec3 p) {\n${body}\n  return ${retV};\n}\n\n`;
}

/**
 * Emits `vec3 <name>(vec3 p)` and/or `float <name>(vec3 p)` for editor frames with `exportVec3Fn` / `exportSdfFn`.
 */
export function emitSceneExportFrameFns(args: {
	doc: GraphDocument;
	pass: BufferId;
	registry: Map<string, NodeTypeDef>;
	nodesById: Map<string, GraphNode>;
	sceneReach: Set<string>;
	pe: GraphEdge[];
	passUniforms: UniformManifestEntry[];
	animatedKeys: Set<string>;
}): { glsl: string; errors: string[] } {
	const { doc, pass, registry, nodesById, sceneReach, pe, passUniforms, animatedKeys } = args;
	const errors: string[] = [];
	const frames = doc.meta.editor?.frames ?? [];
	const namesUsed = new Set<string>();

	let glslAcc = '';

	for (const frame of frames) {
		const rawVec = frame.exportVec3Fn?.trim();
		const rawSdf = frame.exportSdfFn?.trim();
		if (!rawVec && !rawSdf) continue;
		if (rawVec && rawSdf) {
			errors.push(
				`Pass ${pass}: frame ${frame.id.slice(0, 8)}… cannot set both exportVec3Fn and exportSdfFn`,
			);
			continue;
		}

		const kind: ExportKind = rawVec ? 'vec3' : 'sdf';
		const rawName = rawVec ?? rawSdf!;
		const fnBase = sanitizeExportFnBase(rawName);
		if (namesUsed.has(fnBase)) {
			errors.push(
				`Pass ${pass}: duplicate frame export name "${fnBase}" after sanitization (vec3 and SDF exports share one namespace)`,
			);
			continue;
		}
		namesUsed.add(fnBase);

		const insideIds = new Set(
			doc.nodes.filter((n) => n.parentId === frame.id && n.pass === pass).map((n) => n.id),
		);
		if (insideIds.size === 0) {
			errors.push(`Pass ${pass}: frame export "${fnBase}" has no nodes in this pass`);
			continue;
		}

		let badInterior = false;
		for (const id of insideIds) {
			if (!sceneReach.has(id)) {
				errors.push(
					`Pass ${pass}: frame export "${fnBase}" contains node ${id} outside the scene SDF subgraph`,
				);
				badInterior = true;
			}
			const gn = nodesById.get(id);
			if (gn && regId(registry, gn.typeId) === BuiltinNodeId.SdfParamP) {
				errors.push(`Pass ${pass}: frame export "${fnBase}" must not contain sdf_param_p`);
				badInterior = true;
			}
		}
		if (badInterior) continue;

		const chunk = emitOneSceneExportFrame({
			kind,
			frame,
			fnBase,
			pass,
			registry,
			nodesById,
			sceneReach,
			pe,
			passUniforms,
			animatedKeys,
			doc,
			insideIds,
			errors,
		});
		glslAcc += chunk;
	}

	return { glsl: glslAcc, errors };
}

/** @deprecated Use {@link emitSceneExportFrameFns} */
export const emitSceneExportVec3FrameFns = emitSceneExportFrameFns;

/** Validate `domain_call_exported_vec3` nodes reference an exported vec3 name on this pass. */
export function validateDomainCallExportedVec3(
	doc: GraphDocument,
	pass: BufferId,
	registry: Map<string, NodeTypeDef>,
	nodesById: Map<string, GraphNode>,
): string[] {
	const errs: string[] = [];
	const exports = new Set<string>();
	for (const fr of doc.meta.editor?.frames ?? []) {
		const t = fr.exportVec3Fn?.trim();
		if (t) exports.add(sanitizeExportFnBase(t));
	}
	for (const n of doc.nodes) {
		if (n.pass !== pass) continue;
		if (regId(registry, n.typeId) !== BuiltinNodeId.DomainCallExportedVec3) continue;
		const def = registry.get(n.typeId)!;
		const raw = getLiteralStringParam(n, paramById(def, 'fnBase'), '');
		const want = sanitizeExportFnBase(raw);
		if (!exports.has(want)) {
			errs.push(
				`Pass ${pass}: domain_call_exported_vec3 (${n.id}) references "${want}" but no frame has exportVec3Fn producing that name`,
			);
		}
	}
	return errs;
}

/** Validate `domain_call_exported_sdf` / `sdf_repeat_exported_min` reference an exported SDF name on this pass. */
export function validateDomainCallExportedSdf(
	doc: GraphDocument,
	pass: BufferId,
	registry: Map<string, NodeTypeDef>,
	nodesById: Map<string, GraphNode>,
): string[] {
	const errs: string[] = [];
	const exports = new Set<string>();
	for (const fr of doc.meta.editor?.frames ?? []) {
		const t = fr.exportSdfFn?.trim();
		if (t) exports.add(sanitizeExportFnBase(t));
	}
	for (const n of doc.nodes) {
		if (n.pass !== pass) continue;
		const rid = regId(registry, n.typeId);
		if (rid !== BuiltinNodeId.DomainCallExportedSdf && rid !== BuiltinNodeId.SdfRepeatExportedMin) continue;
		const def = registry.get(n.typeId)!;
		const raw = getLiteralStringParam(n, paramById(def, 'fnBase'), '');
		const want = sanitizeExportFnBase(raw);
		if (!exports.has(want)) {
			errs.push(
				`Pass ${pass}: ${def.id} (${n.id}) references "${want}" but no frame has exportSdfFn producing that name`,
			);
		}
	}
	return errs;
}
