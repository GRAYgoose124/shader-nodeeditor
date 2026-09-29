<script lang="ts">
	import { untrack } from 'svelte';
	import { addEdge, type Connection, type Edge, type Node } from '@xyflow/svelte';
	import type {
		BufferId,
		GraphDocument,
		GraphNode,
		NodeTypeDef,
		ParamAnimationSpec,
		UniformManifestEntry,
	} from '@shadertoy/compiler';
	import {
		allBuiltinNodes,
		buildRegistry,
		buildBakedSceneSdfCustomType,
		compileGraph,
		extractNodeGlslBlock,
		isParamAnimatable,
		isParamVisible,
		stringifyGraphDocument,
		uniformName,
	} from '@shadertoy/compiler';
	import type { ShadertoyRunner } from '@shadertoy/runner';
	import ShaderNode from '$lib/ShaderNode.svelte';
	import ShaderEdge from '$lib/ShaderEdge.svelte';
	import EditorFrameNode from '$lib/EditorFrameNode.svelte';
	import { createRaymarchSdfFlow } from '$lib/presets/index.js';
	import { PRESET_LOADERS } from '$lib/presetRegistry.js';
	import type { PresetId } from '$lib/presetIds.js';
	import {
		createGraphNode,
		flowToDoc,
		sortFlowNodesParentsBeforeChildren,
		toFlowNode,
		type FlowNodeAny,
		type FrameNodeData,
		type ShaderNodeData,
	} from '$lib/flowDoc.js';
	import { packShaderNodesResolveOverlap } from '$lib/shaderNodeLayout.js';
	import {
		boundaryInputPorts,
		boundaryOutputPorts,
		collapsedFrameChromeHeight,
	} from '$lib/frameCollapse.js';
	import { customTypesStore } from '$lib/customTypesStore.js';
	import EditorHeaderBar from '$lib/editor/EditorHeaderBar.svelte';
	import PresetLibraryModal from '$lib/editor/PresetLibraryModal.svelte';
	import EditorMultipassBar from '$lib/editor/EditorMultipassBar.svelte';
	import NodeQuickAddModal from '$lib/editor/NodeQuickAddModal.svelte';
	import EditorDockShell from '$lib/editor/EditorDockShell.svelte';
	import {
		ensurePreviewPanelAndFocus,
		restoreClosedDockPanels,
	} from '$lib/editor/editorDockApi.js';
	import { dockPreviewPanelPresent } from '$lib/editor/editorDockStores.js';
	import { findLookatOrbitNodeId } from '$lib/lookatOrbit.js';
	import {
		gpuErrorRelatedNodeIds,
		mergeDiagnostics,
		parseValidateAnchors,
	} from '$lib/compileDiagnostics.js';
	import { isValidShaderConnection } from '$lib/page/flowConnections.js';
	import {
		alignSelectedShaderNodes,
		duplicateSelectedShaderNodes,
		groupSelectedShaderNodes as groupSelectedShaderNodesFlow,
		snapSelectionPositionsToGrid as snapShaderSelectionToGrid,
	} from '$lib/page/flowOps.js';
	import {
		buildSubgraphClipboardV1,
		mergeSubgraphV1IntoFlow,
		parseSubgraphClipboardV1,
		writeSubgraphToClipboard,
	} from '$lib/page/subgraphClipboard.js';
	import {
		readUniformScalar as readUniformScalarValue,
		resetUniformToDefault,
		setUniformScalarValue,
	} from '$lib/page/uniformHelpers.js';
	import {
		applyUniformPresetToRunner,
		collectScalarUniformValues,
		graphMetaWithAppendedUniformPreset,
		graphMetaWithoutUniformPresetAt,
	} from '$lib/page/uniformPresets.js';
	import { handleGraphPageKeydown } from '$lib/page/graphShortcuts.js';
	import { sampleParamAnimationValue } from '$lib/paramAnimationRuntime.js';
	import { boundsFromParamDef, readParamNumber } from '$lib/editor/paramControls.js';
	import { buildGraphPageDockPushes, syncGraphPageDockStores } from '$lib/page/bindGraphPageDockStores.js';
	import { buildFilteredPaletteEntries } from '$lib/page/paletteModel.js';
	import { computePassReadiness } from '$lib/page/passReadiness.js';
	import { applyDiagnosticEdgeStyles } from '$lib/page/edgeDiagnostics.js';
	import {
		exportGraphJson,
		exportLivePageOrAlert,
		exportSubgraphSelectionOrAlert,
		flowStateFromPresetId,
		parseImportGraphFromText,
		parseImportNodeDefsFromText,
		parseSubgraphMergeFromText,
	} from '$lib/page/graphFileIo.js';
	import { flowStateFromGraphDocument } from '$lib/page/graphDocumentImport.js';
	import { createPreviewCaptureHandlers } from '$lib/page/previewCapture.js';
	import {
		publishGraphFlowToStores,
		publishPreviewGpuError,
		subscribeDockPreviewPanelPresent,
		subscribeGraphFlowFromStores,
		subscribePreviewGpuErrorFromStore,
	} from '$lib/page/bindGraphPageStores.js';
	import type { GraphEditorBoundaryPort } from '@shadertoy/compiler';

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
	let presetLibraryOpen = $state(false);
	let previewCanvas = $state<HTMLCanvasElement | null>(null);
	let recordingWebm = $state(false);
	let previewPaused = $state(false);
	let previewTimeRestartKey = $state(0);
	let previewDockPanelPresent = $state(true);
	let gpuError = $state<string | null>(null);
	let focusProblemTick = $state(0);
	let focusProblemNodeId = $state<string | null>(null);

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

	// Only recompile when `graphEpoch` bumps (topology, params, meta relevant to GLSL, etc.).
	// XYFlow mutates `nodes` every frame while dragging; those updates must not track here or compile runs continuously.
	const compileResult = $derived.by(() => {
		graphEpoch;
		return untrack(() => {
			const doc = flowToDoc(nodes, edges, graphMeta, customNodeTypes);
			void stringifyGraphDocument(doc);
			return compileGraph(doc);
		});
	});

	const previewCompileResult = $derived(
		compileResult.errors.length === 0 ? compileResult : null,
	);

	const registry = $derived(buildRegistry(customNodeTypes));
	const allTypesFlat = $derived([...allBuiltinNodes, ...customNodeTypes]);
	const uniformPresetsList = $derived(graphMeta.editor?.uniformPresets ?? []);

	const filteredPalette = $derived(buildFilteredPaletteEntries(allTypesFlat, paletteQuery));

	const knownNodeIds = $derived(new Set(nodes.map((n) => n.id)));

	const mergedDiagnostics = $derived.by(() => {
		const va = parseValidateAnchors(compileResult.errors, knownNodeIds);
		const gpuIds = gpuErrorRelatedNodeIds(
			gpuError,
			compileResult.errors.length === 0 ? compileResult : null,
		);
		return mergeDiagnostics(va, gpuIds);
	});

	$effect(() => {
		const { next, changed } = applyDiagnosticEdgeStyles(edges, mergedDiagnostics.errorEdgeIds);
		if (changed) edges = next;
	});

	function onProblemsFocusNode(id: string) {
		focusProblemNodeId = id;
		focusProblemTick++;
	}

	const passNodes = $derived(
		nodes.filter(
			(n): n is Node<ShaderNodeData, 'shader'> =>
				n.type === 'shader' && n.data.graphNode.pass === activePass,
		),
	);

	function passHasNodes(pass: BufferId): boolean {
		return nodes.some((n) => n.type === 'shader' && n.data.graphNode.pass === pass);
	}

	const readiness = $derived(
		computePassReadiness(
			passNodes.map((n) => n.data.graphNode),
			edges,
			compileResult.errors.length,
		),
	);

	const previewLookatOrbitNodeId = $derived(findLookatOrbitNodeId(nodes, edges, activePass));

	const nodeTypeById = $derived.by(() => {
		const m = new Map<string, string>();
		for (const n of nodes) {
			if (n.type === 'shader') m.set(n.id, n.data.graphNode.typeId);
		}
		return m;
	});

	const shaderGraphNodesById = $derived.by(() => {
		const m = new Map<string, GraphNode>();
		for (const n of nodes) {
			if (n.type === 'shader') m.set(n.id, n.data.graphNode);
		}
		return m;
	});

	const selectedGroupNode = $derived.by((): Node<FrameNodeData, 'group'> | undefined => {
		const id = selectedNodeIds.length === 1 ? selectedNodeIds[0] : undefined;
		if (!id) return undefined;
		const n = nodes.find((x) => x.id === id && x.type === 'group');
		return n as Node<FrameNodeData, 'group'> | undefined;
	});

	const frameIds = $derived(
		nodes.filter((n) => n.type === 'group').map((n) => n.id),
	);

	const uniformGroupsByNode = $derived.by(() => {
		graphEpoch;
		const cr = compileResult;
		if (!cr || cr.errors.length > 0) return [];
		const m = new Map<string, { pass: BufferId; uniforms: UniformManifestEntry[] }>();
		for (const pp of cr.manifest.passes) {
			for (const u of pp.uniforms) {
				const cur = m.get(u.nodeId) ?? { pass: pp.id, uniforms: [] };
				cur.uniforms.push(u);
				m.set(u.nodeId, cur);
			}
		}
		return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	});

	const selectedNodeGlsl = $derived.by(() => {
		graphEpoch;
		if (!selectedNodeId || compileResult.errors.length > 0) return null;
		const frag = compileResult.passes[activePass]?.fragmentSource;
		if (!frag) return null;
		return extractNodeGlslBlock(frag, selectedNodeId);
	});
	const selectedFlowNode = $derived.by((): Node<ShaderNodeData, 'shader'> | null => {
		const n = nodes.find((x) => x.id === selectedNodeId);
		if (!n || n.type !== 'shader') return null;
		return n;
	});
	const selectedDef = $derived(
		selectedFlowNode ? registry.get(selectedFlowNode.data.graphNode.typeId) : undefined,
	);

	function isValidConnection(c: Connection | Edge): boolean {
		return isValidShaderConnection(c, nodes, registry);
	}

	function onConnect(c: Connection) {
		const tgt = c.target ?? '';
		const th = c.targetHandle ?? '';
		// One wire per target input port; otherwise codegen last-wins + motif extraction can reference undeclared g_* (e.g. intersect d on sink).
		const withoutSamePort = edges.filter(
			(e) => !(e.type === 'shaderWire' && e.target === tgt && (e.targetHandle ?? '') === th),
		);
		edges = addEdge({ ...c, type: 'shaderWire' }, withoutSamePort);
		graphEpoch++;
	}

	function onBeforeReconnect(newEdge: Edge, _oldEdge: Edge): Edge | false {
		const conn: Connection = {
			source: newEdge.source,
			target: newEdge.target,
			sourceHandle: newEdge.sourceHandle ?? null,
			targetHandle: newEdge.targetHandle ?? null,
		};
		if (!isValidConnection(conn)) return false;
		return newEdge;
	}

	function onReconnect(_oldEdge: Edge, _newConnection: Connection) {
		graphEpoch++;
	}

	function onFlowDelete(_p: { nodes: Node[]; edges: Edge[] }) {
		graphEpoch++;
	}

	function onSelectionChange({ nodes: sn }: { nodes: Node[] }) {
		selectedNodeIds = sn.map((n) => n.id);
		selectedNodeId = sn.length === 1 ? sn[0]!.id : null;
	}

	function duplicateSelectedNodes() {
		nodes = duplicateSelectedShaderNodes(nodes, selectedNodeIds);
		graphEpoch++;
	}

	function groupSelectedShaderNodes() {
		const next = groupSelectedShaderNodesFlow(nodes, selectedNodeIds);
		if (next !== nodes) {
			nodes = next;
			graphEpoch++;
		}
	}

	function snapSelectionPositionsToGrid() {
		nodes = snapShaderSelectionToGrid(nodes, selectedNodeIds);
		graphEpoch++;
	}

	function alignSelectionNodes() {
		nodes = alignSelectedShaderNodes(nodes, edges, selectedNodeIds, customNodeTypes);
		graphEpoch++;
	}

	function bakeSceneSdfToCustomNode() {
		if (compileResult.errors.length > 0) {
			alert('Fix compile errors first.');
			return;
		}
		const frag = compileResult.passes[activePass]?.fragmentSource;
		if (!frag) {
			alert('No compiled shader for this pass.');
			return;
		}
		const def = buildBakedSceneSdfCustomType(frag, activePass, graphMeta.name ?? 'Baked');
		if (!def) {
			alert('No scene SDF in this pass (need scene_sdf_* from raymarch setup).');
			return;
		}
		customNodeTypes = [...customNodeTypes, def];
		graphEpoch++;
		alert("Added custom node " + def.label + " (" + def.id + "). Find it under Custom in the palette.");
	}

	function addFrame() {
		const w = 400;
		const h = 280;
		const id = crypto.randomUUID();
		const frame: FlowNodeAny = {
			id,
			type: 'group',
			position: { x: 64 + Math.random() * 40, y: 64 + Math.random() * 40 },
			draggable: true,
			dragHandle: '.frame-drag-handle',
			data: { label: 'Frame', collapsed: false, width: w, height: h },
			style: `width: ${w}px; height: ${h}px`,
		};
		nodes = sortFlowNodesParentsBeforeChildren([frame, ...nodes]);
		graphEpoch++;
	}

	function toggleFrameCollapse(frameId: string) {
		const frame = nodes.find((n) => n.id === frameId && n.type === 'group') as
			| Node<FrameNodeData, 'group'>
			| undefined;
		if (!frame) return;
		const d = frame.data;
		const nextCollapsed = !d.collapsed;
		const fullH = d.height;
		const w = d.width;
		const nextH = nextCollapsed ? collapsedFrameChromeHeight(frameId, nodes, edges) : fullH;
		const boundaryPorts: GraphEditorBoundaryPort[] = [
			...boundaryInputPorts(frameId, nodes, edges).map((p) => ({ kind: 'in' as const, ...p })),
			...boundaryOutputPorts(frameId, nodes, edges).map((p) => ({ kind: 'out' as const, ...p })),
		];
		nodes = nodes.map((n) => {
			if (n.id === frameId && n.type === 'group') {
				return {
					...n,
					data: {
						...d,
						collapsed: nextCollapsed,
						boundaryPorts: nextCollapsed ? boundaryPorts : d.boundaryPorts,
					},
					style: `width: ${w}px; height: ${nextH}px`,
				};
			}
			if (n.type === 'shader' && n.parentId === frameId) {
				return { ...n, hidden: nextCollapsed };
			}
			return n;
		});
		graphEpoch++;
	}

	function onShaderNodeDragStop() {
		nodes = sortFlowNodesParentsBeforeChildren(nodes);
		nodes = nodes.map((n) => {
			if (n.type !== 'shader') return n;
			const gn = n.data.graphNode;
			const pid = n.parentId;
			if (
				gn.position.x === n.position.x &&
				gn.position.y === n.position.y &&
				(gn.parentId ?? undefined) === (pid ?? undefined)
			) {
				return n;
			}
			return {
				...n,
				data: {
					graphNode: {
						...gn,
						position: { ...n.position },
						parentId: pid,
					},
				},
			};
		});
	}

	async function copySelectionToClipboard() {
		const bundle = buildSubgraphClipboardV1(nodes, edges, selectedNodeIds);
		if (!bundle) return;
		await writeSubgraphToClipboard(bundle);
	}

	async function pasteFromClipboard() {
		let text: string;
		try {
			text = await navigator.clipboard.readText();
		} catch {
			return;
		}
		let raw: unknown;
		try {
			raw = JSON.parse(text);
		} catch {
			return;
		}
		const payload = parseSubgraphClipboardV1(raw);
		if (!payload) return;
		const next = mergeSubgraphV1IntoFlow(
			{ nodes, edges, graphMeta, customNodeTypes },
			payload,
		);
		nodes = next.nodes;
		edges = next.edges;
		graphMeta = next.graphMeta;
		customNodeTypes = next.customNodeTypes;
		graphEpoch++;
	}

	function readUniformScalar(r: ShadertoyRunner | null, u: UniformManifestEntry): number {
		void uniformUiTick;
		void graphEpoch;
		return readUniformScalarValue(r, u);
	}

	function setUniformScalar(u: UniformManifestEntry, v: number) {
		setUniformScalarValue(previewRunner, u, v);
		uniformUiTick++;
	}

	function resetUniform(u: UniformManifestEntry) {
		resetUniformToDefault(previewRunner, u.name);
		uniformUiTick++;
	}

	function patchParamAnimations(
		mut: (draft: Record<string, ParamAnimationSpec>) => void,
		recompile: boolean,
	) {
		const ed = { ...(graphMeta.editor ?? {}) };
		const pa = { ...(ed.paramAnimations ?? {}) };
		mut(pa);
		const nextEditor = { ...ed };
		if (Object.keys(pa).length === 0) delete nextEditor.paramAnimations;
		else nextEditor.paramAnimations = pa;
		graphMeta = { ...graphMeta, editor: nextEditor };
		if (recompile) graphEpoch++;
	}

	function applyPreviewParamAnimations(r: ShadertoyRunner) {
		// Use the preview compile result as the guard: this avoids a transient frame
		// where `compileResult` may still reflect the previous graph immediately after preset load.
		if (!previewCompileResult) {
			return;
		}
		const specs = graphMeta.editor?.paramAnimations;
		if (!specs) return;
		const t = r.getEffectiveTimeSec();
		for (const spec of Object.values(specs)) {
			const gn = shaderGraphNodesById.get(spec.nodeId);
			if (!gn) continue;
			const def = registry.get(gn.typeId);
			const p = def?.params.find((x) => x.id === spec.paramId);
			if (!p || !isParamAnimatable(p)) continue;
			const b = boundsFromParamDef(p);
			const center = readParamNumber(gn.data, p, b);
			const v = sampleParamAnimationValue(spec, t, center, b.min, b.max);
			const uname = uniformName(spec.nodeId, spec.paramId);
			r.setUniform(uname, v);
		}
	}

	function setSelectedShaderParentFrame(parentId: string) {
		const id = selectedNodeId;
		if (!id) return;
		const pid = parentId || undefined;
		nodes = nodes.map((n) => {
			if (n.id !== id || n.type !== 'shader') return n;
			const frame = pid
				? (nodes.find((x) => x.id === pid && x.type === 'group') as
						| Node<FrameNodeData, 'group'>
						| undefined)
				: undefined;
			const hidden = frame?.data.collapsed === true;
			const gn = n.data.graphNode;
			return {
				...n,
				parentId: pid,
				hidden,
				data: {
					graphNode: {
						...gn,
						parentId: pid,
						position: { ...gn.position },
					},
				},
			};
		});
		graphEpoch++;
	}

	function addNodeType(typeId: string) {
		const gn = createGraphNode(typeId, activePass, { x: 120 + Math.random() * 80, y: 120 + Math.random() * 80 });
		nodes = [...nodes, toFlowNode(gn)];
		graphEpoch++;
	}

	function patchSelectedGraphNode(fn: (g: GraphNode) => void) {
		const id = selectedNodeId;
		if (!id) return;
		const flow = nodes.find((n) => n.id === id);
		if (!flow || flow.type !== 'shader') return;
		const gn = JSON.parse(JSON.stringify(flow.data.graphNode)) as GraphNode;
		fn(gn);
		nodes = nodes.map((n) =>
			n.id === id
				? ({ ...n, data: { graphNode: gn }, position: { ...n.position } } as FlowNodeAny)
				: n,
		);
		graphEpoch++;
	}

	function patchShaderNodeParam(nodeId: string, paramId: string, value: number) {
		const flow = nodes.find((n) => n.id === nodeId);
		if (!flow || flow.type !== 'shader') return;
		const gn = JSON.parse(JSON.stringify(flow.data.graphNode)) as GraphNode;
		gn.data[paramId] = value;
		nodes = nodes.map((n) =>
			n.id === nodeId
				? ({ ...n, data: { graphNode: gn }, position: { ...n.position } } as FlowNodeAny)
				: n,
		);
		graphEpoch++;
	}

	function loadPreset(which: PresetId) {
		const r = flowStateFromPresetId(which, PRESET_LOADERS, customNodeTypes);
		nodes = r.nodes;
		edges = r.edges;
		graphMeta = r.graphMeta;
		graphEpoch++;
		// Ensure baked param animations take effect immediately even if a frame is missed.
		previewTimeRestartKey++;
		// If a preset ships baked param animations, ensure the preview is running.
		if (r.graphMeta.editor?.paramAnimations) previewPaused = false;
	}

	function loadUserPresetFromDoc(doc: GraphDocument) {
		const snap = flowStateFromGraphDocument(doc);
		nodes = snap.nodes;
		edges = snap.edges;
		graphMeta = snap.graphMeta;
		customNodeTypes = snap.customNodeTypes;
		graphEpoch++;
	}

	function exportSelectedSubgraph() {
		exportSubgraphSelectionOrAlert(nodes, edges, selectedNodeIds, graphMeta.name ?? 'graph');
	}

	function importSubgraphJson(ev: Event) {
		const f = (ev.target as HTMLInputElement).files?.[0];
		if (!f) return;
		f.text().then((t) => {
			const r = parseSubgraphMergeFromText(t, { nodes, edges, graphMeta, customNodeTypes });
			if (!r.ok) {
				alert(r.message);
				return;
			}
			nodes = r.snapshot.nodes;
			edges = r.snapshot.edges;
			graphMeta = r.snapshot.graphMeta;
			customNodeTypes = r.snapshot.customNodeTypes;
			graphEpoch++;
		});
		(ev.target as HTMLInputElement).value = '';
	}

	function exportJson() {
		exportGraphJson(nodes, edges, graphMeta, customNodeTypes);
	}

	function exportLivePage() {
		exportLivePageOrAlert(compileResult, graphMeta);
	}

	function importGraphJson(ev: Event) {
		const f = (ev.target as HTMLInputElement).files?.[0];
		if (!f) return;
		f.text().then((t) => {
			const r = parseImportGraphFromText(t);
			if (!r.ok) {
				alert(r.message);
				return;
			}
			customNodeTypes = r.snapshot.customNodeTypes;
			graphMeta = r.snapshot.graphMeta;
			nodes = r.snapshot.nodes;
			edges = r.snapshot.edges;
			graphEpoch++;
		});
		(ev.target as HTMLInputElement).value = '';
	}

	function importNodeDefs(ev: Event) {
		const f = (ev.target as HTMLInputElement).files?.[0];
		if (!f) return;
		f.text().then((t) => {
			const r = parseImportNodeDefsFromText(t);
			if (!r.ok) {
				alert(r.message);
				return;
			}
			customNodeTypes = [...customNodeTypes, ...r.defs];
			graphEpoch++;
		});
		(ev.target as HTMLInputElement).value = '';
	}

	function saveUniformPreset(name: string) {
		const n = name.trim();
		if (!n || !previewRunner || compileResult.errors.length > 0) return;
		const values = collectScalarUniformValues(compileResult.manifest, previewRunner);
		graphMeta = graphMetaWithAppendedUniformPreset(graphMeta, uniformPresetsList, n, values);
	}

	function applyUniformPreset(index: number) {
		const p = uniformPresetsList[index];
		if (!p || !previewRunner) return;
		applyUniformPresetToRunner(previewRunner, p);
		uniformUiTick++;
	}

	function deleteUniformPreset(index: number) {
		graphMeta = graphMetaWithoutUniformPresetAt(graphMeta, uniformPresetsList, index);
	}

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
			buildGraphPageDockPushes({
				nodeTypes,
				edgeTypes,
				defaultEdgeOptions,
				snapGridOn,
				isValidConnection,
				patchShaderNodeParam,
				onConnect,
				onFlowDelete,
				onSelectionChange,
				onBeforeReconnect,
				onReconnect,
				onShaderNodeDragStop,
				mergedDiagnostics,
				focusProblemTick,
				focusProblemNodeId,
				filteredPalette,
				paletteQuery,
				addNodeType,
				setPaletteQuery: (q: string) => {
					paletteQuery = q;
				},
				graphMeta,
				activePass,
				readiness,
				previewDockPanelPresent,
				onOpenPreview: ensurePreviewPanelAndFocus,
				previewCompileResult,
				compileResult,
				gpuError,
				selectedFlowNode,
				selectedDef,
				selectedNodeGlsl,
				patchSelectedGraphNode,
				selectedGroupNode,
				toggleFrameCollapse,
				frameIds,
				setSelectedShaderParentFrame,
				uniformGroupsByNode,
				nodeTypeById,
				previewRunner,
				readUniformScalar,
				setUniformScalar,
				resetUniform,
				uniformPresetsList,
				saveUniformPreset,
				applyUniformPreset,
				deleteUniformPreset,
				registry,
				shaderGraphNodesById,
				onProblemsFocusNode,
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
				previewBeforeFrame: applyPreviewParamAnimations,
				patchParamAnimations,
			}),
		);
	});
</script>

<svelte:window
	onkeydown={(e) =>
		handleGraphPageKeydown(e, {
			openQuickAdd: () => {
				quickAddOpen = true;
			},
			duplicateSelectedNodes,
			copySelectionToClipboard,
			pasteFromClipboard,
			groupSelectedShaderNodes,
		})}
/>

<NodeQuickAddModal
	bind:open={quickAddOpen}
	allTypes={allTypesFlat}
	onPick={(typeId) => addNodeType(typeId)}
/>

<div class="shell">
	<EditorHeaderBar
		bind:activePass
		{compileResult}
		{snapGridOn}
		onDuplicate={duplicateSelectedNodes}
		onGroup={groupSelectedShaderNodes}
		onSnapGrid={snapSelectionPositionsToGrid}
		onToggleSnapGrid={() => (snapGridOn = !snapGridOn)}
		onAlignNodes={alignSelectionNodes}
		onBakeSceneSdf={bakeSceneSdfToCustomNode}
		onAddFrame={addFrame}
		onExportGraph={exportJson}
		onExportLivePage={exportLivePage}
		onExportSelection={exportSelectedSubgraph}
		onImportGraph={importGraphJson}
		onMergeSubgraph={importSubgraphJson}
		onImportNodeDefs={importNodeDefs}
		onOpenPresetLibrary={() => (presetLibraryOpen = true)}
		onRestoreDockPanels={restoreClosedDockPanels}
	/>

	<PresetLibraryModal
		bind:open={presetLibraryOpen}
		onLoadBuiltin={loadPreset}
		onLoadUserDoc={loadUserPresetFromDoc}
		getCurrentDoc={() => flowToDoc(nodes, edges, graphMeta, customNodeTypes)}
		customNodeTypes={customNodeTypes}
	/>

	<p class="wire-hint">
		Wires: click to select, then Delete or Backspace to remove. Drag the dots on a wire to reconnect.
		Drag on empty canvas to box-select (pan with middle or right mouse). Ctrl+C / Ctrl+V copies selected shader nodes.
		Ctrl+Shift+G groups selected shaders into a new frame. <strong>Ctrl+K</strong> quick-add node. Use Parent frame in the
		inspector to nest nodes. <strong>Preset library</strong> in the header lists built-in graphs (with optional WebP previews) and
		saved presets. Preview: Pause / Restart in the preview toolbar; closed dock tabs: <strong>Restore panels</strong> in the header.
	</p>

	<EditorMultipassBar bind:activePass {compileResult} {passHasNodes} />

	<EditorDockShell />
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
	.shell > :global(header),
	.shell > .wire-hint,
	.shell > :global(.multipass-bar) {
		flex-shrink: 0;
	}
	.shell > :global(.editor-dock-shell) {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	/* Sidebars scroll independently; graph uses pan/zoom only (no document scroll). */
	.shell :global(aside.palette),
	.shell :global(aside.right) {
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.shell :global(.flow-wrap) {
		min-height: 0;
		height: 100%;
		overflow: hidden;
		align-self: stretch;
	}
	.wire-hint {
		margin: 0;
		padding: 6px 16px;
		font-size: 11px;
		opacity: 0.72;
		border-bottom: 1px solid #252a33;
		background: #101318;
		line-height: 1.35;
	}
</style>
