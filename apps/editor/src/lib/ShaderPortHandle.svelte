<script lang="ts">
	import { Handle, Position, useNodeConnections } from '@xyflow/svelte';
	import type { HandleType } from '@xyflow/system';

	let {
		handleType,
		position,
		handleId,
		extraClass = '',
	}: {
		handleType: HandleType;
		position: Position;
		handleId: string;
		extraClass?: string;
	} = $props();

	// One component instance per port; handleType/handleId are stable for its lifetime.
	// svelte-ignore state_referenced_locally
	const connections = useNodeConnections({ handleType, handleId });
	const connected = $derived(connections.current.length > 0);
</script>

<Handle
	type={handleType}
	{position}
	id={handleId}
	class="{extraClass}{connected ? ' h-connected' : ''}"
/>
