<script lang="ts">
	import {
		BaseEdge,
		EdgeReconnectAnchor,
		getSmoothStepPath,
		useStore,
		type SmoothStepEdgeProps,
	} from '@xyflow/svelte';
	import type { Position } from '@xyflow/system';
	import { resolveCollapsedWireEndpoints } from './frameCollapse.js';
	import { edgeDebugLabelsStore } from './edgeDebugLabelsStore.js';

	type ShaderWireEdgeProps = SmoothStepEdgeProps & {
		source?: string;
		target?: string;
		sourceHandleId?: string | null;
		targetHandleId?: string | null;
	};

	let {
		id,
		source = '',
		target = '',
		sourceHandleId,
		targetHandleId,
		interactionWidth = 28,
		label,
		labelStyle,
		style,
		markerEnd,
		markerStart,
		pathOptions,
		sourcePosition,
		sourceX,
		sourceY,
		targetPosition,
		targetX,
		targetY,
	}: ShaderWireEdgeProps = $props();

	const store = useStore();

	const resolved = $derived.by(() => {
		void store.nodes;
		void store.edges;
		void store.nodeLookup;
		return resolveCollapsedWireEndpoints(
			store,
			{
				source,
				target,
				sourceHandle: sourceHandleId,
				targetHandle: targetHandleId,
			},
			sourceX,
			sourceY,
			targetX,
			targetY,
			sourcePosition as Position,
			targetPosition as Position,
			(fid) =>
				(store.nodeLookup.get(fid)?.internals.userNode as { data?: { width?: number } } | undefined)
					?.data?.width ?? 400,
			(fid) => {
				const n = store.nodeLookup.get(fid)?.internals.userNode;
				return n?.type === 'group' && !!(n as { data?: { collapsed?: boolean } }).data?.collapsed;
			},
		);
	});

	let dbgMap = $state<Record<string, string>>({});
	$effect(() => {
		const u = edgeDebugLabelsStore.subscribe((m) => {
			dbgMap = m;
		});
		return u;
	});

	const displayLabel = $derived.by(() => {
		const key = id ?? '';
		const d = dbgMap[key] ?? '';
		if (d && label) return `${String(label)}\n${d}`;
		if (d) return d;
		return label;
	});

	let [path, labelX, labelY] = $derived(
		getSmoothStepPath({
			sourceX: resolved.sourceX,
			sourceY: resolved.sourceY,
			targetX: resolved.targetX,
			targetY: resolved.targetY,
			sourcePosition: resolved.sourcePosition,
			targetPosition: resolved.targetPosition,
			borderRadius: pathOptions?.borderRadius,
			offset: pathOptions?.offset,
			stepPosition: pathOptions?.stepPosition,
		}),
	);
</script>

<g>
	<BaseEdge
		{id}
		{path}
		{labelX}
		{labelY}
		label={displayLabel}
		{labelStyle}
		{markerStart}
		{markerEnd}
		{interactionWidth}
		{style}
	/>
	<EdgeReconnectAnchor
		type="source"
		position={{ x: resolved.sourceX, y: resolved.sourceY }}
		size={18}
	/>
	<EdgeReconnectAnchor
		type="target"
		position={{ x: resolved.targetX, y: resolved.targetY }}
		size={18}
	/>
</g>
