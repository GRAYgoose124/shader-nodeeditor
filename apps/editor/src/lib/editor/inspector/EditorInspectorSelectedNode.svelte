<script lang="ts">
	import type {
		GraphMeta,
		GraphNode,
		NodeTypeDef,
		ParamAnimationSpec,
		ParamDef,
	} from '@shadertoy/compiler';
	import {
		defaultParamAnimationSpec,
		isParamAnimatable,
		isParamVisible,
		paramAnimKey,
		resolveParamChoice,
	} from '@shadertoy/compiler';
	import type { Node } from '@xyflow/svelte';
	import type { FrameNodeData, ShaderNodeData } from '$lib/flowDoc.js';
	import {
		boundsFromParamDef,
		clampScalar,
		readParamNumber,
	} from '$lib/editor/paramControls.js';

	let {
		selectedFlowNode,
		selectedDef,
		selectedNodeGlsl,
		patchSelectedGraphNode,
		selectedGroupNode,
		onToggleFrameCollapse,
		frameIds,
		onSetParentFrame,
		graphMeta,
		patchParamAnimations,
	}: {
		selectedFlowNode: Node<ShaderNodeData, 'shader'> | null;
		selectedDef: NodeTypeDef | undefined;
		selectedNodeGlsl: string | null;
		patchSelectedGraphNode: (fn: (g: GraphNode) => void) => void;
		selectedGroupNode: Node<FrameNodeData, 'group'> | undefined;
		onToggleFrameCollapse: (id: string) => void;
		frameIds: string[];
		onSetParentFrame: (parentId: string) => void;
		graphMeta: GraphMeta;
		patchParamAnimations: (
			mut: (draft: Record<string, ParamAnimationSpec>) => void,
			recompile: boolean,
		) => void;
	} = $props();

	function commitInspectorGraphParam(p: ParamDef, raw: number) {
		const b = boundsFromParamDef(p);
		const v = clampScalar(raw, b.min, b.max, p.glslType === 'int');
		patchSelectedGraphNode((g) => {
			g.data[p.id] = v;
		});
	}

	const visibleParams = $derived(
		selectedFlowNode && selectedDef
			? selectedDef.params.filter((p) =>
					isParamVisible(p, selectedFlowNode!.data.graphNode.data),
				)
			: [],
	);
</script>

<h2>Inspector</h2>
{#if selectedFlowNode && selectedDef}
	<p class="nid">{selectedFlowNode.data.graphNode.typeId}</p>
	{#if selectedDef.description}
		<p class="node-help">{selectedDef.description}</p>
	{/if}
	{#if selectedDef.docUrl}
		<p class="node-doc">
			<a href={selectedDef.docUrl} target="_blank" rel="noreferrer">Reference</a>
		</p>
	{/if}
	{#if selectedDef.codegenKind === 'glsl_expr'}
		<label class="ta">
			Expression (GLSL, use {'{{in:a}}'} etc.)
			<textarea
				rows="5"
				value={String(selectedFlowNode.data.graphNode.data.expression ?? '')}
				oninput={(e) => {
					const v = (e.target as HTMLTextAreaElement).value;
					patchSelectedGraphNode((g) => {
						g.data.expression = v;
					});
				}}
			></textarea>
		</label>
	{/if}
	<div class="param-grid">
		{#each visibleParams as p (p.id)}
			{@const gn = selectedFlowNode.data.graphNode}
			{@const animKey = paramAnimKey(gn.id, p.id)}
			{@const isAnim = Boolean(graphMeta.editor?.paramAnimations?.[animKey])}
			<label class="param">
				<span
					>{p.label ?? p.id} ({isAnim ? 'animated uniform' : p.binding})</span
				>
				{#if p.choices?.length}
					<select
						class="param-select"
						value={resolveParamChoice(gn.data, p, p.choices[0]!.value)}
						onchange={(e) => {
							const v = (e.target as HTMLSelectElement).value;
							patchSelectedGraphNode((g) => {
								g.data[p.id] = v;
							});
						}}
					>
						{#each p.choices as c (c.value)}
							<option value={c.value}>{c.label}</option>
						{/each}
					</select>
				{:else}
					{@const b = boundsFromParamDef(p)}
					{@const val = readParamNumber(gn.data, p, b)}
					<div class="param-slider-row">
						<input
							type="range"
							min={b.min}
							max={b.max}
							step={b.step}
							value={val}
							oninput={(e) =>
								commitInspectorGraphParam(
									p,
									parseFloat((e.currentTarget as HTMLInputElement).value),
								)}
						/>
						<input
							class="param-num"
							type="number"
							min={b.min}
							max={b.max}
							step={b.isInt ? 1 : 'any'}
							value={val}
							title="Exact value (clamped to min/max)"
							oninput={(e) => {
								const x = (e.currentTarget as HTMLInputElement).valueAsNumber;
								if (!Number.isFinite(x)) return;
								commitInspectorGraphParam(p, x);
							}}
						/>
					</div>
					{#if isParamAnimatable(p)}
						<label class="anim-toggle">
							<input
								type="checkbox"
								checked={isAnim}
								onchange={() => {
									if (isAnim) {
										patchParamAnimations((d) => {
											delete d[animKey];
										}, true);
									} else {
										patchParamAnimations((d) => {
											d[animKey] = defaultParamAnimationSpec(gn.id, p.id);
										}, true);
									}
								}}
							/>
							Animate
						</label>
					{/if}
				{/if}
			</label>
		{/each}
	</div>
	{#if selectedNodeGlsl}
		<details class="node-glsl">
			<summary>Generated GLSL (this node)</summary>
			<pre class="glsl-snippet">{selectedNodeGlsl}</pre>
		</details>
	{/if}
{:else if selectedGroupNode}
	<p class="nid">Frame</p>
	<p class="muted">Visual group; compile ignores frame bounds. Collapse stores boundary port metadata for validation.</p>
	<button type="button" onclick={() => onToggleFrameCollapse(selectedGroupNode.id)}>
		{selectedGroupNode.data.collapsed ? 'Expand' : 'Collapse'} frame
	</button>
{:else}
	<p class="muted">Select a node</p>
{/if}

{#if selectedFlowNode && frameIds.length > 0}
	<label class="param parent-frame">
		<span>Parent frame</span>
		<select
			class="param-select"
			value={selectedFlowNode.parentId ?? ''}
			onchange={(e) => {
				onSetParentFrame((e.target as HTMLSelectElement).value);
			}}
		>
			<option value="">(none)</option>
			{#each frameIds as fid (fid)}
				<option value={fid}>{fid.slice(0, 8)}…</option>
			{/each}
		</select>
	</label>
{/if}

<style>
	.node-help {
		opacity: 0.85;
		line-height: 1.45;
		margin: 0 0 8px;
	}
	.node-doc {
		margin: 0 0 10px;
	}
	.node-doc a {
		color: #9ab4ff;
	}
	.node-glsl {
		margin-top: 10px;
		font-size: 11px;
	}
	.node-glsl summary {
		cursor: pointer;
		color: #9ab4ff;
	}
	.glsl-snippet {
		margin: 6px 0 0;
		padding: 8px;
		max-height: 220px;
		overflow: auto;
		background: #0a0c10;
		border: 1px solid #2a3140;
		border-radius: 6px;
		font-size: 10px;
		line-height: 1.35;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.parent-frame {
		margin-top: 12px;
		padding-top: 10px;
		border-top: 1px solid #2a3038;
	}
	.muted {
		opacity: 0.55;
		margin: 0;
	}
	.nid {
		font-family: ui-monospace, monospace;
		opacity: 0.85;
	}
	.param-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 8px;
	}
	.param {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 0;
	}
	.param-slider-row {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}
	.param-slider-row input[type='range'] {
		flex: 1;
		min-width: 0;
	}
	.param-num {
		width: 4.75rem;
		flex-shrink: 0;
		padding: 4px 6px;
		font-size: 11px;
		font-family: ui-monospace, monospace;
		border-radius: 6px;
		border: 1px solid #333842;
		background: #12151a;
		color: #e8eaed;
	}
	.anim-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 10px;
		opacity: 0.9;
		margin-top: 2px;
		cursor: pointer;
		user-select: none;
	}
	.param-select {
		width: 100%;
		background: #1a1d24;
		border: 1px solid #333842;
		color: #e8eaed;
		border-radius: 6px;
		padding: 6px 8px;
		font-size: 12px;
	}
	.ta textarea {
		width: 100%;
		background: #1a1d24;
		border: 1px solid #333842;
		color: #e8eaed;
		border-radius: 6px;
		padding: 8px;
		font-family: ui-monospace, monospace;
		font-size: 11px;
	}
</style>
