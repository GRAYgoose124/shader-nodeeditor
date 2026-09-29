# Media inputs (textures + audio) — design

## Goal
Ship **first-class media inputs** (image/video textures + audio) in `shadertoy-nodeeditor` so users can build Shadertoy-style shaders that react to external media without custom hacks.

This is the most direct “missing capability” called out in [`TODO.md`](C:\Users\goose\Documents\Projects\shadertoy-nodeeditor\TODO.md) and unblocks many interesting shaders immediately.

## Success criteria (definition of done)
- Users can add at least one **Image/Video Texture** input and one **Audio** input, wire them into a shader graph, and see results in preview.
- Graph documents serialize these inputs in a stable way (copy/paste + export/import retains bindings).
- Runner reliably binds the chosen resources into `iChannel0..3` for the relevant pass(es).
- Clear UX: users can see **what resource is bound to which channel** for the active pass.

## Scope
### In scope (v1)
- **New resource model in graph meta** for “external inputs” (media sources).
- **Per-pass channel mapping** (Shadertoy-like `iChannelK`) for `image/bufA/bufB/bufC/bufD`.
- **Two new node families**:
  - **Sampling nodes** that read from a chosen channel (`sample_channel`-like), targeting `sampler2D iChannelK`.
  - **Audio analysis nodes** that expose a few “cheap & useful” signals (e.g. amplitude / band energy) to drive parameters.
- **Runner support** to load and bind:
  - image textures (local file picker)
  - video textures (local file picker; video element → WebGL texture updates)
  - audio (local file picker; WebAudio analysis → uniforms/texture)

### Explicit non-goals (v1)
- A full Shadertoy “asset browser” or online URL importing.
- More than 4 channels per pass.
- Complex color management / video decode controls.
- A generalized “material subgraph” system for raymarch materials.

## Key design decisions
### 1) Data model: external inputs live in `GraphDocument.meta`
We will persist media definitions and channel bindings in `GraphDocument.meta` (alongside existing editor-only meta), so they round-trip with the graph.

Sketch:
- `meta.mediaInputs`: catalog of reusable input definitions (id + kind + config)
- `meta.iChannels`: per-pass mapping \(already discussed in compiler docs\) will be extended to support **external media ids** in addition to pass ids.

This aligns with existing architecture notes in [`packages/compiler/ARCHITECTURE.md`](C:\Users\goose\Documents\Projects\shadertoy-nodeeditor\packages\compiler\ARCHITECTURE.md) where `meta.iChannels` is already the intended binding mechanism for runner behavior.

### 2) UX: channel binding is a small, always-visible panel
Add a compact “Channels” panel in the editor:
- shows `Pass=image|bufA..` and `iChannel0..3`
- each channel is a dropdown: **(None / bufA..bufD / External: <media input>)**
- plus buttons to “Add image”, “Add video”, “Add audio” that create a new external input and select it for the chosen channel

This keeps the workflow fast and discoverable without requiring new node types purely for “binding”.

### 3) Shader interface: keep GLSL familiar
Keep GLSL contracts close to Shadertoy:
- Textures: `sampler2D iChannel0..3`
- Audio: either
  - **uniform floats** (e.g. `uAudioLevel`, `uAudioBand0..N`) for immediate utility, and/or
  - an **audio texture** bound to an `iChannelK` (more Shadertoy-faithful but more plumbing)

For v1, prefer **uniforms first** for audio (simpler, debuggable, good enough), and optionally add an audio texture in v2.

## Milestones
- **M1 — Persisted channel bindings**
  - Extend `GraphDocument.meta.iChannels` to reference external media ids
  - Update export/import and clipboard paths so it round-trips
- **M2 — Texture inputs end-to-end**
  - UI: add image/video input and bind it to a channel
  - Runner: load/bind to `iChannelK`
  - Shader: `sample_channel` nodes work with external textures
- **M3 — Audio signals**
  - UI: add audio input
  - Runner: analyze audio and provide uniforms
  - Nodes: expose audio signals as float outputs
- **M4 — UX hardening**
  - clear empty/error states (missing file, unsupported format)
  - sensible defaults (auto-bind first created input to `iChannel0`)

## Risks & mitigations
- **Portability**: local file references may break on another machine.
  - Mitigation: store “display name + kind” and treat file handles/paths as best-effort; allow rebinding when missing.
- **Performance**: video textures need throttling and proper texture update strategy.
  - Mitigation: cap update rate; only upload when video frame advances; reuse textures.
- **Complexity creep**: too many media features at once.
  - Mitigation: strict v1 scope; prioritize image texture first, then video, then audio.

## Follow-up opportunities (after v1 ships)
- Use the existing shader corpus tagging pipeline (`scripts/fragment-shader-corpus.mjs`) to build a small gallery of “media-reactive” examples once media is available.
- Expand to audio texture compatibility for closer Shadertoy parity.

