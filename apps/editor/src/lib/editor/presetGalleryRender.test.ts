import { describe, expect, it } from 'vitest';
import { compileGraph } from '@shadertoy/compiler';
import { compilePresetSnapshot, graphDocumentForPreset } from './presetGalleryRender.js';

describe('presetGalleryRender', () => {
	it.each(['raymarch', 'show_ink_diffusion', 'show_sdf_cathedral', 'show_fractal_artifact'] as const)(
		'compiles preset %s',
		(id) => {
			const doc = graphDocumentForPreset(id, []);
			expect(doc.nodes.length).toBeGreaterThan(0);
			const r = compilePresetSnapshot(id, []);
			if (!r) {
				const full = compileGraph(doc);
				// eslint-disable-next-line no-console
				console.log('compile errors for', id, full.errors);
			}
			expect(r, `compilePresetSnapshot returned null for ${id}`).not.toBeNull();
			expect(r!.errors, `compile errors for ${id}: ${JSON.stringify(r!.errors)}`).toEqual([]);
			expect(r!.manifest.passes.some((p) => p.id === 'image')).toBe(true);
		},
	);
});
