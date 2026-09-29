<script lang="ts">
	import type { BufferId, CompileResult, GraphMeta, SceneSdfProbeVisualization } from '@shadertoy/compiler';
	import type { ShadertoyRunner } from '@shadertoy/runner';
	import ShaderPreview from '$lib/ShaderPreview.svelte';
	import EditorMultipassBar from '$lib/editor/EditorMultipassBar.svelte';
	import { previewGpuErrorStore } from '$lib/editor/graphSync';

	let {
		graphMeta = { name: 'graph' } as GraphMeta,
		activePass,
		onActivePassChange,
		passHasNodes,
		previewCompileResult,
		compileResult,
		reloadKey,
		previewPaused,
		onTogglePreviewPause,
		previewTimeRestartKey,
		onPreviewRestartTime,
		lookatOrbitNodeId = null,
		onUniformTweak,
		onRunnerReady,
		onCanvasReady,
		onSnapshotPng,
		onToggleWebmRecord,
		recordingWebm,
		beforeFrame,
		afterFrame,
		flowImageHasSceneSdf = false,
		selectedNodeIdForDebug = null as string | null,
		supportsSceneSdfProbe = false,
		supportsWireProbe = false,
		debugSceneProbeOn = false,
		onDebugSceneProbeOn,
		debugSceneViz = 'distance_rgb' as SceneSdfProbeVisualization,
		onDebugSceneViz,
		debugProbePx = 0,
		debugProbePy = 0,
		debugProbePz = 0,
		onDebugProbeP,
		debugProbeSlice = 1.25,
		onDebugProbeSlice,
		debugProbeScale = 1,
		onDebugProbeScale,
		debugProbeEps = 0.001,
		onDebugProbeEps,
		debugWireProbeOn = false,
		onDebugWireProbeOn,
		debugHudText = null as string | null,
		sampleDebugCenterPixel = false,
		onDebugCenterPixel = undefined as
			| ((rgba: [number, number, number, number]) => void)
			| undefined,
	}: {
		graphMeta?: GraphMeta;
		activePass: BufferId;
		onActivePassChange: (pass: BufferId) => void;
		passHasNodes: (pass: BufferId) => boolean;
		previewCompileResult: CompileResult | null;
		compileResult: CompileResult;
		reloadKey: number;
		previewPaused: boolean;
		onTogglePreviewPause: () => void;
		previewTimeRestartKey: number;
		onPreviewRestartTime: () => void;
		lookatOrbitNodeId?: string | null;
		onUniformTweak?: () => void;
		onRunnerReady: (r: ShadertoyRunner | null) => void;
		onCanvasReady?: (c: HTMLCanvasElement | null) => void;
		onSnapshotPng: () => void;
		onToggleWebmRecord: () => void;
		recordingWebm: boolean;
		beforeFrame?: (r: ShadertoyRunner) => void;
		afterFrame?: (r: ShadertoyRunner) => void;
		/** Graph contains `scene_sdf_sink` on image — show SDF probe UI even before first debug compile. */
		flowImageHasSceneSdf?: boolean;
		/** Selected shader node id (for wire probe enable state). */
		selectedNodeIdForDebug?: string | null;
		supportsSceneSdfProbe?: boolean;
		supportsWireProbe?: boolean;
		debugSceneProbeOn?: boolean;
		onDebugSceneProbeOn?: (v: boolean) => void;
		debugSceneViz?: SceneSdfProbeVisualization;
		onDebugSceneViz?: (v: SceneSdfProbeVisualization) => void;
		debugProbePx?: number;
		debugProbePy?: number;
		debugProbePz?: number;
		onDebugProbeP?: (axis: 0 | 1 | 2, v: number) => void;
		/** XY half-extent in scene space (0 = single point). */
		debugProbeSlice?: number;
		onDebugProbeSlice?: (v: number) => void;
		debugProbeScale?: number;
		onDebugProbeScale?: (v: number) => void;
		debugProbeEps?: number;
		onDebugProbeEps?: (v: number) => void;
		debugWireProbeOn?: boolean;
		onDebugWireProbeOn?: (v: boolean) => void;
		debugHudText?: string | null;
		sampleDebugCenterPixel?: boolean;
		onDebugCenterPixel?: (rgba: [number, number, number, number]) => void;
	} = $props();

	let gpuError = $state<string | null>(null);

	$effect(() => {
		gpuError = $previewGpuErrorStore;
	});

	$effect(() => {
		previewGpuErrorStore.set(gpuError);
	});

	const nErr = $derived(compileResult.errors.length + (gpuError ? 1 : 0));
	const orbitHint = $derived(
		Boolean(lookatOrbitNodeId) && compileResult.errors.length === 0 && previewCompileResult,
	);
	const canShowSdfDebug = $derived(flowImageHasSceneSdf || supportsSceneSdfProbe);
	/** Any successful image preview: show tools (SDF block only when this graph has a scene sink). */
	const gpuDebugPanel = $derived(
		Boolean(previewCompileResult) && compileResult.errors.length === 0,
	);
</script>

<div class="preview-dock">
	<div class="toolbar">
		<span class="title">
			Preview {#if nErr > 0}<span class="badge" title="Compile errors">{nErr}</span>{/if}
			{#if previewCompileResult}
				<span class="preview-subhint" title="Strip between toolbar and canvas when compile succeeds"
					>GPU debug</span
				>
			{/if}
			{#if orbitHint}<span class="orbit-hint" title="Look-at camera + raymarch scene">Drag to orbit</span>{/if}
		</span>
		<div class="actions">
			<button
				type="button"
				class="btn"
				class:pause={true}
				class:on={previewPaused}
				onclick={onTogglePreviewPause}
				title={previewPaused ? 'Resume animation (iTime advances)' : 'Pause animation (freeze iTime)'}
			>
				{previewPaused ? 'Resume' : 'Pause'}
			</button>
			<button
				type="button"
				class="btn"
				onclick={onPreviewRestartTime}
				disabled={compileResult.errors.length > 0}
				title="Reset iTime to 0 and redraw (works while paused)"
			>
				Restart
			</button>
			<button type="button" class="btn" onclick={onSnapshotPng} title="PNG snapshot">PNG</button>
			<button
				type="button"
				class="btn"
				class:rec={recordingWebm}
				onclick={onToggleWebmRecord}
				title="WebM record"
			>
				{recordingWebm ? 'Stop' : 'WebM'}
			</button>
		</div>
	</div>
	{#if gpuDebugPanel}
		<div class="gpu-debug-bar" role="region" aria-label="GPU debug">
			<span class="gpu-debug-title">GPU debug</span>
			{#if canShowSdfDebug}
				<label class="dbg-row">
					<input
						type="checkbox"
						checked={debugSceneProbeOn}
						onchange={(e) => onDebugSceneProbeOn?.(e.currentTarget.checked)}
					/>
					<span>SDF probe</span>
				</label>
				<select
					class="dbg-select"
					value={debugSceneViz}
					onchange={(e) =>
						onDebugSceneViz?.(e.currentTarget.value as SceneSdfProbeVisualization)}
					disabled={!debugSceneProbeOn}
					title="Probe visualization"
				>
					<option value="distance_rgb">Distance (grayscale)</option>
					<option value="distance_nan_flags">Distance + NaN/inf flags</option>
					<option value="gradient_mag">Gradient magnitude</option>
				</select>
				<span class="dbg-coord" title="Probe position in scene space">
					<label
						>Px<input
							type="number"
							step="any"
							class="dbg-num"
							value={debugProbePx}
							disabled={!debugSceneProbeOn}
							onchange={(e) =>
								onDebugProbeP?.(0, Number.parseFloat(e.currentTarget.value) || 0)}
						/></label
					>
					<label
						>Py<input
							type="number"
							step="any"
							class="dbg-num"
							value={debugProbePy}
							disabled={!debugSceneProbeOn}
							onchange={(e) =>
								onDebugProbeP?.(1, Number.parseFloat(e.currentTarget.value) || 0)}
						/></label
					>
					<label
						>Pz<input
							type="number"
							step="any"
							class="dbg-num"
							value={debugProbePz}
							disabled={!debugSceneProbeOn}
							onchange={(e) =>
								onDebugProbeP?.(2, Number.parseFloat(e.currentTarget.value) || 0)}
						/></label
					>
				</span>
				<label class="dbg-row compact" title="XY half-extent in scene units (0 = single point)">
					Slice
					<input
						type="number"
						step="any"
						class="dbg-num sm"
						value={debugProbeSlice}
						disabled={!debugSceneProbeOn}
						onchange={(e) =>
							onDebugProbeSlice?.(Number.parseFloat(e.currentTarget.value) || 0)}
					/>
				</label>
				<label class="dbg-row compact" title="Scale for distance / gradient mapping">
					Scale
					<input
						type="number"
						step="any"
						class="dbg-num sm"
						value={debugProbeScale}
						disabled={!debugSceneProbeOn}
						onchange={(e) =>
							onDebugProbeScale?.(Number.parseFloat(e.currentTarget.value) || 0)}
					/>
				</label>
				<label class="dbg-row compact" title="Finite difference step for gradient mode">
					Eps
					<input
						type="number"
						step="any"
						class="dbg-num sm"
						value={debugProbeEps}
						disabled={!debugSceneProbeOn}
						onchange={(e) => onDebugProbeEps?.(Number.parseFloat(e.currentTarget.value) || 0)}
					/>
				</label>
			{/if}
			{#if !debugSceneProbeOn}
				<label class="dbg-row">
					<input
						type="checkbox"
						checked={debugWireProbeOn}
						disabled={!selectedNodeIdForDebug}
						onchange={(e) => onDebugWireProbeOn?.(e.currentTarget.checked)}
						title={selectedNodeIdForDebug
							? 'Overwrites preview with the first incoming wire to the selected node'
							: 'Select a shader node on the graph first'}
					/>
					<span>Wire probe</span>
				</label>
				{#if supportsWireProbe}
					<span class="dbg-footnote"
						>Uses the best incoming wire (color, ray dir, origin, …); center-pixel RGBA in HUD / on the
						wire.</span
					>
				{:else if !selectedNodeIdForDebug}
					<span class="dbg-footnote">Select a node, then enable (shader recompiles with a tail tap).</span>
				{/if}
			{/if}
			{#if debugHudText}
				<span class="dbg-hud" title="Center pixel after image pass">{debugHudText}</span>
			{/if}
			{#if debugSceneProbeOn}
				<span class="dbg-hint">Preview shows probe output, not the final shade.</span>
			{/if}
		</div>
	{/if}
	<div class="body">
		<ShaderPreview
			bind:gpuError
			{graphMeta}
			compileResult={previewCompileResult}
			{reloadKey}
			paused={previewPaused}
			timeRestartKey={previewTimeRestartKey}
			lookatOrbitNodeId={lookatOrbitNodeId ?? null}
			{onUniformTweak}
			{onRunnerReady}
			{onCanvasReady}
			{beforeFrame}
			{afterFrame}
			sampleDebugCenterPixel={sampleDebugCenterPixel}
			onDebugCenterPixel={onDebugCenterPixel}
			applyGpuDebugAfterLoad={(r) => {
				const c = previewCompileResult;
				if (!c) return;
				const img = c.manifest.passes.find((p) => p.id === 'image');
				if (img?.supportsSceneSdfProbe) {
					r.setDebugSceneProbe(
						debugSceneProbeOn,
						[debugProbePx, debugProbePy, debugProbePz],
						debugProbeScale,
						debugProbeEps,
						debugProbeSlice,
					);
				} else {
					r.setDebugSceneProbe(false);
				}
				if (img?.supportsWireProbe) {
					r.setDebugWireProbe(debugWireProbeOn);
				} else {
					r.setDebugWireProbe(false);
				}
			}}
		/>
	</div>
	<div class="pass-footer">
		<EditorMultipassBar {activePass} {onActivePassChange} {compileResult} {passHasNodes} />
	</div>
</div>

<style>
	.preview-dock {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		background: #12151c;
	}
	.toolbar {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 6px 8px;
		background: #1a1f28;
		border-bottom: 1px solid #2a3140;
	}
	.title {
		font-size: 11px;
		font-weight: 600;
		color: #e4e7ec;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.orbit-hint {
		font-size: 10px;
		font-weight: 500;
		color: #8b93a5;
		opacity: 0.9;
	}
	.preview-subhint {
		font-size: 9px;
		font-weight: 600;
		color: #7eb8ff;
		opacity: 0.95;
	}
	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		padding: 0 6px;
		font-size: 10px;
		font-weight: 700;
		color: #ffb4b4;
		background: rgba(120, 40, 40, 0.45);
		border-radius: 999px;
	}
	.actions {
		display: flex;
		/* Prevent toolbar reflow changing preview canvas height (which triggers a resize + iFrame reset). */
		flex-wrap: nowrap;
		gap: 6px;
		overflow-x: auto;
		overflow-y: hidden;
	}
	.btn {
		background: #252a33;
		border: 1px solid #3a4150;
		color: #e8eaed;
		border-radius: 6px;
		padding: 4px 8px;
		font-size: 11px;
		cursor: pointer;
	}
	/* Stabilize button width so Pause/Resume doesn't cause layout jumps. */
	.btn.pause {
		min-width: 70px;
	}
	.btn:hover {
		background: #2e3440;
	}
	.btn.rec {
		border-color: #a04444;
		background: rgba(120, 40, 40, 0.35);
	}
	.btn.on {
		border-color: #4a6a9a;
		background: rgba(50, 80, 130, 0.35);
	}
	.pass-footer {
		flex-shrink: 0;
		border-top: 1px solid #2a3140;
	}
	.pass-footer :global(.multipass-bar) {
		border-bottom: none;
	}
	.gpu-debug-bar {
		flex-shrink: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 10px;
		padding: 6px 8px;
		background: #151a22;
		border-bottom: 1px solid #2a3140;
		font-size: 10px;
		color: #c5cad6;
	}
	.gpu-debug-title {
		font-weight: 700;
		color: #9ecfff;
		margin-right: 4px;
	}
	.dbg-row {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		white-space: nowrap;
	}
	.dbg-row.compact {
		gap: 3px;
	}
	.dbg-select {
		max-width: 200px;
		font-size: 10px;
		padding: 2px 4px;
		border-radius: 4px;
		background: #1e2430;
		border: 1px solid #3a4150;
		color: #e4e7ec;
	}
	.dbg-coord {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.dbg-num {
		width: 4.2rem;
		font-size: 10px;
		padding: 2px 4px;
		margin-left: 2px;
		border-radius: 4px;
		background: #1e2430;
		border: 1px solid #3a4150;
		color: #e4e7ec;
	}
	.dbg-num.sm {
		width: 3.5rem;
	}
	.dbg-hud {
		font-family: ui-monospace, monospace;
		color: #9ecfff;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dbg-hint {
		flex-basis: 100%;
		color: #8b93a5;
		font-style: italic;
	}
	.dbg-footnote {
		flex-basis: 100%;
		font-size: 9px;
		color: #6d7588;
		line-height: 1.3;
	}
	.body {
		flex: 1;
		min-height: 0;
		padding: 8px;
		display: flex;
		flex-direction: column;
	}
	.body :global(.wrap) {
		min-height: 0;
		flex: 1;
	}
</style>
