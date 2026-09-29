<script lang="ts">
	import type { CompileResult } from '@shadertoy/compiler';

	let {
		compileResult,
		gpuError,
		onFocusNode,
		onFocusEdge,
		knownEdgeIds,
		knownNodeIds,
	}: {
		compileResult: CompileResult;
		gpuError: string | null;
		onFocusNode: (nodeId: string) => void;
		onFocusEdge: (edgeId: string) => void;
		knownEdgeIds: Set<string>;
		knownNodeIds: Set<string>;
	} = $props();

	const graphErrs = $derived(compileResult.errors);
	const hasGpu = $derived(!!(gpuError && gpuError.trim()));
	const hasGraph = $derived(graphErrs.length > 0);
	const total = $derived(graphErrs.length + (hasGpu ? 1 : 0));

	const allText = $derived.by(() => {
		const parts: string[] = [];
		if (graphErrs.length > 0) {
			parts.push('Graph', ...graphErrs);
		}
		if (hasGpu) {
			if (parts.length) parts.push('');
			parts.push('GPU', gpuError!.trim());
		}
		return parts.join('\n');
	});

	const UUID_RE = /\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/gi;

	function nodeIdsInText(s: string): string[] {
		const out: string[] = [];
		let m: RegExpExecArray | null;
		const re = new RegExp(UUID_RE.source, 'gi');
		while ((m = re.exec(s)) !== null) {
			const id = m[1]!;
			if (!out.includes(id)) out.push(id);
		}
		return out;
	}

	function lineAtCaret(text: string, caret: number): string {
		const start = text.lastIndexOf('\n', Math.max(0, caret - 1)) + 1;
		let end = text.indexOf('\n', caret);
		if (end === -1) end = text.length;
		return text.slice(start, end);
	}

	function onDumpMouseUp(ev: MouseEvent) {
		const el = ev.currentTarget as HTMLTextAreaElement;
		requestAnimationFrame(() => {
			if (el.selectionStart !== el.selectionEnd) return;
			const line = lineAtCaret(el.value, el.selectionStart);
			const ids = nodeIdsInText(line);
			for (const id of ids) {
				if (knownEdgeIds.has(id)) {
					onFocusEdge(id);
					return;
				}
			}
			for (const id of ids) {
				if (knownNodeIds.has(id)) {
					onFocusNode(id);
					return;
				}
			}
			if (ids[0]) onFocusNode(ids[0]);
		});
	}

	async function copyAll() {
		const t = allText;
		if (!t) return;
		try {
			await navigator.clipboard.writeText(t);
		} catch {
			ta?.focus();
			ta?.select();
			document.execCommand('copy');
		}
	}

	let ta: HTMLTextAreaElement | null = $state(null);
</script>

<section class="problems" aria-label="Problems and shader output">
	<header class="ph">
		<span class="title">Problems</span>
		{#if total > 0}
			<span class="count">{total}</span>
			<button type="button" class="copy-all" onclick={copyAll}>Copy all</button>
		{/if}
	</header>
	<div class="body">
		{#if !hasGraph && !hasGpu}
			<p class="ok">No issues.</p>
		{:else}
			<p class="hint">
				<kbd>Ctrl+A</kbd> to select all, or use <strong>Copy all</strong>. After a normal click (no drag-select),
				a line with an edge id focuses that wire; otherwise a node id focuses the node.
			</p>
			<textarea
				bind:this={ta}
				class="dump"
				readonly
				rows="14"
				value={allText}
				onmouseup={onDumpMouseUp}
				aria-label="All problems as plain text"
			></textarea>
		{/if}
	</div>
</section>

<style>
	.problems {
		display: flex;
		flex-direction: column;
		min-height: 0;
		max-height: 42vh;
		border-top: 1px solid #252a33;
		background: #0c0e12;
		flex-shrink: 0;
		resize: vertical;
		overflow: hidden;
	}
	.ph {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-bottom: 1px solid #252a33;
		background: #101318;
		flex-shrink: 0;
	}
	.title {
		font-size: 12px;
		font-weight: 600;
		color: #c5cad6;
	}
	.count {
		font-size: 10px;
		padding: 2px 7px;
		border-radius: 999px;
		background: #5a2525;
		color: #ffb4b4;
		font-weight: 600;
	}
	.copy-all {
		margin-left: auto;
		padding: 4px 10px;
		font-size: 11px;
		border-radius: 6px;
		border: 1px solid #3a4a6a;
		background: #1a2230;
		color: #c5d4f0;
		cursor: pointer;
	}
	.copy-all:hover {
		background: #243044;
	}
	.body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 8px 12px 12px;
		overscroll-behavior: contain;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ok {
		margin: 0;
		font-size: 12px;
		opacity: 0.55;
	}
	.hint {
		margin: 0;
		font-size: 10px;
		line-height: 1.4;
		opacity: 0.65;
		color: #8a93a3;
	}
	.hint kbd {
		font-size: 9px;
		padding: 1px 5px;
		border-radius: 4px;
		border: 1px solid #3a4150;
		background: #1a1d24;
		color: #b8c0d0;
	}
	.dump {
		flex: 1;
		min-height: 120px;
		width: 100%;
		box-sizing: border-box;
		padding: 8px 10px;
		border-radius: 6px;
		border: 1px solid #2a3140;
		background: #141820;
		color: #ffb4b4;
		font-size: 11px;
		font-family: ui-monospace, 'Cascadia Code', monospace;
		line-height: 1.4;
		resize: vertical;
		user-select: text;
		cursor: text;
	}
	.dump:focus {
		outline: 1px solid #4a6a9e;
		outline-offset: 1px;
	}
</style>
