import { Position } from '@xyflow/system';
import type { Edge, Node } from '@xyflow/svelte';

/** Match `.frame-bar` height in `EditorFrameNode.svelte`. */
export const COLLAPSED_BAR_H = 24;
export const COLLAPSED_ROW_H = 22;
export const COLLAPSED_PAD_BOTTOM = 6;

type FlowishNode = Pick<Node, 'id' | 'type' | 'parentId' | 'hidden'>;
type FlowishEdge = Pick<Edge, 'source' | 'target' | 'sourceHandle' | 'targetHandle'>;

export function insideShaderIds(nodes: FlowishNode[], frameId: string): Set<string> {
	return new Set(
		nodes.filter((n) => n.type === 'shader' && n.parentId === frameId).map((n) => n.id),
	);
}

export function boundaryInputPortsForInside(
	inside: Set<string>,
	edges: FlowishEdge[],
): { nodeId: string; handleId: string }[] {
	const keys = new Map<string, { nodeId: string; handleId: string }>();
	for (const e of edges) {
		if (!inside.has(e.target) || inside.has(e.source)) continue;
		const handleId = e.targetHandle ?? '';
		const k = `${e.target}\0${handleId}`;
		if (!keys.has(k)) keys.set(k, { nodeId: e.target, handleId });
	}
	return [...keys.values()].sort((a, b) => {
		const c = a.nodeId.localeCompare(b.nodeId);
		return c !== 0 ? c : a.handleId.localeCompare(b.handleId);
	});
}

export function boundaryOutputPortsForInside(
	inside: Set<string>,
	edges: FlowishEdge[],
): { nodeId: string; handleId: string }[] {
	const keys = new Map<string, { nodeId: string; handleId: string }>();
	for (const e of edges) {
		if (!inside.has(e.source) || inside.has(e.target)) continue;
		const handleId = e.sourceHandle ?? '';
		const k = `${e.source}\0${handleId}`;
		if (!keys.has(k)) keys.set(k, { nodeId: e.source, handleId });
	}
	return [...keys.values()].sort((a, b) => {
		const c = a.nodeId.localeCompare(b.nodeId);
		return c !== 0 ? c : a.handleId.localeCompare(b.handleId);
	});
}

export function boundaryInputPorts(
	frameId: string,
	nodes: FlowishNode[],
	edges: FlowishEdge[],
): { nodeId: string; handleId: string }[] {
	return boundaryInputPortsForInside(insideShaderIds(nodes, frameId), edges);
}

export function boundaryOutputPorts(
	frameId: string,
	nodes: FlowishNode[],
	edges: FlowishEdge[],
): { nodeId: string; handleId: string }[] {
	return boundaryOutputPortsForInside(insideShaderIds(nodes, frameId), edges);
}

export function collapsedFrameChromeHeightFromInside(
	inside: Set<string>,
	edges: FlowishEdge[],
): number {
	const rows = Math.max(
		1,
		boundaryInputPortsForInside(inside, edges).length,
		boundaryOutputPortsForInside(inside, edges).length,
	);
	return COLLAPSED_BAR_H + rows * COLLAPSED_ROW_H + COLLAPSED_PAD_BOTTOM;
}

export function collapsedFrameChromeHeight(
	frameId: string,
	nodes: FlowishNode[],
	edges: FlowishEdge[],
): number {
	return collapsedFrameChromeHeightFromInside(insideShaderIds(nodes, frameId), edges);
}

type StoreLike = {
	nodes: FlowishNode[];
	edges: FlowishEdge[];
	nodeLookup: Map<
		string,
		{
			internals: {
				positionAbsolute: { x: number; y: number };
				userNode: FlowishNode;
			};
			measured?: { width?: number; height?: number };
			width?: number;
			height?: number;
		}
	>;
};

function frameBox(store: StoreLike, frameId: string, dataWidth: number): { x: number; y: number; w: number } | null {
	const internal = store.nodeLookup.get(frameId);
	if (!internal) return null;
	const { x, y } = internal.internals.positionAbsolute;
	const w =
		internal.measured?.width ?? internal.width ?? dataWidth;
	return { x, y, w };
}

export function resolveCollapsedWireEndpoints(
	store: StoreLike,
	edge: {
		source: string;
		target: string;
		sourceHandle?: string | null;
		targetHandle?: string | null;
	},
	sourceX: number,
	sourceY: number,
	targetX: number,
	targetY: number,
	sourcePosition: Position,
	targetPosition: Position,
	frameDataWidth: (frameId: string) => number,
	frameCollapsed: (frameId: string) => boolean,
): {
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
	sourcePosition: Position;
	targetPosition: Position;
} {
	let sx = sourceX;
	let sy = sourceY;
	let tx = targetX;
	let ty = targetY;
	let sp = sourcePosition;
	let tp = targetPosition;

	const tUser = store.nodeLookup.get(edge.target)?.internals.userNode;
	if (tUser?.hidden && tUser.type === 'shader' && tUser.parentId) {
		const fid = tUser.parentId;
		if (frameCollapsed(fid)) {
			const ports = boundaryInputPorts(fid, store.nodes, store.edges);
			const idx = ports.findIndex(
				(p) => p.nodeId === edge.target && p.handleId === (edge.targetHandle ?? ''),
			);
			if (idx >= 0) {
				const box = frameBox(store, fid, frameDataWidth(fid));
				if (box) {
					tx = box.x;
					ty = box.y + COLLAPSED_BAR_H + idx * COLLAPSED_ROW_H + COLLAPSED_ROW_H / 2;
					tp = Position.Left;
				}
			}
		}
	}

	const sUser = store.nodeLookup.get(edge.source)?.internals.userNode;
	if (sUser?.hidden && sUser.type === 'shader' && sUser.parentId) {
		const fid = sUser.parentId;
		if (frameCollapsed(fid)) {
			const ports = boundaryOutputPorts(fid, store.nodes, store.edges);
			const idx = ports.findIndex(
				(p) => p.nodeId === edge.source && p.handleId === (edge.sourceHandle ?? ''),
			);
			if (idx >= 0) {
				const box = frameBox(store, fid, frameDataWidth(fid));
				if (box) {
					sx = box.x + box.w;
					sy = box.y + COLLAPSED_BAR_H + idx * COLLAPSED_ROW_H + COLLAPSED_ROW_H / 2;
					sp = Position.Right;
				}
			}
		}
	}

	return { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty, sourcePosition: sp, targetPosition: tp };
}
