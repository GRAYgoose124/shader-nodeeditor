# Contributing

## Adding a graph preset

1. **ID** — Add the new identifier to the `PresetId` union in `apps/editor/src/lib/presetIds.ts`.
2. **Flow** — Implement `createYourPresetFlow()` (and optional `metaForYourPreset()`) in the appropriate file under `apps/editor/src/lib/presets/` (see `starters.ts`, `procedural2d.ts`, `buffers.ts`, etc.) and export it from `apps/editor/src/lib/presets/index.ts`.
3. **Catalog** — Add one object to `PRESET_CATALOG` in `apps/editor/src/lib/presetCatalog.ts` (`groupLabel`, `uiLabel`, and `load` returning `{ nodes, edges, meta }`). That updates both the dropdown and `PRESET_LOADERS` automatically.
4. **Verify** — `npm run build -w editor` and smoke-test the new preset from the dropdown.

Editor-only flow glue (palette model, import/export, dock/store bridges, shortcuts) lives under `apps/editor/src/lib/page/`; split inspector UI lives under `apps/editor/src/lib/editor/inspector/`.

**Presets and media:** a preset may include `meta.mediaInputs` and `meta.iChannels` entries that use `{ media: "<id>" }`. Graph JSON round-trips those fields, but **binary files are not embedded**—after load, users pick files again in the inspector (session store `apps/editor/src/lib/editor/mediaFileById.ts`). Prefer buffer-only `iChannels` in checked-in starters unless the preset description tells authors to bind media.

For compiler and buffer conventions, see `packages/compiler/ARCHITECTURE.md` and `docs/shader-pipeline.md`.
