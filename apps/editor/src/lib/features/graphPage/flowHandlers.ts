import { addEdge, type Connection, type Edge, type Node } from '@xyflow/svelte';
import type { BufferId, GraphEditorBoundaryPort, GraphNode, NodeTypeDef } from '@shadertoy/compiler';

import { boundaryInputPorts, boundaryOutputPorts, collapsedFrameChromeHeight } from '$lib/frameCollapse.js';
import type { FlowNodeAny, FrameNodeData, ShaderNodeData } from '$lib/flowDoc.js';
import { sortFlowNodesParentsBeforeChildren } from '$lib/flowDoc.js';
import type { PassReadiness } from '$lib/model/graph/passReadiness.js';
import { isValidShaderConnection } from '$lib/page/flowConnections.js';

export function isValidConnectionForGraphPage(
	c: Connection | Edge,
	nodes: FlowNodeAny[],
	registry: Map<string, NodeTypeDef>,
): boolean {
	return isValidShaderConnection(c, nodes, registry);
}

/**
 * Enforces: one wire per target input port (last-wins codegen can reference undeclared vars otherwise).
 */
export function connectShaderWireSinglePort(edges: Edge[], c: Connection): Edge[] {
	const tgt = c.target ?? '';
	const th = c.targetHandle ?? '';
	const withoutSamePort = edges.filter(
		(e) => !(e.type === 'shaderWire' && e.target === tgt && (e.targetHandle ?? '') === th),
	);
	return addEdge({ ...c, type: 'shaderWire' }, withoutSamePort);
}

export function onBeforeReconnectValidate(
	newEdge: Edge,
	isValidConnection: (c: Connection | Edge) => boolean,
): Edge | false {
	const conn: Connection = {
		source: newEdge.source,
		target: newEdge.target,
		sourceHandle: newEdge.sourceHandle ?? null,
		targetHandle: newEdge.targetHandle ?? null,
	};
	if (!isValidConnection(conn)) return false;
	return newEdge;
}

export function selectionChangeToIds(sn: Node[]): { selectedNodeIds: string[]; selectedNodeId: string | null } {
	const selectedNodeIds = sn.map((n) => n.id);
	const selectedNodeId = sn.length === 1 ? sn[0]!.id : null;
	return { selectedNodeIds, selectedNodeId };
}

export function addFrameNode(args: {
	nodes: FlowNodeAny[];
	createId: () => string;
	random: () => number;
}): FlowNodeAny[] {
	const w = 400;
	const h = 280;
	const id = args.createId();
	const frame: FlowNodeAny = {
		id,
		type: 'group',
		position: { x: 64 + args.random() * 40, y: 64 + args.random() * 40 },
		draggable: true,
		dragHandle: '.frame-drag-handle',
		data: { label: 'Frame', collapsed: false, width: w, height: h },
		style: `width: ${w}px; height: ${h}px`,
	};
	return sortFlowNodesParentsBeforeChildren([frame, ...args.nodes]);
}

export function toggleFrameCollapseInGraphPage(args: {
	nodes: FlowNodeAny[];
	edges: Edge[];
	frameId: string;
}): FlowNodeAny[] {
	const frame = args.nodes.find((n) => n.id === args.frameId && n.type === 'group') as
		| Node<FrameNodeData, 'group'>
		| undefined;
	if (!frame) return args.nodes;
	const d = frame.data;
	const nextCollapsed = !d.collapsed;
	const fullH = d.height;
	const w = d.width;
	const nextH = nextCollapsed ? collapsedFrameChromeHeight(args.frameId, args.nodes, args.edges) : fullH;
	const boundaryPorts: GraphEditorBoundaryPort[] = [
		...boundaryInputPorts(args.frameId, args.nodes, args.edges).map((p) => ({ kind: 'in' as const, ...p })),
		...boundaryOutputPorts(args.frameId, args.nodes, args.edges).map((p) => ({ kind: 'out' as const, ...p })),
	];
	return args.nodes.map((n) => {
		if (n.id === args.frameId && n.type === 'group') {
			return {
				...n,
				data: {
					...d,
					collapsed: nextCollapsed,
					boundaryPorts: nextCollapsed ? boundaryPorts : d.boundaryPorts,
				},
				style: `width: ${w}px; height: ${nextH}px`,
			};
		}
		if (n.type === 'shader' && n.parentId === args.frameId) {
			return { ...n, hidden: nextCollapsed };
		}
		return n;
	});
}

export function persistShaderNodePositionsAfterDrag(nodes: FlowNodeAny[]): FlowNodeAny[] {
	const sorted = sortFlowNodesParentsBeforeChildren(nodes);
	return sorted.map((n) => {
		if (n.type !== 'shader') return n;
		const gn: GraphNode = n.data.graphNode;
		const pid = n.parentId;
		if (
			gn.position.x === n.position.x &&
			gn.position.y === n.position.y &&
			(gn.parentId ?? undefined) === (pid ?? undefined)
		) {
			return n;
		}
		return {
			...n,
			data: {
				graphNode: {
					...gn,
					position: { ...n.position },
					parentId: pid,
				},
			},
		};
	});
}

export function passHasNodesInFlow(nodes: FlowNodeAny[], pass: BufferId): boolean {
	return nodes.some((n) => n.type === 'shader' && n.data.graphNode.pass === pass);
}

