<script lang="ts">
	import type { CompileResult, GraphDocument, NodeTypeDef } from '@shadertoy/compiler';
	import { PRESET_CATALOG } from '$lib/presetCatalog.js';
	import type { PresetId } from '$lib/presetIds.js';
	import PresetBuiltinThumb from './PresetBuiltinThumb.svelte';
	import {
		compilePresetSnapshot,
		isPresetGalleryBlacklisted,
		blacklistPresetGallery,
		getCachedPresetCompile,
		presetGalleryCacheKey,
		setCachedPresetCompile,
		captureCompileResultStill,
		setCachedPresetStillPersistent,
	} from './presetGalleryRender.js';
	import { presetCardGradient } from './presetThumb.js';
	import type { UserGraphPresetRecord } from './userGraphPresets.js';
	import {
		addUserGraphPreset,
		getUserGraphPresets,
		removeUserGraphPreset,
		updateUserGraphPreset,
	} from './userGraphPresets.js';

	let {
		open = $bindable(false),
		onLoadBuiltin,
		onLoadUserDoc,
		getCurrentDoc,
		customNodeTypes = [] as NodeTypeDef[],
	}: {
		open?: boolean;
		onLoadBuiltin: (id: PresetId) => void;
		onLoadUserDoc: (doc: GraphDocument) => void;
		getCurrentDoc: () => GraphDocument;
		customNodeTypes?: NodeTypeDef[];
	} = $props();

	let dlg: HTMLDialogElement | undefined = $state();
	let filter = $state('');
	let saveName = $state('');

	let userList = $state<UserGraphPresetRecord[]>([]);

	$effect(() => {
		void open;
		if (open) userList = getUserGraphPresets();
	});

	$effect(() => {
		const d = dlg;
		if (!d) return;
		if (open) {
			if (!d.open) {
				d.showModal();
				filter = '';
				saveName = '';
			}
		} else if (d.open) {
			d.close();
		}
	});

	function closeModal() {
		open = false;
	}

	function onDialogClose() {
		open = false;
	}

	const filterLc = $derived(filter.trim().toLowerCase());

	const builtinFiltered = $derived(
		PRESET_CATALOG.filter(
			(e) =>
				!filterLc ||
				e.uiLabel.toLowerCase().includes(filterLc) ||
				e.groupLabel.toLowerCase().includes(filterLc) ||
				e.id.toLowerCase().includes(filterLc),
		),
	);

	const userFiltered = $derived(
		userList.filter(
			(r) =>
				!filterLc ||
				r.name.toLowerCase().includes(filterLc) ||
				r.id.toLowerCase().includes(filterLc),
		),
	);

	function loadBuiltin(id: PresetId) {
		onLoadBuiltin(id);
		closeModal();
	}

	function loadUser(rec: UserGraphPresetRecord) {
		onLoadUserDoc(rec.doc);
		closeModal();
	}

	function saveCurrent() {
		const name = saveName.trim() || 'My preset';
		addUserGraphPreset(name, getCurrentDoc());
		saveName = '';
		userList = getUserGraphPresets();
	}

	function updateUser(id: string) {
		if (!confirm('Overwrite this preset with the current graph?')) return;
		updateUserGraphPreset(id, getCurrentDoc());
		userList = getUserGraphPresets();
	}

	function deleteUser(id: string, label: string) {
		if (!confirm(`Delete preset "${label}"?`)) return;
		removeUserGraphPreset(id);
		userList = getUserGraphPresets();
	}

	/** Built-in preview pipeline: compile → still JPEG → hover uses same compile snapshot. */
	let presetCompile = $state<Partial<Record<PresetId, CompileResult | null>>>({});
	let presetStill = $state<Partial<Record<PresetId, string>>>({});

	async function ensureCompiled(presetId: PresetId): Promise<CompileResult | null> {
		const cacheKey = presetGalleryCacheKey(presetId, customNodeTypes);
		if (isPresetGalleryBlacklisted(cacheKey)) return null;
		const cached = getCachedPresetCompile(cacheKey);
		if (cached !== undefined) return cached;
		// Yield to keep UI responsive.
		await new Promise<void>((r) => requestAnimationFrame(() => r()));
		const t0 = performance.now();
		const res = compilePresetSnapshot(presetId, customNodeTypes);
		setCachedPresetCompile(cacheKey, res);
		presetCompile = { ...presetCompile, [presetId]: res };
		if (performance.now() - t0 > 2000) {
			blacklistPresetGallery(cacheKey);
			setCachedPresetCompile(cacheKey, null);
			presetCompile = { ...presetCompile, [presetId]: null };
			return null;
		}
		return res;
	}

	async function ensureStill(presetId: PresetId): Promise<void> {
		if (presetStill[presetId]) return;
		const res = await ensureCompiled(presetId);
		if (!res) return;
		// Yield again before WebGL work.
		await new Promise<void>((r) => requestAnimationFrame(() => r()));
		const cacheKey = presetGalleryCacheKey(presetId, customNodeTypes);
		const t0 = performance.now();
		const url = captureCompileResultStill(res);
		if (url) {
			void setCachedPresetStillPersistent(cacheKey, url);
			presetStill = { ...presetStill, [presetId]: url };
		}
		if (performance.now() - t0 > 2000) {
			blacklistPresetGallery(cacheKey);
			setCachedPresetCompile(cacheKey, null);
			presetCompile = { ...presetCompile, [presetId]: null };
		}
	}

	$effect(() => {
		if (!open) return;
		// Reset quickly; then hydrate compiles in one shot to avoid re-render thrash.
		presetCompile = {};
		presetStill = {};
		const types = customNodeTypes;
		const initCompile: Partial<Record<PresetId, CompileResult | null>> = {};
		for (const e of PRESET_CATALOG) {
			const cacheKey = presetGalleryCacheKey(e.id, types);
			if (isPresetGalleryBlacklisted(cacheKey)) {
				initCompile[e.id] = null;
				continue;
			}
			const cachedCompile = getCachedPresetCompile(cacheKey);
			if (cachedCompile !== undefined) initCompile[e.id] = cachedCompile;
		}
		presetCompile = initCompile;
	});
</script>

<dialog
	bind:this={dlg}
	class="preset-lib-dlg"
	onclose={onDialogClose}
	onclick={(e) => {
		if (e.target === dlg) closeModal();
	}}
>
	<div class="panel" role="document">
		<header class="head">
			<h2>Preset library</h2>
			<button type="button" class="icon-close" onclick={closeModal} title="Close">×</button>
		</header>

		<div class="toolbar">
			<label class="search-label">
				<span class="sr-only">Filter</span>
				<input
					class="search"
					type="search"
					placeholder="Filter by name or group…"
					bind:value={filter}
				/>
			</label>
			<div class="save-row">
				<input
					class="save-in"
					type="text"
					placeholder="Name for new preset…"
					bind:value={saveName}
				/>
				<button type="button" class="btn primary" onclick={saveCurrent}>Save current graph</button>
			</div>
		</div>

		<div class="scroll">
			<section class="section">
				<h3>Built-in presets</h3>
				<p class="hint">
					Thumbnails are generated when you open this dialog (compile + capture). Optional static images:
					<code>static/presets/&lt;id&gt;.webp</code> or <code>.png</code> show until the capture is ready. Hover a card
					for a live preview.
				</p>
				<div class="grid">
					{#each builtinFiltered as entry (entry.id)}
						<article class="card">
							<PresetBuiltinThumb
								{entry}
								cacheKey={presetGalleryCacheKey(entry.id, customNodeTypes)}
								stillDataUrl={presetStill[entry.id]}
								compileResult={presetCompile[entry.id]}
								ensureCompiled={ensureCompiled}
								ensureStill={ensureStill}
							/>
							<div class="body">
								<span class="chip">{entry.groupLabel}</span>
								<h4 class="title">{entry.uiLabel}</h4>
								<code class="id">{entry.id}</code>
								<button type="button" class="btn load" onclick={() => loadBuiltin(entry.id)}>
									Load
								</button>
							</div>
						</article>
					{/each}
				</div>
			</section>

			<section class="section">
				<h3>My presets</h3>
				{#if userFiltered.length === 0}
					<p class="empty">No saved presets yet. Name the graph above and click “Save current graph”.</p>
				{:else}
					<div class="grid">
						{#each userFiltered as rec (rec.id)}
							<article class="card user">
								<div
									class="thumb"
									style:background={presetCardGradient(rec.id + rec.savedAt)}
								></div>
								<div class="body">
									<span class="chip user-chip">Saved {new Date(rec.savedAt).toLocaleString()}</span>
									<h4 class="title">{rec.name}</h4>
									<div class="row-btns">
										<button type="button" class="btn load" onclick={() => loadUser(rec)}>Load</button>
										<button type="button" class="btn" onclick={() => updateUser(rec.id)}>Update</button>
										<button
											type="button"
											class="btn danger"
											onclick={() => deleteUser(rec.id, rec.name)}>Delete</button>
									</div>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	</div>
</dialog>

<style>
	.preset-lib-dlg {
		border: none;
		padding: 0;
		max-width: 96vw;
		width: min(1100px, 96vw);
		max-height: 90vh;
		background: transparent;
		color: #e4e7ec;
	}
	.preset-lib-dlg::backdrop {
		background: rgba(6, 8, 12, 0.72);
	}
	.panel {
		display: flex;
		flex-direction: column;
		max-height: 90vh;
		background: #141820;
		border: 1px solid #2c3340;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
		overflow: hidden;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid #2a3140;
		background: #1a1f28;
	}
	.head h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}
	.icon-close {
		background: transparent;
		border: none;
		color: #9aa3b5;
      cursor: pointer;
		font-size: 1.5rem;
		line-height: 1;
		padding: 4px 8px;
		border-radius: 6px;
	}
	.icon-close:hover {
		background: #252b38;
		color: #e8eaed;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		padding: 10px 16px;
		border-bottom: 1px solid #252b38;
		background: #161a22;
	}
	.search-label {
		flex: 1;
		min-width: 180px;
	}
	.search {
		width: 100%;
		box-sizing: border-box;
		padding: 8px 10px;
		border-radius: 8px;
		border: 1px solid #3a4150;
		background: #0e1014;
		color: #e8eaed;
		font-size: 13px;
	}
	.save-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.save-in {
		padding: 8px 10px;
		border-radius: 8px;
		border: 1px solid #3a4150;
		background: #0e1014;
		color: #e8eaed;
		font-size: 13px;
		min-width: 160px;
	}
	.btn {
		background: #252a33;
		border: 1px solid #3a4150;
		color: #e8eaed;
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 12px;
		cursor: pointer;
	}
	.btn:hover {
		background: #2e3440;
	}
	.btn.primary {
		border-color: #3d5a80;
		background: rgba(50, 90, 130, 0.35);
	}
	.btn.primary:hover {
		background: rgba(60, 100, 145, 0.45);
	}
	.btn.danger {
		border-color: #6a3030;
		background: rgba(90, 40, 40, 0.3);
		color: #ffb4b4;
	}
	.btn.danger:hover {
		background: rgba(110, 50, 50, 0.45);
	}
	.btn.load {
		width: 100%;
		margin-top: 8px;
	}
	.scroll {
		overflow: auto;
		padding: 14px 16px 18px;
		flex: 1;
		min-height: 0;
	}
	.section {
		margin-bottom: 28px;
	}
	.section h3 {
		margin: 0 0 8px;
		font-size: 0.85rem;
		font-weight: 600;
		color: #c5cad6;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.hint {
		margin: 0 0 12px;
		font-size: 11px;
		color: #7a8498;
	}
	.hint code {
		font-size: 10px;
		color: #9aa7c0;
	}
	.empty {
		font-size: 12px;
		color: #7a8498;
		margin: 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 12px;
	}
	.card {
		display: flex;
		flex-direction: column;
		background: #1a1f28;
		border: 1px solid #2c3340;
		border-radius: 10px;
		overflow: hidden;
	}
	/* User preset placeholder strip (built-ins use PresetBuiltinThumb). */
	.thumb {
		position: relative;
		height: 112px;
		overflow: hidden;
	}
	.body {
		padding: 10px 12px 12px;
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}
	.chip {
		font-size: 10px;
		font-weight: 600;
		color: #8b93a5;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 4px;
	}
	.user-chip {
		font-weight: 500;
		text-transform: none;
		color: #6b9bd1;
	}
	.title {
		margin: 0 0 6px;
		font-size: 13px;
		font-weight: 600;
		line-height: 1.35;
		color: #e8eaed;
	}
	.id {
		font-size: 10px;
		color: #5c6575;
		display: block;
		margin-bottom: 4px;
		word-break: break-all;
	}
	.row-btns {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}
	.row-btns .btn {
		flex: 1;
		min-width: 72px;
		margin-top: 0;
	}
	.row-btns .btn.load {
		flex: 1 1 100%;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}
</style>
