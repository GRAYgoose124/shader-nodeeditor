<script lang="ts">
	import type { BufferId, CompileResult } from '@shadertoy/compiler';

	const PASSES: BufferId[] = ['bufA', 'bufB', 'bufC', 'bufD', 'image'];

	interface Props {
		activePass: BufferId;
		onActivePassChange: (pass: BufferId) => void;
		compileResult: CompileResult;
		passHasNodes: (pass: BufferId) => boolean;
	}

	let { activePass, onActivePassChange, compileResult, passHasNodes }: Props = $props();

	function errorsForPass(pass: BufferId): string[] {
		const prefix = `Pass ${pass}:`;
		return compileResult.errors.filter((e) => e.startsWith(prefix));
	}

	function edgeErrors(): string[] {
		return compileResult.errors.filter((e) => e.startsWith('Edge ') || e.startsWith('Node ') || e.startsWith('Unknown '));
	}
</script>

<div class="multipass-bar" role="tablist" aria-label="Shader passes">
	{#each PASSES as pass (pass)}
		{@const nErr = errorsForPass(pass).length}
		<button
			type="button"
			class:active={activePass === pass}
			class:has-nodes={passHasNodes(pass)}
			onclick={() => onActivePassChange(pass)}
			role="tab"
			aria-selected={activePass === pass}
		>
			<span class="lab">{pass}</span>
			{#if nErr > 0}
				<span class="badge err" title={errorsForPass(pass).join('\n')}>{nErr}</span>
			{:else if compileResult.errors.length === 0 && passHasNodes(pass)}
				<span class="badge ok">ok</span>
			{/if}
		</button>
	{/each}
	{#if edgeErrors().length > 0}
		<span class="global-err" title={edgeErrors().join('\n')}>+{edgeErrors().length} global</span>
	{/if}
</div>

<style>
	.multipass-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-bottom: 1px solid #252a33;
		background: #101318;
		font-size: 11px;
	}
	.multipass-bar button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid #2f3540;
		background: #1a1f28;
		color: #9aa3b2;
		cursor: pointer;
		font-size: 11px;
	}
	.multipass-bar button:hover {
		background: #222833;
	}
	.multipass-bar button.active {
		border-color: #4a6a9e;
		color: #e4e7ec;
		background: #252d3d;
	}
	.multipass-bar button.has-nodes .lab {
		font-weight: 600;
	}
	.badge {
		font-size: 9px;
		padding: 1px 5px;
		border-radius: 4px;
	}
	.badge.err {
		background: rgba(120, 40, 40, 0.5);
		color: #ffb4b4;
	}
	.badge.ok {
		background: rgba(40, 90, 60, 0.35);
		color: #9dd4b0;
		opacity: 0.75;
	}
	.global-err {
		margin-left: 8px;
		color: #ff9999;
		font-size: 10px;
		cursor: default;
	}
</style>
