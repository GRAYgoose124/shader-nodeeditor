import type { CompileDebugOptions, CompileResult, GraphDocument } from '@shadertoy/compiler';
import { compileGraph } from '@shadertoy/compiler';

export type CompileGraphWorkerIn = {
	id: number;
	doc: GraphDocument;
	debug?: CompileDebugOptions;
};

export type CompileGraphWorkerOut =
	| { id: number; ok: true; result: CompileResult }
	| { id: number; ok: false; message: string };

self.onmessage = (ev: MessageEvent<CompileGraphWorkerIn>) => {
	const { id, doc, debug } = ev.data;
	try {
		const result = compileGraph(doc, debug);
		const out: CompileGraphWorkerOut = { id, ok: true, result };
		postMessage(out);
	} catch (e) {
		const out: CompileGraphWorkerOut = { id, ok: false, message: String(e) };
		postMessage(out);
	}
};
