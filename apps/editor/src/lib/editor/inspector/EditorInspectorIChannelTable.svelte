<script lang="ts">
	import type { CompileResult, GraphMeta, IChannelSlotBinding } from '@shadertoy/compiler';
	import type { BufferId } from '@shadertoy/compiler';
	import { DEFAULT_PASS_ORDER } from '@shadertoy/compiler';
	import { missingIChannelBindingsForPass } from '$lib/ichannelHints.js';

	function formatIChannelCell(b: IChannelSlotBinding | undefined): string {
		if (b === undefined) return '—';
		if (typeof b === 'string') return b;
		if (b && typeof b === 'object' && 'media' in b) return `media:${b.media}`;
		return '—';
	}

	let {
		graphMeta,
		activePass,
		compileResult,
		gpuError = null as string | null,
	}: {
		graphMeta: GraphMeta;
		activePass: BufferId;
		compileResult: CompileResult;
		gpuError?: string | null;
	} = $props();

	const missingICh = $derived(
		missingIChannelBindingsForPass(
			activePass,
			graphMeta,
			compileResult.passes[activePass]?.fragmentSource,
		),
	);
</script>

<h2>Buffer links (iChannel)</h2>
<p class="muted small ihead">
	Texture inputs per pass (like Shadertoy). Configure <code>meta.iChannels</code> in exported JSON or use a preset
	that sets it.
</p>
<table class="ichan-table">
	<thead>
		<tr>
			<th>Pass</th>
			<th>0</th>
			<th>1</th>
			<th>2</th>
			<th>3</th>
		</tr>
	</thead>
	<tbody>
		{#each DEFAULT_PASS_ORDER as p (p)}
			<tr class:ich-active={p === activePass}>
				<td class="ich-pass">{p}</td>
				{#each [0, 1, 2, 3] as k (k)}
					<td>{formatIChannelCell(graphMeta.iChannels?.[p]?.[k as 0 | 1 | 2 | 3])}</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
{#if missingICh.length > 0}
	<p class="ich-warn">
		<strong>{activePass}</strong> shader references
		<code>{missingICh.map((k) => `iChannel${k}`).join(', ')}</code>
		but <code>meta.iChannels.{activePass}</code> omits
		{missingICh.length === 1 ? 'that index' : 'those indices'} — the runner may use a black texture.
	</p>
{/if}

{#if compileResult && compileResult.errors.length > 0}
	<p class="problems-hint">
		<strong>{compileResult.errors.length}</strong> graph issue{compileResult.errors.length === 1 ? '' : 's'} — see
		<strong>Problems</strong> panel below.
	</p>
{/if}
{#if gpuError}
	<p class="problems-hint gpu">
		GPU shader error — see <strong>Problems</strong> panel.
	</p>
{/if}

<style>
	.ihead {
		margin: 0 0 8px;
		line-height: 1.4;
	}
	.ichan-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 10px;
		margin-bottom: 8px;
	}
	.ichan-table th,
	.ichan-table td {
		border: 1px solid #333842;
		padding: 4px 6px;
		text-align: left;
	}
	.ichan-table th {
		background: #1a1d24;
		opacity: 0.9;
	}
	.ichan-table tr.ich-active td {
		background: rgba(60, 90, 140, 0.22);
	}
	.ich-pass {
		font-weight: 600;
		white-space: nowrap;
	}
	.ich-warn {
		font-size: 11px;
		line-height: 1.45;
		padding: 8px;
		margin: 0 0 12px;
		border-radius: 6px;
		border: 1px solid #5a4a35;
		background: rgba(80, 70, 40, 0.2);
		color: #e8d4a8;
	}
	.problems-hint {
		background: rgba(80, 20, 20, 0.35);
		border: 1px solid #633;
		padding: 8px 10px;
		border-radius: 6px;
		margin: 0 0 10px;
		font-size: 11px;
		line-height: 1.4;
		color: #e8b4b4;
	}
	.problems-hint.gpu {
		background: rgba(60, 30, 20, 0.4);
		border-color: #744;
	}
	.muted {
		opacity: 0.55;
		margin: 0;
	}
	.small {
		font-size: 10px;
	}
</style>
