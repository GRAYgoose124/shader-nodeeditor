<script lang="ts">
	import type { BufferId } from '@shadertoy/compiler';
	import type { CompileResult } from '@shadertoy/compiler';
	interface Props {
		activePass?: BufferId;
		compileResult: CompileResult;
		onDuplicate: () => void;
		onGroup: () => void;
		onSnapGrid: () => void;
		onToggleSnapGrid: () => void;
		snapGridOn: boolean;
		onAlignNodes: () => void;
		onBakeSceneSdf: () => void;
		onAddFrame: () => void;
		onExportGraph: () => void;
		onExportLivePage: () => void;
		onExportSelection: () => void;
		onImportGraph: (ev: Event) => void;
		onMergeSubgraph: (ev: Event) => void;
		onImportNodeDefs: (ev: Event) => void;
		onOpenPresetLibrary: () => void;
		onRestoreDockPanels: () => void;
	}

	let {
		activePass = $bindable<BufferId>('image'),
		compileResult,
		onDuplicate,
		onGroup,
		onSnapGrid,
		onToggleSnapGrid,
		snapGridOn,
		onAlignNodes,
		onBakeSceneSdf,
		onAddFrame,
		onExportGraph,
		onExportLivePage,
		onExportSelection,
		onImportGraph,
		onMergeSubgraph,
		onImportNodeDefs,
		onOpenPresetLibrary,
		onRestoreDockPanels,
	}: Props = $props();
</script>

<header class="bar">
	<h1>Shadertoy node graph</h1>
	<div class="bar-actions">
		<label class="pass">
			New node pass
			<select bind:value={activePass}>
				<option value="image">image</option>
				<option value="bufA">bufA</option>
				<option value="bufB">bufB</option>
				<option value="bufC">bufC</option>
				<option value="bufD">bufD</option>
			</select>
		</label>
		<button
			type="button"
			class="preset-lib-btn"
			onclick={onOpenPresetLibrary}
			title="Browse built-in and saved graph presets"
		>
			Preset library
		</button>
		<button
			type="button"
			onclick={onRestoreDockPanels}
			title="Re-open Palette, Graph, Preview, Inspector, or Problems if any were closed"
		>
			Restore panels
		</button>
		<button type="button" onclick={onDuplicate} title="Ctrl+D">Duplicate</button>
		<button type="button" onclick={onGroup} title="Ctrl+Shift+G">Group selection</button>
		<button type="button" onclick={onSnapGrid} title="Snap selected nodes to 16px grid">Snap selection</button>
		<button type="button" onclick={onToggleSnapGrid} title="While dragging, snap to grid">
			Grid snap {snapGridOn ? 'on' : 'off'}
		</button>
		<button
			type="button"
			onclick={onAlignNodes}
			title="Layer selection left→right by graph order, pack rows to shorten wires (uses estimated node heights)."
		>
			Align nodes
		</button>
		<button
			type="button"
			onclick={onBakeSceneSdf}
			disabled={compileResult.errors.length > 0}
			title="Bake compiled scene_sdf into a custom distance node"
		>
			Bake scene SDF
		</button>
		<button type="button" onclick={onAddFrame}>Add frame</button>
		<button type="button" onclick={onExportGraph}>Export graph</button>
		<button
			type="button"
			onclick={onExportLivePage}
			disabled={compileResult.errors.length > 0}
			title={compileResult.errors.length > 0 ? 'Resolve compile errors first' : 'Download single HTML with WebGL2 runner'}
		>
			Export live page
		</button>
		<button type="button" onclick={onExportSelection}>Export selection</button>
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
</header>

<style>
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 16px;
		border-bottom: 1px solid #252a33;
		background: #14171d;
	}
	.bar h1 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}
	.bar-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.bar-actions button,
	.pass select {
		background: #252a33;
		border: 1px solid #3a4150;
		color: #e8eaed;
		border-radius: 6px;
		padding: 6px 10px;
		font-size: 12px;
		cursor: pointer;
	}
	.preset-lib-btn {
		min-width: 120px;
	}
	.file {
		font-size: 12px;
		cursor: pointer;
	}
	.file input {
		display: none;
	}
</style>
