import type { CompileDebugOptions, CompileResult, GraphDocument } from '@shadertoy/compiler';
import { compileGraph } from '@shadertoy/compiler';
import type { CompileGraphWorkerIn, CompileGraphWorkerOut } from './compileGraph.worker';

let worker: Worker | undefined;
let nextJobId = 0;
const pending = new Map<
	number,
	{
		resolve: (r: CompileResult) => void;
		reject: (e: Error) => void;
	}
>();

function ensureWorker(): Worker {
	if (worker) return worker;
	const w = new Worker(new URL('./compileGraph.worker.ts', import.meta.url), { type: 'module' });
	w.onmessage = (ev: MessageEvent<CompileGraphWorkerOut>) => {
		const data = ev.data;
		const p = pending.get(data.id);
		if (!p) return;
		pending.delete(data.id);
		if (data.ok) p.resolve(data.result);
		else p.reject(new Error(data.message));
	};
	w.onerror = (e) => {
		for (const [, pr] of pending) {
			pr.reject(new Error(e.message || 'compile worker error'));
		}
		pending.clear();
	};
	worker = w;
	return w;
}

/**
 * Runs {@link compileGraph} off the main thread when Web Workers exist (browser).
 * Used for preset-library hover previews only — main editor compiles synchronously.
 * Falls back to synchronous compile when `Worker` is unavailable or `postMessage` fails.
 */
export function compileGraphInWorker(
	doc: GraphDocument,
	debug?: CompileDebugOptions,
): Promise<CompileResult> {
	if (typeof Worker === 'undefined') {
		return Promise.resolve(compileGraph(doc, debug));
	}
	const id = ++nextJobId;
	const w = ensureWorker();
	return new Promise<CompileResult>((resolve, reject) => {
		pending.set(id, { resolve, reject });
		const msg: CompileGraphWorkerIn = { id, doc, debug };
		try {
			w.postMessage(msg);
		} catch {
			pending.delete(id);
			try {
				resolve(compileGraph(doc, debug));
			} catch (e2) {
				reject(e2 instanceof Error ? e2 : new Error(String(e2)));
			}
		}
	});
}
