import { describe, expect, it, vi } from 'vitest';
import { createProgram, ensureFloatColorBufferExtensions, tryCreateProgram } from '../webgl.js';

type Opts = { vsOk?: boolean; fsOk?: boolean; linkOk?: boolean; shaders?: boolean; program?: boolean };

/** Minimal WebGL2 stub: only what createProgram/tryCreateProgram touch. */
function mockGl(o: Opts = {}) {
	const { vsOk = true, fsOk = true, linkOk = true, shaders = true, program = true } = o;
	const sources = new Map<object, string>();
	const gl = {
		VERTEX_SHADER: 1,
		FRAGMENT_SHADER: 2,
		COMPILE_STATUS: 3,
		LINK_STATUS: 4,
		createShader: vi.fn((type: number) => (shaders ? { type } : null)),
		shaderSource: vi.fn((s: object, src: string) => void sources.set(s, src)),
		compileShader: vi.fn(),
		getShaderParameter: vi.fn((s: { type: number }) => (s.type === 1 ? vsOk : fsOk)),
		getShaderInfoLog: vi.fn(() => 'ERROR: 0:1: bad token'),
		createProgram: vi.fn(() => (program ? {} : null)),
		attachShader: vi.fn(),
		linkProgram: vi.fn(),
		getProgramParameter: vi.fn(() => linkOk),
		getProgramInfoLog: vi.fn(() => 'link mismatch'),
		deleteShader: vi.fn(),
		deleteProgram: vi.fn(),
		getExtension: vi.fn((n: string) => (n === 'EXT_color_buffer_float' ? {} : null)),
	};
	return gl as unknown as WebGL2RenderingContext & typeof gl;
}

describe('tryCreateProgram', () => {
	it('returns a program and frees shader objects on success', () => {
		const gl = mockGl();
		const r = tryCreateProgram(gl, 'v', 'f');
		expect(r.ok).toBe(true);
		expect(gl.deleteShader).toHaveBeenCalledTimes(2);
		expect(gl.deleteProgram).not.toHaveBeenCalled();
	});

	it('reports vertex compile failures with the GPU log', () => {
		const gl = mockGl({ vsOk: false });
		const r = tryCreateProgram(gl, 'v', 'f');
		expect(r).toEqual({ ok: false, log: expect.stringContaining('Vertex shader compile failed') });
		expect(r.ok === false && r.log).toContain('bad token');
		expect(gl.deleteShader).toHaveBeenCalledTimes(2);
	});

	it('reports fragment compile failures', () => {
		const r = tryCreateProgram(mockGl({ fsOk: false }), 'v', 'f');
		expect(r.ok === false && r.log).toContain('Fragment shader compile failed');
	});

	it('reports link failures and deletes the program', () => {
		const gl = mockGl({ linkOk: false });
		const r = tryCreateProgram(gl, 'v', 'f');
		expect(r.ok === false && r.log).toContain('Program link failed');
		expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
	});

	it('handles context failing to allocate shaders / programs', () => {
		expect(tryCreateProgram(mockGl({ shaders: false }), 'v', 'f').ok).toBe(false);
		expect(tryCreateProgram(mockGl({ program: false }), 'v', 'f').ok).toBe(false);
	});
});

describe('createProgram', () => {
	it('returns null on failure and the program on success', () => {
		expect(createProgram(mockGl({ fsOk: false }), 'v', 'f')).toBeNull();
		expect(createProgram(mockGl(), 'v', 'f')).not.toBeNull();
	});
});

describe('ensureFloatColorBufferExtensions', () => {
	it('reflects which extensions the context exposes', () => {
		expect(ensureFloatColorBufferExtensions(mockGl())).toEqual({
			extColorBufferFloat: true,
			extColorBufferHalfFloat: false,
		});
	});
});
