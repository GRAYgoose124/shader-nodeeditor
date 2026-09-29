import type { Node } from '@xyflow/svelte';
import type { GraphNode, NodeTypeDef } from '@shadertoy/compiler';
import { buildRegistry, isParamVisible } from '@shadertoy/compiler';
import type { FlowNodeAny, ShaderNodeData } from './flowDoc.js';
import { getShaderNodeSubtitle, SHADER_NODE_SUBTITLE_EXTRA_H } from './shaderNodeSubtitle.js';

/** Matches `toFlowNode` default; DOM grows with canvas params + optional subtitle. */
export const SHADER_NODE_LAYOUT_WIDTH = 200;
const BASE_SHADER_H = 110;
const CANVAS_PARAM_ROW_H = 32;

function estimateGraphNodeHeight(gn: GraphNode, customTypes?: NodeTypeDef[]): number {
	const reg = buildRegistry(customTypes ?? []);
	const def = reg.get(gn.typeId);
	if (!def) return BASE_SHADER_H;
	let h = BASE_SHADER_H;
	if (getShaderNodeSubtitle(def, gn.data)) {
		h += SHADER_NODE_SUBTITLE_EXTRA_H;
	}
	if (def.canvasParams?.length) {
		for (const pid of def.canvasParams) {
			const p = def.params.find((x) => x.id === pid);
			if (!p || p.binding !== 'uniform') continue;
			if (p.glslType !== 'float' && p.glslType !== 'int') continue;
			if (!isParamVisible(p, gn.data)) continue;
			h += CANVAS_PARAM_ROW_H;
		}
	}
	return h;
}

export function estimateShaderFlowNodeHeight(
	n: Node<ShaderNodeData, 'shader'>,
	customTypes?: NodeTypeDef[],
): number {
	return estimateGraphNodeHeight(n.data.graphNode, customTypes);
}

function rectsOverlap(
	ax: number,
	ay: number,
	aw: number,
	ah: number,
	bx: number,
	by: number,
	bw: number,
	bh: number,
): boolean {
	return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/**
 * Preserves X; pushes nodes down only when axis-aligned boxes (top-left + estimated size) overlap.
 * Skips nodes inside frames (`parentId` set). Intended for preset loads and initial graphs.
 */
export function packShaderNodesResolveOverlap(
	nodes: FlowNodeAny[],
	customTypes?: NodeTypeDef[],
	opts?: { nodeWidth?: number; gapY?: number; maxPasses?: number },
): FlowNodeAny[] {
	const W = opts?.nodeWidth ?? SHADER_NODE_LAYOUT_WIDTH;
	const GAP = opts?.gapY ?? 28;
	const MAX_PASSES = opts?.maxPasses ?? 64;

	const shaderIndices: number[] = [];
	for (let i = 0; i < nodes.length; i++) {
		const n = nodes[i]!;
		if (n.type !== 'shader') continue;
		if (n.parentId) continue;
		shaderIndices.push(i);
	}
	if (shaderIndices.length === 0) return nodes;

	const next = nodes.map((n) => {
		if (n.type !== 'shader') return n;
		const gn = n.data.graphNode;
		return {
			...n,
			data: { graphNode: { ...gn, position: { ...gn.position } } },
			position: { ...n.position },
		};
	});

	const getH = (i: number) => estimateShaderFlowNodeHeight(next[i]! as Node<ShaderNodeData, 'shader'>, customTypes);

	for (let pass = 0; pass < MAX_PASSES; pass++) {
		let moved = false;
		const order = [...shaderIndices].sort((ia, ib) => {
			const na = next[ia] as Node<ShaderNodeData, 'shader'>;
			const nb = next[ib] as Node<ShaderNodeData, 'shader'>;
			const dy = na.position.y - nb.position.y;
			if (Math.abs(dy) > 1e-6) return dy;
			return na.position.x - nb.position.x;
		});

		for (const i of order) {
			const n = next[i]! as Node<ShaderNodeData, 'shader'>;
			const x = n.position.x;
			let y = n.position.y;
			const h = getH(i);
			let inner = true;
			while (inner) {
				inner = false;
				for (const j of shaderIndices) {
					if (j === i) continue;
					const o = next[j]! as Node<ShaderNodeData, 'shader'>;
					const oh = getH(j);
					if (rectsOverlap(x, y, W, h, o.position.x, o.position.y, W, oh)) {
						y = o.position.y + oh + GAP;
						inner = true;
						moved = true;
						break;
					}
				}
			}
			if (y !== n.position.y) {
				n.position = { ...n.position, y };
				n.data = {
					...n.data,
					graphNode: { ...n.data.graphNode, position: { ...n.data.graphNode.position, y } },
				};
			}
		}
		if (!moved) break;
	}

	return next;
}
