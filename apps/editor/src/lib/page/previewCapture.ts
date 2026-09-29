export type PreviewCaptureHandlers = {
	snapshotPng: () => void;
	toggleWebm: () => void;
};

/**
 * PNG snapshot + WebM screen capture from a preview canvas.
 * Keeps MediaRecorder state in closures; page supplies reactive getters/setters for recording flag.
 */
export function createPreviewCaptureHandlers(opts: {
	getCanvas: () => HTMLCanvasElement | null;
	/** Optional: when provided, enables reliable PNG capture via `gl.readPixels`. */
	getRunner?: () => { gl: WebGL2RenderingContext } | null;
	getGraphName: () => string;
	getRecording: () => boolean;
	setRecording: (v: boolean) => void;
	/** Shown when canvas missing or codec fails */
	alertUser: (msg: string) => void;
}): PreviewCaptureHandlers {
	let mediaRecorder: MediaRecorder | null = null;
	let mediaChunks: Blob[] = [];

	const snapshotPng = () => {
		const canvas = opts.getCanvas();
		if (!canvas) {
			opts.alertUser('Preview canvas not ready.');
			return;
		}
		const stem = (opts.getGraphName() || 'frame') + '.png';

		// Prefer `gl.readPixels` when possible: `toDataURL` can capture black on WebGL canvases
		// when `preserveDrawingBuffer` is false.
		const r = opts.getRunner?.() ?? null;
		if (r?.gl) {
			try {
				const gl = r.gl;
				const w = canvas.width | 0;
				const h = canvas.height | 0;
				if (w <= 0 || h <= 0) throw new Error('Preview canvas has zero size.');

				const pixels = new Uint8Array(w * h * 4);
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

				// Flip Y (WebGL origin is bottom-left; canvas/image is top-left)
				const flipped = new Uint8ClampedArray(w * h * 4);
				for (let y = 0; y < h; y++) {
					const src = (h - 1 - y) * w * 4;
					const dst = y * w * 4;
					flipped.set(pixels.subarray(src, src + w * 4), dst);
				}

				const out = document.createElement('canvas');
				out.width = w;
				out.height = h;
				const ctx = out.getContext('2d');
				if (!ctx) throw new Error('2D canvas not available.');
				ctx.putImageData(new ImageData(flipped, w, h), 0, 0);

				out.toBlob((blob) => {
					if (!blob) {
						opts.alertUser('PNG capture failed.');
						return;
					}
					const a = document.createElement('a');
					a.href = URL.createObjectURL(blob);
					a.download = stem;
					a.click();
					URL.revokeObjectURL(a.href);
				}, 'image/png');
				return;
			} catch (e) {
				// Fall through to `toDataURL` so snapshot still does something.
				console.warn('PNG capture via readPixels failed:', e);
			}
		}

		const a = document.createElement('a');
		a.href = canvas.toDataURL('image/png');
		a.download = stem;
		a.click();
	};

	const toggleWebm = () => {
		const previewCanvas = opts.getCanvas();
		if (!previewCanvas) {
			opts.alertUser('Preview canvas not ready.');
			return;
		}
		if (opts.getRecording() && mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
			opts.setRecording(false);
			return;
		}
		const webmStem = opts.getGraphName() || 'capture';
		const finishStop = (mime: string) => {
			const blob = new Blob(mediaChunks, { type: mime });
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = webmStem + '.webm';
			a.click();
			URL.revokeObjectURL(a.href);
			mediaRecorder = null;
			mediaChunks = [];
		};
		try {
			const stream = previewCanvas.captureStream(30);
			const rec = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
			mediaChunks = [];
			rec.ondataavailable = (e) => {
				if (e.data.size > 0) mediaChunks.push(e.data);
			};
			rec.onstop = () => {
				finishStop('video/webm');
			};
			rec.start(200);
			mediaRecorder = rec;
			opts.setRecording(true);
		} catch {
			try {
				const stream = previewCanvas.captureStream(30);
				const rec = new MediaRecorder(stream);
				mediaChunks = [];
				rec.ondataavailable = (e) => {
					if (e.data.size > 0) mediaChunks.push(e.data);
				};
				rec.onstop = () => {
					finishStop(rec.mimeType || 'video/webm');
				};
				rec.start(200);
				mediaRecorder = rec;
				opts.setRecording(true);
			} catch (e2) {
				opts.alertUser(e2 instanceof Error ? e2.message : String(e2));
			}
		}
	};

	return { snapshotPng, toggleWebm };
}
