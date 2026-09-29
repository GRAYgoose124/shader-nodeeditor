/** Rows for the shortcuts help table (editor chrome + canvas). */
export const SHORTCUT_HELP_ROWS: readonly { action: string; detail: string }[] = [
	{ action: 'Quick-add node', detail: 'Ctrl+K (Cmd+K on macOS)' },
	{ action: 'Duplicate selected nodes', detail: 'Ctrl+D' },
	{ action: 'Copy / paste shader subgraph', detail: 'Ctrl+C / Ctrl+V' },
	{ action: 'Group selected shaders into frame', detail: 'Ctrl+Shift+G' },
	{ action: 'Remove selected wire', detail: 'Delete or Backspace' },
	{ action: 'Reconnect wire', detail: 'Drag the dots on a wire' },
	{ action: 'Box-select nodes', detail: 'Drag on empty canvas' },
	{ action: 'Pan canvas', detail: 'Middle or right mouse drag' },
	{ action: 'Nest nodes in a frame', detail: 'Parent frame in Inspector' },
	{ action: 'Pause / restart preview time', detail: 'Preview panel toolbar' },
];
