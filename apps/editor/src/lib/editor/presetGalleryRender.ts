import { compileGraph, type CompileResult, type GraphDocument, type NodeTypeDef } from '@shadertoy/compiler';
import { ShadertoyRunner } from '@shadertoy/runner';
import type { Edge } from '@xyflow/svelte';
import type { PresetId } from '$lib/presetIds.js';
import { PRESET_LOADERS } from '$lib/presetRegistry.js';
import { flowToDoc, type FlowNodeAny } from '$lib/flowDoc.js';
import { flowStateFromPresetId } from '$lib/page/graphFileIo.js';

export const PRESET_THUMB_PIXEL_W = 320;
export const PRESET_THUMB_PIXEL_H = 180;

const PRESET_GALLERY_STILL_STORAGE_PREFIX = 'presetGalleryStill:v2:'; // v2 uses Cache Storage (blob) when available
const PRESET_GALLERY_BLACKLIST_STORAGE_PREFIX = 'presetGalleryBlacklist:v1:';
const presetCompileCache = new Map<string, CompileResult | null>();
const presetStillCache = new Map<string, string | null>();
const presetBlacklistCache = new Map<string, boolean>();

const PRESET_GALLERY_CACHE_NAME = 'preset-gallery-v1';
let presetGalleryCachePromise: Promise<Cache> | null = null;

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

export function presetGalleryCacheKey(
	presetId: PresetId,
	customNodeTypes: NodeTypeDef[] | undefined,
): string {
	return `${presetId}::${hashCustomNodeTypes(customNodeTypes)}`;
}

function presetStillStorageKey(cacheKey: string): string {
	return `${PRESET_GALLERY_STILL_STORAGE_PREFIX}${cacheKey}`;
}

function presetStillCacheRequestUrl(cacheKey: string): string {
	// Synthetic URL for Cache Storage keys.
	return `https://cache.local/${PRESET_GALLERY_CACHE_NAME}/${encodeURIComponent(cacheKey)}.jpg`;
}

function presetBlacklistStorageKey(cacheKey: string): string {
	return `${PRESET_GALLERY_BLACKLIST_STORAGE_PREFIX}${cacheKey}`;
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
		const v = window.sessionStorage.getItem(presetBlacklistStorageKey(cacheKey));
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
		window.sessionStorage.setItem(presetBlacklistStorageKey(cacheKey), '1');
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
	// Persistent write is async (see below).
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
	if (presetStillCache.has(cacheKey)) return presetStillCache.get(cacheKey);
	if (typeof window === 'undefined') return undefined;

	// 1) Cache Storage (best-effort)
	try {
		const c = await getPresetGalleryCache();
		if (c) {
			const r = await c.match(presetStillCacheRequestUrl(cacheKey));
			if (r) {
				const blob = await r.blob();
				const url = URL.createObjectURL(blob);
				presetStillCache.set(cacheKey, url);
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
			presetStillCache.set(cacheKey, v);
			return v;
		}
		presetStillCache.set(cacheKey, null);
		return null;
	} catch {
		return undefined;
	}
}

export async function setCachedPresetStillPersistent(cacheKey: string, still: string | null): Promise<void> {
	presetStillCache.set(cacheKey, still);
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

export function graphDocumentForPreset(
	presetId: PresetId,
	customNodeTypes: NodeTypeDef[] | undefined,
): GraphDocument {
	const { nodes, edges, graphMeta } = flowStateFromPresetId(
		presetId,
		PRESET_LOADERS,
		customNodeTypes ?? [],
	);
	return flowToDoc(nodes as FlowNodeAny[], edges as Edge[], graphMeta, customNodeTypes);
}

export function compilePresetSnapshot(
	presetId: PresetId,
	customNodeTypes: NodeTypeDef[] | undefined,
): CompileResult | null {
	const doc = graphDocumentForPreset(presetId, customNodeTypes);
	const r = compileGraph(doc);
	if (r.errors.length > 0) return null;
	return r;
}

// Shared still-capture runner to avoid WebGL context churn/exhaustion.
let sharedCapture:
	| {
			canvas: HTMLCanvasElement;
			runner: ShadertoyRunner;
			w: number;
			h: number;
	  }
	| undefined;

function ensureSharedCapture(w: number, h: number): { canvas: HTMLCanvasElement; runner: ShadertoyRunner } | null {
	if (typeof document === 'undefined') return null;
	try {
		if (!sharedCapture) {
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const runner = new ShadertoyRunner(canvas);
			sharedCapture = { canvas, runner, w, h };
		}
		if (sharedCapture.w !== w || sharedCapture.h !== h) {
			sharedCapture.canvas.width = w;
			sharedCapture.canvas.height = h;
			sharedCapture.w = w;
			sharedCapture.h = h;
		}
		return { canvas: sharedCapture.canvas, runner: sharedCapture.runner };
	} catch {
		return null;
	}
}

/**
 * Render one still from a successful compile (warm-up frames for ping-pong / feedback).
 */
export function captureCompileResultStill(
	result: CompileResult,
	opts?: { width?: number; height?: number; warmFrames?: number },
): string | null {
	const w = opts?.width ?? PRESET_THUMB_PIXEL_W;
	const h = opts?.height ?? PRESET_THUMB_PIXEL_H;
	const warm = opts?.warmFrames ?? 16;
	try {
		const shared = ensureSharedCapture(w, h);
		if (!shared) return null;
		const { canvas, runner } = shared;
		const err = runner.load(result);
		if (err) {
			return null;
		}
		const mouse = { x: w * 0.5, y: h * 0.5, click: false };
		for (let i = 0; i < warm; i++) runner.renderFrame(mouse);
		return canvas.toDataURL('image/jpeg', 0.88);
	} catch {
		return null;
	}
}
