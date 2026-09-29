import { getCachedPresetStillFromMemory, setCachedPresetStillInMemory } from './cache.js';

const PRESET_GALLERY_CACHE_NAME = 'preset-gallery-v1';
const PRESET_GALLERY_STILL_STORAGE_PREFIX = 'presetGalleryStill:v2:'; // v2 uses Cache Storage (blob) when available
let presetGalleryCachePromise: Promise<Cache> | null = null;

function presetStillStorageKey(cacheKey: string): string {
	return `${PRESET_GALLERY_STILL_STORAGE_PREFIX}${cacheKey}`;
}

function presetStillCacheRequestUrl(cacheKey: string): string {
	// Synthetic URL for Cache Storage keys.
	return `https://cache.local/${PRESET_GALLERY_CACHE_NAME}/${encodeURIComponent(cacheKey)}.jpg`;
}

async function getPresetGalleryCache(): Promise<Cache | null> {
	if (typeof window === 'undefined') return null;
	if (!('caches' in window)) return null;
	try {
		if (!presetGalleryCachePromise) presetGalleryCachePromise = caches.open(PRESET_GALLERY_CACHE_NAME);
		return await presetGalleryCachePromise;
	} catch {
		return null;
	}
}

function dataUrlToBlob(dataUrl: string): Blob | null {
	const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
	if (!m) return null;
	const mime = m[1] || 'image/jpeg';
	const b64 = m[2];
	try {
		const bin = atob(b64);
		const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return new Blob([bytes], { type: mime });
	} catch {
		return null;
	}
}

/**
 * Persistent still cache (refresh-safe): prefer Cache Storage (blob), fallback to sessionStorage (data URL).
 */
export async function getCachedPresetStillPersistent(cacheKey: string): Promise<string | null | undefined> {
	const memo = getCachedPresetStillFromMemory(cacheKey);
	if (memo !== undefined) return memo;
	if (typeof window === 'undefined') return undefined;

	// 1) Cache Storage (best-effort)
	try {
		const c = await getPresetGalleryCache();
		if (c) {
			const r = await c.match(presetStillCacheRequestUrl(cacheKey));
			if (r) {
				const blob = await r.blob();
				const url = URL.createObjectURL(blob);
				setCachedPresetStillInMemory(cacheKey, url);
				return url;
			}
		}
	} catch {
		// ignore
	}

	// 2) sessionStorage fallback (may be quota-limited)
	try {
		const v = window.sessionStorage.getItem(presetStillStorageKey(cacheKey));
		if (typeof v === 'string' && v.length > 0) {
			setCachedPresetStillInMemory(cacheKey, v);
			return v;
		}
		setCachedPresetStillInMemory(cacheKey, null);
		return null;
	} catch {
		return undefined;
	}
}

export async function setCachedPresetStillPersistent(cacheKey: string, still: string | null): Promise<void> {
	setCachedPresetStillInMemory(cacheKey, still);
	if (typeof window === 'undefined') return;

	// 1) Cache Storage (best-effort)
	try {
		const c = await getPresetGalleryCache();
		if (c) {
			const req = presetStillCacheRequestUrl(cacheKey);
			if (still) {
				const blob = dataUrlToBlob(still);
				if (blob) {
					await c.put(req, new Response(blob, { headers: { 'Content-Type': blob.type } }));
					return;
				}
			}
			await c.delete(req);
		}
	} catch {
		// ignore
	}

	// 2) sessionStorage fallback (may throw quota errors)
	try {
		const k = presetStillStorageKey(cacheKey);
		if (still) window.sessionStorage.setItem(k, still);
		else window.sessionStorage.removeItem(k);
	} catch {
		// ignore
	}
}

