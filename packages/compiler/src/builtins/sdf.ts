import type { NodeTypeDef } from '../types.js';
import { raymarchSceneNode } from './sdfRaymarchSceneNode.js';
import { sdfNodesMain } from './sdfNodesMain.js';
import { sdfNodesTail } from './sdfNodesTail.js';

/**
 * SDF primitives, CSG, domain ops, raymarch.
 * Prefer composable nodes (`sdf_sphere`, `sdf_box`, `sdf_torus`, …) over **`sdf_primitive`**
 * when you want a readable graph; `sdf_primitive` remains for one-node ergonomics and presets.
 * Prefer `domain_rotate_euler*`, `domain_twist`, `domain_bend` over legacy single-axis nodes.
 * `domain_bend` is IQ cheap bend; `domain_twist` is helical (perpendicular-plane rotation)—not the same warp.
 *
 * Implementation is split across [`sdfNodesMain.ts`](./sdfNodesMain.ts) (barrel), [`sdfNodes/`](./sdfNodes/), [`sdfRaymarchSceneNode.ts`](./sdfRaymarchSceneNode.ts), and [`sdfNodesTail.ts`](./sdfNodesTail.ts); this file preserves export order for the builtin registry.
 */
export const sdfNodes: NodeTypeDef[] = [...sdfNodesMain, raymarchSceneNode, ...sdfNodesTail];
