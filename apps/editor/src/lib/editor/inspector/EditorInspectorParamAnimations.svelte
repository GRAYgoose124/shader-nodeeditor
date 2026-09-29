<script lang="ts">
	import type {
		GraphMeta,
		GraphNode,
		NodeTypeDef,
		ParamAnimationCurve,
		ParamAnimationSpec,
	} from '@shadertoy/compiler';
	let {
		graphMeta,
		nodeTypeRegistry,
		shaderGraphNodesById,
		patchParamAnimations,
	}: {
		graphMeta: GraphMeta;
		nodeTypeRegistry: Map<string, NodeTypeDef>;
		shaderGraphNodesById: Map<string, GraphNode>;
		patchParamAnimations: (
			mut: (draft: Record<string, ParamAnimationSpec>) => void,
			recompile: boolean,
		) => void;
	} = $props();

	const curves: { id: ParamAnimationCurve; label: string }[] = [
		{ id: 'sine', label: 'Sine' },
		{ id: 'triangle', label: 'Triangle' },
		{ id: 'saw', label: 'Saw' },
		{ id: 'smooth', label: 'Smooth' },
	];

	const entries = $derived(
		Object.entries(graphMeta.editor?.paramAnimations ?? {}).sort(([a], [b]) =>
			a.localeCompare(b),
		),
	);

	function labelFor(key: string, spec: ParamAnimationSpec): string {
		const gn = shaderGraphNodesById.get(spec.nodeId);
		const def = gn ? nodeTypeRegistry.get(gn.typeId) : undefined;
		const p = def?.params.find((x) => x.id === spec.paramId);
		const nodeHint = gn ? `${def?.label ?? gn.typeId}` : spec.nodeId.slice(0, 8);
		return `${nodeHint} — ${p?.label ?? spec.paramId}`;
	}
</script>

<h2>Param animations</h2>
<p class="muted">
	Time-driven float sliders. Wave moves around the node inspector value (center). <strong>Peak-to-peak</strong>
	is the total swing in parameter units; leave empty to use <strong>Depth</strong> × (max − min).
	<strong>Offset</strong> shifts the result before clamping to min/max.
</p>
{#if entries.length === 0}
	<p class="muted">Enable <strong>Animate</strong> on a float parameter in the node inspector.</p>
{:else}
	<div class="list">
		{#each entries as [key, spec] (key)}
			<div class="card">
				<div class="head">
					<span class="title">{labelFor(key, spec)}</span>
					<button
						type="button"
						class="btn-del"
						onclick={() =>
							patchParamAnimations((d) => {
								delete d[key];
							}, true)}
					>
						Remove
					</button>
				</div>
				<label class="row">
					<span>Curve</span>
					<select
						class="param-select"
						value={spec.curve}
						onchange={(e) => {
							const curve = (e.currentTarget as HTMLSelectElement).value as ParamAnimationCurve;
							patchParamAnimations((d) => {
								const s = d[key];
								if (s) s.curve = curve;
							}, false);
						}}
					>
						{#each curves as c (c.id)}
							<option value={c.id}>{c.label}</option>
						{/each}
					</select>
				</label>
				<label class="row">
					<span>Speed (Hz)</span>
					<input
						type="number"
						step="0.01"
						min="0"
						value={spec.speed}
						oninput={(e) => {
							const v = (e.currentTarget as HTMLInputElement).valueAsNumber;
							if (!Number.isFinite(v) || v < 0) return;
							patchParamAnimations((d) => {
								const s = d[key];
								if (s) s.speed = v;
							}, false);
						}}
					/>
				</label>
				<label class="row">
					<span>Phase (s)</span>
					<input
						type="number"
						step="0.05"
						value={spec.phase}
						oninput={(e) => {
							const v = (e.currentTarget as HTMLInputElement).valueAsNumber;
							if (!Number.isFinite(v)) return;
							patchParamAnimations((d) => {
								const s = d[key];
								if (s) s.phase = v;
							}, false);
						}}
					/>
				</label>
				<label class="row row-top">
					<span>Peak-to-peak</span>
					<input
						class="stretch"
						type="number"
						step="any"
						min="0"
						placeholder="depth × span"
						value={spec.range !== undefined && Number.isFinite(spec.range) ? spec.range : ''}
						title="Total wave span in param units. Empty: use depth × (max − min)."
						oninput={(e) => {
							const raw = (e.currentTarget as HTMLInputElement).value.trim();
							patchParamAnimations((d) => {
								const s = d[key];
								if (!s) return;
								if (raw === '') {
									delete s.range;
								} else {
									const v = parseFloat(raw);
									if (Number.isFinite(v) && v >= 0) s.range = v;
								}
							}, false);
						}}
					/>
				</label>
				<label class="row">
					<span>Offset</span>
					<input
						type="number"
						step="any"
						value={spec.offset ?? 0}
						title="Added after the wave, before clamp to param min/max"
						oninput={(e) => {
							const v = (e.currentTarget as HTMLInputElement).valueAsNumber;
							if (!Number.isFinite(v)) return;
							patchParamAnimations((d) => {
								const s = d[key];
								if (s) s.offset = v;
							}, false);
						}}
					/>
				</label>
				<label class="row">
					<span>Depth (0–1)</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={spec.depth}
						title="Used only when peak-to-peak is empty"
						oninput={(e) => {
							const v = parseFloat((e.currentTarget as HTMLInputElement).value);
							patchParamAnimations((d) => {
								const s = d[key];
								if (s) s.depth = Math.max(0, Math.min(1, v));
							}, false);
						}}
					/>
					<span class="depth-val">{spec.depth.toFixed(2)}</span>
				</label>
			</div>
		{/each}
	</div>
{/if}

<style>
	.muted {
		opacity: 0.55;
		margin: 0 0 8px;
		line-height: 1.45;
		font-size: 11px;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.card {
		border: 1px solid #2a3038;
		border-radius: 8px;
		padding: 8px 10px;
		background: #12151a;
		font-size: 11px;
	}
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 8px;
	}
	.title {
		line-height: 1.35;
	}
	.btn-del {
		flex-shrink: 0;
		background: #352020;
		border: 1px solid #553030;
		color: #eeb4b4;
		border-radius: 4px;
		padding: 2px 8px;
		font-size: 10px;
		cursor: pointer;
	}
	.row {
		display: grid;
		grid-template-columns: 88px 1fr auto;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
		font-size: 10px;
	}
	.row span:first-child {
		opacity: 0.8;
	}
	.row-top .stretch {
		grid-column: 2 / -1;
	}
	.param-select,
	.row input[type='number'] {
		grid-column: 2 / -1;
		background: #1a1d24;
		border: 1px solid #333842;
		color: #e8eaed;
		border-radius: 6px;
		padding: 5px 8px;
		font-size: 11px;
	}
	.row input[type='range'] {
		grid-column: 2;
		min-width: 0;
	}
	.depth-val {
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
		width: 2.25rem;
		text-align: right;
	}
</style>
