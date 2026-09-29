# Shader pipeline

## Passes

Graphs compile per-pass. Pass IDs are:
- `image` (final framebuffer)
- `bufA`, `bufB`, `bufC`, `bufD` (intermediate buffers)

Each pass produces its own fragment shader source.

## iChannels (`meta.iChannels`)

`GraphDocument.meta.iChannels` maps each **pass** to up to four slots (`0`…`3`) that become **`sampler2D iChannel0`…`iChannel3`** in that pass’s fragment shader.

### Binding shapes

- **Buffer pass (legacy / minimal JSON):** a bare `BufferId` string, e.g. `"bufA"`, `"image"`.
- **External media:** `{ "media": "<id>" }` where `<id>` is listed under **`meta.mediaInputs`** (`packages/compiler` validates that the id exists).

The **compiler** resolves each slot to a manifest entry (`PassManifest.channels` in `packages/compiler/src/types.ts`): either `{ kind: 'buffer', bufferId }` or `{ kind: 'media', mediaId }`. Export/import and clipboard preserve the **authoring** form (`IChannelSlotBinding`); tooling that reads `CompileResult.manifest` sees the resolved form.

Typical patterns:
- **Buffer-to-image**: `image` slot `0` → `bufA` so the image pass can sample the buffer.
- **Feedback (ping-pong)**: `bufA` slot `0` → `bufA` to sample the previous frame of the same pass.
- **Media texture on image**: add a `mediaInputs` entry (`kind: 'image' | 'video'`), then e.g. `image` slot `0` → `{ media: "myPhoto" }` so `sample_channel` / raymarch surface sampling uses the uploaded texture.

The runner enables **ping-pong** only when a **buffer** channel for that pass targets **the same pass** (self-feedback). Binding a slot to **media** does not imply ping-pong.

## Audio globals

Every pass fragment declares (when using the standard prelude from the compiler):

- `u_audioLevel` — overall level  
- `u_audioBandLow`, `u_audioBandMid`, `u_audioBandHigh` — simple band energies from the FFT when an **audio** `mediaInputs` entry is active and decoded in the runner; otherwise **0**.

In the node graph, the Core builtin **`audio_levels`** exposes these as one **`vec4(level, low, mid, high)`** output.

## Scene SDF subgraph (raymarching)

Raymarching uses a dedicated scene-distance function that is emitted from the nodes upstream of `scene_sdf_sink`.

See `packages/compiler/ARCHITECTURE.md` for details and examples (including **`surfTexChannel`** sampling **`iChannelK`**, which may be fed by a buffer pass **or** media-bound texture).
