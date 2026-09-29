# Bake selection → custom node

## Goal

Let authors select a connected subgraph in the shader graph and **bake** it into a single **Custom** `NodeTypeDef` whose GLSL is the **same code the compiler already emitted** for those nodes (from the active pass fragment), then **replace** the selection with one node that exposes the same external interface.

## Non-goals

- Frames are **not** required; selection defines the subgraph.
- No full GLSL optimizer (no algebraic rewrites, no cross-procedure inlining beyond described cleanup).

## Interface (API)

Boundary edges use the same rule as “outside ↔ inside”:

- **Input ports**: every edge `source ∉ selection → target ∈ selection` yields one input on the baked node keyed by `(targetNodeId, targetHandle)`. Types come from the target node’s input port definition.
- **Output ports**: every edge `source ∈ selection → target ∉ selection` yields one output keyed by `(sourceNodeId, sourceHandle)`. Types come from the source node’s output port definition.

Validation:

- Selection must be non-empty and only **shader** nodes in a **single** pass (the active pass).
- Compile must succeed for the document; bake uses `fragmentSource` from that compile.
- At least one **output** boundary edge (otherwise the baked node cannot drive anything).
- No duplicate external sources into the same target input (same as the rest of the editor: one wire per input port).

## Code generation

1. **Topo-order** selected nodes using edges with both ends in the selection (`topoOrder` from `graphutil.ts`).
2. For each node id, **`extractNodeGlslBlock(fragmentSource, nodeId)`** and concatenate in topo order.
3. **Preamble**: for each input boundary edge, emit  
   `\<glslType\> g_\<sanitizedSource\>_\<sourceHandle\> = {{in:\<portId\>}};`  
   so inner blocks keep referencing the same `g_*` names they used when the predecessor was outside the selection.
4. **Epilogue**: for each output boundary edge, emit  
   `\<glslType\> {{out:\<portId\>}} = g_\<sanitizedSource\>_\<sourceHandle\>;`
5. **Moderate cleanup** on the concatenated node blocks only:
   - Remove **simple** assignment lines to `g_*` that are not in the backward-closure of variables needed for the epilogue (and not referenced by kept assignments).
   - Collapse extra blank lines / trim trailing spaces.

**Uniform prefix remap:** before emitting the custom `NodeTypeDef`, `buildBakedSelectionCustomType` accepts **`bakedNodeIdForUniforms`** (the id of the new shader node). When set, **`remapBakedSelectionUniforms`** rewrites `u_<oldNodeId>_` → `u_<bakedNodeId>_<oldNodeId>_` across the merged kernel so param uniforms are owned by the baked node and stay stable after replace. The editor (`tryBakeSelectionToCustomNode`) always passes the new node id. **Bake scene SDF** remains a separate feature with its own uniform story.

## Replacement

After creating the `NodeTypeDef` and appending it to `GraphDocument.customNodeTypes`:

1. Insert a new shader node whose `typeId` equals the new def’s `id`, positioned near the selection centroid.
2. Rewire: external → baked inputs; baked outputs → former external targets.
3. Delete all selected shader nodes and edges whose both ends lie in the selection.

## UX

- Toolbar action next to **Bake scene SDF**: **Bake selection** (disabled when compile errors or empty / invalid selection).

## Testing

- Unit test: small graph with 2–3 nodes, selection, bake, assert rewiring and custom type list.
- Regression: preset gallery compile still passes.
