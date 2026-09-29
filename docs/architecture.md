# Architecture overview

At a high level:

- The **editor** builds and edits a `GraphDocument` (nodes, edges, and meta).
- The **compiler** turns that `GraphDocument` into per-pass GLSL fragment shaders.
- The **runner** executes the passes (`image`, `bufA..bufD`), wiring `iChannel0..3` from `meta.iChannels`: each slot may reference another **buffer pass** (`bufA`…`image` as a string) or **external media** (`{ media: "<GraphMediaInput.id>" }`) declared in `meta.mediaInputs`. The runner uploads images/videos to GPU textures (with per-frame video texture sync where needed), runs Web Audio analysis for audio inputs, and sets **`u_audioLevel`**, **`u_audioBandLow`**, **`u_audioBandMid`**, **`u_audioBandHigh`** on every pass fragment (default 0 when no audio is bound).

## Key modules

- **Editor**
  - Graph UI + state glue: `apps/editor/src/lib/page/*`
  - **Media bindings:** inspector `apps/editor/src/lib/editor/inspector/EditorInspectorMediaPanel.svelte`; picked `File` objects live in a session store `apps/editor/src/lib/editor/mediaFileById.ts` (not serialized in graph JSON — users rebind files after import).
  - **Graph route (main editor):** `apps/editor/src/routes/+page.svelte` composes the shell; `GraphPageShell.svelte` holds layout; `graphPageDerived.ts` centralizes derived state; `graphPageDockBridge.ts` connects docked panels to the graph; `graphPageActions.ts` (with `graphPageActionsFlow.ts`, `graphPageActionsIo.ts`, `graphPageActionsUniform.ts`) exposes imperative handlers via `createGraphPageActions`.
  - Graph ↔ XYFlow conversion: `apps/editor/src/lib/flowDoc.ts`
  - Presets: `apps/editor/src/lib/presets/*`

- **Compiler**
  - Orchestration: `packages/compiler/src/compile/graph.ts`
  - Scene SDF emission: `packages/compiler/src/compile/scene.ts`
  - Template expansion (including raymarch strips): `packages/compiler/src/compile/template.ts`
  - Builtins: `packages/compiler/src/builtins/*`

For a deeper compiler walkthrough, see `packages/compiler/ARCHITECTURE.md`.

