import { writable } from 'svelte/store';

/** Session-only local `File` handles for `GraphMediaInput.id` (not serialized in graph JSON). */
export const mediaFileById = writable<Map<string, File>>(new Map());
