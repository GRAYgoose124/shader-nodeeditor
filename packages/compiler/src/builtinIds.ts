export const BuiltinNodeId = {
	FragOutput: 'frag_output',
	RaymarchScene: 'raymarch_scene',
	SceneSdfSink: 'scene_sdf_sink',
	SceneSdfZoneBegin: 'scene_sdf_zone_begin',
	SceneSdfZoneEnd: 'scene_sdf_zone_end',
	SceneSdfRepeatBegin: 'scene_sdf_repeat_begin',
	SceneSdfRepeatEnd: 'scene_sdf_repeat_end',
	SdfParamP: 'sdf_param_p',
	SdfTessellateFeedback: 'sdf_tessellate_feedback',
	/** Composable motif pullback: same motif extraction as `sdf_tessellate_feedback`, selectable loop kernel. */
	SdfIteratePullback: 'sdf_iterate_pullback',
	DomainCallExportedVec3: 'domain_call_exported_vec3',
	DomainCallExportedSdf: 'domain_call_exported_sdf',
	/** Min union of `float fn(vec3)` frame export along an axis (finite literal count). */
	SdfRepeatExportedMin: 'sdf_repeat_exported_min',
	SdfAlbedo: 'sdf_albedo',
	SdfAlbedoScalarMix: 'sdf_albedo_scalar_mix',
	SdfPrimitive: 'sdf_primitive',
	SdfTorus: 'sdf_torus',
	SdfTorusKnot: 'sdf_torus_knot',
	FeedbackPassSubsteps: 'feedback_pass_substeps',
	GlslRepeatBegin: 'glsl_repeat_begin',
	GlslRepeatEnd: 'glsl_repeat_end',
} as const;

export type BuiltinNodeId = (typeof BuiltinNodeId)[keyof typeof BuiltinNodeId];

