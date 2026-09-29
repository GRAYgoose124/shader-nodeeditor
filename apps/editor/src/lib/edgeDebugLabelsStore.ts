import { writable } from 'svelte/store';

/** Edge id → short debug text (e.g. center-pixel RGBA under wire probe). */
export const edgeDebugLabelsStore = writable<Record<string, string>>({});
