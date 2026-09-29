import type { Connection, Edge } from '@xyflow/svelte';
import type { NodeTypeDef } from '@shadertoy/compiler';
import type { FlowNodeAny } from '$lib/flowDoc.js';

export function isValidShaderConnection(
	c: Connection | Edge,
	nodes: FlowNodeAny[],
	registry: Map<string, NodeTypeDef>,
): boolean {
	const srcId = 'source' in c ? c.source : '';
	const tgtId = 'target' in c ? c.target : '';
	const srcHandle = c.sourceHandle ?? '';
	const tgtHandle = c.targetHandle ?? '';
	const srcN = nodes.find((n) => n.id === srcId);
	const tgtN = nodes.find((n) => n.id === tgtId);
	if (!srcN || !tgtN || srcN.type !== 'shader' || tgtN.type !== 'shader') return false;
	if (srcN.data.graphNode.pass !== tgtN.data.graphNode.pass) return false;
	const srcDef = registry.get(srcN.data.graphNode.typeId);
	const tgtDef = registry.get(tgtN.data.graphNode.typeId);
	if (!srcDef || !tgtDef) return false;
	const outPort = srcDef.outputs.find((p) => p.id === srcHandle);
	const inPort = tgtDef.inputs.find((p) => p.id === tgtHandle);
	if (!outPort || !inPort) return false;
	return outPort.type === inPort.type;
}
