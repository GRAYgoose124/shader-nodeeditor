# Compiler architecture

## Where the editor lives (presets + page)

| Area | Location |
|------|-----------|
| Preset ID union | `apps/editor/src/lib/presetIds.ts` |
| Starter / demo flows (`create*Flow`, `metaFor*`) | `apps/editor/src/lib/presets/*.ts`, barrel `presets/index.ts` |
| Preset catalog (labels, groups, loaders) | `apps/editor/src/lib/presetCatalog.ts` |
| `PRESET_LOADERS` re-export | `apps/editor/src/lib/presetRegistry.ts` |
| Legacy import path | `apps/editor/src/lib/defaultFlow.ts` → re-exports presets |
| Clipboard, subgraph merge, export/download, uniform helpers, flow ops, palette/readiness/store bridges | `apps/editor/src/lib/page/*.ts` |
| Inspector subpanels | `apps/editor/src/lib/editor/inspector/*.svelte` |
| `GraphDocument` ↔ XYFlow nodes/edges | `apps/editor/src/lib/flowDoc.ts` |
| Main graph route (loads presets, dock stores) | `apps/editor/src/routes/+page.svelte` |

## Compiler source split (`packages/compiler/src`)

| Module | Role |
|--------|------|
| `compile.ts` | `compileGraph`, pass ordering, validation, main-pass expansion (orchestration) |
| `compileScene.ts` | Scene SDF emission: `emitSceneNodeLine`, `wireMapForNode`, motif wiring helpers, CSG/material lines |
| `glslPrelude.ts` | `VERTEX_SHADER`, `FRAG_HEADER`, `glslUniformDecl`, `indentBlock` |
| `emitPassFragment.ts` | `emitPassFragment` (assemble full fragment from prelude + uniforms + main) |
| `compileParams.ts` | Scalar/literal/uniform param resolution (`getParamScalar`, `ensureFloatUniform`, `literalParamGlsl`, …) |
| `compileTemplate.ts` | `expandTemplate`, raymarch optional strips, `ExpandOpts` |
| `expandSdfPrimitive.ts` | `sdf_primitive` shape switch + Inigo Quilez helpers |
| `builtins/*.ts` | `NodeTypeDef` templates and GLSL helpers per domain |
| `builtins/sdf.ts` | Barrel: `[...sdfNodesMain, raymarchSceneNode, ...sdfNodesTail]` (stable registry order) |
| `builtins/sdfNodesMain.ts` / `sdfRaymarchSceneNode.ts` / `sdfNodesTail.ts` | SDF builtin list slices (main graph nodes, raymarch template node, post-raymarch ops) |

## Graph → GLSL (`compileGraph`)

- Each **pass** (`image`, `bufA`…`bufD`) is compiled independently from `GraphNode`s tagged with that `pass`.
- Most nodes expand via **`NodeTypeDef.template`** placeholders (`{{in:x}}`, `{{out:y}}`, `{{param:z}}`, …). See `types.ts`.
- **Uniform** params become WebGL uniforms; **literal** params are baked into source.

## Scene SDF subgraph (special case today)

Raymarching uses a dedicated **scene distance function**:

1. Nodes upstream of **`scene_sdf_sink`** (and inside the sink’s upstream set) form the **scene graph**.
2. They are **topo-sorted separately** from the “main” pass graph and emitted as `float scene_sdf_<passTag>(vec3 p) { … }`.
3. **`sdf_param_p`** supplies the `p` parameter inside that subgraph; edges from it are wired as the identifier `p`.
4. **`raymarch_scene`** receives the generated function name via `{{sceneSdf}}` substitution.

This is the template for a future **generalized named subgraph**: same isolation + topo + function wrapper, registered by convention instead of ad hoc logic scattered across `compile.ts` / `compileScene.ts`.

## Editor frames vs compile

- **`GraphEditorFrame`** (in `meta.editor.frames`) is **layout only** for the runner: `compileGraph` ignores frame membership.
- **Collapsed frame `boundaryPorts`**: metadata describing edges that cross the frame border. Used for:
  - Validation (`validateAllFrameBoundaries` in `subgraphContract.ts`) so stored ports match the graph.
  - Future: emit a **named GLSL function** for the interior without duplicating special-case logic per domain.

## Composable SDF nodes

Prefer small nodes (`sdf_sphere`, `sdf_box`, `op_union`, …) over **`sdf_primitive`** when readability matters. `sdf_primitive` remains for presets and single-node workflows.

## Procedural 2D (`proc2d_*` in `builtins/procedural2d.ts`)

- **Purpose**: UV / `vec2` pattern generation **without** `scene_sdf_sink` or raymarching—noise, FBM, Voronoi, domain warp, etc.
- **Prelude**: These nodes call the same **Inigo Quilez helpers** already inlined in every pass fragment header (`iq_hash31`, `iq_vnoise`, `iq_fbm3`, `iq_voronoi3_f12`, `iq_gnoise`, `iq_fbm3_g`, `iq_fbm3_grad_fd` in [`glslPrelude.ts`](src/glslPrelude.ts) as `FRAG_HEADER`). No extra prelude wiring is required.
- **SDF overlap**: Similar math appears on **`domain_*`** nodes in the scene graph (e.g. `domain_fbm_displace`); `proc2d_*` exposes the same ideas for **2D domains** (`vec2` + optional `z` slice uniform) in the main pass graph.
- **Extras**: Tiling / symmetry (`proc2d_repeat_xy`, `proc2d_mirror_xy`, `proc2d_kaleidoscope`), polar ↔ Cartesian, ridged FBM, Voronoi warp + edge metric, small float combinators (`proc2d_mix_float`, …), and **`proc2d_time_z`** (`iTime`-based scalar) for animating palette or mix inputs without extra buffer passes.

## Fractal / IFS in the main graph (`builtins/fractal.ts`, `builtins/ifs.ts`)

- **Fractal** and **IFS (2D)** nodes take **`vec2` domains** (typically **UV** or **`proc2d_domain` / warp** outputs). They are **not** part of the scene SDF subgraph; you compose **Procedural → Fractal/IFS** by wiring **`vec2`** in the **same pass** as `frag_output`.
- **`ifs_affine`** implements **z′ = M·z + t** (uniform matrix + translation). Stack with **`ifs_linear_fold`**, **`ifs_iterate`**, and **`ifs_to_rgb`** (or sample noise on **`z`** with **`proc2d_*`**) like any other `vec2` chain.

## Raymarch surface texturing via `iChannel` (`raymarch_scene` in `builtins/sdf.ts`)

- The emitted GLSL lives in [`builtins/raymarchSceneTemplate.ts`](src/builtins/raymarchSceneTemplate.ts); **`sdf.ts`** registers the node and params.
- **`raymarch_scene`** can multiply diffuse lighting by a **sampled albedo** from **`sampler2D iChannelK`** at the **hit point**, using **hit position** **`pmc_*`** and **normal** **`nmc_*`** already computed in the template.
- **Consistency**: **relative hit ε** (`relHitEps` × distance, combined with **`eps`**) is used for the primary march, sky bounce, reflection, and GI sub-marches. **Shadow** penumbra uses tunable **`shadowStart`**, **`shadowHitEps`**, **`shadowStepMin`**, **`shadowStepMax`**. Optional **surface ray refine** (two steps along **`rd`**) and **`nEpsRel`** (scale normal sampling by distance) reduce shimmering on some scenes.
- **Reflection** evaluates **full surface shading** at the reflected hit (not a flat gray), with optional **Schlick Fresnel** weighting via **`reflFresnel`**.
- **Diffuse GI** (`giOn`): three fixed hemisphere directions (stable, deterministic from **`gl_FragCoord`**), cosine-weighted accumulation; optional **second bounce** with a short march (`giSecondBounce`, **`giSteps2`**). This is **expensive**—use low **`giSteps`** / **`giStr`** first.
- **Compile-time feature flags**: **`skyBounceOn`**, **`reflOn`**, **`giOn`**, and **`surfaceRefineOn`** are **literal** Off/On choices. When Off, the compiler **omits** that block from GLSL so the default shader stays small and fast (toggle On and recompile to enable).
- **Params**: **`surfTexOn`** (uniform), **`surfTexChannel`** (literal 0–3), **`surfTexScale`**, **`surfTexBlend`**, **`surfTexMode`** (triplanar vs cylindrical XZ). This is **not** a general “wire any subgraph as material”—only **one chosen channel** is sampled inside the marcher.
- **Tradeoffs**: triplanar uses **three** fetches per shaded hit (better seam behavior than a single planar projection); cylindrical is cheaper and suits columns. Set **`meta.iChannels`** (e.g. **`image.0 → bufA`**) so **`bufA`** can run a **2D fractal / procedural** shader while **`image`** raymarches an SDF **textured** from that buffer.

### Splitting `builtins/sdf.ts` (deferred)

The file is large (~1.8k lines) and is left as a single module until feature work focuses on raymarch/SDF. A future split might separate **node registration + param defs** from **SDF primitive helpers**, keeping [`raymarchSceneTemplate.ts`](src/builtins/raymarchSceneTemplate.ts) as the emitted-body boundary and using a **barrel re-export** so compiler tests and import sites stay stable.

## Buffer feedback with two channels (`sample_channel` + `mix_vec4`)

To **blend the previous frame of a buffer with another pass** (e.g. persistent trails + fresh injection from **`bufA`**), wire **`meta.iChannels`** so the feedback pass samples itself and the source:

- **`meta.iChannels.bufB`**: **`{ 0: 'bufB', 1: 'bufA' }`** — channel 0 is the ping-pong self-reference (runner enables **`pingPong`** when a pass binds a channel to itself); channel 1 is a stable feed from **`bufA`**.
- In the graph: two **`sample_channel`** nodes (indices 0 and 1) into **`mix_vec4`** (uniform **`t`** controls injection strength; keep it small for long-lived smears). Optional **`proc2d_warp_fbm`** on UV before sampling breaks up symmetry.

**`sample_channel`** outputs **`vec4`**; **`mix_vec3`** cannot replace **`mix_vec4`** for two texture samples—use **`mix_vec4`** for that pattern.

## Pixel-texel feedback (`builtins/feedback2d.ts`)

- **`frag_coord_xy`**: emits `gl_FragCoord.xy` for integer-aligned neighbor kernels (pair with **`sample_channel_texel`**).
- **`sample_channel_texel`**: `texelFetch(iChannelK, ivec2(pixel), 0)` — same channel literal convention as **`sample_channel`**.
- **`conv3x3_texel`**: one 3×3 loop with center / cardinal / diagonal weight slots; **`wrapMode`** torus vs clamp. Use for Laplacian-style stencils without nine separate fetches.
- **Self ping-pong**: set **`meta.iChannels.bufA`**: **`{ 0: 'bufA' }`** (or the pass tag you use) so the pass samples **itself** on channel 0; the runner turns on **`pingPong`** when a buffer binds to itself.
- **Showing the buffer on screen**: Shadertoy **`#iChannel0 "self"`** on **Image** is modeled as **sim on `bufA`** plus an **`image`** pass with **`sample_channel`** and **`meta.iChannels.image`**: **`{ 0: 'bufA' }`** — the runner only draws **`image`** to the default framebuffer.
- **Vec4 plumbing**: **`vec4_const`**, **`vec4_add`**, **`vec4_mul`**, **`vec4_scale`**, **`vec4_mul_float`**, plus **`expr_vec4`** (`builtins/custom.ts`) for one-off mixing swizzles when decomposition is too noisy.

## Document meta (`GraphMeta.editor`)

- **`frames`**: persisted XYFlow groups + collapse state + optional `boundaryPorts`.
- **`uniformPresets`**: editor-only snapshots of scalar uniforms for live performance (not consumed by `compileGraph`).
