import type { Edge, Node } from '@xyflow/svelte';
import type { GraphNode, NodeTypeDef } from '@shadertoy/compiler';
import {
	sortFlowNodesParentsBeforeChildren,
	toFlowNode,
	type FlowNodeAny,
	type ShaderNodeData,
} from '$lib/flowDoc.js';
import { estimateShaderFlowNodeHeight } from '$lib/shaderNodeLayout.js';
import {
	alignSelectedShaderNodesCore,
	duplicateSelectedShaderNodesCore,
	groupSelectedShaderNodesCore,
	snapSelectionPositionsToGridCore,
} from '$lib/model/flowOpsCore.js';

const NODE_LAYOUT_BOX = { w: 200, h: 110 };

export function duplicateSelectedShaderNodes(
	nodes: FlowNodeAny[],
	selectedNodeIds: string[],
): FlowNodeAny[] {
	return duplicateSelectedShaderNodesCore(nodes, selectedNodeIds);
}

export function groupSelectedShaderNodes(nodes: FlowNodeAny[], selectedNodeIds: string[]): FlowNodeAny[] {
	const r = groupSelectedShaderNodesCore(nodes, selectedNodeIds);
	if (r.error) alert(r.error);
	return r.nodes;
}

export function snapSelectionPositionsToGrid(
	nodes: FlowNodeAny[],
	selectedNodeIds: string[],
	grid = 16,
): FlowNodeAny[] {
	return snapSelectionPositionsToGridCore(nodes, selectedNodeIds, grid);
}

function median(nums: number[]): number {
	if (nums.length === 0) return 0;
	const s = [...nums].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * Align selected shader nodes into a layered graph layout:
 * - X: longest-path rank (sources left, sinks right).
 * - Within each layer, barycenter passes reduce edge crossings.
 * - Y: median of parent node vertical centers, then non-overlap packing (short vertical wires).
 */
export function alignSelectedShaderNodes(
	nodes: FlowNodeAny[],
	edges: Edge[],
	selectedNodeIds: string[],
	customNodeTypes: NodeTypeDef[],
): FlowNodeAny[] {
	const r = alignSelectedShaderNodesCore({ nodes, edges, selectedNodeIds, customNodeTypes });
	if (r.error) alert(r.error);
	return r.nodes;
}
