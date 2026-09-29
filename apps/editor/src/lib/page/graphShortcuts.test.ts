import { describe, expect, it, vi } from 'vitest';
import { handleGraphPageKeydown, isTypingFocusTarget } from './graphShortcuts.js';

describe('isTypingFocusTarget', () => {
	it('returns true for input / textarea / select', () => {
		expect(isTypingFocusTarget({ tagName: 'INPUT' } as HTMLElement)).toBe(true);
		expect(isTypingFocusTarget({ tagName: 'TEXTAREA' } as HTMLElement)).toBe(true);
		expect(isTypingFocusTarget({ tagName: 'SELECT' } as HTMLElement)).toBe(true);
	});

	it('returns true for contenteditable', () => {
		const el = { tagName: 'DIV', isContentEditable: true } as HTMLElement;
		expect(isTypingFocusTarget(el)).toBe(true);
	});

	it('returns false for other elements', () => {
		expect(isTypingFocusTarget({ tagName: 'DIV', isContentEditable: false } as HTMLElement)).toBe(
			false,
		);
		expect(isTypingFocusTarget(null)).toBe(false);
	});
});

function keyEv(init: {
	key: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
	target?: EventTarget | null;
}): KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> } {
	const preventDefault = vi.fn();
	return {
		key: init.key,
		ctrlKey: init.ctrlKey ?? false,
		metaKey: init.metaKey ?? false,
		shiftKey: init.shiftKey ?? false,
		target: init.target ?? ({ tagName: 'DIV', isContentEditable: false } as unknown as EventTarget),
		preventDefault,
	} as KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> };
}

describe('handleGraphPageKeydown', () => {
	it('invokes openQuickAdd on Ctrl+K and prevents default', () => {
		const openQuickAdd = vi.fn();
		const ev = keyEv({ key: 'k', ctrlKey: true });
		handleGraphPageKeydown(ev, {
			openQuickAdd,
			duplicateSelectedNodes: vi.fn(),
			copySelectionToClipboard: vi.fn(),
			pasteFromClipboard: vi.fn(),
			groupSelectedShaderNodes: vi.fn(),
		});
		expect(openQuickAdd).toHaveBeenCalledOnce();
		expect(ev.preventDefault).toHaveBeenCalled();
	});

	it('does nothing when focus is an input', () => {
		const openQuickAdd = vi.fn();
		const input = { tagName: 'INPUT' } as unknown as EventTarget;
		handleGraphPageKeydown(keyEv({ key: 'k', ctrlKey: true, target: input }), {
			openQuickAdd,
			duplicateSelectedNodes: vi.fn(),
			copySelectionToClipboard: vi.fn(),
			pasteFromClipboard: vi.fn(),
			groupSelectedShaderNodes: vi.fn(),
		});
		expect(openQuickAdd).not.toHaveBeenCalled();
	});
});
