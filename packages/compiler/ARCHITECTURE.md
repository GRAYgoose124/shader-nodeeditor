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

## Bake selection → custom node (editor)

- **Pass-specific**: uses the **active pass** compile output (`passes[activePass].fragmentSource`); the selection must be shader nodes **in that pass only**.
- **Uniforms**: `tryBakeSelectionToCustomNode` fixes the new node id **before** building the custom type and passes **`bakedNodeIdForUniforms`** into **`buildBakedSelectionCustomType`**, which runs **`remapBakedSelectionUniforms`** (see [`glslExtract.ts`](src/glslExtract.ts), exported from [`index.ts`](src/index.ts)) so uniforms extracted from inner blocks use **`u_<bakedNodeId>_<sourceNodeId>_…`** prefixes and stay owned by the baked node. **Bake scene SDF** remains the separate path for the raymarch distance field.
- **Boundary** `shaderWire` edges (one end inside the selection, one outside) become the custom node’s **inputs and outputs**; selected nodes are removed and replaced by one node wired to the same externals.
- **Implementation**: `tryBakeSelectionToCustomNode` in `apps/editor/src/lib/page/bakeSelectionToCustomNode.ts`; concatenation + moderate cleanup in [`glslExtract.ts`](src/glslExtract.ts) (`buildBakedSelectionCustomType`, `optimizeBakedSelectionGlslKernel`, `remapBakedSelectionUniforms`).

## Compiler source split (`packages/compiler/src`)

| Module | Role |
|--------|------|
| **`compile/graph.ts`** | `compileGraph`, pass ordering, main-pass expansion (orchestration); calls `validateGraph` first |
| **`compile/scene.ts`** | Scene SDF emission: `emitSceneNodeLine`, `wireMapForNode`, motif wiring helpers, CSG/material lines |
| **`compile/emitPassFragment.ts`** | `emitPassFragment` (assemble full fragment from prelude + uniforms + main) |
| **`compile/params.ts`** | Scalar/literal/uniform param resolution (`getParamScalar`, `ensureFloatUniform`, `literalParamGlsl`, …) |
| **`compile/template.ts`** | `expandTemplate`, raymarch optional strips, `ExpandOpts` |
| **`compile/repeatMain.ts`** | `glsl_repeat_*` zone planning and emission |
| **`compile/motifPullback.ts`** | Motif subgraph slice + `sdf_tessellate_feedback` / `sdf_iterate_pullback` GLSL emission |
| **`compile/sceneSdfZone.ts`** | `scene_sdf_zone_begin` / `scene_sdf_zone_end` pairing, body slice, leak checks, `float scene_sdf_zone_<id>_<pass>(vec3 p)` helpers |
| **`compile/frameFnExport.ts`** | Frame `exportVec3Fn` / `exportSdfFn` → named `vec3` / `float` scene helpers + call validation |
| **`compile/fixtures.ts`** | Shared tiny `GraphDocument`s for tests |
| **`compile/__tests__/*.test.ts`** | Compiler / template Vitest suites |
| `glslPrelude.ts` | `VERTEX_SHADER`, `FRAG_HEADER`, `glslUniformDecl`, `indentBlock` |
| `expandSdfPrimitive.ts` | `sdf_primitive` shape switch + Inigo Quilez helpers |
| `validate.ts` | Graph validation (imports `compile/params`, `compile/repeatMain` for repeat + substeps rules) |
| `builtins/*.ts` | `NodeTypeDef` templates and GLSL helpers per domain |
| `builtins/sdf.ts` | Barrel: `[...sdfNodesMain, raymarchSceneNode, ...sdfNodesTail]` (stable registry order) |
| `builtins/sdfNodesMain.ts` | Thin list: `sdfPrimitiveComboNode`, primitive/material/csg/scene spreads, `sdfNodesMainInline` |
| `builtins/sdfNodes/sdfPrimitiveCombo.ts` | All-in-one **`sdf_primitive`** dropdown node (params + empty template) |
| `builtins/sdfNodes/mainInline.ts` | Extra SDF main-graph nodes (hex tessellation, domain repeat/rotate/warp, Menger, …) |
| `builtins/sdfRaymarchSceneNode.ts` / `sdfNodesTail.ts` | Raymarch template node + post-raymarch ops |

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

This is the template for a future **generalized named subgraph**: same isolation + topo + function wrapper, registered by convention instead of ad hoc logic scattered across `compile/graph.ts` / `compile/scene.ts`.

**Named float SDF from frames:** When a frame sets **`exportSdfFn`** (and not `exportVec3Fn` on the same frame), the compiler emits `float <name>(vec3 p)` from the frame interior. Boundary contract is **one `vec3` in** and **one `float` out** (`d`), interior nodes must lie in the scene SDF reach set and must not include `sdf_param_p`. Use **`domain_call_exported_sdf`** to sample that function; **`sdf_repeat_exported_min`** unions translated copies (literal count ≤ 16) along one axis for lattice-style CSG.

**Scene SDF zone markers (in-graph):** **`scene_sdf_zone_begin`** / **`scene_sdf_zone_end`** use a matching literal **`zoneId`**. Wire **`sdf_param_p` → begin `p` → in-zone shapes → end `d` → rest of scene** so the backward slice reaches the begin marker. The compiler emits **`float scene_sdf_zone_<sanitizedId>_<pass>(vec3 p)`** for the zone interior (begin passthrough + body) and at each end **`float g_<end>_d = <helper>(p);`** in the main `scene_sdf_*` body. If **Shade with SDF albedo** is On, it also emits zone **`_hit`** helpers and uses them in **`scene_hit_*`** so materials match the non-zone path.

**Scene SDF repeat markers:** **`scene_sdf_repeat_begin`** / **`scene_sdf_repeat_end`** (same `zoneId` idiom) emit a compile-time **`for`** + **`min`** over translated **`p`** along one axis (literal **Copies** capped in codegen). Same **no texture / `iChannel` in the repeat body** rule as other repeat zones (`repeatMain.ts`). **v1:** repeat bodies must not overlap each other; **zone and repeat regions must not overlap** on shared nodes.

**Fractal motif pullback** with zones/repeat: **allowed** when the motif slice **`M`** from **`tryMotifPullbackPlan`** does **not** intersect any zone/repeat body or begin/end marker; otherwise validate errors.

**Union hit normal (winning strand):** **`tryStratifyUnionScene`** still refuses stratification when zone or repeat markers exist. If **Union hit normal** is On and stratify fails **only** for that reason, compile **continues** and normals use the **merged** SDF (IQ gradient on the combined field), same as when stratify is off for other deferred cases.

**Contrast** with **frames + `exportSdfFn`**, which names a subgraph from layout metadata instead of paired **`scene_sdf_zone_*`** / **`scene_sdf_repeat_*`** graph nodes.

## Editor frames vs compile

- **`GraphEditorFrame`** (in `meta.editor.frames`) is **layout only** for the runner: `compileGraph` ignores frame membership.
- **Collapsed frame `boundaryPorts`**: metadata describing edges that cross the frame border. Used for:
  - Validation (`validateAllFrameBoundaries` in `subgraphContract.ts`) so stored ports match the graph.
  - **`exportVec3Fn` / `exportSdfFn`**: with valid crossings, the compiler emits **`vec3 name(vec3 p)`** or **`float name(vec3 p)`** for the interior (`frameFnExport.ts`). Names are sanitized and must be unique per pass among both export kinds.

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
- **Tradeoffs**: triplanar uses **three** fetches per shaded hit (better seam behavior than a single planar projection); cylindrical is cheaper and suits columns. Set **`meta.iChannels`** so the chosen **`surfTexChannel`** samples a **buffer** (e.g. **`image` slot `0` → `bufA`** while **`bufA`** runs a 2D procedural pass) **or** **media** (e.g. **`image` slot `0` → `{ media: \"photo\" }`** with a matching **`meta.mediaInputs`** entry) while **`image`** raymarches an SDF textured from that `sampler2D`.

### Splitting `builtins/sdf.ts` (deferred)

The file is large (~1.8k lines) and is left as a single module until feature work focuses on raymarch/SDF. A future split might separate **node registration + param defs** from **SDF primitive helpers**, keeping [`raymarchSceneTemplate.ts`](src/builtins/raymarchSceneTemplate.ts) as the emitted-body boundary and using a **barrel re-export** so compiler tests and import sites stay stable.

## Buffer feedback with two channels (`sample_channel` + `mix_vec4`)

To **blend the previous frame of a buffer with another pass** (e.g. persistent trails + fresh injection from **`bufA`**), wire **`meta.iChannels`** so the feedback pass samples itself and the source:

- **`meta.iChannels.bufB`**: **`{ 0: 'bufB', 1: 'bufA' }`** — channel 0 is the ping-pong self-reference (runner enables **`pingPong`** when a **buffer** channel for **`bufB`** targets **`bufB`**); channel 1 is a stable feed from **`bufA`**.
- **Media on a channel** (still uses `sample_channel` / the same `iChannelK` samplers): e.g. **`{ 0: { media: \"myVideo\" } }`** with **`meta.mediaInputs`** containing **`id: \"myVideo\"`**. **Ping-pong** is **not** driven by media bindings—only **self**-buffer references flip the ping-pong target.
- In the graph: two **`sample_channel`** nodes (indices 0 and 1) into **`mix_vec4`** (uniform **`t`** controls injection strength; keep it small for long-lived smears). Optional **`proc2d_warp_fbm`** on UV before sampling breaks up symmetry.

**`sample_channel`** outputs **`vec4`**; **`mix_vec3`** cannot replace **`mix_vec4`** for two texture samples—use **`mix_vec4`** for that pattern.

## Pixel-texel feedback (`builtins/feedback2d.ts`)

- **`frag_coord_xy`**: emits `gl_FragCoord.xy` for integer-aligned neighbor kernels (pair with **`sample_channel_texel`**).
- **`sample_channel_texel`**: `texelFetch(iChannelK, ivec2(pixel), 0)` — same channel literal convention as **`sample_channel`**.
- **`conv3x3_texel`**: one 3×3 loop with center / cardinal / diagonal weight slots; **`wrapMode`** torus vs clamp. Use for Laplacian-style stencils without nine separate fetches.
- **Self ping-pong**: set **`meta.iChannels.bufA`**: **`{ 0: 'bufA' }`** (or the pass tag you use) so the pass samples **itself** on channel 0; the runner turns on **`pingPong`** when a **buffer** slot resolves to the **same** pass id (string self-bind).
- **Showing the buffer on screen**: Shadertoy **`#iChannel0 "self"`** on **Image** is modeled as **sim on `bufA`** plus an **`image`** pass with **`sample_channel`** and **`meta.iChannels.image`**: **`{ 0: 'bufA' }`** — the runner only draws **`image`** to the default framebuffer.
- **Vec4 plumbing**: **`vec4_const`**, **`vec4_add`**, **`vec4_mul`**, **`vec4_scale`**, **`vec4_mul_float`**, plus **`expr_vec4`** (`builtins/custom.ts`) for one-off mixing swizzles when decomposition is too noisy.

## Pass substeps (runner) vs `glsl_repeat_*` (compile-time loop)

These solve different problems:

- **Pass substeps** (`PassManifest.substeps`, from **`meta.passSubsteps[bufX]`** and/or the **`feedback_pass_substeps`** builtin): the **runner** draws that buffer pass (bind → uniforms → channels → **draw** → **ping-pong flip**) **N times per displayed frame**, with **`iFrame` / `iTime` unchanged** across those inner steps. Use this for **reaction–diffusion**, **conv3×3** neighbor stencils, or anything that needs **fresh texel reads** after each sub-step. Unrolling the same graph **inside one fragment** does **not** update neighbors correctly—the FBO you write is the one neighbors read until the next draw.

- **`glsl_repeat_begin` / `glsl_repeat_end`** (`builtins/repeatMain.ts`, planning in **`compile/repeatMain.ts`**): the **compiler** emits a **`for`** loop over an inlined subgraph in **`main()`**. **v1** allows only **pure math / SDF-style** work inside the zone: any expansion that performs **`texture` / `texelFetch` / `iChannel`** is rejected (validation points authors at **pass substeps** instead). Loop index is available in **`expr_*`** and templates as **`{{loop:<indexName>}}`** (default index name `ri`). Pair nodes share the same **zone id** literal.

**Merge rule:** **`feedback_pass_substeps` wins** when present for that pass: its literal **`count`** is used after clamping; **`meta.passSubsteps`** applies when the node is absent. At most **one** such node per buffer pass; **not allowed** on **`image`**.

## Document meta (`GraphMeta.editor`)

- **`frames`**: persisted XYFlow groups + collapse state + optional `boundaryPorts`.
- **`uniformPresets`**: editor-only snapshots of scalar uniforms for live performance (not consumed by `compileGraph`).
