import { sceneFnSuffix } from './graphutil.js';
import type { BufferId, NodeTypeDef } from './types.js';

/** Extract the GLSL block emitted for one graph node (between `// node: id` markers). */
export function extractNodeGlslBlock(fragmentSource: string, nodeId: string): string | null {
	const needle = '// node: ' + nodeId + '\n';
	const i = fragmentSource.indexOf(needle);
	if (i === -1) return null;
	const start = i + needle.length;
	const rest = fragmentSource.slice(start);
	const stops = ['\n// node: ', '\nfloat scene_sdf_', '\nvoid scene_hit_', '\nvoid main('] as const;
	let end = rest.length;
	for (const s of stops) {
		const j = rest.indexOf(s);
		if (j !== -1) end = Math.min(end, j);
	}
	return rest.slice(0, end).trim();
}

/**
 * Build a custom `NodeTypeDef` from the compiled `scene_sdf_<pass>()` body for this pass.
 * `fnName` is alphanumeric (from pass id); safe to embed in RegExp.
 */
export function buildBakedSceneSdfCustomType(
	fragmentSource: string,
	pass: BufferId,
	label: string,
): NodeTypeDef | null {
	const sfx = sceneFnSuffix(pass);
	const fnName = `scene_sdf_${sfx}`;
	if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fnName)) return null;
	const re = new RegExp(`float\\s+${fnName}\\s*\\(\\s*vec3\\s+p\\s*\\)\\s*\\{([\\s\\S]*?)\\n\\}\\s*`);
	const m = fragmentSource.match(re);
	if (!m) return null;
	let body = m[1].trim().replace(/\r\n/g, '\n');
	body = body.replace(/\n\s*return\s+([^;]+);\s*$/, '\nfloat {{out:d}} = $1;');
	if (!body.includes('{{out:d}}')) {
		body = body.replace(/^\s*return\s+([^;]+);\s*$/, 'float {{out:d}} = $1;');
	}
	if (!body.includes('{{out:d}}')) return null;
	const id = `baked_sdf_${sfx}_${Math.random().toString(36).slice(2, 10)}`;
	return {
		id,
		label: label.trim() || `Baked SDF (${pass})`,
		category: 'Custom',
		description:
			'Baked scene distance field from a full compile. Uniforms still use the original node ids from bake time.',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [],
		template: `// node: {{nodeId}} — baked from ${fnName}\nvec3 p = {{in:p}};\n${body}`,
	};
}
