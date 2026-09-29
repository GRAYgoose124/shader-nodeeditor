import { writable } from 'svelte/store';
import type { NodeTypeDef } from '@shadertoy/compiler';

export const customTypesStore = writable<NodeTypeDef[]>([]);
