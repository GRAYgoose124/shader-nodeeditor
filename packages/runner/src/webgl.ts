export function createProgram(
	gl: WebGL2RenderingContext,
	vertexSource: string,
	fragmentSource: string,
): WebGLProgram | null {
	const r = tryCreateProgram(gl, vertexSource, fragmentSource);
	return r.ok ? r.program : null;
}

/** Returns GPU compile/link logs on failure (for UI). */
export function tryCreateProgram(
	gl: WebGL2RenderingContext,
	vertexSource: string,
	fragmentSource: string,
): { ok: true; program: WebGLProgram } | { ok: false; log: string } {
	const vs = gl.createShader(gl.VERTEX_SHADER);
	const fs = gl.createShader(gl.FRAGMENT_SHADER);
	if (!vs || !fs) {
		return { ok: false, log: 'Could not create shader objects' };
	}
	gl.shaderSource(vs, vertexSource);
	gl.compileShader(vs);
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(vs) ?? 'unknown';
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		return { ok: false, log: `Vertex shader compile failed:\n${log}` };
	}
	gl.shaderSource(fs, fragmentSource);
	gl.compileShader(fs);
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(fs) ?? 'unknown';
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		return { ok: false, log: `Fragment shader compile failed:\n${log}` };
	}
	const p = gl.createProgram();
	if (!p) {
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		return { ok: false, log: 'Could not create program' };
	}
	gl.attachShader(p, vs);
	gl.attachShader(p, fs);
	gl.linkProgram(p);
	gl.deleteShader(vs);
	gl.deleteShader(fs);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
		const log = gl.getProgramInfoLog(p) ?? 'unknown';
		gl.deleteProgram(p);
		return { ok: false, log: `Program link failed:\n${log}` };
	}
	return { ok: true, program: p };
}

export function createTextureRGBA(gl: WebGL2RenderingContext, w: number, h: number): WebGLTexture {
	const t = gl.createTexture()!;
	gl.bindTexture(gl.TEXTURE_2D, t);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	// REPEAT: raymarch surface UVs use world position * scale (often negative); CLAMP_TO_EDGE smears one edge.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return t;
}

/**
 * Float/half-float textures exist in core GL2, but **color rendering** often needs these extensions
 * or `checkFramebufferStatus` stays incomplete (falls back to RGBA8 and clamp wash).
 */
export function ensureFloatColorBufferExtensions(gl: WebGL2RenderingContext): {
	extColorBufferFloat: boolean;
	extColorBufferHalfFloat: boolean;
} {
	const ext32 = !!gl.getExtension('EXT_color_buffer_float');
	const ext16 = !!gl.getExtension('EXT_color_buffer_half_float');
	return { extColorBufferFloat: ext32, extColorBufferHalfFloat: ext16 };
}

/** Ping-pong color attachments using half/full float (Shadertoy-style buffers). Falls back when FBO incomplete. */
export function tryCreatePingPongHdrRgba(
	gl: WebGL2RenderingContext,
	w: number,
	h: number,
): { textures: [WebGLTexture, WebGLTexture]; fbos: [WebGLFramebuffer, WebGLFramebuffer] } | null {
	ensureFloatColorBufferExtensions(gl);

	const attempts: ReadonlyArray<{ internal: number; dataType: number }> = [
		{ internal: gl.RGBA16F, dataType: gl.HALF_FLOAT },
		{ internal: gl.RGBA32F, dataType: gl.FLOAT },
	];

	function probeComplete(tex: WebGLTexture): boolean {
		const fb = gl.createFramebuffer();
		if (!fb) return false;
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
		const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.deleteFramebuffer(fb);
		return ok;
	}

	for (const { internal, dataType } of attempts) {
		const mkTex = (): WebGLTexture | null => {
			const t = gl.createTexture();
			if (!t) return null;
			gl.bindTexture(gl.TEXTURE_2D, t);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, dataType, null);
			gl.bindTexture(gl.TEXTURE_2D, null);
			return t;
		};

		const t0 = mkTex();
		const t1 = mkTex();
		if (!t0 || !t1) {
			if (t0) gl.deleteTexture(t0);
			if (t1) gl.deleteTexture(t1);
			continue;
		}
		if (!probeComplete(t0) || !probeComplete(t1)) {
			gl.deleteTexture(t0);
			gl.deleteTexture(t1);
			continue;
		}

		try {
			const f0 = createFboWithColor(gl, t0);
			const f1 = createFboWithColor(gl, t1);
			return { textures: [t0, t1], fbos: [f0, f1] };
		} catch {
			gl.deleteTexture(t0);
			gl.deleteTexture(t1);
		}
	}

	return null;
}

export function createFboWithColor(gl: WebGL2RenderingContext, color: WebGLTexture): WebGLFramebuffer {
	const f = gl.createFramebuffer()!;
	gl.bindFramebuffer(gl.FRAMEBUFFER, f);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
	const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	if (status !== gl.FRAMEBUFFER_COMPLETE) {
		throw new Error(`Framebuffer incomplete: ${status}`);
	}
	return f;
}
