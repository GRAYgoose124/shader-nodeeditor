# Getting started

## Prerequisites
- Node.js + npm (this repo uses npm workspaces; see root `package.json`)

## Install

```bash
npm install
```

## Run the editor

```bash
npm run dev
```

## Build + test

```bash
npm run build
npm run test
```

## Workspace layout
- `apps/editor`: editor UI
- `packages/compiler`: graph → GLSL compiler
- `packages/runner`: preview/runtime runner

## Channels and media (where it lives)

- **In the editor:** Inspector **Media** panel — add image / video / audio inputs, pick files, and bind each pass’s `iChannel0..3` to a buffer pass or a media id.
- **In the graph document:** `GraphDocument.meta.mediaInputs` (catalog) and `meta.iChannels` (per pass, slot → `BufferId` or `{ media: "<id>" }`). Exported JSON / clipboard round-trip these fields; binary files are **session-local** until the user re-picks them after import.
- **Details:** See [Shader pipeline](shader-pipeline.md) and [Compiler architecture](../packages/compiler/ARCHITECTURE.md).
