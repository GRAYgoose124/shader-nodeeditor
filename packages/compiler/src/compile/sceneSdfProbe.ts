import type { SceneSdfProbeVisualization, UniformManifestEntry } from '../types.js';

/** GLSL: `p_dbg` = anchor plus optional XY spread from `v_uv` (see `u_dbg_scene_slice`). */
export const sceneSdfProbePointBlock = `vec3 p_dbg = u_dbg_scene_p;
if (u_dbg_scene_slice > 1e-8) {
  vec2 dq = (v_uv - 0.5) * 2.0 * u_dbg_scene_slice;
  p_dbg.xy += dq;
}
`;

/** Uniforms injected when scene SDF probe debug is compiled into a pass. */
export function pushSceneSdfProbeUniforms(passUniforms: UniformManifestEntry[]): void {
	const nodeId = '__dbg_scene__';
	passUniforms.push(
		{
			name: 'u_dbg_scene_on',
			type: 'float',
			nodeId,
			paramId: 'probe_on',
			default: 0,
			min: 0,
			max: 1,
			step: 1,
			label: 'Debug: SDF probe on',
		},
		{
			name: 'u_dbg_scene_p',
			type: 'vec3',
			nodeId,
			paramId: 'probe_p',
			default: [0, 0, 0],
			label: 'Debug: probe position (world)',
		},
		{
			name: 'u_dbg_scene_slice',
			type: 'float',
			nodeId,
			paramId: 'probe_slice',
			default: 1.25,
			min: 0,
			max: 50,
			step: 0.05,
			label: 'Debug: XY half-extent (0 = single point)',
		},
		{
			name: 'u_dbg_scene_scale',
			type: 'float',
			nodeId,
			paramId: 'probe_scale',
			default: 1,
			min: 1e-6,
			max: 1000,
			step: 0.01,
			label: 'Debug: distance / gradient scale',
		},
		{
			name: 'u_dbg_scene_eps',
			type: 'float',
			nodeId,
			paramId: 'probe_eps',
			default: 0.001,
			min: 1e-7,
			max: 0.1,
			step: 1e-6,
			label: 'Debug: gradient finite-diff eps',
		},
	);
}

/**
 * Early-out block at the start of `main()` — must run after `scene_sdf_*` is declared in the shader.
 */
export function sceneSdfProbeMainPreamble(sceneFnName: string, visualization: SceneSdfProbeVisualization): string {
	switch (visualization) {
		case 'distance_rgb':
			return `if (u_dbg_scene_on > 0.5) {
${sceneSdfProbePointBlock}
  float d_dbg = ${sceneFnName}(p_dbg);
  float s_dbg = clamp(0.5 + 0.5 * tanh(d_dbg * u_dbg_scene_scale), 0.0, 1.0);
  fragColor = vec4(s_dbg, s_dbg, s_dbg, 1.0);
  return;
}
`;
		case 'distance_nan_flags':
			return `if (u_dbg_scene_on > 0.5) {
${sceneSdfProbePointBlock}
  float d_dbg = ${sceneFnName}(p_dbg);
  bool nan_dbg = isnan(d_dbg);
  bool inf_dbg = isinf(d_dbg);
  float g_dbg = nan_dbg ? 1.0 : 0.0;
  float b_dbg = inf_dbg ? 1.0 : 0.0;
  float r_dbg = (nan_dbg || inf_dbg) ? 0.0 : clamp(0.5 + 0.5 * tanh(d_dbg * u_dbg_scene_scale), 0.0, 1.0);
  fragColor = vec4(r_dbg, g_dbg, b_dbg, 1.0);
  return;
}
`;
		case 'gradient_mag':
			return `if (u_dbg_scene_on > 0.5) {
${sceneSdfProbePointBlock}
  float e_dbg = max(u_dbg_scene_eps, 1e-7);
  float dx_dbg = ${sceneFnName}(p_dbg + vec3(e_dbg, 0.0, 0.0)) - ${sceneFnName}(p_dbg - vec3(e_dbg, 0.0, 0.0));
  float dy_dbg = ${sceneFnName}(p_dbg + vec3(0.0, e_dbg, 0.0)) - ${sceneFnName}(p_dbg - vec3(0.0, e_dbg, 0.0));
  float dz_dbg = ${sceneFnName}(p_dbg + vec3(0.0, 0.0, e_dbg)) - ${sceneFnName}(p_dbg - vec3(0.0, 0.0, e_dbg));
  float gm_dbg = length(vec3(dx_dbg, dy_dbg, dz_dbg)) / max(2.0 * e_dbg, 1e-7);
  float s_dbg = clamp(gm_dbg * u_dbg_scene_scale, 0.0, 1.0);
  fragColor = vec4(s_dbg, s_dbg * 0.7, s_dbg * 0.4, 1.0);
  return;
}
`;
		default: {
			const _exhaustive: never = visualization;
			return _exhaustive;
		}
	}
}
