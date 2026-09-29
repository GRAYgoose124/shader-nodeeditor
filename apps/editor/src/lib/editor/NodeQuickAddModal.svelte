<script lang="ts">
	import type { NodeTypeDef } from '@shadertoy/compiler';

	let {
		open = $bindable(false),
		allTypes,
		onPick,
	}: {
		open?: boolean;
		allTypes: NodeTypeDef[];
		onPick: (typeId: string) => void;
	} = $props();

	let query = $state('');
	let highlight = $state(0);

	function docUrlMatches(docUrl: string | undefined, q: string): boolean {
		if (!docUrl) return false;
		const low = docUrl.toLowerCase();
		if (low.includes(q)) return true;
		try {
			const host = new URL(docUrl).hostname.replace(/^www\./, '').toLowerCase();
			return host.includes(q) || q.includes(host);
		} catch {
			return false;
		}
	}

	const flat = $derived(
		[...allTypes].sort((a, b) => a.label.localeCompare(b.label)),
	);

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return flat;
		return flat.filter(
			(t) =>
				t.label.toLowerCase().includes(q) ||
				t.id.toLowerCase().includes(q) ||
				(t.category ?? '').toLowerCase().includes(q) ||
				(t.description ?? '').toLowerCase().includes(q) ||
				docUrlMatches(t.docUrl, q),
		);
	});

	$effect(() => {
		if (open) {
			query = '';
			highlight = 0;
		}
	});

	$effect(() => {
		void filtered.length;
		if (highlight >= filtered.length) highlight = Math.max(0, filtered.length - 1);
	});

	function pick(i: number) {
		const t = filtered[i];
		if (!t) return;
		onPick(t.id);
		open = false;
	}

	let searchEl: HTMLInputElement | null = $state(null);
	$effect(() => {
		if (open) queueMicrotask(() => searchEl?.focus());
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlight = Math.min(filtered.length - 1, highlight + 1);
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlight = Math.max(0, highlight - 1);
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			pick(highlight);
		}
	}}
/>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
	<div
		class="backdrop"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label="Add node"
		onclick={(e) => {
			if (e.target === e.currentTarget) open = false;
		}}
	>
		<div class="modal">
			<div class="head">
				<span>Add node</span>
				<kbd>Ctrl</kbd><kbd>K</kbd>
			</div>
			<input
				bind:this={searchEl}
				class="q"
				type="search"
				placeholder="Type to filter…"
				bind:value={query}
			/>
			<ul class="list">
				{#each filtered as t, i (t.id)}
					<li>
						<button
							type="button"
							class:hi={i === highlight}
							onclick={() => pick(i)}
							onmouseenter={() => (highlight = i)}
						>
							<span class="lab">{t.label}</span>
							<code class="id">{t.id}</code>
							{#if t.category}
								<span class="cat">{t.category}</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
			{#if filtered.length === 0}
				<p class="empty">No matches</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 20000;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 12vh;
	}
	.modal {
		width: min(480px, 92vw);
		max-height: min(70vh, 560px);
		display: flex;
		flex-direction: column;
		background: #161a22;
		border: 1px solid #3a4150;
		border-radius: 10px;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		font-size: 13px;
		font-weight: 600;
		border-bottom: 1px solid #2a3140;
	}
	.head kbd {
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 4px;
		background: #252b36;
		border: 1px solid #3a4150;
		margin-left: 4px;
	}
	.q {
		margin: 10px 12px;
		padding: 8px 10px;
		border-radius: 6px;
		border: 1px solid #333842;
		background: #0f1116;
		color: #e8eaed;
		font-size: 13px;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0 8px 10px;
		overflow: auto;
		flex: 1;
		min-height: 0;
	}
	.list li button {
		width: 100%;
		text-align: left;
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		gap: 2px 12px;
		padding: 8px 10px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: #e4e7ec;
		cursor: pointer;
		font-size: 12px;
	}
	.list li button.hi,
	.list li button:hover {
		background: #252b38;
	}
	.lab {
		font-weight: 500;
	}
	.id {
		grid-column: 2;
		grid-row: 1 / span 2;
		align-self: center;
		font-size: 10px;
		opacity: 0.65;
	}
	.cat {
		grid-column: 1;
		font-size: 10px;
		opacity: 0.5;
	}
	.empty {
		padding: 12px;
		text-align: center;
		opacity: 0.55;
		font-size: 12px;
	}
</style>
