import type { DockviewApi } from 'dockview-core';

let api: DockviewApi | null = null;

export function setEditorDockApi(next: DockviewApi | null) {
	api = next;
}

export function focusDockPreviewPanel() {
	api?.getPanel('preview')?.api.setActive();
}

/**
 * If the Preview tab was closed, re-add it next to the graph (default layout), then focus it.
 */
export function ensurePreviewPanelAndFocus() {
	if (!api) return;
	const existing = api.getPanel('preview');
	if (existing) {
		existing.api.setActive();
		return;
	}
	if (api.getPanel('graph')) {
		api.addPanel({
			id: 'preview',
			component: 'preview',
			title: 'Preview',
			position: { referencePanel: 'graph', direction: 'within' },
			renderer: 'always',
		});
	} else {
		api.addPanel({
			id: 'preview',
			component: 'preview',
			title: 'Preview',
			renderer: 'always',
		});
	}
	api.getPanel('preview')?.api.setActive();
}

const RESTORE_LAYOUT_PANELS = [
	{ id: 'graph', component: 'graph', title: 'Graph', renderer: 'always' as const },
	{
		id: 'preview',
		component: 'preview',
		title: 'Preview',
		position: { referencePanel: 'graph', direction: 'within' as const },
		renderer: 'always' as const,
	},
	{
		id: 'palette',
		component: 'palette',
		title: 'Palette',
		position: { referencePanel: 'graph', direction: 'left' as const },
		initialWidth: 200,
	},
	{
		id: 'toolbar',
		component: 'toolbar',
		title: 'Toolbar',
		position: { referencePanel: 'palette', direction: 'within' as const },
		renderer: 'always' as const,
	},
	{
		id: 'inspector',
		component: 'inspector',
		title: 'Inspector',
		position: { referencePanel: 'graph', direction: 'right' as const },
		initialWidth: 300,
	},
	{
		id: 'problems',
		component: 'problems',
		title: 'Problems',
		position: { referencePanel: 'graph', direction: 'below' as const },
		initialHeight: 160,
	},
	{
		id: 'presets',
		component: 'presets',
		title: 'Presets',
		position: { referencePanel: 'problems', direction: 'within' as const },
		renderer: 'always' as const,
	},
] as const;

/** Re-add any standard dock panels that were closed (keeps existing panels and layout). */
export function restoreClosedDockPanels() {
	if (!api) return;
	for (const spec of RESTORE_LAYOUT_PANELS) {
		if (api.getPanel(spec.id)) continue;
		api.addPanel({ ...spec });
	}
}
