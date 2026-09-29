<script lang="ts">
	import type { Connection, Edge, Node } from '@xyflow/svelte';
	import type {
		BufferId,
		CompileDebugOptions,
		GraphDocument,
		GraphMeta,
		GraphNode,
		NodeTypeDef,
		SceneSdfProbeVisualization,
		UniformManifestEntry,
	} from '@shadertoy/compiler';
	import { allBuiltinNodes, buildRegistry } from '@shadertoy/compiler';
	import ShaderNode from '$lib/ShaderNode.svelte';
	import ShaderEdge from '$lib/ShaderEdge.svelte';
	import EditorFrameNode from '$lib/EditorFrameNode.svelte';
	import { createRaymarchSdfFlow } from '$lib/presets/index.js';
	import {
		flowToDoc,
		sortFlowNodesParentsBeforeChildren,
		type FlowNodeAny,
		type ShaderNodeData,
	} from '$lib/flowDoc.js';
	import { packShaderNodesResolveOverlap } from '$lib/shaderNodeLayout.js';
	import { customTypesStore } from '$lib/customTypesStore.js';
	import { ensurePreviewPanelAndFocus } from '$lib/editor/editorDockApi.js';
	import { dockPreviewPanelPresent } from '$lib/editor/editorDockStores.js';
	import { passHasNodesInFlow } from '$lib/features/graphPage/flowHandlers.js';
	import { createPreviewCaptureHandlers } from '$lib/page/previewCapture.js';
	import {
		bumpBuiltinGalleryThumbTick,
		presetGalleryCacheKey,
		readWebGlCanvasToJpegDataUrl,
		setCachedPresetStillPersistent,
	} from '$lib/editor/presetGalleryRender.js';
	import { PRESET_LOADERS } from '$lib/presetRegistry.js';
	import type { PresetId } from '$lib/presetIds.js';
	import { buildGraphPageDockPushes, syncGraphPageDockStores } from '$lib/page/bindGraphPageDockStores.js';
	import { buildFilteredPaletteEntries } from '$lib/page/paletteModel.js';
	import { applyDiagnosticEdgeStyles } from '$lib/page/edgeDiagnostics.js';
	import {
		publishGraphFlowToStores,
		publishPreviewGpuError,
		subscribeDockPreviewPanelPresent,
		subscribeGraphFlowFromStores,
		subscribePreviewGpuErrorFromStore,
	} from '$lib/page/bindGraphPageStores.js';
	import type { ShadertoyRunner } from '@shadertoy/runner';
	import { edgeDebugLabelsStore } from '$lib/edgeDebugLabelsStore.js';
	import {
		buildCompileResultFromFlow,
		buildFrameIds,
		buildKnownNodeIds,
		buildMergedDiagnostics,
		buildNodeTypeById,
		buildPreviewLookatOrbitNodeId,
		buildReadiness,
		buildSelectedFlowNode,
		buildSelectedGroupNode,
		buildSelectedNodeGlsl,
		buildShaderGraphNodesById,
		buildUniformGroupsByNode,
		filterPassShaderNodes,
		firstImagePassIncomingEdgeId,
		flowImagePassHasSceneSdfSink,
	} from '$lib/page/graphPageDerived.js';
	import { createGraphPageActions } from '$lib/page/graphPageActions.js';
	import { buildGraphPageDockBuildInput } from '$lib/page/graphPageDockBridge.js';
	import GraphPageShell from '$lib/page/GraphPageShell.svelte';

	const nodeTypes = { shader: ShaderNode, group: EditorFrameNode };
	const edgeTypes = { shaderWire: ShaderEdge };
	const defaultEdgeOptions = {
		type: 'shaderWire',
		deletable: true,
		selectable: true,
		focusable: true,
		interactionWidth: 28,
	};

	const _initialFlow = structuredClone(createRaymarchSdfFlow());
	let nodes = $state<FlowNodeAny[]>(
		sortFlowNodesParentsBeforeChildren(
			packShaderNodesResolveOverlap(_initialFlow.nodes as FlowNodeAny[], []),
		),
	);
	let edges = $state<Edge[]>(
		_initialFlow.edges.map((e) => ({ ...e, type: 'shaderWire' as const })),
	);
	let graphMeta = $state<GraphDocument['meta']>({ name: 'graph' });
	let customNodeTypes = $state.raw<NodeTypeDef[]>([]);
	let activePass = $state<BufferId>('image');
	let selectedNodeId = $state<string | null>(null);
	let selectedNodeIds = $state<string[]>([]);
	let paletteQuery = $state('');
	let previewRunner = $state<ShadertoyRunner | null>(null);
	let snapGridOn = $state(true);
	let uniformUiTick = $state(0);
	let graphEpoch = $state(0);
	let quickAddOpen = $state(false);
	let previewCanvas = $state<HTMLCanvasElement | null>(null);
	let recordingWebm = $state(false);
	let previewPaused = $state(false);
	let previewTimeRestartKey = $state(0);
	let previewDockPanelPresent = $state(true);
	let gpuError = $state<string | null>(null);
	let focusProblemTick = $state(0);
	let focusProblemNodeId = $state<string | null>(null);
	let focusProblemEdgeTick = $state(0);
	let focusProblemEdgeId = $state<string | null>(null);

	let debugSceneProbeOn = $state(false);
	let debugSceneViz = $state<SceneSdfProbeVisualization>('distance_rgb');
	let debugProbePx = $state(0);
	let debugProbePy = $state(0);
	let debugProbePz = $state(0);
	let debugProbeScale = $state(1);
	/** XY half-extent for SDF probe sampling (matches manifest default). */
	let debugProbeSlice = $state(1.25);
	let debugProbeEps = $state(0.001);
	let debugWireProbeOn = $state(false);
	let debugHudRGBA = $state<string | null>(null);

	function isPresetId(s: string): s is PresetId {
		return Object.prototype.hasOwnProperty.call(PRESET_LOADERS, s);
	}

	let lastBuiltinGalleryStillEpoch = $state(-1);

	function previewAfterFrame(r: ShadertoyRunner) {
		const pid = graphMeta.editor?.builtinPresetGalleryId;
		if (!pid || !isPresetId(pid)) return;
		if (gpuError || !previewCompileResult) return;
		if (lastBuiltinGalleryStillEpoch === graphEpoch) return;
		const c = previewCanvas;
		if (!c) return;
		const url = readWebGlCanvasToJpegDataUrl(c, r.gl);
		if (!url) return;
		lastBuiltinGalleryStillEpoch = graphEpoch;
		const cacheKey = presetGalleryCacheKey(pid, customNodeTypes);
		void setCachedPresetStillPersistent(cacheKey, url);
		bumpBuiltinGalleryThumbTick();
	}

	const previewCapture = createPreviewCaptureHandlers({
		getCanvas: () => previewCanvas,
		getRunner: () => previewRunner,
		getGraphName: () => graphMeta.name ?? '',
		getRecording: () => recordingWebm,
		setRecording: (v) => {
			recordingWebm = v;
		},
		alertUser: (msg) => alert(msg),
	});

	$effect(() => {
		customTypesStore.set(customNodeTypes);
	});

	const compileResult = $derived.by(() => {
		void graphEpoch;
		void nodes;
		void edges;
		void graphMeta;
		void customNodeTypes;
		void debugSceneProbeOn;
		void debugSceneViz;
		void debugWireProbeOn;
		void selectedNodeId;
		const wireTgt = buildSelectedFlowNode(nodes, selectedNodeId)?.id;
		const dbg: CompileDebugOptions | undefined = (() => {
			if (debugSceneProbeOn) {
				return { sceneSdfProbe: { pass: 'image', visualization: debugSceneViz } };
			}
			if (debugWireProbeOn && wireTgt) {
				return { wireProbe: { pass: 'image', targetNodeId: wireTgt } };
			}
			return undefined;
		})();
		return buildCompileResultFromFlow(nodes, edges, graphMeta, customNodeTypes, dbg);
	});

	const previewImagePassInfo = $derived(compileResult.manifest.passes.find((p) => p.id === 'image'));
	const previewSupportsSceneSdfProbe = $derived(!!previewImagePassInfo?.supportsSceneSdfProbe);
	const previewSupportsWireProbe = $derived(!!previewImagePassInfo?.supportsWireProbe);

	const previewSampleDebugCenterPixel = $derived(
		(debugSceneProbeOn && previewSupportsSceneSdfProbe) ||
			(debugWireProbeOn && previewSupportsWireProbe),
	);

	function onPreviewDebugCenterPixel(c: [number, number, number, number]) {
		debugHudRGBA = `center ${c.map((x) => x.toFixed(4)).join(' ')}`;
	}

	$effect(() => {
		if (!previewSampleDebugCenterPixel) debugHudRGBA = null;
	});

	const previewCompileResult = $derived(
		compileResult.errors.length === 0 ? compileResult : null,
	);

	$effect(() => {
		const r = previewRunner;
		const img = compileResult.manifest.passes.find((p) => p.id === 'image');
		if (!r) return;
		void debugSceneProbeOn;
		void debugProbePx;
		void debugProbePy;
		void debugProbePz;
		void debugProbeScale;
		void debugProbeSlice;
		void debugProbeEps;
		void debugWireProbeOn;
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
	});

	$effect(() => {
		void debugWireProbeOn;
		void selectedNodeId;
		void nodes;
		void edges;
		void debugHudRGBA;
		const wireTgt = buildSelectedFlowNode(nodes, selectedNodeId)?.id;
		const img = previewCompileResult?.manifest.passes.find((p) => p.id === 'image');
		if (!debugWireProbeOn || !wireTgt || !img?.supportsWireProbe) {
			edgeDebugLabelsStore.set({});
			return;
		}
		const eid = firstImagePassIncomingEdgeId(nodes, edges, wireTgt);
		if (!eid || !debugHudRGBA) {
			edgeDebugLabelsStore.set({});
			return;
		}
		edgeDebugLabelsStore.set({ [eid]: debugHudRGBA });
	});

	const registry = $derived(buildRegistry(customNodeTypes));
	const allTypesFlat = $derived([...allBuiltinNodes, ...customNodeTypes]);
	const uniformPresetsList = $derived(graphMeta.editor?.uniformPresets ?? []);

	const filteredPalette = $derived(buildFilteredPaletteEntries(allTypesFlat, paletteQuery));

	const knownNodeIds = $derived(buildKnownNodeIds(nodes));
	const knownEdgeIds = $derived(new Set(edges.map((e) => e.id)));

	const mergedDiagnostics = $derived.by(() =>
		buildMergedDiagnostics(compileResult, gpuError, knownNodeIds),
	);

	$effect(() => {
		const { next, changed } = applyDiagnosticEdgeStyles(edges, mergedDiagnostics.errorEdgeIds);
		if (changed) edges = next;
	});

	function onProblemsFocusNode(id: string) {
		focusProblemNodeId = id;
		focusProblemEdgeId = null;
		focusProblemTick++;
	}

	function onProblemsFocusEdge(id: string) {
		focusProblemEdgeId = id;
		focusProblemNodeId = null;
		focusProblemEdgeTick++;
	}

	const passNodes = $derived(filterPassShaderNodes(nodes, activePass));

	function passHasNodes(pass: BufferId): boolean {
		return passHasNodesInFlow(nodes, pass);
	}

	const readiness = $derived(
		buildReadiness(passNodes, edges, compileResult.errors.length),
	);

	const previewLookatOrbitNodeId = $derived(
		buildPreviewLookatOrbitNodeId(nodes, edges, activePass),
	);

	const nodeTypeById = $derived(buildNodeTypeById(nodes));

	const shaderGraphNodesById = $derived(buildShaderGraphNodesById(nodes));

	const selectedGroupNode = $derived(buildSelectedGroupNode(nodes, selectedNodeIds));

	const frameIds = $derived(buildFrameIds(nodes));

	const uniformGroupsByNode = $derived.by(() => {
		graphEpoch;
		return buildUniformGroupsByNode(compileResult);
	});

	const selectedNodeGlsl = $derived.by(() => {
		graphEpoch;
		return buildSelectedNodeGlsl(compileResult, activePass, selectedNodeId);
	});

	const selectedFlowNode = $derived.by(() => buildSelectedFlowNode(nodes, selectedNodeId));

	const previewFlowImageHasSceneSdf = $derived(flowImagePassHasSceneSdfSink(nodes));

	const selectedDef = $derived(
		selectedFlowNode ? registry.get(selectedFlowNode.data.graphNode.typeId) : undefined,
	);

	const graphActions = createGraphPageActions({
		getNodes: () => nodes,
		setNodes: (v) => {
			nodes = v;
		},
		getEdges: () => edges,
		setEdges: (v) => {
			edges = v;
		},
		getGraphMeta: () => graphMeta,
		setGraphMeta: (v) => {
			graphMeta = v;
		},
		getCustomNodeTypes: () => customNodeTypes,
		setCustomNodeTypes: (v) => {
			customNodeTypes = v;
		},
		bumpGraphEpoch: () => {
			graphEpoch++;
		},
		getActivePass: () => activePass,
		getSelectedNodeId: () => selectedNodeId,
		setSelectedNodeId: (v) => {
			selectedNodeId = v;
		},
		getSelectedNodeIds: () => selectedNodeIds,
		setSelectedNodeIds: (v) => {
			selectedNodeIds = v;
		},
		getCompileResult: () => compileResult,
		getPreviewCompileResult: () => previewCompileResult,
		getPreviewRunner: () => previewRunner,
		setPreviewRunner: (r) => {
			previewRunner = r;
		},
		getUniformUiTick: () => uniformUiTick,
		bumpUniformUiTick: () => {
			uniformUiTick++;
		},
		getGraphEpoch: () => graphEpoch,
		getUniformPresetsList: () => uniformPresetsList,
		setPreviewPaused: (v) => {
			previewPaused = v;
		},
		bumpPreviewTimeRestartKey: () => {
			previewTimeRestartKey++;
		},
		getRegistry: () => registry,
		getShaderGraphNodesById: () => shaderGraphNodesById,
	});

	$effect(() => {
		publishGraphFlowToStores(nodes, edges);
	});

	$effect(() => {
		return subscribeGraphFlowFromStores({
			getNodes: () => nodes,
			setNodes: (v) => {
				nodes = v;
			},
			getEdges: () => edges,
			setEdges: (v) => {
				edges = v;
			},
		});
	});

	$effect(() => {
		publishPreviewGpuError(gpuError);
	});

	$effect(() => {
		return subscribePreviewGpuErrorFromStore({
			getGpuError: () => gpuError,
			setGpuError: (v) => {
				gpuError = v;
			},
		});
	});

	$effect(() => {
		return subscribeDockPreviewPanelPresent((v) => {
			previewDockPanelPresent = v;
		});
	});

	$effect(() => {
		syncGraphPageDockStores(
			buildGraphPageDockPushes(
				buildGraphPageDockBuildInput({
					nodeTypes,
					edgeTypes,
					defaultEdgeOptions,
					snapGridOn,
					actions: graphActions,
					mergedDiagnostics,
					focusProblemTick,
					focusProblemNodeId,
					focusProblemEdgeTick,
					focusProblemEdgeId,
					filteredPalette,
					paletteQuery,
					setPaletteQuery: (q: string) => {
						paletteQuery = q;
					},
					graphMeta,
					patchGraphMeta: (fn: (d: GraphMeta) => void) => {
						const d = structuredClone(graphMeta);
						fn(d);
						graphMeta = d;
						graphEpoch++;
					},
					activePass,
					setActivePass: (pass: BufferId) => {
						activePass = pass;
					},
					passHasNodes,
					onToggleSnapGrid: () => {
						snapGridOn = !snapGridOn;
					},
					readiness,
					previewDockPanelPresent,
					onOpenPreview: ensurePreviewPanelAndFocus,
					previewCompileResult,
					compileResult,
					gpuError,
					selectedFlowNode,
					selectedDef,
					selectedNodeGlsl,
					selectedGroupNode,
					frameIds,
					uniformGroupsByNode,
					nodeTypeById,
					previewRunner,
					uniformPresetsList,
					registry,
					shaderGraphNodesById,
					onProblemsFocusNode,
					onProblemsFocusEdge,
					knownEdgeIds,
					knownNodeIds,
					graphEpoch,
					previewLookatOrbitNodeId,
					bumpUniformUiTick: () => {
						uniformUiTick++;
					},
					setPreviewRunner: (r: ShadertoyRunner | null) => {
						previewRunner = r;
					},
					setPreviewCanvas: (c: HTMLCanvasElement | null) => {
						previewCanvas = c;
					},
					snapshotPreviewPng: previewCapture.snapshotPng,
					toggleWebmRecord: previewCapture.toggleWebm,
					recordingWebm,
					previewPaused,
					onTogglePreviewPause: () => {
						previewPaused = !previewPaused;
					},
					previewTimeRestartKey,
					onPreviewRestartTime: () => {
						previewTimeRestartKey++;
					},
					previewAfterFrame,
					getCurrentDoc: () => flowToDoc(nodes, edges, graphMeta, customNodeTypes),
					customNodeTypes,
					previewSupportsSceneSdfProbe,
					previewSupportsWireProbe,
					previewFlowImageHasSceneSdf,
					selectedNodeIdForGpuDebug: selectedFlowNode?.id ?? null,
					debugSceneProbeOn,
					onDebugSceneProbeOn: (v: boolean) => {
						debugSceneProbeOn = v;
					},
					debugSceneViz,
					onDebugSceneViz: (v: SceneSdfProbeVisualization) => {
						debugSceneViz = v;
					},
					debugProbePx,
					debugProbePy,
					debugProbePz,
					onDebugProbeP: (axis: 0 | 1 | 2, v: number) => {
						if (axis === 0) debugProbePx = v;
						else if (axis === 1) debugProbePy = v;
						else debugProbePz = v;
					},
					debugProbeScale,
					onDebugProbeScale: (v: number) => {
						debugProbeScale = v;
					},
					debugProbeSlice,
					onDebugProbeSlice: (v: number) => {
						debugProbeSlice = v;
					},
					debugProbeEps,
					onDebugProbeEps: (v: number) => {
						debugProbeEps = v;
					},
					debugWireProbeOn,
					onDebugWireProbeOn: (v: boolean) => {
						debugWireProbeOn = v;
					},
					debugHudText: debugHudRGBA,
					previewSampleDebugCenterPixel,
					onPreviewDebugCenterPixel,
				}),
			),
		);
	});
</script>

<GraphPageShell bind:quickAddOpen {allTypesFlat} actions={graphActions} />
