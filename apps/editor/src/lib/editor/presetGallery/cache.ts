import type { CompileResult, NodeTypeDef } from '@shadertoy/compiler';
import type { PresetId } from '$lib/presetIds.js';

const presetCompileCache = new Map<string, CompileResult | null>();
const presetStillCache = new Map<string, string | null>();
const presetBlacklistCache = new Map<string, boolean>();

function fnv1a32(s: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		// h *= 16777619 (but in 32-bit)
		h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
	}
	return h.toString(16).padStart(8, '0');
}

function hashCustomNodeTypes(customNodeTypes: NodeTypeDef[] | undefined): string {
	if (!customNodeTypes || customNodeTypes.length === 0) return 'none';
	try {
		// Hashing full JSON keeps cache invalidation simple when custom nodes change.
		return fnv1a32(JSON.stringify(customNodeTypes));
	} catch {
		return 'unhashable';
	}
}

export function presetGalleryCacheKey(presetId: PresetId, customNodeTypes: NodeTypeDef[] | undefined): string {
	return `${presetId}::${hashCustomNodeTypes(customNodeTypes)}`;
}

export function getCachedPresetCompile(cacheKey: string): CompileResult | null | undefined {
	return presetCompileCache.get(cacheKey);
}

export function setCachedPresetCompile(cacheKey: string, res: CompileResult | null): void {
	presetCompileCache.set(cacheKey, res);
}

export function isPresetGalleryBlacklisted(cacheKey: string): boolean {
	if (presetBlacklistCache.has(cacheKey)) return presetBlacklistCache.get(cacheKey) === true;
	if (typeof window === 'undefined') return false;
	try {
		const v = window.sessionStorage.getItem(`presetGalleryBlacklist:v1:${cacheKey}`);
		const b = v === '1';
		presetBlacklistCache.set(cacheKey, b);
		return b;
	} catch {
		return false;
	}
}

export function blacklistPresetGallery(cacheKey: string): void {
	presetBlacklistCache.set(cacheKey, true);
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.setItem(`presetGalleryBlacklist:v1:${cacheKey}`, '1');
	} catch {
		// ignore
	}
}

export function getCachedPresetStill(cacheKey: string): string | null | undefined {
	if (presetStillCache.has(cacheKey)) return presetStillCache.get(cacheKey);
	if (typeof window === 'undefined') return undefined;
	// Synchronous path only returns in-memory. Persistent lookup is async (see below).
	return undefined;
}

export function setCachedPresetStill(cacheKey: string, still: string | null): void {
	presetStillCache.set(cacheKey, still);
}

export function getCachedPresetStillFromMemory(cacheKey: string): string | null | undefined {
	return presetStillCache.get(cacheKey);
}

export function setCachedPresetStillInMemory(cacheKey: string, still: string | null): void {
	presetStillCache.set(cacheKey, still);
}

