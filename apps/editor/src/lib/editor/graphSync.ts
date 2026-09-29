import { writable, type Writable } from 'svelte/store';
import type { Edge } from '@xyflow/svelte';
import type { FlowNodeAny } from '$lib/flowDoc.js';

/** Reference-equality writable to avoid sync loops between +page and dock-mounted flow. */
function refWritable<T>(initial: T): Writable<T> & { peek: () => T } {
	let value = initial;
	const { subscribe, set: rawSet } = writable(initial);
	return {
		subscribe,
		set(v: T) {
			if (v === value) return;
			value = v;
			rawSet(v);
		},
		update(fn: (v: T) => T) {
			const next = fn(value);
			if (next !== value) {
				value = next;
				rawSet(next);
			}
		},
		peek: () => value,
	};
}

export const graphNodesStore = refWritable<FlowNodeAny[]>([]);
export const graphEdgesStore = refWritable<Edge[]>([]);

/** Shared with docked preview panel for two-way gpuError binding. */
export const previewGpuErrorStore = refWritable<string | null>(null);
