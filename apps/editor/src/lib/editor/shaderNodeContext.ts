export type ShaderNodePatchFn = (nodeId: string, paramId: string, value: number) => void;

/** Context key for `setContext` / `getContext` in `EditorFlowCanvas` → `ShaderNode`. */
export const SHADER_NODE_PATCH_KEY = 'st-shader-node-patch';
