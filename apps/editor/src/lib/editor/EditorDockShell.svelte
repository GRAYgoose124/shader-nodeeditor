<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { mount, unmount, type Component } from 'svelte';
	import {
		createDockview,
		type DockviewApi,
		type IContentRenderer,
		type SerializedDockview,
	} from 'dockview-core';
	import type { GroupPanelPartInitParameters } from 'dockview-core';
	import { setEditorDockApi } from './editorDockApi';
	import { dockPreviewPanelPresent } from './editorDockStores';
	import DockedPalette from './DockedPalette.svelte';
	import DockedFlow from './DockedFlow.svelte';
	import DockedInspector from './DockedInspector.svelte';
	import DockedProblems from './DockedProblems.svelte';
	import DockedPreview from './DockedPreview.svelte';
	import DockedPresetLibrary from './DockedPresetLibrary.svelte';
	import DockedButtonPalette from './DockedButtonPalette.svelte';

	const STORAGE_KEY = 'editor-dock-layout-v1';

	let rootEl: HTMLDivElement | null = $state(null);
	let api: DockviewApi | null = null;
	let resizeObs: ResizeObserver | null = null;
	let saveT: ReturnType<typeof setTimeout> | undefined;
	let layoutSub: { dispose: () => void } | null = null;

	class SvelteDockPanel implements IContentRenderer {
		readonly element = document.createElement('div');
		mounted: ReturnType<typeof mount> | undefined;
		Panel: Component;

		constructor(panel: Component) {
			this.Panel = panel;
			this.element.className = 'st-dock-panel-root';
		}

		init(_params: GroupPanelPartInitParameters) {
			this.element.style.height = '100%';
			this.element.style.minHeight = '0';
			this.element.style.overflow = 'hidden';
			this.mounted = mount(this.Panel, { target: this.element });
		}

		dispose() {
			if (this.mounted) {
				unmount(this.mounted);
				this.mounted = undefined;
			}
		}
	}

	function createRenderer(name: string): IContentRenderer {
		switch (name) {
			case 'palette':
				return new SvelteDockPanel(DockedPalette as Component);
			case 'graph':
				return new SvelteDockPanel(DockedFlow as Component);
			case 'inspector':
				return new SvelteDockPanel(DockedInspector as Component);
			case 'problems':
				return new SvelteDockPanel(DockedProblems as Component);
			case 'preview':
				return new SvelteDockPanel(DockedPreview as Component);
			case 'presets':
				return new SvelteDockPanel(DockedPresetLibrary as Component);
			case 'toolbar':
				return new SvelteDockPanel(DockedButtonPalette as Component);
			default:
				return new SvelteDockPanel(DockedPalette as Component);
		}
	}

	function scheduleSaveLayout() {
		if (!api) return;
		if (saveT) clearTimeout(saveT);
		saveT = setTimeout(() => {
			saveT = undefined;
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(api!.toJSON()));
			} catch {
				/* quota */
			}
		}, 400);
	}

	function syncPreviewPanelPresence() {
		dockPreviewPanelPresent.set(!!api?.getPanel('preview'));
	}

	function loadStoredLayout(): SerializedDockview | null {
		if (typeof localStorage === 'undefined') return null;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			return JSON.parse(raw) as SerializedDockview;
		} catch {
			return null;
		}
	}

	function layoutLooksValid(data: SerializedDockview): boolean {
		const ids = new Set(Object.keys(data.panels ?? {}));
		for (const id of ['graph', 'palette', 'inspector', 'problems', 'preview']) {
			if (!ids.has(id)) return false;
		}
		return true;
	}

	function buildDefaultLayout(dv: DockviewApi) {
		dv.clear();
		dv.addPanel({
			id: 'graph',
			component: 'graph',
			title: 'Graph',
			renderer: 'always',
		});
		dv.addPanel({
			id: 'preview',
			component: 'preview',
			title: 'Preview',
			position: { referencePanel: 'graph', direction: 'within' },
			renderer: 'always',
		});
		dv.addPanel({
			id: 'palette',
			component: 'palette',
			title: 'Palette',
			position: { referencePanel: 'graph', direction: 'left' },
			initialWidth: 200,
		});
		dv.addPanel({
			id: 'toolbar',
			component: 'toolbar',
			title: 'Toolbar',
			position: { referencePanel: 'palette', direction: 'within' },
			renderer: 'always',
		});
		dv.addPanel({
			id: 'inspector',
			component: 'inspector',
			title: 'Inspector',
			position: { referencePanel: 'graph', direction: 'right' },
			initialWidth: 300,
		});
		dv.addPanel({
			id: 'problems',
			component: 'problems',
			title: 'Problems',
			position: { referencePanel: 'graph', direction: 'below' },
			initialHeight: 160,
		});
		dv.addPanel({
			id: 'presets',
			component: 'presets',
			title: 'Presets',
			position: { referencePanel: 'problems', direction: 'within' },
			renderer: 'always',
		});
	}

	onMount(() => {
		if (!rootEl) return;

		const dv = createDockview(rootEl, {
			createComponent: (options) => createRenderer(options.name),
			defaultRenderer: 'always',
		});
		api = dv;
		setEditorDockApi(dv);

		const stored = loadStoredLayout();
		if (stored && layoutLooksValid(stored)) {
			try {
				dv.fromJSON(stored);
			} catch {
				buildDefaultLayout(dv);
			}
		} else {
			buildDefaultLayout(dv);
		}
		if (!dv.getPanel('toolbar') && dv.getPanel('palette')) {
			dv.addPanel({
				id: 'toolbar',
				component: 'toolbar',
				title: 'Toolbar',
				position: { referencePanel: 'palette', direction: 'within' },
				renderer: 'always',
			});
		}
		if (!dv.getPanel('presets') && dv.getPanel('problems')) {
			dv.addPanel({
				id: 'presets',
				component: 'presets',
				title: 'Presets',
				position: { referencePanel: 'problems', direction: 'within' },
				renderer: 'always',
			});
		}
		syncPreviewPanelPresence();

		layoutSub = dv.onDidLayoutChange(() => {
			scheduleSaveLayout();
			syncPreviewPanelPresence();
		});

		resizeObs = new ResizeObserver(() => {
			if (!rootEl || !api) return;
			api.layout(rootEl.clientWidth, rootEl.clientHeight);
		});
		resizeObs.observe(rootEl);
		dv.layout(rootEl.clientWidth, rootEl.clientHeight);
	});

	onDestroy(() => {
		if (saveT) clearTimeout(saveT);
		layoutSub?.dispose();
		layoutSub = null;
		resizeObs?.disconnect();
		resizeObs = null;
		api?.dispose();
		api = null;
		setEditorDockApi(null);
	});
</script>

<div bind:this={rootEl} class="editor-dock-shell dockview-theme-dark"></div>

<style>
	.editor-dock-shell {
		flex: 1;
		min-height: 0;
		width: 100%;
		--dv-group-view-background-color: #0e1014;
		--dv-tabs-and-actions-container-background-color: #141820;
		--dv-tabs-and-actions-container-height: 28px;
		--dv-tabs-and-actions-container-font-size: 11px;
		--dv-activegroup-visiblepanel-tab-background-color: #0e1014;
		--dv-activegroup-hiddenpanel-tab-background-color: #1a1f28;
		--dv-inactivegroup-visiblepanel-tab-background-color: #0e1014;
		--dv-inactivegroup-hiddenpanel-tab-background-color: #1a1f28;
		--dv-tab-divider-color: #252b38;
		--dv-activegroup-visiblepanel-tab-color: #e4e7ec;
		--dv-activegroup-hiddenpanel-tab-color: #8b93a5;
		--dv-inactivegroup-visiblepanel-tab-color: #8b93a5;
		--dv-inactivegroup-hiddenpanel-tab-color: #5c6575;
		--dv-separator-border: #2c3340;
	}
	.editor-dock-shell :global(.st-dock-panel-root) {
		height: 100%;
		min-height: 0;
	}
	.editor-dock-shell :global(.st-dock-panel-root > *) {
		height: 100%;
		min-height: 0;
	}
</style>
