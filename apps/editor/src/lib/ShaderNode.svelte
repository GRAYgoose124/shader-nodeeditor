<script lang="ts">
	import { getContext } from 'svelte';
	import { Position, type Node, type NodeProps } from '@xyflow/svelte';
	import { buildRegistry, isParamVisible } from '@shadertoy/compiler';
	import type { GlslType, ParamDef } from '@shadertoy/compiler';
	import type { ShaderNodeData } from './flowDoc.js';
	import { customTypesStore } from './customTypesStore.js';
	import { SHADER_NODE_PATCH_KEY, type ShaderNodePatchFn } from '$lib/editor/shaderNodeContext.js';
	import { errorChromeStore } from '$lib/editor/errorChromeStore.js';
	import ShaderPortHandle from '$lib/ShaderPortHandle.svelte';
	import {
		boundsFromParamDef,
		clampScalar,
		readParamNumber,
	} from '$lib/editor/paramControls.js';
	import { getShaderNodeSubtitle } from '$lib/shaderNodeSubtitle.js';

	let { id, data, selected }: NodeProps<Node<ShaderNodeData, 'shader'>> = $props();

	const hasNodeErr = $derived($errorChromeStore.errorNodeIds.has(id));
	const portErr = $derived($errorChromeStore.errorPortsByNode.get(id));

	const gn = $derived(data.graphNode);
	const customs = $derived($customTypesStore);
	const registry = $derived(buildRegistry(customs));
	const def = $derived(registry.get(gn.typeId));
	const patchParam = getContext<ShaderNodePatchFn | undefined>(SHADER_NODE_PATCH_KEY);

	const nodeSubtitle = $derived(getShaderNodeSubtitle(def, gn.data));
	const subtitleIsExpr = $derived(def?.codegenKind === 'glsl_expr');

	const canvasParamDefs = $derived.by((): ParamDef[] => {
		const d = def;
		const ids = d?.canvasParams;
		if (!d || !ids?.length) return [];
		const out: ParamDef[] = [];
		for (const pid of ids) {
			const p = d.params.find((x) => x.id === pid);
			if (!p || p.binding !== 'uniform') continue;
			if (p.glslType !== 'float' && p.glslType !== 'int') continue;
			if (!isParamVisible(p, gn.data)) continue;
			out.push(p);
		}
		return out;
	});

	function commitCanvasParam(p: ParamDef, raw: number) {
		if (!patchParam) return;
		const b = boundsFromParamDef(p);
		const v = clampScalar(raw, b.min, b.max, p.glslType === 'int');
		patchParam(id, p.id, v);
	}

	function tyClass(t: GlslType): string {
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
</script>

<div class="shader-node" class:sel={selected} class:err={hasNodeErr}>
	<div class="head">
		<div class="title-line">{def?.label ?? gn.typeId}</div>
		{#if nodeSubtitle}
			<div
				class="sub"
				class:sub-mono={subtitleIsExpr}
				title={subtitleIsExpr && typeof gn.data['expression'] === 'string'
					? gn.data['expression'].trim()
					: undefined}>{nodeSubtitle}</div>
		{/if}
	</div>
	{#if canvasParamDefs.length > 0 && patchParam}
		<div class="canvas-params nodrag">
			{#each canvasParamDefs as p (p.id)}
				{@const b = boundsFromParamDef(p)}
				{@const v = readParamNumber(gn.data, p, b)}
				<label class="c-param nodrag">
					<span class="c-lab" title="Param id: {p.id}">{p.label ?? p.id}</span>
					<div class="c-slider-row">
						<input
							class="nodrag c-range"
							type="range"
							min={b.min}
							max={b.max}
							step={b.step}
							value={v}
							oninput={(e) =>
								commitCanvasParam(p, parseFloat((e.currentTarget as HTMLInputElement).value))}
						/>
						<input
							class="nodrag c-num"
							type="number"
							min={b.min}
							max={b.max}
							step={b.isInt ? 1 : 'any'}
							value={v}
							oninput={(e) => {
								const x = (e.currentTarget as HTMLInputElement).valueAsNumber;
								if (!Number.isFinite(x)) return;
								commitCanvasParam(p, x);
							}}
						/>
					</div>
				</label>
			{/each}
		</div>
	{/if}
	<div class="body">
		{#each def?.inputs ?? [] as inp (inp.id)}
			<div class="row in">
				<ShaderPortHandle
					handleType="target"
					position={Position.Left}
					handleId={inp.id}
					extraClass="h {tyClass(inp.type)}{portErr?.inputs.has(inp.id) ? ' h-port-err' : ''}"
				/>
				<span class="port-label">{inp.label ?? inp.id}</span>
				<span class="ty {tyClass(inp.type)}" title="{inp.type}{inp.label ? ` · ${inp.label}` : ''}"
					>{inp.type}</span
				>
			</div>
		{/each}
		{#each def?.outputs ?? [] as out (out.id)}
			<div class="row out">
				<span class="ty {tyClass(out.type)}" title="{out.type}{out.label ? ` · ${out.label}` : ''}"
					>{out.type}</span
				>
				<span class="port-label">{out.label ?? out.id}</span>
				<ShaderPortHandle
					handleType="source"
					position={Position.Right}
					handleId={out.id}
					extraClass="h {tyClass(out.type)}{portErr?.outputs.has(out.id) ? ' h-port-err' : ''}"
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	.shader-node {
		min-width: 128px;
		max-width: 280px;
		background: #161a22;
		border: 1px solid #2c3340;
		border-radius: 6px;
		color: #e4e7ec;
		font-size: 11px;
		font-family: system-ui, 'Segoe UI', Roboto, sans-serif;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
	}
	.shader-node.sel {
		border-color: #5b8cff;
		box-shadow: 0 0 0 1px #5b8cff;
	}
	.shader-node.err {
		border-color: #cc4444;
		box-shadow: 0 0 0 2px rgba(200, 60, 60, 0.85);
	}
	.shader-node.err.sel {
		border-color: #cc4444;
		box-shadow:
			0 0 0 2px rgba(200, 60, 60, 0.85),
			0 0 0 3px rgba(91, 140, 255, 0.45);
	}
	.head {
		padding: 4px 8px;
		font-weight: 600;
		font-size: 10px;
		border-bottom: 1px solid #252b36;
		background: #1c212a;
		border-radius: 5px 5px 0 0;
		overflow: hidden;
	}
	.title-line {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.sub {
		margin-top: 2px;
		font-weight: 500;
		font-size: 9px;
		opacity: 0.82;
		color: #a8c4ff;
		line-height: 1.2;
	}
	.sub-mono {
		font-family: ui-monospace, 'Cascadia Mono', monospace;
		font-weight: 400;
		font-size: 8px;
		color: #c8dbf8;
		opacity: 0.95;
	}
	.canvas-params {
		padding: 4px 6px 6px;
		border-bottom: 1px solid #252b36;
		background: #141820;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.c-param {
		display: flex;
		flex-direction: column;
		gap: 1px;
		margin: 0;
		cursor: default;
	}
	.c-lab {
		font-size: 8px;
		font-family: ui-monospace, monospace;
		opacity: 0.65;
		text-transform: none;
	}
	.c-slider-row {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
	}
	.c-range {
		flex: 1;
		min-width: 0;
		margin: 0;
		min-height: 14px;
		touch-action: pan-y;
	}
	.c-num {
		width: 3.25rem;
		flex-shrink: 0;
		padding: 1px 3px;
		font-size: 8px;
		font-family: ui-monospace, monospace;
		border-radius: 3px;
		border: 1px solid #333842;
		background: #12151a;
		color: #e4e7ec;
	}
	.body {
		padding: 4px 6px 6px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 4px;
		position: relative;
		min-height: 18px;
	}
	.row.in {
		justify-content: flex-start;
		padding-left: 2px;
	}
	.row.out {
		justify-content: flex-end;
		padding-right: 2px;
	}
	.port-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ty {
		font-size: 9px;
		font-family: ui-monospace, 'Cascadia Mono', monospace;
		padding: 1px 4px;
		border-radius: 3px;
		opacity: 0.92;
		flex-shrink: 0;
	}
	:global(.shader-node .h) {
		width: 7px !important;
		height: 7px !important;
		min-width: 7px !important;
		min-height: 7px !important;
		border-width: 1.5px !important;
	}
	:global(.shader-node .h.glsl-float) {
		border-color: #7dd3a0 !important;
		background: #12151a !important;
	}
	:global(.shader-node .h.glsl-int) {
		border-color: #9dd87a !important;
		background: #12151a !important;
	}
	:global(.shader-node .h.glsl-vec2) {
		border-color: #7eb8ff !important;
		background: #12151a !important;
	}
	:global(.shader-node .h.glsl-vec3) {
		border-color: #c49dff !important;
		background: #12151a !important;
	}
	:global(.shader-node .h.glsl-vec4) {
		border-color: #ff9dd0 !important;
		background: #12151a !important;
	}
	:global(.shader-node .h.glsl-mat4) {
		border-color: #ffb870 !important;
		background: #12151a !important;
	}
	:global(.shader-node .h.glsl-tex) {
		border-color: #5fd4d4 !important;
		background: #12151a !important;
	}
	:global(.shader-node .h.glsl-unknown) {
		border-color: #6b7280 !important;
		background: #12151a !important;
	}
	:global(.shader-node .h.h-port-err) {
		box-shadow: 0 0 0 2px #e04040 !important;
		border-color: #ff6666 !important;
	}
	:global(.shader-node .h.h-connected.glsl-float) {
		background: #5ab88a !important;
		border-color: #7dd3a0 !important;
	}
	:global(.shader-node .h.h-connected.glsl-int) {
		background: #7eb85a !important;
		border-color: #9dd87a !important;
	}
	:global(.shader-node .h.h-connected.glsl-vec2) {
		background: #5a93d4 !important;
		border-color: #7eb8ff !important;
	}
	:global(.shader-node .h.h-connected.glsl-vec3) {
		background: #9a6fe0 !important;
		border-color: #c49dff !important;
	}
	:global(.shader-node .h.h-connected.glsl-vec4) {
		background: #e06fa8 !important;
		border-color: #ff9dd0 !important;
	}
	:global(.shader-node .h.h-connected.glsl-mat4) {
		background: #d4924a !important;
		border-color: #ffb870 !important;
	}
	:global(.shader-node .h.h-connected.glsl-tex) {
		background: #3db8b8 !important;
		border-color: #5fd4d4 !important;
	}
	:global(.shader-node .h.h-connected.glsl-unknown) {
		background: #6b7280 !important;
		border-color: #9ca3af !important;
	}
	.ty.glsl-float {
		background: rgba(125, 211, 160, 0.15);
		color: #9ee4bc;
	}
	.ty.glsl-int {
		background: rgba(157, 216, 122, 0.15);
		color: #b8e08f;
	}
	.ty.glsl-vec2 {
		background: rgba(126, 184, 255, 0.15);
		color: #a8ccff;
	}
	.ty.glsl-vec3 {
		background: rgba(196, 157, 255, 0.15);
		color: #d4b8ff;
	}
	.ty.glsl-vec4 {
		background: rgba(255, 157, 208, 0.15);
		color: #ffc2e0;
	}
	.ty.glsl-mat4 {
		background: rgba(255, 184, 112, 0.15);
		color: #ffd0a0;
	}
	.ty.glsl-tex {
		background: rgba(95, 212, 212, 0.15);
		color: #7ee8e8;
	}
	.ty.glsl-unknown {
		background: rgba(107, 114, 128, 0.2);
		color: #9ca3af;
	}
</style>
