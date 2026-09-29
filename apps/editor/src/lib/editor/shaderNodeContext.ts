export type ShaderNodePatchFn = (nodeId: string, paramId: string, value: number) => void;

export type ShaderNodeParamBypassPatchFn = (nodeId: string, paramId: string, bypassed: boolean) => void;

/** Context key for `setContext` / `getContext` in `EditorFlowCanvas` → `ShaderNode`. */
export const SHADER_NODE_PATCH_KEY = 'st-shader-node-patch';

export const SHADER_NODE_PARAM_BYPASS_KEY = 'st-shader-node-param-bypass';
