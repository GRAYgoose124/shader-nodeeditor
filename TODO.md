# Roadmap

## Direction

Planned: a code-first SDF authoring mode (text DSL with live-scrubbed literals), SDF-to-mesh baking (glTF) for use in external game engines, and a portable, evaluable SDF representation (today the SDF exists only as emitted GLSL). The node graph stays for now.

## Backlog / done

- [x] box selection for nodes (click and drag)
- [x] quick grouping, quick node manip features
- [x] snap to grid / align by node depth
- [x] view node source (guided glsl previews)
- [x] convert complex node subgraphs like Scene SDF to a compiled custom node with the exact code that it would have been (for further refinement/direct editing)
- [x] generic subgraph bake: **Bake selection** (toolbar) replaces a selection with one custom node from compiled GLSL; **Bake scene SDF** still available for the raymarch scene distance field.

- [x] Multipass bar + shared `activePass` with header (per-pass error badges; preview still single-pass)
- [x] Editor shell components + Ctrl+K quick-add; uniform presets in graph JSON; PNG + WebM capture
- [x] Frame `boundaryPorts` in doc meta + compiler validation; see `packages/compiler/ARCHITECTURE.md`
- [x] Accurate/efficient GI / Pathtracing.
- [x] Media inputs: **image / video / audio** — `meta.mediaInputs` + `meta.iChannels` with `{ media: "<id>" }`; inspector **Media** panel (`EditorInspectorMediaPanel.svelte`); session `File` map (`apps/editor/src/lib/editor/mediaFileById.ts`); runner bind + video sync + audio bands (`packages/runner/src/shadertoy-runner.ts`); Core **`audio_levels`** node reads `u_audioLevel` / `u_audioBandLow|Mid|High`. URL asset browser and online import remain out of scope (see `docs/superpowers/specs/2026-04-08-media-inputs-design.md`).
- [ ] Dense nodes like menger or kaleidoscope need more composability controls
- [x] pause / resume restarts the shader instead of pausing on and continuing from the last frame.
- [ ] Generic iterable / “zone” nodes for SDF construction (beyond today’s pieces). Pass **substeps** and `glsl_repeat_*` helpers already cover some repeat/unroll patterns in codegen; **tesselate sdf** is separate from domain repetition. Still want a higher-level repeat/zone node (e.g. relative angles, repeat rules, start/end) closer to Blender-style zones.
- [x] New nodes from the palette / quick-add spawn at **viewport center** (flow coords via `EditorFlowViewportBridge.svelte` + `getFlowCenterForNewNode` in `apps/editor/src/lib/editor/flowPlacement.ts`, consumed by `addNodeType` in `graphPageActionsFlow.ts`; falls back to random near `(120,120)` if the bridge is not mounted).
- [ ] xenodream / fractal flame inspired morphs/xforms + gen (sdf constructions)
- [x] Wire up iMouse to preview — `ShaderPreview` passes mouse to the runner; `iMouse` uniform is set (`packages/runner`). Re-open if a specific workflow still lacks mouse input.
