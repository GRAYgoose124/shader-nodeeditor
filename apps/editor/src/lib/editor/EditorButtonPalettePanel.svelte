<script lang="ts">
	import type { BufferId } from '@shadertoy/compiler';
	import type { CompileResult } from '@shadertoy/compiler';
	import { SHORTCUT_HELP_ROWS } from '$lib/page/shortcutHelpRows.js';

	interface Props {
		activePass: BufferId;
		onActivePassChange: (pass: BufferId) => void;
		compileResult: CompileResult;
		snapGridOn: boolean;
		onDuplicate: () => void;
		onGroup: () => void;
		onSnapGrid: () => void;
		onToggleSnapGrid: () => void;
		onAlignNodes: () => void;
		onBakeSceneSdf: () => void;
		onBakeSelection: () => void;
		onAddFrame: () => void;
		onExportGraph: () => void;
		onExportLivePage: () => void;
		onExportSelection: () => void;
		onImportGraph: (ev: Event) => void;
		onMergeSubgraph: (ev: Event) => void;
		onImportNodeDefs: (ev: Event) => void;
		onRestoreDockPanels: () => void;
	}

	let {
		activePass,
		onActivePassChange,
		compileResult,
		snapGridOn,
		onDuplicate,
		onGroup,
		onSnapGrid,
		onToggleSnapGrid,
		onAlignNodes,
		onBakeSceneSdf,
		onBakeSelection,
		onAddFrame,
		onExportGraph,
		onExportLivePage,
		onExportSelection,
		onImportGraph,
		onMergeSubgraph,
		onImportNodeDefs,
		onRestoreDockPanels,
	}: Props = $props();

	let shortcutsOpen = $state(false);
</script>

<div class="toolbar-panel">
	<div class="top-actions">
		<button
			type="button"
			class="btn"
			class:active={shortcutsOpen}
			onclick={() => (shortcutsOpen = !shortcutsOpen)}
			title="Show or hide keyboard shortcuts and tips"
		>
			Shortcuts
		</button>
		<button
			type="button"
			class="btn"
			onclick={onRestoreDockPanels}
			title="Re-open Palette, Graph, Preview, Inspector, or Problems if any were closed"
		>
			Restore panels
		</button>
	</div>

	{#if shortcutsOpen}
		<div class="shortcuts-wrap">
			<table class="shortcuts">
				<caption class="sr-only">Editor shortcuts</caption>
				<thead>
					<tr>
						<th scope="col">Action</th>
						<th scope="col">Shortcut / note</th>
					</tr>
				</thead>
				<tbody>
					{#each SHORTCUT_HELP_ROWS as row (row.action)}
						<tr>
							<td>{row.action}</td>
							<td>{row.detail}</td>
						</tr>
					{/each}
					<tr>
						<td>Re-open closed dock tabs</td>
						<td>Restore panels (this toolbar)</td>
					</tr>
				</tbody>
			</table>
		</div>
	{/if}

	<section class="block">
		<h2 class="block-title">New node pass</h2>
		<div class="row">
			<select
				class="select"
				value={activePass}
				onchange={(e) => onActivePassChange(e.currentTarget.value as BufferId)}
			>
				<option value="image">image</option>
				<option value="bufA">bufA</option>
				<option value="bufB">bufB</option>
				<option value="bufC">bufC</option>
				<option value="bufD">bufD</option>
			</select>
		</div>
	</section>

	<section class="block">
		<h2 class="block-title">Selection & layout</h2>
		<div class="btn-grid">
			<button type="button" class="btn" onclick={onDuplicate} title="Ctrl+D">Duplicate</button>
			<button type="button" class="btn" onclick={onGroup} title="Ctrl+Shift+G">Group selection</button>
			<button type="button" class="btn" onclick={onSnapGrid} title="Snap selected nodes to 16px grid">
				Snap selection
			</button>
			<button type="button" class="btn" onclick={onToggleSnapGrid} title="While dragging, snap to grid">
				Grid snap {snapGridOn ? 'on' : 'off'}
			</button>
			<button
				type="button"
				class="btn wide"
				onclick={onAlignNodes}
				title="Layer selection left→right by graph order, pack rows to shorten wires"
			>
				Align nodes
			</button>
		</div>
	</section>

	<section class="block">
		<h2 class="block-title">Scene</h2>
		<div class="btn-grid">
			<button
				type="button"
				class="btn wide"
				onclick={onBakeSceneSdf}
				disabled={compileResult.errors.length > 0}
				title="Bake compiled scene_sdf into a custom distance node"
			>
				Bake scene SDF
			</button>
			<button
				type="button"
				class="btn wide"
				onclick={onBakeSelection}
				disabled={compileResult.errors.length > 0}
				title="Replace selected nodes with one custom node; wires across the selection border become ports (active pass only)"
			>
				Bake selection
			</button>
			<button type="button" class="btn" onclick={onAddFrame}>Add frame</button>
		</div>
	</section>

	<section class="block">
		<h2 class="block-title">Export</h2>
		<div class="btn-grid">
			<button type="button" class="btn" onclick={onExportGraph}>Export graph</button>
			<button
				type="button"
				class="btn"
				onclick={onExportLivePage}
				disabled={compileResult.errors.length > 0}
				title={compileResult.errors.length > 0 ? 'Resolve compile errors first' : 'Download single HTML with WebGL2 runner'}
			>
				Export live page
			</button>
			<button type="button" class="btn" onclick={onExportSelection}>Export selection</button>
		</div>
	</section>

	<section class="block">
		<h2 class="block-title">Import</h2>
		<div class="file-grid">
			<label class="file">
				Import graph
				<input type="file" accept="application/json" onchange={onImportGraph} />
			</label>
			<label class="file">
				Merge subgraph
				<input type="file" accept="application/json" onchange={onMergeSubgraph} />
			</label>
			<label class="file">
				Import node defs
				<input type="file" accept="application/json" onchange={onImportNodeDefs} />
			</label>
		</div>
	</section>
</div>

<style>
	.toolbar-panel {
		height: 100%;
		min-height: 0;
		overflow: auto;
		padding: 10px 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		background: #12151c;
	}
	.top-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.block-title {
		margin: 0;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #8b93a5;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.btn-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.btn-grid .wide {
		grid-column: 1 / -1;
	}
	.file-grid {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.btn,
	.select {
		background: #252a33;
		border: 1px solid #3a4150;
		color: #e8eaed;
		border-radius: 6px;
		padding: 6px 10px;
		font-size: 12px;
		cursor: pointer;
		text-align: center;
	}
	.btn:hover:not(:disabled) {
		background: #2e3440;
	}
	.btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.btn.active {
		border-color: #4a6a9e;
		background: rgba(50, 80, 130, 0.35);
	}
	.select {
		width: 100%;
		max-width: 100%;
	}
	.file {
		font-size: 12px;
		cursor: pointer;
		color: #c5cad6;
		padding: 6px 10px;
		border-radius: 6px;
		border: 1px dashed #3a4150;
		text-align: center;
	}
	.file:hover {
		border-color: #4a5568;
		background: rgba(255, 255, 255, 0.03);
	}
	.file input {
		display: none;
	}
	.shortcuts-wrap {
		border: 1px solid #2a3140;
		border-radius: 8px;
		overflow: hidden;
		background: #0e1014;
	}
	.shortcuts {
		width: 100%;
		border-collapse: collapse;
		font-size: 11px;
	}
	.shortcuts th,
	.shortcuts td {
		padding: 6px 10px;
		text-align: left;
		border-bottom: 1px solid #252a33;
		vertical-align: top;
	}
	.shortcuts th {
		background: #1a1f28;
		color: #9aa3b2;
		font-weight: 600;
	}
	.shortcuts td:first-child {
		color: #e4e7ec;
		width: 42%;
	}
	.shortcuts td:last-child {
		color: #9aa3b2;
	}
	.shortcuts tbody tr:last-child td {
		border-bottom: none;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
