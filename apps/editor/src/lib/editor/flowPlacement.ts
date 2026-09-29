import { writable } from 'svelte/store';

/** Set from `EditorFlowViewportBridge` (inside SvelteFlow) for palette / add-node placement. */
export const getFlowCenterForNewNode = writable<(() => { x: number; y: number }) | null>(null);
