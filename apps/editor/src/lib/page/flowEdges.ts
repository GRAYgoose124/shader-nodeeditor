import type { Edge } from '@xyflow/svelte';

export function mapEdgesShaderWire(es: Edge[]): Edge[] {
	return es.map((e) => ({ ...e, type: 'shaderWire' as const }));
}
