# SDF Showcase “Shrine Lattice” Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `sdf_full_pipeline_showcase` macro “noisy octahedron cage” with a hierarchical architectural filigree lattice sculpture with mechanical linkage cues, while keeping the existing warp→SDF→feedback→albedo pipeline.

**Architecture:** Keep the existing warp export frame + `domain_call_exported_vec3` to generate a lively domain, but rebuild the SDF as a finite repeated “rib/collar/flange” motif with subtractive bores and a rounded global bounding volume. Feed the resulting SDF into existing feedback tessellation + orbit-min albedo shading.

**Tech Stack:** SvelteKit editor preset graph (`apps/editor`), compiler builtin node types (`packages/compiler`), runner (`packages/runner`) unchanged.

---

### Task 1: Build the new macro SDF subgraph in the preset

**Files:**
- Modify: `C:\Users\goose\Documents\Projects\shadertoy-nodeeditor\apps\editor\src\lib\presets\sdf_full_pipeline_showcase.ts`

- [ ] **Step 1: Replace “Menger ∩ box ∩ octahedron” with a rib lattice shrine**

Implement the following node modules (all in the preset file, as graph nodes):

1) **Domain repeat (finite lattice)**
- Add `domain_repeat_limited_xyz` after the warp call (use modest periods + limits):
  - `cx=1.35, cy=1.15, cz=1.35`
  - `lx=1, ly=2, lz=1` (gives 3×5×3 cells)

2) **Rib motif (union / smooth union)**
- Create in repeated space:
  - `sdf_capsule_y` (primary strut): `r≈0.07, h≈0.45`
  - `sdf_box` (flange plate): `hx≈0.22, hy≈0.06, hz≈0.22` then `op_round_d` with `rad≈0.045`
  - `sdf_torus` (collar ring): `R≈0.22, r≈0.04`
- Combine via `smin_float` (k≈0.10) or `op_union` where appropriate.

3) **Mechanical cuts**
- Subtract bores:
  - `sdf_cylinder_y` (bore): `r≈0.055`
  - optionally a second `sdf_torus` (thin ring cutter): `R≈0.22, r≈0.02`
- Use `op_subtract` (or `smin_smooth_sub_float` with k≈0.10) to carve holes.
- Optionally apply `op_onion_d` (th≈0.03) to one branch to create casing shell.

4) **Global bounding (rounded shrine volume)**
- Intersect with `sdf_box` (bigger): `hx≈0.9, hy≈1.25, hz≈0.9` then `op_round_d` (rad≈0.12)
- This becomes the macro silhouette limiter (replaces octahedron).

5) **Pipeline hook-up**
- Feed the bounded lattice distance into existing `sdf_tessellate_feedback`.
- Keep orbit-min (`domain_kifs_orbit_min`) for albedo “good texture” driver.

- [ ] **Step 2: Adjust raymarch parameters if needed**

Tune `raymarch_scene` defaults only if the new geometry needs it (keep conservative):
- `maxSteps` ~ 260–320
- `distTrust` ~ 0.50–0.60
- `eps` ~ 0.002 (maybe 0.0015 if stable)

- [ ] **Step 3: Keep motion slow**

Update meta animations only if needed:
- keep slow `full_rot.ty`
- optionally animate one structural parameter (e.g. collar minor `r` or smooth-union `k`) at very low speed/range.

---

### Task 2: Verify in dev

**Files:**
- (no code changes required unless issues found)

- [ ] **Step 1: Run dev and load the preset**

Open the editor and load the `sdf_full_pipeline_showcase` preset.

Expected:
- graph loads and is interactive
- preset loads (no silent failure)
- sculpture reads as repeated ribs/collars/bores with a rounded shrine boundary

- [ ] **Step 2: Check browser console**

Expected:
- no `effect_update_depth_exceeded`
- no infinite uniform update loops

- [ ] **Step 3: Sanity check import/export**

Expected:
- importing a graph JSON works
- switching presets works

**See also:** [`docs/shader-pipeline.md`](../../shader-pipeline.md) for `iChannels`, buffer feedback, and optional **media**-bound textures.
