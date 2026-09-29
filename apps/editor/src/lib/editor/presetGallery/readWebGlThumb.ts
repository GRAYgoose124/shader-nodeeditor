import { PRESET_THUMB_PIXEL_H, PRESET_THUMB_PIXEL_W } from './capture.js';

/**
 * Read the current default framebuffer from a WebGL canvas, flip Y, scale to thumb size, JPEG data URL.
 */
export function readWebGlCanvasToJpegDataUrl(
	canvas: HTMLCanvasElement,
	gl: WebGL2RenderingContext,
	opts?: { outW?: number; outH?: number; quality?: number },
): string | null {
	const outW = opts?.outW ?? PRESET_THUMB_PIXEL_W;
	const outH = opts?.outH ?? PRESET_THUMB_PIXEL_H;
	const quality = opts?.quality ?? 0.88;
	try {
		const w = canvas.width | 0;
		const h = canvas.height | 0;
		if (w <= 0 || h <= 0) return null;

		const pixels = new Uint8Array(w * h * 4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

		const flipped = new Uint8ClampedArray(w * h * 4);
		for (let y = 0; y < h; y++) {
			const src = (h - 1 - y) * w * 4;
			const dst = y * w * 4;
			flipped.set(pixels.subarray(src, src + w * 4), dst);
		}

		const full = document.createElement('canvas');
		full.width = w;
		full.height = h;
		const ctx = full.getContext('2d');
		if (!ctx) return null;
		ctx.putImageData(new ImageData(flipped, w, h), 0, 0);

		const thumb = document.createElement('canvas');
		thumb.width = outW;
		thumb.height = outH;
		const tctx = thumb.getContext('2d');
		if (!tctx) return null;
		tctx.drawImage(full, 0, 0, outW, outH);
		return thumb.toDataURL('image/jpeg', quality);
	} catch {
		return null;
	}
}
