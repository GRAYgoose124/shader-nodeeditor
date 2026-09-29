<script lang="ts">
	import type { CompileResult, GraphDocument, NodeTypeDef } from '@shadertoy/compiler';
	import { compileGraph, stringifyGraphDocument } from '@shadertoy/compiler';
	import { onMount } from 'svelte';
	import { PRESET_CATALOG } from '$lib/presetCatalog.js';
	import type { PresetId } from '$lib/presetIds.js';
	import PresetLibraryBuiltinGrid from './PresetLibraryBuiltinGrid.svelte';
	import {
		graphDocumentForPreset,
		isPresetGalleryBlacklisted,
		blacklistPresetGallery,
		getCachedPresetCompile,
		presetGalleryCacheKey,
		setCachedPresetCompile,
		presetBuiltinGalleryThumbTick,
	} from './presetGalleryRender.js';
	import { compileGraphInWorker } from '$lib/workers/compileGraphClient.js';
	import type { UserGraphPresetRecord } from './userGraphPresets.js';
	import {
		addUserGraphPreset,
		getUserGraphPresets,
		removeUserGraphPreset,
		updateUserGraphPreset,
	} from './userGraphPresets.js';
	import { presetCardGradient } from './presetThumb.js';

	let {
		onLoadBuiltin,
		onLoadUserDoc,
		getCurrentDoc,
		customNodeTypes = [] as NodeTypeDef[],
	}: {
		onLoadBuiltin: (id: PresetId) => void;
		onLoadUserDoc: (doc: GraphDocument) => void;
		getCurrentDoc: () => GraphDocument;
		customNodeTypes?: NodeTypeDef[];
	} = $props();

	let filter = $state('');
	let saveName = $state('');
	let userList = $state<UserGraphPresetRecord[]>([]);
	let builtinThumbTick = $state(0);

	onMount(() => {
		userList = getUserGraphPresets();
	});

	$effect(() => {
		const unsub = presetBuiltinGalleryThumbTick.subscribe((v) => {
			builtinThumbTick = v;
		});
		return () => unsub();
	});

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
	}

	function loadUser(rec: UserGraphPresetRecord) {
		onLoadUserDoc(rec.doc);
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

	let presetCompile = $state<Partial<Record<PresetId, CompileResult | null>>>({});

	/** Coalesce parallel hover compiles for the same cache key onto one worker job. */
	const galleryCompileInflight = new Map<string, Promise<CompileResult | null>>();

	async function ensureCompiled(presetId: PresetId): Promise<CompileResult | null> {
		const cacheKey = presetGalleryCacheKey(presetId, customNodeTypes);
		if (isPresetGalleryBlacklisted(cacheKey)) return null;
		const cached = getCachedPresetCompile(cacheKey);
		if (cached !== undefined) return cached;
		let inflight = galleryCompileInflight.get(cacheKey);
		if (!inflight) {
			inflight = (async () => {
				await new Promise<void>((r) => requestAnimationFrame(() => r()));
				const t0 = performance.now();
				const doc = graphDocumentForPreset(presetId, customNodeTypes);
				void stringifyGraphDocument(doc);
				let raw: CompileResult;
				try {
					raw = await compileGraphInWorker(doc);
				} catch {
					raw = compileGraph(doc);
				}
				const res = raw.errors.length > 0 ? null : raw;
				setCachedPresetCompile(cacheKey, res);
				presetCompile = { ...presetCompile, [presetId]: res };
				if (performance.now() - t0 > 2000) {
					blacklistPresetGallery(cacheKey);
					setCachedPresetCompile(cacheKey, null);
					presetCompile = { ...presetCompile, [presetId]: null };
					return null;
				}
				return res;
			})().finally(() => {
				galleryCompileInflight.delete(cacheKey);
			});
			galleryCompileInflight.set(cacheKey, inflight);
		}
		return inflight;
	}

	$effect(() => {
		void customNodeTypes;
		galleryCompileInflight.clear();
		presetCompile = {};
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

<div class="preset-lib-panel">
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
		<PresetLibraryBuiltinGrid
			entries={builtinFiltered}
			{customNodeTypes}
			{presetCompile}
			{builtinThumbTick}
			{ensureCompiled}
			onLoadBuiltin={loadBuiltin}
		/>

		<section class="section">
			<h3>My presets</h3>
			{#if userFiltered.length === 0}
				<p class="empty">No saved presets yet. Name the graph above and click “Save current graph”.</p>
			{:else}
				<div class="grid">
					{#each userFiltered as rec (rec.id)}
						<article class="card user">
							<div class="thumb" style:background={presetCardGradient(rec.id + rec.savedAt)}></div>
							<div class="body">
								<span class="chip user-chip">Saved {new Date(rec.savedAt).toLocaleString()}</span>
								<h4 class="title">{rec.name}</h4>
								<div class="row-btns">
									<button type="button" class="btn load" onclick={() => loadUser(rec)}>Load</button>
									<button type="button" class="btn" onclick={() => updateUser(rec.id)}>Update</button>
									<button type="button" class="btn danger" onclick={() => deleteUser(rec.id, rec.name)}>
										Delete
									</button>
								</div>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>

<style>
	.preset-lib-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		background: #141820;
		color: #e4e7ec;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		padding: 10px 12px;
		flex-shrink: 0;
		border-bottom: 1px solid #252b38;
		background: #161a22;
	}
	.search-label {
		flex: 1;
		min-width: 140px;
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
		min-width: 140px;
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
		padding: 12px 12px 16px;
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
	.empty {
		font-size: 12px;
		color: #7a8498;
		margin: 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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
