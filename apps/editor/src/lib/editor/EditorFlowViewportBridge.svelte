<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { useSvelteFlow } from '@xyflow/svelte';
	import { getFlowCenterForNewNode } from '$lib/editor/flowPlacement.js';

	const { screenToFlowPosition } = useSvelteFlow();

	function computeCenter(): { x: number; y: number } {
		const el = document.querySelector('.flow-wrap .svelte-flow__viewport') as HTMLElement | null;
		if (!el) return { x: 120, y: 120 };
		const r = el.getBoundingClientRect();
		return screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
	}

	onMount(() => {
		getFlowCenterForNewNode.set(() => computeCenter());
	});

	onDestroy(() => {
		getFlowCenterForNewNode.set(null);
	});
</script>
