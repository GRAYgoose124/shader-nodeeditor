import { writable } from 'svelte/store';
import type { MergedDiagnostics } from '$lib/compileDiagnostics.js';

const empty = (): MergedDiagnostics => ({
	errorNodeIds: new Set(),
	errorEdgeIds: new Set(),
	errorPortsByNode: new Map(),
});

/** Reactive error highlights for the flow (nodes, edges, ports). */
export const errorChromeStore = writable<MergedDiagnostics>(empty());

export function resetErrorChromeStore(): void {
	errorChromeStore.set(empty());
}
