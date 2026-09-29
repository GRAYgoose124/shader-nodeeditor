import type {
	CompileResult,
	GraphDocument,
	GraphUniformPreset,
} from '@shadertoy/compiler';
import type { ShadertoyRunner } from '@shadertoy/runner';

export function collectScalarUniformValues(
	manifest: CompileResult['manifest'],
	runner: ShadertoyRunner,
): Record<string, number> {
	const values: Record<string, number> = {};
	for (const pp of manifest.passes) {
		for (const u of pp.uniforms) {
			if (u.type === 'float' || u.type === 'int') {
				const v = runner.getUniform(u.name);
				if (typeof v === 'number') values[u.name] = v;
			}
		}
	}
	return values;
}

export function graphMetaWithAppendedUniformPreset(
	graphMeta: GraphDocument['meta'],
	existing: GraphUniformPreset[],
	name: string,
	values: Record<string, number>,
): GraphDocument['meta'] {
	const n = name.trim();
	const next: GraphUniformPreset[] = [...existing, { name: n, values }];
	return {
		...graphMeta,
		editor: { ...(graphMeta.editor ?? {}), uniformPresets: next },
	};
}

export function graphMetaWithoutUniformPresetAt(
	graphMeta: GraphDocument['meta'],
	existing: GraphUniformPreset[],
	index: number,
): GraphDocument['meta'] {
	const next = existing.filter((_, i) => i !== index);
	return {
		...graphMeta,
		editor: { ...(graphMeta.editor ?? {}), uniformPresets: next },
	};
}

export function applyUniformPresetToRunner(runner: ShadertoyRunner, preset: GraphUniformPreset): void {
	for (const [k, v] of Object.entries(preset.values)) {
		runner.setUniform(k, v);
	}
}
