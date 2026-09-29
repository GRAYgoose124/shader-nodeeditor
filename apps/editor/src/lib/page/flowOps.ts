import type { Edge, Node } from '@xyflow/svelte';
import type { GraphNode, NodeTypeDef } from '@shadertoy/compiler';
import {
	sortFlowNodesParentsBeforeChildren,
	toFlowNode,
	type FlowNodeAny,
	type ShaderNodeData,
} from '$lib/flowDoc.js';
import { estimateShaderFlowNodeHeight } from '$lib/shaderNodeLayout.js';

const NODE_LAYOUT_BOX = { w: 200, h: 110 };

export function duplicateSelectedShaderNodes(
	nodes: FlowNodeAny[],
	selectedNodeIds: string[],
): FlowNodeAny[] {
	if (selectedNodeIds.length === 0) return nodes;
	const idSet = new Set(selectedNodeIds);
	const clones: FlowNodeAny[] = [];
	for (const n of nodes) {
		if (n.type !== 'shader' || !idSet.has(n.id)) continue;
		const gn = structuredClone(n.data.graphNode) as GraphNode;
		gn.id = crypto.randomUUID();
		gn.parentId = undefined;
		gn.position = { x: n.position.x + 28, y: n.position.y + 28 };
		clones.push(toFlowNode(gn));
	}
	return [...nodes, ...clones];
}

export function groupSelectedShaderNodes(nodes: FlowNodeAny[], selectedNodeIds: string[]): FlowNodeAny[] {
	const sel = selectedNodeIds.filter((id) => {
		const n = nodes.find((x) => x.id === id);
		return n?.type === 'shader';
	});
	if (sel.length === 0) {
		alert('Select one or more shader nodes to group.');
		return nodes;
	}
	const { w: bw, h: bh } = NODE_LAYOUT_BOX;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const pad = 28;
	for (const id of sel) {
		const n = nodes.find((x) => x.id === id)!;
		minX = Math.min(minX, n.position.x);
		minY = Math.min(minY, n.position.y);
		maxX = Math.max(maxX, n.position.x + bw);
		maxY = Math.max(maxY, n.position.y + bh);
	}
	const fx = minX - pad;
	const fy = minY - pad;
	const fw = maxX - minX + pad * 2;
	const fh = maxY - minY + pad * 2;
	const frameId = crypto.randomUUID();
	const frame: FlowNodeAny = {
		id: frameId,
		type: 'group',
		position: { x: fx, y: fy },
		draggable: true,
		dragHandle: '.frame-drag-handle',
		data: { label: 'Frame', collapsed: false, width: fw, height: fh },
		style: `width: ${fw}px; height: ${fh}px`,
	};
	return sortFlowNodesParentsBeforeChildren([
		frame,
		...nodes.map((n) => {
			if (n.type !== 'shader' || !sel.includes(n.id)) return n;
			const rel = { x: n.position.x - fx, y: n.position.y - fy };
			const gn = n.data.graphNode;
			return {
				...n,
				parentId: frameId,
				position: rel,
				data: {
					graphNode: { ...gn, position: { ...rel }, parentId: frameId },
				},
			};
		}),
	]);
}

export function snapSelectionPositionsToGrid(
	nodes: FlowNodeAny[],
	selectedNodeIds: string[],
	grid = 16,
): FlowNodeAny[] {
	const sel = new Set(selectedNodeIds);
	return nodes.map((n) => {
		if (!sel.has(n.id)) return n;
		return {
			...n,
			position: {
				x: Math.round(n.position.x / grid) * grid,
				y: Math.round(n.position.y / grid) * grid,
			},
		};
	});
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
	const sel = selectedNodeIds.filter((id) =>
		nodes.some((x) => x.id === id && x.type === 'shader'),
	);
	if (sel.length === 0) {
		alert('Select shader nodes to align.');
		return nodes;
	}
	const idSet = new Set(sel);
	const subEdges = edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));

	const depth = new Map<string, number>();
	for (const id of sel) depth.set(id, 0);
	let fix = true;
	let guard = 0;
	while (fix && guard++ < 500) {
		fix = false;
		for (const e of subEdges) {
			const ns = (depth.get(e.source) ?? 0) + 1;
			const cur = depth.get(e.target) ?? 0;
			if (ns > cur) {
				depth.set(e.target, ns);
				fix = true;
			}
		}
	}

	const colW = 200;
	const rowPad = 12;
	const grid = 16;

	function flowNode(id: string): Node<ShaderNodeData, 'shader'> | null {
		const n = nodes.find((x) => x.id === id);
		if (!n || n.type !== 'shader') return null;
		return n as Node<ShaderNodeData, 'shader'>;
	}

	function flowY(id: string): number {
		return flowNode(id)?.position.y ?? 0;
	}

	function flowH(id: string): number {
		const n = flowNode(id);
		if (!n) return NODE_LAYOUT_BOX.h;
		return estimateShaderFlowNodeHeight(n, customNodeTypes);
	}

	const partitions = new Map<string, string[]>();
	for (const id of sel) {
		const n = nodes.find((x) => x.id === id)!;
		const key = n.parentId ?? '';
		if (!partitions.has(key)) partitions.set(key, []);
		partitions.get(key)!.push(id);
	}

	const posUpdates = new Map<string, { x: number; y: number }>();

	for (const ids of partitions.values()) {
		let minX = Infinity;
		let minY = Infinity;
		for (const id of ids) {
			const n = nodes.find((x) => x.id === id)!;
			minX = Math.min(minX, n.position.x);
			minY = Math.min(minY, n.position.y);
		}
		const anchorX = Math.round(minX / grid) * grid;
		const anchorY = Math.round(minY / grid) * grid;

		const idLocal = new Set(ids);
		const predsIn = new Map<string, string[]>();
		const succOut = new Map<string, string[]>();
		for (const id of ids) {
			predsIn.set(id, []);
			succOut.set(id, []);
		}
		for (const e of subEdges) {
			if (!idLocal.has(e.source) || !idLocal.has(e.target)) continue;
			predsIn.get(e.target)!.push(e.source);
			succOut.get(e.source)!.push(e.target);
		}

		const byLayer = new Map<number, string[]>();
		let maxLayer = 0;
		for (const id of ids) {
			const L = depth.get(id) ?? 0;
			maxLayer = Math.max(maxLayer, L);
			if (!byLayer.has(L)) byLayer.set(L, []);
			byLayer.get(L)!.push(id);
		}

		for (const idList of byLayer.values()) {
			idList.sort((a, b) => {
				const ya = flowY(a);
				const yb = flowY(b);
				if (ya !== yb) return ya - yb;
				return a.localeCompare(b);
			});
		}

		for (let iter = 0; iter < 4; iter++) {
			for (let L = 1; L <= maxLayer; L++) {
				const layer = byLayer.get(L);
				if (!layer) continue;
				const below = byLayer.get(L - 1)!;
				const idxBelow = new Map(below.map((nid, i) => [nid, i]));
				layer.sort((a, b) => {
					const ia = median(
						(predsIn.get(a) ?? [])
							.filter((p) => (depth.get(p) ?? 0) === L - 1)
							.map((p) => idxBelow.get(p) ?? 0),
					);
					const ib = median(
						(predsIn.get(b) ?? [])
							.filter((p) => (depth.get(p) ?? 0) === L - 1)
							.map((p) => idxBelow.get(p) ?? 0),
					);
					if (ia !== ib) return ia - ib;
					return a.localeCompare(b);
				});
			}
			for (let L = maxLayer - 1; L >= 0; L--) {
				const layer = byLayer.get(L);
				if (!layer) continue;
				const above = byLayer.get(L + 1);
				if (!above) continue;
				const idxAbove = new Map(above.map((nid, i) => [nid, i]));
				layer.sort((a, b) => {
					const ia = median(
						(succOut.get(a) ?? [])
							.filter((s) => (depth.get(s) ?? 0) === L + 1)
							.map((s) => idxAbove.get(s) ?? 0),
					);
					const ib = median(
						(succOut.get(b) ?? [])
							.filter((s) => (depth.get(s) ?? 0) === L + 1)
							.map((s) => idxAbove.get(s) ?? 0),
					);
					if (ia !== ib) return ia - ib;
					return a.localeCompare(b);
				});
			}
		}

		const placedCenterY = new Map<string, number>();

		for (let L = 0; L <= maxLayer; L++) {
			const layer = byLayer.get(L)!;
			const items = layer.map((id) => {
				const preds = (predsIn.get(id) ?? []).filter(
					(p) => idLocal.has(p) && (depth.get(p) ?? -1) < L,
				);
				let idealCenter: number;
				if (preds.length === 0) {
					idealCenter = flowY(id) + flowH(id) * 0.5;
				} else {
					idealCenter = median(
						preds.map((p) => {
							const pc = placedCenterY.get(p);
							if (pc !== undefined) return pc;
							return flowY(p) + flowH(p) * 0.5;
						}),
					);
				}
				const tie = layer.indexOf(id);
				return { id, idealCenter, tie };
			});

			items.sort((a, b) => {
				if (a.idealCenter !== b.idealCenter) return a.idealCenter - b.idealCenter;
				return a.tie - b.tie;
			});

			let prevBottom = anchorY - rowPad;
			for (const it of items) {
				const h = flowH(it.id);
				let top = it.idealCenter - h * 0.5;
				top = Math.max(top, prevBottom + rowPad);
				top = Math.round(top / grid) * grid;
				const x = Math.round((anchorX + L * colW) / grid) * grid;
				posUpdates.set(it.id, { x, y: top });
				placedCenterY.set(it.id, top + h * 0.5);
				prevBottom = top + h;
			}
		}
	}

	return nodes.map((n) => {
		if (!idSet.has(n.id) || n.type !== 'shader') return n;
		const p = posUpdates.get(n.id)!;
		const gn = n.data.graphNode;
		return {
			...n,
			position: { x: p.x, y: p.y },
			data: { ...n.data, graphNode: { ...gn, position: { x: p.x, y: p.y } } },
		};
	});
}
