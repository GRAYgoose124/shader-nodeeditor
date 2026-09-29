<script lang="ts">
	import { useEdges, useNodes, useSvelteFlow } from '@xyflow/svelte';

	let {
		focusTick = 0,
		focusNodeId = null as string | null,
		focusEdgeTick = 0,
		focusEdgeId = null as string | null,
	}: {
		focusTick?: number;
		focusNodeId?: string | null;
		focusEdgeTick?: number;
		focusEdgeId?: string | null;
	} = $props();

	const { fitView } = useSvelteFlow();
	const nodes = useNodes();
	const edges = useEdges();

	$effect(() => {
		void focusEdgeTick;
		const eid = focusEdgeId;
		if (!eid) return;

		queueMicrotask(async () => {
			const edge = edges.current.find((e) => e.id === eid);
			if (!edge) return;
			await fitView({
				nodes: [{ id: edge.source }, { id: edge.target }],
				padding: 0.35,
				duration: 400,
				maxZoom: 1.5,
				minZoom: 0.15,
			});
			edges.update((es) => es.map((e) => ({ ...e, selected: e.id === eid })));
			nodes.update((nds) => nds.map((n) => ({ ...n, selected: false })));
		});
	});

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
			edges.update((es) => es.map((e) => ({ ...e, selected: false })));
		});
	});
</script>
