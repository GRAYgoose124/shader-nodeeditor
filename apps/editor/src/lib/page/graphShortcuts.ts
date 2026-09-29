/** DOM guard: do not steal shortcuts while user types in form fields. */
export function isTypingFocusTarget(t: EventTarget | null): boolean {
	const el = t as HTMLElement | null;
	if (!el) return false;
	const tag = el.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export type GraphPageShortcutHandlers = {
	openQuickAdd: () => void;
	duplicateSelectedNodes: () => void;
	copySelectionToClipboard: () => Promise<void>;
	pasteFromClipboard: () => Promise<void>;
	groupSelectedShaderNodes: () => void;
};

/** Ctrl/Cmd+K quick-add, D duplicate, C/V copy-paste subgraph, Shift+G group. */
export function handleGraphPageKeydown(ev: KeyboardEvent, h: GraphPageShortcutHandlers): void {
	if (isTypingFocusTarget(ev.target)) return;
	const mod = ev.ctrlKey || ev.metaKey;
	if (mod && ev.key.toLowerCase() === 'k') {
		ev.preventDefault();
		h.openQuickAdd();
		return;
	}
	if (mod && ev.key === 'd') {
		ev.preventDefault();
		h.duplicateSelectedNodes();
	}
	if (mod && ev.key === 'c') {
		ev.preventDefault();
		void h.copySelectionToClipboard();
	}
	if (mod && ev.key === 'v') {
		ev.preventDefault();
		void h.pasteFromClipboard();
	}
	if (mod && ev.shiftKey && ev.key.toLowerCase() === 'g') {
		ev.preventDefault();
		h.groupSelectedShaderNodes();
	}
}
