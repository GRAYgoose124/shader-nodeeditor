<script lang="ts">
	import { useNodes, useSvelteFlow } from '@xyflow/svelte';

	let {
		focusTick = 0,
		focusNodeId = null as string | null,
	}: {
		focusTick?: number;
		focusNodeId?: string | null;
	} = $props();

	const { fitView } = useSvelteFlow();
	const nodes = useNodes();

	$effect(() => {
		void focusTick;
		const id = focusNodeId;
		if (!id) return;

		queueMicrotask(async () => {
			await fitView({
				nodes: [{ id }],
				padding: 0.4,
				duration: 400,
				maxZoom: 1.5,
				minZoom: 0.15,
			});
			nodes.update((nds) => nds.map((n) => ({ ...n, selected: n.id === id })));
		});
	});
</script>
