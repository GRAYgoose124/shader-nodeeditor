import { writable } from 'svelte/store';

/** Incremented when a built-in preset gallery still is written; library cards resync from memory/cache. */
export const presetBuiltinGalleryThumbTick = writable(0);

export function bumpBuiltinGalleryThumbTick(): void {
	presetBuiltinGalleryThumbTick.update((n) => n + 1);
}
