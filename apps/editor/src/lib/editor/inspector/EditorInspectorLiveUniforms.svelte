<script lang="ts">
	import type { CompileResult, GraphNode, NodeTypeDef, UniformManifestEntry } from '@shadertoy/compiler';
	import type { BufferId } from '@shadertoy/compiler';
	import { isParamVisible } from '@shadertoy/compiler';
	import type { ShadertoyRunner } from '@shadertoy/runner';
	import { boundsFromUniform, clampScalar } from '$lib/editor/paramControls.js';

	type UniformSort = 'manifest' | 'name' | 'label';

	let {
		compileResult,
		previewCompileResult,
		uniformGroupsByNode,
		nodeTypeById,
		previewRunner,
		readUniformScalar,
		setUniformScalar,
		resetUniform,
		nodeTypeRegistry = new Map<string, NodeTypeDef>(),
		shaderGraphNodesById = new Map<string, GraphNode>(),
	}: {
		compileResult: CompileResult;
		previewCompileResult: CompileResult | null;
		uniformGroupsByNode: [string, { pass: BufferId; uniforms: UniformManifestEntry[] }][];
		nodeTypeById: Map<string, string>;
		previewRunner: ShadertoyRunner | null;
		readUniformScalar: (r: ShadertoyRunner | null, u: UniformManifestEntry) => number;
		setUniformScalar: (u: UniformManifestEntry, v: number) => void;
		resetUniform: (u: UniformManifestEntry) => void;
		nodeTypeRegistry?: Map<string, NodeTypeDef>;
		shaderGraphNodesById?: Map<string, GraphNode>;
	} = $props();

	let uniformFilter = $state('');
	let uniformSort = $state<UniformSort>('manifest');

	function isUniformRowVisible(u: UniformManifestEntry): boolean {
		const gn = shaderGraphNodesById.get(u.nodeId);
		if (!gn) return true;
		const def = nodeTypeRegistry.get(gn.typeId);
		if (!def) return true;
		const p = def.params.find((x) => x.id === u.paramId);
		if (!p) return true;
		return isParamVisible(p, gn.data);
	}

	function filterAndSortUniforms(list: UniformManifestEntry[]): UniformManifestEntry[] {
		const visibleList = list.filter(
			(u) => u.driver !== 'paramAnimation' && isUniformRowVisible(u),
		);
		const q = uniformFilter.trim().toLowerCase();
		let out = q
			? visibleList.filter((u) => {
					const label = (u.label ?? u.paramId ?? '').toLowerCase();
					const name = u.name.toLowerCase();
					const pid = u.paramId.toLowerCase();
					return name.includes(q) || label.includes(q) || pid.includes(q);
				})
			: [...visibleList];
		if (uniformSort === 'name') {
			out.sort((a, b) => a.name.localeCompare(b.name));
		} else if (uniformSort === 'label') {
			out.sort((a, b) =>
				(a.label ?? a.paramId).localeCompare(b.label ?? b.paramId),
			);
		}
		return out;
	}
</script>

<h2>Uniforms (live)</h2>
<p class="muted">Grouped by node; reset uses manifest defaults. Recompiling re-seeds from graph.</p>
{#if compileResult && previewCompileResult}
	<div class="uniform-toolbar">
		<input
			class="uniform-search"
			type="search"
			placeholder="Filter by name or label…"
			bind:value={uniformFilter}
			aria-label="Filter uniforms"
		/>
		<label class="sort-lab">
			Sort
			<select class="param-select sort-select" bind:value={uniformSort}>
				<option value="manifest">Manifest order</option>
				<option value="name">Uniform name</option>
				<option value="label">Label</option>
			</select>
		</label>
	</div>
	{#each uniformGroupsByNode as [nid, bundle] (nid)}
		{@const rows = filterAndSortUniforms(bundle.uniforms)}
		{#if rows.length > 0}
			<details class="uniform-group" open>
				<summary>
					<code>{nodeTypeById.get(nid) ?? '?'}</code>
					<span class="uniform-nid">{nid.slice(0, 8)}…</span>
				</summary>
				<div class="uniform-grid">
					{#each rows as u (u.name)}
						<div class="uniform-row">
							<div class="uniform-head">
								<span>{u.label ?? u.paramId}</span>
								<code class="uname">{u.name}</code>
							</div>
							{#if u.type === 'float' || u.type === 'int'}
								{@const ub = boundsFromUniform(u)}
								{@const uv = readUniformScalar(previewRunner, u)}
								<div class="uniform-ctrl">
									<input
										type="range"
										min={ub.min}
										max={ub.max}
										step={ub.step}
										value={uv}
										oninput={(e) => {
											const raw = parseFloat((e.currentTarget as HTMLInputElement).value);
											const v = clampScalar(raw, ub.min, ub.max, ub.isInt);
											setUniformScalar(u, v);
										}}
									/>
									<input
										class="param-num"
										type="number"
										min={ub.min}
										max={ub.max}
										step={ub.isInt ? 1 : 'any'}
										value={uv}
										title="Exact value (clamped to min/max)"
										oninput={(e) => {
											const x = (e.currentTarget as HTMLInputElement).valueAsNumber;
											if (!Number.isFinite(x)) return;
											const v = clampScalar(x, ub.min, ub.max, ub.isInt);
											setUniformScalar(u, v);
										}}
									/>
									<button type="button" class="btn-reset" onclick={() => resetUniform(u)}>Reset</button>
								</div>
							{:else}
								<div class="uniform-ctrl">
									<span class="muted small">{u.type}</span>
									<button type="button" class="btn-reset" onclick={() => resetUniform(u)}>Reset</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</details>
		{/if}
	{/each}
	{#if uniformFilter.trim() && uniformGroupsByNode.every(([, b]) => filterAndSortUniforms(b.uniforms).length === 0)}
		<p class="muted small">No uniforms match filter.</p>
	{/if}
{:else if compileResult}
	<p class="muted">Fix compile errors to tune uniforms in the runner.</p>
{/if}

<style>
	.uniform-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 8px;
		margin-bottom: 10px;
	}
	.uniform-search {
		flex: 1;
		min-width: 120px;
		padding: 6px 8px;
		border-radius: 6px;
		border: 1px solid #333842;
		background: #1a1d24;
		color: #e8eaed;
		font-size: 11px;
	}
	.sort-lab {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 10px;
		opacity: 0.85;
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
	.sort-select {
		min-width: 130px;
		font-size: 11px;
		padding: 5px 8px;
	}
	.uniform-group {
		margin-bottom: 10px;
		border: 1px solid #2a3038;
		border-radius: 8px;
		padding: 4px 8px 8px;
		background: #12151a;
	}
	.uniform-group summary {
		cursor: pointer;
		font-size: 11px;
		padding: 4px 0;
		list-style: none;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.uniform-group summary::-webkit-details-marker {
		display: none;
	}
	.uniform-nid {
		opacity: 0.5;
		font-family: ui-monospace, monospace;
		font-size: 10px;
	}
	.uniform-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 6px;
	}
	.uniform-row {
		margin-bottom: 0;
		min-width: 0;
	}
	.uniform-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px;
		margin-bottom: 4px;
		font-size: 11px;
	}
	.uname {
		font-size: 9px;
		opacity: 0.65;
	}
	.uniform-ctrl {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.uniform-ctrl input[type='range'] {
		flex: 1;
		min-width: 48px;
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
	.btn-reset {
		background: #252a33;
		border: 1px solid #3a4150;
		color: #c5cad6;
		border-radius: 4px;
		padding: 2px 8px;
		font-size: 10px;
		cursor: pointer;
	}
	.btn-reset:hover {
		background: #2e3440;
	}
	.muted {
		opacity: 0.55;
		margin: 0;
	}
	.small {
		font-size: 10px;
	}
</style>
