import type { GraphDocument } from '@shadertoy/compiler';
import { parseGraphDocument } from '@shadertoy/compiler';

const STORAGE_KEY = 'editor-user-graph-presets-v1';

export type UserGraphPresetRecord = {
	id: string;
	name: string;
	savedAt: string;
	doc: GraphDocument;
};

type StoredEnvelope = { v: 1; items: UserGraphPresetRecord[] };

function emptyEnvelope(): StoredEnvelope {
	return { v: 1, items: [] };
}

function readEnvelope(): StoredEnvelope {
	if (typeof localStorage === 'undefined') return emptyEnvelope();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return emptyEnvelope();
		const j = JSON.parse(raw) as unknown;
		if (!j || typeof j !== 'object' || !('items' in j)) return emptyEnvelope();
		const items = (j as StoredEnvelope).items;
		if (!Array.isArray(items)) return emptyEnvelope();
		const out: UserGraphPresetRecord[] = [];
		for (const it of items) {
			if (!it || typeof it !== 'object') continue;
			const rec = it as Partial<UserGraphPresetRecord>;
			if (typeof rec.id !== 'string' || typeof rec.name !== 'string' || !rec.doc) continue;
			const chk = parseGraphDocument(JSON.stringify(rec.doc));
			if (!chk.ok) continue;
			out.push({
				id: rec.id,
				name: rec.name,
				savedAt: typeof rec.savedAt === 'string' ? rec.savedAt : new Date().toISOString(),
				doc: chk.doc,
			});
		}
		return { v: 1, items: out };
	} catch {
		return emptyEnvelope();
	}
}

function writeEnvelope(env: StoredEnvelope): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
	} catch {
		/* quota */
	}
}

export function getUserGraphPresets(): UserGraphPresetRecord[] {
	return readEnvelope().items;
}

export function addUserGraphPreset(name: string, doc: GraphDocument): UserGraphPresetRecord {
	const trimmed = name.trim() || 'Untitled';
	const env = readEnvelope();
	const rec: UserGraphPresetRecord = {
		id: crypto.randomUUID(),
		name: trimmed,
		savedAt: new Date().toISOString(),
		doc: cloneDoc(doc),
	};
	env.items = [rec, ...env.items];
	writeEnvelope(env);
	return rec;
}

export function updateUserGraphPreset(id: string, doc: GraphDocument): boolean {
	const env = readEnvelope();
	const i = env.items.findIndex((x) => x.id === id);
	if (i < 0) return false;
	env.items[i] = {
		...env.items[i]!,
		savedAt: new Date().toISOString(),
		doc: cloneDoc(doc),
	};
	writeEnvelope(env);
	return true;
}

export function removeUserGraphPreset(id: string): boolean {
	const env = readEnvelope();
	const next = env.items.filter((x) => x.id !== id);
	if (next.length === env.items.length) return false;
	env.items = next;
	writeEnvelope(env);
	return true;
}

function cloneDoc(doc: GraphDocument): GraphDocument {
	return JSON.parse(JSON.stringify(doc)) as GraphDocument;
}

/** For tests: replace storage contents. */
export function _testSetUserGraphPresetsData(json: string | null): void {
	if (typeof localStorage === 'undefined') return;
	if (json == null) localStorage.removeItem(STORAGE_KEY);
	else localStorage.setItem(STORAGE_KEY, json);
}
