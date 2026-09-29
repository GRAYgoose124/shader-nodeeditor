/* Embedded in exported HTML; plain ES5-ish for maximum portability. */
(function () {
	'use strict';
	var b64 = window.__GRAPH_B64;
	window.__GRAPH_B64 = undefined;

	function decodeUtf8(b64s) {
		return decodeURIComponent(escape(atob(b64s)));
	}

	function tryCreateProgram(gl, vsSrc, fsSrc) {
		var v = gl.createShader(gl.VERTEX_SHADER);
		var f = gl.createShader(gl.FRAGMENT_SHADER);
		if (!v || !f) return { ok: false, log: 'Could not create shader objects' };
		gl.shaderSource(v, vsSrc);
		gl.compileShader(v);
		if (!gl.getShaderParameter(v, gl.COMPILE_STATUS)) {
			var lv = gl.getShaderInfoLog(v) || '';
			gl.deleteShader(v);
			gl.deleteShader(f);
			return { ok: false, log: 'Vertex:\n' + lv };
		}
		gl.shaderSource(f, fsSrc);
		gl.compileShader(f);
		if (!gl.getShaderParameter(f, gl.COMPILE_STATUS)) {
			var lf = gl.getShaderInfoLog(f) || '';
			gl.deleteShader(v);
			gl.deleteShader(f);
			return { ok: false, log: 'Fragment:\n' + lf };
		}
		var p = gl.createProgram();
		if (!p) {
			gl.deleteShader(v);
			gl.deleteShader(f);
			return { ok: false, log: 'Could not create program' };
		}
		gl.attachShader(p, v);
		gl.attachShader(p, f);
		gl.linkProgram(p);
		gl.deleteShader(v);
		gl.deleteShader(f);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
			var lp = gl.getProgramInfoLog(p) || '';
			gl.deleteProgram(p);
			return { ok: false, log: 'Link:\n' + lp };
		}
		return { ok: true, program: p };
	}

	function createTexRGBA(gl, tw, th) {
		var t = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
		return t;
	}

	function createFbo(gl, tex) {
		var fb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
		var st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer incomplete: ' + st);
		return fb;
	}

	function tryCreatePingPongHdr(gl, tw, th) {
		gl.getExtension('EXT_color_buffer_float');
		gl.getExtension('EXT_color_buffer_half_float');
		var attempts = [
			{ internal: gl.RGBA16F, dataType: gl.HALF_FLOAT },
			{ internal: gl.RGBA32F, dataType: gl.FLOAT },
		];
		function probe(tex) {
			var fb = gl.createFramebuffer();
			if (!fb) return false;
			gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
			var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.deleteFramebuffer(fb);
			return ok;
		}
		function mkTexFor(internal, dataType) {
			var t = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, t);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			gl.texImage2D(gl.TEXTURE_2D, 0, internal, tw, th, 0, gl.RGBA, dataType, null);
			gl.bindTexture(gl.TEXTURE_2D, null);
			return t;
		}
		for (var ai = 0; ai < attempts.length; ai++) {
			var a = attempts[ai];
			var t0 = mkTexFor(a.internal, a.dataType);
			var t1 = mkTexFor(a.internal, a.dataType);
			if (!probe(t0) || !probe(t1)) {
				gl.deleteTexture(t0);
				gl.deleteTexture(t1);
				continue;
			}
			try {
				var hf0 = createFbo(gl, t0);
				var hf1 = createFbo(gl, t1);
				return { textures: [t0, t1], fbos: [hf0, hf1] };
			} catch (e) {
				gl.deleteTexture(t0);
				gl.deleteTexture(t1);
			}
		}
		return null;
	}

	function showErr(msg) {
		var el = document.getElementById('err');
		if (el) {
			el.hidden = false;
			el.textContent = msg;
		}
	}

	var canvas = document.getElementById('exp');
	if (!canvas) return showErr('Missing canvas');
	var gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false });
	if (!gl) return showErr('WebGL2 is required (use a recent desktop or mobile browser).');

	var bundle;
	try {
		bundle = JSON.parse(decodeUtf8(b64));
	} catch (e) {
		return showErr('Could not decode graph: ' + e);
	}

	var manifest = bundle.manifest;
	var passSrc = bundle.passes;
	var paramAnimations = bundle.paramAnimations || null;

	var programs = new Map();
	var uniformLocs = new Map();
	var bufferTargets = new Map();
	var blackTex = null;
	var w = 0;
	var h = 0;
	var frame = 0;
	var timeStart = performance.now();
	var userUniformValues = new Map();
	var vao = null;

	// Param animation runtime (mirrors editor preview semantics).
	function fract01(x) {
		return x - Math.floor(x);
	}
	function sample01(spec, iTimeSec) {
		var speed = typeof spec.speed === 'number' ? spec.speed : 0.25;
		var phase = typeof spec.phase === 'number' ? spec.phase : 0;
		var t = speed * (iTimeSec + phase);
		var u = fract01(t);
		var c = spec.curve || 'sine';
		if (c === 'saw') return u;
		if (c === 'triangle') return 1 - 2 * Math.abs(u - 0.5);
		if (c === 'smooth') return u * u * (3 - 2 * u);
		// sine (default)
		return 0.5 + 0.5 * Math.sin(2 * Math.PI * t);
	}
	function clamp(x, lo, hi) {
		return Math.min(hi, Math.max(lo, x));
	}
	function sampleValue(spec, iTimeSec, center, min, max) {
		var w01 = sample01(spec, iTimeSec);
		var depth = typeof spec.depth === 'number' ? clamp(spec.depth, 0, 1) : 1;
		var span;
		if (typeof spec.range === 'number' && isFinite(spec.range)) span = Math.max(0, spec.range);
		else span = (max - min) * depth;
		var off = typeof spec.offset === 'number' && isFinite(spec.offset) ? spec.offset : 0;
		return clamp(center + (w01 - 0.5) * span + off, min, max);
	}
	function uniformName(nodeId, paramId) {
		return 'u_' + nodeId + '_' + paramId;
	}
	function buildUniformInfo() {
		var m = {};
		for (var i = 0; i < manifest.passes.length; i++) {
			var pm = manifest.passes[i];
			for (var j = 0; j < pm.uniforms.length; j++) {
				var u = pm.uniforms[j];
				m[u.name] = u;
			}
		}
		return m;
	}
	var uniformInfoByName = buildUniformInfo();
	function applyParamAnimations(iTimeSec) {
		if (!paramAnimations) return;
		for (var k in paramAnimations) {
			if (!Object.prototype.hasOwnProperty.call(paramAnimations, k)) continue;
			var spec = paramAnimations[k];
			if (!spec || typeof spec !== 'object') continue;
			var nodeId = spec.nodeId;
			var paramId = spec.paramId;
			if (typeof nodeId !== 'string' || typeof paramId !== 'string') continue;
			var uname = uniformName(nodeId, paramId);
			var ui = uniformInfoByName[uname];
			// If the shader doesn't declare the uniform, ignore.
			if (!ui) continue;
			var center = userUniformValues.has(uname) ? userUniformValues.get(uname) : ui.default;
			if (typeof center !== 'number') continue; // only float anims supported
			var min = typeof ui.min === 'number' ? ui.min : center - 1;
			var max = typeof ui.max === 'number' ? ui.max : center + 1;
			userUniformValues.set(uname, sampleValue(spec, iTimeSec, center, min, max));
		}
	}

	function collectUniforms(passId, program) {
		var ul = new Map();
		var num = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
		for (var i = 0; i < num; i++) {
			var inf = gl.getActiveUniform(program, i);
			if (!inf) continue;
			var base = inf.name.replace(/\[0\]$/, '');
			ul.set(base, gl.getUniformLocation(program, base));
		}
		uniformLocs.set(passId, ul);
	}

	function uniformTypeFor(passId, name) {
		for (var i = 0; i < manifest.passes.length; i++) {
			if (manifest.passes[i].id !== passId) continue;
			var us = manifest.passes[i].uniforms;
			for (var j = 0; j < us.length; j++) {
				if (us[j].name === name) return us[j].type;
			}
		}
		return undefined;
	}

	for (var pi = 0; pi < manifest.passes.length; pi++) {
		var pm = manifest.passes[pi];
		for (var ui = 0; ui < pm.uniforms.length; ui++) {
			var u = pm.uniforms[ui];
			if (userUniformValues.has(u.name)) continue;
			var d = u.default;
			if (Object.prototype.toString.call(d) === '[object Array]') userUniformValues.set(u.name, d.slice());
			else userUniformValues.set(u.name, d);
		}
	}

	for (var pj = 0; pj < manifest.passes.length; pj++) {
		var passManifest = manifest.passes[pj];
		var pid = passManifest.id;
		var src = passSrc[pid];
		if (!src) continue;
		var built = tryCreateProgram(gl, src.vertexSource, src.fragmentSource);
		if (!built.ok) return showErr('Pass ' + pid + ': ' + built.log);
		programs.set(pid, built.program);
		collectUniforms(pid, built.program);
	}

	vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	function getTextureForBuffer(buf) {
		var bt = bufferTargets.get(buf);
		if (!bt) return blackTex;
		if (bt.kind === 'single') return bt.texture;
		return bt.textures[bt.writeIndex ^ 1];
	}

	function getWriteFbo(buf) {
		if (buf === 'image') return null;
		var bt = bufferTargets.get(buf);
		if (!bt) return null;
		if (bt.kind === 'single') return bt.fbo;
		return bt.fbos[bt.writeIndex];
	}

	function flipBuffer(buf) {
		var bt = bufferTargets.get(buf);
		if (bt && bt.kind === 'pingpong') bt.writeIndex ^= 1;
	}

	function rebuildBuffers() {
		bufferTargets.forEach(function (bt) {
			if (bt.kind === 'single') {
				gl.deleteTexture(bt.texture);
				gl.deleteFramebuffer(bt.fbo);
			} else {
				gl.deleteTexture(bt.textures[0]);
				gl.deleteTexture(bt.textures[1]);
				gl.deleteFramebuffer(bt.fbos[0]);
				gl.deleteFramebuffer(bt.fbos[1]);
			}
		});
		bufferTargets.clear();

		if (blackTex) gl.deleteTexture(blackTex);
		blackTex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, blackTex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
		gl.bindTexture(gl.TEXTURE_2D, null);

		for (var i = 0; i < manifest.passes.length; i++) {
			var pass = manifest.passes[i];
			if (pass.id === 'image') continue;
			if (pass.pingPong) {
				var hdr = tryCreatePingPongHdr(gl, w, h);
				var t0, t1, f0, f1;
				if (hdr) {
					t0 = hdr.textures[0];
					t1 = hdr.textures[1];
					f0 = hdr.fbos[0];
					f1 = hdr.fbos[1];
				} else {
					t0 = createTexRGBA(gl, w, h);
					t1 = createTexRGBA(gl, w, h);
					f0 = createFbo(gl, t0);
					f1 = createFbo(gl, t1);
				}
				bufferTargets.set(pass.id, {
					kind: 'pingpong',
					textures: [t0, t1],
					fbos: [f0, f1],
					writeIndex: 0,
				});
				// Match vec4 feedback sims (w should start 0); opaque alpha seeds Laplacian diffusion on .w.
				gl.clearColor(0, 0, 0, 0);
				gl.bindFramebuffer(gl.FRAMEBUFFER, f0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.bindFramebuffer(gl.FRAMEBUFFER, f1);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			} else {
				var t = createTexRGBA(gl, w, h);
				var f = createFbo(gl, t);
				bufferTargets.set(pass.id, { kind: 'single', texture: t, fbo: f });
				gl.clearColor(0, 0, 0, 1);
				gl.bindFramebuffer(gl.FRAMEBUFFER, f);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			}
		}
	}

	function resize() {
		var rect = canvas.getBoundingClientRect();
		var rw = Math.max(2, Math.floor(rect.width) || canvas.width || 800);
		var rh = Math.max(2, Math.floor(rect.height) || canvas.height || 450);
		var ow = w;
		var oh = h;
		w = rw;
		h = rh;
		canvas.width = w;
		canvas.height = h;
		gl.viewport(0, 0, w, h);
		try {
			rebuildBuffers();
			if (ow !== w || oh !== h) frame = 0;
		} catch (e) {
			showErr(String(e));
		}
	}

	resize();
	if (typeof ResizeObserver !== 'undefined') {
		new ResizeObserver(resize).observe(canvas);
	}

	var mouse = { x: 0, y: 0, click: false };
	canvas.addEventListener('pointermove', function (e) {
		var r = canvas.getBoundingClientRect();
		mouse.x = e.clientX - r.left;
		mouse.y = e.clientY - r.top;
	});
	canvas.addEventListener('pointerdown', function () {
		mouse.click = true;
	});
	window.addEventListener('pointerup', function () {
		mouse.click = false;
	});

	function applyUniforms(passId) {
		var locs = uniformLocs.get(passId);
		if (!locs) return;
		var rect = canvas.getBoundingClientRect();
		var sx = w / Math.max(rect.width, 1e-6);
		var sy = h / Math.max(rect.height, 1e-6);
		var mx = mouse.x * sx;
		var my = h - mouse.y * sy;

		function setF(n, v) {
			var L = locs.get(n);
			if (L) gl.uniform1f(L, v);
		}
		function setI(n, v) {
			var L = locs.get(n);
			if (L) gl.uniform1i(L, v);
		}
		function setV3(n, x, y, z) {
			var L = locs.get(n);
			if (L) gl.uniform3f(L, x, y, z);
		}
		function setV4(n, x, y, z, ww) {
			var L = locs.get(n);
			if (L) gl.uniform4f(L, x, y, z, ww);
		}

		setV3('iResolution', w, h, 1);
		setF('iTime', (performance.now() - timeStart) * 0.001);
		setI('iFrame', frame);
		setV4('iMouse', mx, my, mouse.click ? mx : -mx, mouse.click ? my : -my);

		userUniformValues.forEach(function (val, name) {
			var L = locs.get(name);
			if (!L) return;
			var ut = uniformTypeFor(passId, name);
			if (typeof val === 'number') {
				if (ut === 'int') gl.uniform1i(L, Math.round(val));
				else gl.uniform1f(L, val);
			} else if (Object.prototype.toString.call(val) === '[object Array]') {
				if (val.length === 2) gl.uniform2f(L, val[0], val[1]);
				else if (val.length === 3) gl.uniform3f(L, val[0], val[1], val[2]);
				else if (val.length === 4) gl.uniform4f(L, val[0], val[1], val[2], val[3]);
			}
		});
	}

	function bindChannels(pass) {
		var locs = uniformLocs.get(pass.id);
		if (!locs) return;
		var ch = ['iChannel0', 'iChannel1', 'iChannel2', 'iChannel3'];
		for (var i = 0; i < 4; i++) {
			var uname = ch[i];
			var L = locs.get(uname);
			var srcBuf = pass.channels[uname];
			var tex = srcBuf ? getTextureForBuffer(srcBuf) : blackTex;
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, tex);
			if (L) gl.uniform1i(L, i);
		}
	}

	function renderFrame() {
		gl.bindVertexArray(vao);
		for (var i = 0; i < manifest.passes.length; i++) {
			var pass = manifest.passes[i];
			var prog = programs.get(pass.id);
			if (!prog) continue;

			gl.bindFramebuffer(gl.FRAMEBUFFER, getWriteFbo(pass.id));
			gl.viewport(0, 0, w, h);
			gl.useProgram(prog);
			applyUniforms(pass.id);
			bindChannels(pass);
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.BLEND);
			gl.drawArrays(gl.TRIANGLES, 0, 3);

			if (pass.id !== 'image') {
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				flipBuffer(pass.id);
			}
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		frame++;
	}

	function loop() {
		applyParamAnimations((performance.now() - timeStart) * 0.001);
		renderFrame();
		requestAnimationFrame(loop);
	}
	requestAnimationFrame(loop);
})();
