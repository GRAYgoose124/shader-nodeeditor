import type { NodeTypeDef } from '@shadertoy/compiler';
import { describe, expect, it } from 'vitest';
import { buildFilteredPaletteEntries, buildPaletteByCategory } from './paletteModel.js';

const mk = (id: string, label: string, category?: string, description?: string): NodeTypeDef => ({
	id,
	label,
	category,
	description,
	inputs: [],
	outputs: [],
	params: [],
	template: '//',
});

describe('paletteModel', () => {
	it('buildPaletteByCategory groups and sorts labels', () => {
		const m = buildPaletteByCategory([
			mk('b', 'B', 'Core'),
			mk('a', 'A', 'Core'),
			mk('x', 'X', 'Other'),
		]);
		expect(m.get('Core')?.map((t) => t.id)).toEqual(['a', 'b']);
		expect(m.get('Other')?.[0]?.id).toBe('x');
	});

	it('filterPaletteEntries narrows by query', () => {
		const entries = buildFilteredPaletteEntries(
			[
				mk('noise', 'Noise', 'Procedural', '2D value noise'),
				mk('box', 'Box', 'SDF'),
			],
			'noise',
		);
		expect(entries.length).toBe(1);
		expect(entries[0]?.[1].map((t) => t.id)).toEqual(['noise']);
	});
});
