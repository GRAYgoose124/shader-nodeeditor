import type { GlslType } from './types.js';

export const GLOBAL_UNIFORMS: { name: string; type: GlslType }[] = [
	{ name: 'iResolution', type: 'vec3' },
	{ name: 'iTime', type: 'float' },
	{ name: 'iMouse', type: 'vec4' },
	{ name: 'iFrame', type: 'int' },
	{ name: 'iChannel0', type: 'sampler2D' },
	{ name: 'iChannel1', type: 'sampler2D' },
	{ name: 'iChannel2', type: 'sampler2D' },
	{ name: 'iChannel3', type: 'sampler2D' },
	/** Filled by runner when an audio media input is active (default 0). */
	{ name: 'u_audioLevel', type: 'float' },
	{ name: 'u_audioBandLow', type: 'float' },
	{ name: 'u_audioBandMid', type: 'float' },
	{ name: 'u_audioBandHigh', type: 'float' },
];

function glslTypeForGlobal(t: GlslType): string {
	// Keep this strict: globals are always declared as their exact GLSL type.
	return t;
}

export function globalUniformDeclBlock(): string {
	return GLOBAL_UNIFORMS.map((u) => `uniform ${glslTypeForGlobal(u.type)} ${u.name};`).join('\n');
}

