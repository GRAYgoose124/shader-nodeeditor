export const RaymarchTemplateMarker = {
	BeginSky: 'BEGIN_RM_SKY',
	EndSky: 'END_RM_SKY',
	BeginRefl: 'BEGIN_RM_REFL',
	EndRefl: 'END_RM_REFL',
	BeginGi: 'BEGIN_RM_GI',
	EndGi: 'END_RM_GI',
	BeginSdfAlbedo: 'BEGIN_RM_SDF_ALBEDO',
	EndSdfAlbedo: 'END_RM_SDF_ALBEDO',
	BeginRefine: 'BEGIN_RM_REFINE',
	EndRefine: 'END_RM_REFINE',
	BeginPrimaryNormal: 'BEGIN_RM_PRIMARY_NORMAL',
	EndPrimaryNormal: 'END_RM_PRIMARY_NORMAL',
} as const;

export function markerBlockRE(begin: string, end: string): RegExp {
	// Match blocks with the exact newline + marker comment protocol used by raymarchSceneTemplate.
	return new RegExp(`\\n\\/\\/<<${begin}>>\\n([\\s\\S]*?)\\n\\/\\/<<${end}>>`, 'g');
}

