<script lang="ts">
	import { browser } from '$app/environment';
	import { Handle, Position, type Node, type NodeProps } from '@xyflow/svelte';
	import { useStore, useSvelteFlow } from '@xyflow/svelte';
	import { buildRegistry } from '@shadertoy/compiler';
	import type { GlslType } from '@shadertoy/compiler';
	import type { FrameNodeData, ShaderNodeData } from './flowDoc.js';
	import { customTypesStore } from './customTypesStore.js';
	import {
		boundaryInputPorts,
		boundaryOutputPorts,
		collapsedFrameChromeHeight,
		COLLAPSED_ROW_H,
	} from './frameCollapse.js';

	let { id, data }: NodeProps<Node<FrameNodeData, 'group'>> = $props();

	const store = useStore();
	const { updateNode } = useSvelteFlow();

	const customs = $derived($customTypesStore);
	const registry = $derived(buildRegistry(customs));

	const inputs = $derived.by(() => {
		void store.nodes;
		void store.edges;
		return boundaryInputPorts(id, store.nodes, store.edges);
	});

	const outputs = $derived.by(() => {
		void store.nodes;
		void store.edges;
		return boundaryOutputPorts(id, store.nodes, store.edges);
	});

	function tyClass(t: GlslType | undefined): string {
		switch (t) {
			case 'float':
				return 'glsl-float';
			case 'int':
				return 'glsl-int';
			case 'vec2':
				return 'glsl-vec2';
			case 'vec3':
				return 'glsl-vec3';
			case 'vec4':
				return 'glsl-vec4';
			case 'mat4':
				return 'glsl-mat4';
			case 'sampler2D':
				return 'glsl-tex';
			default:
				return 'glsl-unknown';
		}
	}

	function portMeta(nodeId: string, handleId: string, kind: 'in' | 'out') {
		const n = store.nodes.find((x) => x.id === nodeId) as Node<ShaderNodeData, 'shader'> | undefined;
		if (!n || n.type !== 'shader') {
			return { label: handleId, ty: undefined as GlslType | undefined };
		}
		const gn = n.data.graphNode;
		const def = registry.get(gn.typeId);
		if (kind === 'in') {
			const p = def?.inputs?.find((i) => i.id === handleId);
			return { label: p?.label ?? handleId, ty: p?.type };
		}
		const p = def?.outputs?.find((o) => o.id === handleId);
		return { label: p?.label ?? handleId, ty: p?.type };
	}

	let lastChromeH = $state(0);

	$effect(() => {
		if (!browser) return;
		void store.nodes;
		void store.edges;
		const self = store.nodes.find((n) => n.id === id && n.type === 'group');
		if (!self?.data.collapsed) {
			lastChromeH = 0;
			return;
		}
		const w = self.data.width;
		const h = collapsedFrameChromeHeight(id, store.nodes, store.edges);
		if (h === lastChromeH) return;
		lastChromeH = h;
		updateNode(id, (node) =>
			node.type === 'group' ? { ...node, style: `width: ${w}px; height: ${h}px` } : node,
		);
	});
</script>

<div class="frame-root" class:collapsed={data.collapsed}>
	<div class="frame-bar frame-drag-handle">{data.label ?? 'Frame'}</div>
	{#if data.collapsed}
		<div class="frame-ports" style:--row-h="{COLLAPSED_ROW_H}px">
			<div class="col in">
				{#each inputs as p (p.nodeId + '\0' + p.handleId)}
					{@const meta = portMeta(p.nodeId, p.handleId, 'in')}
					<div class="port-row">
						<Handle
							type="target"
							position={Position.Left}
							id={'c-in-' + p.nodeId + '-' + p.handleId}
							class="h {tyClass(meta.ty)}"
							isConnectable={false}
						/>
						<span class="port-label">{meta.label}</span>
						<span class="ty {tyClass(meta.ty)}" title={meta.ty}>{meta.ty ?? '?'}</span>
					</div>
				{/each}
			</div>
			<div class="col out">
				{#each outputs as p (p.nodeId + '\0' + p.handleId)}
					{@const meta = portMeta(p.nodeId, p.handleId, 'out')}
					<div class="port-row">
						<span class="ty {tyClass(meta.ty)}" title={meta.ty}>{meta.ty ?? '?'}</span>
						<span class="port-label">{meta.label}</span>
						<Handle
							type="source"
							position={Position.Right}
							id={'c-out-' + p.nodeId + '-' + p.handleId}
							class="h {tyClass(meta.ty)}"
							isConnectable={false}
						/>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="frame-body"></div>
	{/if}
</div>

<style>
	.frame-root {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		border: 1px dashed #3d4a5c;
		border-radius: 6px;
		background: rgba(12, 14, 18, 0.35);
		font-family: system-ui, 'Segoe UI', sans-serif;
		font-size: 10px;
		color: #9aa3b2;
	}
	.frame-root.collapsed {
		background: rgba(12, 14, 18, 0.55);
	}
	.frame-bar {
		flex: 0 0 auto;
		height: 24px;
		box-sizing: border-box;
		padding: 4px 8px;
		background: rgba(30, 36, 46, 0.9);
		border-bottom: 1px solid #2a3340;
		border-radius: 5px 5px 0 0;
		font-weight: 600;
		cursor: grab;
	}
	.frame-bar:active {
		cursor: grabbing;
	}
	.frame-body {
		flex: 1;
		min-height: 0;
	}
	.frame-ports {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: row;
		align-items: stretch;
		gap: 6px;
		padding: 4px 6px 6px;
	}
	.col {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.port-row {
		position: relative;
		display: flex;
		align-items: center;
		height: var(--row-h, 22px);
		gap: 4px;
		font-size: 10px;
	}
	.col.in .port-row {
		justify-content: flex-start;
		padding-left: 10px;
	}
	.col.out .port-row {
		justify-content: flex-end;
		padding-right: 10px;
	}
	.port-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: #c5cad3;
	}
	.col.out .port-label {
		text-align: right;
	}
	.ty {
		font-size: 9px;
		opacity: 0.75;
		flex-shrink: 0;
	}
	:global(.frame-root .h) {
		width: 8px !important;
		height: 8px !important;
		border-width: 2px !important;
	}
	:global(.frame-root .glsl-float) {
		background: #6b8cae !important;
		border-color: #9bb4cc !important;
	}
	:global(.frame-root .glsl-int) {
		background: #8b7aab !important;
		border-color: #b5a6d4 !important;
	}
	:global(.frame-root .glsl-vec2) {
		background: #6ba38a !important;
		border-color: #9cc9b0 !important;
	}
	:global(.frame-root .glsl-vec3) {
		background: #a38a6b !important;
		border-color: #d4b89c !important;
	}
	:global(.frame-root .glsl-vec4) {
		background: #a36b7a !important;
		border-color: #d49cac !important;
	}
	:global(.frame-root .glsl-mat4) {
		background: #7a8aa3 !important;
		border-color: #a8b5cc !important;
	}
	:global(.frame-root .glsl-tex) {
		background: #7a6ba3 !important;
		border-color: #b0a0d4 !important;
	}
	:global(.frame-root .glsl-unknown) {
		background: #555 !important;
		border-color: #888 !important;
	}
</style>
