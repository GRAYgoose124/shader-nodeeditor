/** Produce a valid GLSL identifier segment from a graph node id */
export function sanitizeNodeId(nodeId: string): string {
	return nodeId.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function outVar(nodeId: string, portId: string): string {
	return `g_${sanitizeNodeId(nodeId)}_${portId}`;
}

export function uniformName(nodeId: string, paramId: string): string {
	return `u_${sanitizeNodeId(nodeId)}_${paramId}`;
}
