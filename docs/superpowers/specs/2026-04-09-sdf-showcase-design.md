## Goal

Improve the `sdf_full_pipeline_showcase` preset so it reads as a **hierarchical architectural filigree sculpture** with **mechanical linkage / hydraulic** cues, instead of “a noisy octahedron”. Preserve the current showcase’s best quality: **high-frequency surface texture** and the full pipeline demonstration (warp export → SDF → feedback tessellation → orbit-based albedo).

Success looks like:

- The macro silhouette is **not** a single platonic primitive.
- The form has **repeated motifs** (struts, ribs, collars, plates, bores) that nest at multiple scales.
- Negative space and internal voids are prominent (cathedral / shrine feel).
- Motion is present but not flickery; “alive” without destroying readability.

Non-goals:

- Adding new node types or changing the compiler. This work should be achievable with existing SDF/domain/CSG nodes.
- Perfect physical “hydraulic simulation”. The mechanical feel is implied via geometry (bores, collars, clamps, pistons).

## Constraints

- Must stay performant for the editor preview (raymarch still reasonable). Prefer limited repetition, avoid excessive iteration counts.
- Must remain a readable preset graph: structure grouped, major modules obvious.
- Avoid Svelte reactivity loops (do not introduce effects that feed back into uniform updates).

## Current state (problem)

The current graph applies a rich warp chain, but the final “sculpture” is mostly:

- `Menger ∩ box ∩ octahedron` → `feedback tessellation` → albedo mix

This yields lots of micro detail but it “sticks” to an octahedron-like cage, wasting detail and reading as “a primitive with noise”.

## Proposed direction (approved)

Replace the macro sculpture with a **Gothic lattice shrine** built from composable primitives + CSG, then feed it through the existing texturing pipeline.

Three-layer structure:

### Layer A — Structural ribs (architectural)

Create a finite lattice of repeating “rib” motifs:

- Use `domain_repeat_limited_xyz` to create a **finite grid** of cells (e.g. \(3 \times 5 \times 3\)).
- Inside each cell, build a rib motif using primitives:
  - `sdf_capsule_y` as the primary strut
  - `sdf_box` as flange / plate pieces, then `op_round_d` for cast/forged edges
  - `sdf_torus` as collar rings / reinforcing bands
- Use `op_union` or `smin_float` for weld-like joins.

### Layer B — Linkage cuts (mechanical / hydraulics)

Carve mechanical cues into the rib structure:

- Subtract bolt holes and bores:
  - `sdf_sphere` for drilled holes
  - `sdf_cylinder_y` or thin `sdf_torus` for pass-through bores / ring cuts
- Use `op_onion_d` selectively to create shell thickness (casing vibe).
- Optional “piston” impression: capsule + collar repeated along Y in a limited region.

### Layer C — Global sculpting (avoid platonic cage)

Apply an overall shaping boundary that is *not* an octahedron:

- Intersect the lattice with a rounded bounding volume:
  - `sdf_box` → `op_round_d` (rounded shrine volume)
  - optionally blend with a sphere union to soften corners and avoid “boxy” look
- Keep the boundary slightly asymmetric via existing warp/export chain so the sculpture feels alive.

## Pipeline integration (keep the showcase stack)

Keep the existing high-level flow scaffolding:

- `sdf_param_p` → warp/export frame → `domain_call_exported_vec3` (warped domain)
- New: build “rib lattice shrine” SDF from that domain
- Feed into `sdf_tessellate_feedback` for detail amplification
- Use `domain_kifs_orbit_min` (or similar) as the “good texture” driver for albedo
- `sdf_albedo_scalar_mix` to map orbit/metric into material colors
- `scene_sdf_sink` → `raymarch_scene` → `frag_output`

## Motion / dynamics

Motion should read as slow “breathing / rotating”:

- Keep slow `domain_rotate_euler_time` (or similar) at the top.
- Optionally animate a *small* parameter in the lattice (collar radius, flange thickness, or repeat cell size slightly), but avoid fast oscillations that cause flicker in raymarched SDFs.

## Implementation plan (high level)

1. Update `apps/editor/src/lib/presets/sdf_full_pipeline_showcase.ts`:
   - Replace `Menger ∩ box ∩ octahedron` subgraph with the “rib lattice shrine” SDF.
   - Preserve/adjust raymarch settings (maxSteps/distTrust/eps) as needed.
2. Keep the warp export frame; it remains the “pipeline” demonstration.
3. Tune parameters for readability:
   - repetition limits, motif sizes, carve radii, smoothing radii, and global bounds.
4. Verify in dev:
   - graph loads, presets load, no console `effect_update_depth_exceeded`.
   - sculpture reads as hierarchical filigree with mechanical cues.

## See also

- Multipass and `iChannel` wiring (buffers or **media** textures): [`docs/shader-pipeline.md`](../../shader-pipeline.md).
