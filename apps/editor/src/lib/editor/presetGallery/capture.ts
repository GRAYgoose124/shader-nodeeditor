import type { CompileResult } from '@shadertoy/compiler';
import { ShadertoyRunner } from '@shadertoy/runner';

export const PRESET_THUMB_PIXEL_W = 320;
export const PRESET_THUMB_PIXEL_H = 180;

// Shared still-capture runner to avoid WebGL context churn/exhaustion.
let sharedCapture:
	| {
			canvas: HTMLCanvasElement;
			runner: ShadertoyRunner;
			w: number;
			h: number;
	  }
	| undefined;

function ensureSharedCapture(w: number, h: number): { canvas: HTMLCanvasElement; runner: ShadertoyRunner } | null {
	if (typeof document === 'undefined') return null;
	try {
		if (!sharedCapture) {
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const runner = new ShadertoyRunner(canvas);
			sharedCapture = { canvas, runner, w, h };
		}
		if (sharedCapture.w !== w || sharedCapture.h !== h) {
			sharedCapture.canvas.width = w;
			sharedCapture.canvas.height = h;
			sharedCapture.w = w;
			sharedCapture.h = h;
		}
		return { canvas: sharedCapture.canvas, runner: sharedCapture.runner };
	} catch {
		return null;
	}
}

/**
 * Render one still from a successful compile (warm-up frames for ping-pong / feedback).
 */
export function captureCompileResultStill(
	result: CompileResult,
	opts?: { width?: number; height?: number; warmFrames?: number },
): string | null {
	const w = opts?.width ?? PRESET_THUMB_PIXEL_W;
	const h = opts?.height ?? PRESET_THUMB_PIXEL_H;
	const warm = opts?.warmFrames ?? 16;
	try {
		const shared = ensureSharedCapture(w, h);
		if (!shared) return null;
		const { canvas, runner } = shared;
		const err = runner.load(result);
		if (err) {
			return null;
		}
		const mouse = { x: w * 0.5, y: h * 0.5, click: false };
		for (let i = 0; i < warm; i++) runner.renderFrame(mouse);
		return canvas.toDataURL('image/jpeg', 0.88);
	} catch {
		return null;
	}
}

