import type { GraphDocument } from '@shadertoy/compiler';
import { describe, expect, it, beforeEach } from 'vitest';
import {
	addUserGraphPreset,
	getUserGraphPresets,
	removeUserGraphPreset,
	updateUserGraphPreset,
	_testSetUserGraphPresetsData,
} from './userGraphPresets.js';

function memoryStorage(): Storage {
	const m = new Map<string, string>();
	return {
		get length() {
			return m.size;
		},
		clear: () => m.clear(),
		getItem: (k) => m.get(k) ?? null,
		key: (i) => [...m.keys()][i] ?? null,
		removeItem: (k) => {
			m.delete(k);
		},
		setItem: (k, v) => {
			m.set(k, v);
		},
	} as Storage;
}

const minimalDoc = (): GraphDocument => ({
	version: 1,
	meta: { name: 'test-doc' },
	nodes: [
		{ id: 'u1', typeId: 'uv', pass: 'image', position: { x: 0, y: 0 }, data: {} },
		{
			id: 'o1',
			typeId: 'frag_output',
			pass: 'image',
			position: { x: 0, y: 0 },
			data: {},
		},
	],
	edges: [{ id: 'e1', source: 'u1', target: 'o1', sourceHandle: 'uv', targetHandle: 'color' }],
});

describe('userGraphPresets', () => {
	beforeEach(() => {
		Object.defineProperty(globalThis, 'localStorage', {
			value: memoryStorage(),
			configurable: true,
			writable: true,
		});
		_testSetUserGraphPresetsData(null);
	});

	it('adds and lists presets', () => {
		const doc = minimalDoc();
		const rec = addUserGraphPreset('  Alpha  ', doc);
		expect(rec.name).toBe('Alpha');
		const all = getUserGraphPresets();
		expect(all).toHaveLength(1);
		expect(all[0]!.doc.meta?.name).toBe('test-doc');
	});

	it('updates and removes', () => {
		const rec = addUserGraphPreset('One', minimalDoc());
		const doc2 = minimalDoc();
		doc2.meta = { name: 'v2' };
		expect(updateUserGraphPreset(rec.id, doc2)).toBe(true);
		expect(getUserGraphPresets()[0]!.doc.meta?.name).toBe('v2');
		expect(removeUserGraphPreset(rec.id)).toBe(true);
		expect(getUserGraphPresets()).toHaveLength(0);
	});
});
