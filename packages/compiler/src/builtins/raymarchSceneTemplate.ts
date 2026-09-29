/**
 * GLSL body for `raymarch_scene`. Placeholders {{nodeId}}, {{ns}}, {{sceneSdf}}, {{in:*}}, {{out:*}},
 * {{param:*}}, {{iChannel:param:surfTexChannel}} are filled by `expandTemplate` in compile.ts.
 */
const RM_CORE = `// node: {{nodeId}} — raymarch / lighting / https://iquilezles.org/articles/raymarchingdf/ https://iquilezles.org/articles/rmimprovement/ https://iquilezles.org/articles/palettes/ https://iquilezles.org/articles/normalsSDF/
vec3 rmo_{{ns}} = {{in:ro}};
vec3 rmd_{{ns}} = normalize({{in:rd}});
float tmc_{{ns}} = 0.0;
vec3 amb_{{ns}} = vec3(float({{param:ambR}}), float({{param:ambG}}), float({{param:ambB}}));
vec3 clm_{{ns}} = amb_{{ns}};
vec3 ldir_{{ns}} = vec3(float({{param:lx}}), float({{param:ly}}), float({{param:lz}}));
ldir_{{ns}} = ldir_{{ns}} / max(length(ldir_{{ns}}), 1e-4);
float hitMc_{{ns}} = 0.0;
float dLst_{{ns}} = 1e9;
float dtLst_{{ns}} = 0.0;
for (int imc_{{ns}} = 0; imc_{{ns}} < 512; imc_{{ns}}++) {
  if (float(imc_{{ns}}) >= float({{param:maxSteps}})) break;
  vec3 pmc_{{ns}} = rmo_{{ns}} + tmc_{{ns}} * rmd_{{ns}};
  float dmc_{{ns}} = {{sceneSdf}}(pmc_{{ns}});
  float hitEpsP_{{ns}} = max(float({{param:eps}}), float({{param:relHitEps}}) * max(tmc_{{ns}}, 1e-4));
  if (dmc_{{ns}} < hitEpsP_{{ns}}) {
    hitMc_{{ns}} = 1.0;
//<<BEGIN_RM_REFINE>>
    if (float({{param:surfaceRefineOn}}) > 0.5) {
      for (int srf_{{ns}} = 0; srf_{{ns}} < 4; srf_{{ns}}++) {
        float dsrf_{{ns}} = {{sceneSdf}}(pmc_{{ns}});
        pmc_{{ns}} -= rmd_{{ns}} * dsrf_{{ns}};
      }
    }
//<<END_RM_REFINE>>
    float nEpsU_{{ns}} = float({{param:nEps}}) * (1.0 + float({{param:nEpsRel}}) * max(tmc_{{ns}}, 1e-4));
//<<BEGIN_RM_PRIMARY_NORMAL>>
    vec3 nmc_{{ns}};
    if (float({{param:nTetra}}) > 0.5) {
      vec2 te_{{ns}} = vec2(1.0, -1.0) * 0.57735027 * nEpsU_{{ns}};
      nmc_{{ns}} = normalize(
        te_{{ns}}.xyy * {{sceneSdf}}(pmc_{{ns}} + te_{{ns}}.xyy) +
        te_{{ns}}.yyx * {{sceneSdf}}(pmc_{{ns}} + te_{{ns}}.yyx) +
        te_{{ns}}.yxy * {{sceneSdf}}(pmc_{{ns}} + te_{{ns}}.yxy) +
        te_{{ns}}.xxx * {{sceneSdf}}(pmc_{{ns}} + te_{{ns}}.xxx));
    } else if (float({{param:iqNormal}}) > 0.5) {
      vec2 ve_{{ns}} = vec2(nEpsU_{{ns}}, 0.0);
      nmc_{{ns}} = normalize(vec3(
        {{sceneSdf}}(pmc_{{ns}} + ve_{{ns}}.xyy) - {{sceneSdf}}(pmc_{{ns}} - ve_{{ns}}.xyy),
        {{sceneSdf}}(pmc_{{ns}} + ve_{{ns}}.yxy) - {{sceneSdf}}(pmc_{{ns}} - ve_{{ns}}.yxy),
        {{sceneSdf}}(pmc_{{ns}} + ve_{{ns}}.yyx) - {{sceneSdf}}(pmc_{{ns}} - ve_{{ns}}.yyx)));
    } else {
      nmc_{{ns}} = normalize(pmc_{{ns}});
    }
//<<END_RM_PRIMARY_NORMAL>>
    float df_{{ns}} = max(dot(nmc_{{ns}}, ldir_{{ns}}), 0.0);
    float sha_{{ns}} = 1.0;
    if (float({{param:softShadow}}) > 0.5) {
      vec3 shRo_{{ns}} = pmc_{{ns}} + nmc_{{ns}} * float({{param:shadowNormalBias}}) + ldir_{{ns}} * float({{param:shadowLightBias}});
      float tsh_{{ns}} = float({{param:shadowStart}});
      float shEps_{{ns}} = float({{param:shadowHitEps}});
      float shRelax_{{ns}} = float({{param:shadowStepRelax}}) * float({{param:distTrust}});
      for (int ish_{{ns}} = 0; ish_{{ns}} < 40; ish_{{ns}}++) {
        float dh_{{ns}} = {{sceneSdf}}(shRo_{{ns}} + ldir_{{ns}} * tsh_{{ns}});
        float shShell_{{ns}} = shEps_{{ns}} * (3.0 + 0.06 * tsh_{{ns}});
        sha_{{ns}} = min(sha_{{ns}}, smoothstep(0.0, shShell_{{ns}}, dh_{{ns}}));
        sha_{{ns}} = min(sha_{{ns}}, float({{param:shadowK}}) * max(dh_{{ns}}, 0.0) / max(tsh_{{ns}}, 1e-4));
        tsh_{{ns}} += clamp(dh_{{ns}} * shRelax_{{ns}}, float({{param:shadowStepMin}}), float({{param:shadowStepMax}}));
        if (tsh_{{ns}} > float({{param:shadowMax}})) break;
        if (sha_{{ns}} < 0.001) break;
      }
    }
    float occ_{{ns}} = 1.0;
    if (float({{param:aoOn}}) > 0.5) {
      float sca_{{ns}} = 1.0;
      float tao_{{ns}} = float({{param:aoStep}});
      for (int iao_{{ns}} = 0; iao_{{ns}} < 5; iao_{{ns}}++) {
        float dao_{{ns}} = {{sceneSdf}}(pmc_{{ns}} + nmc_{{ns}} * tao_{{ns}});
        sca_{{ns}} = min(sca_{{ns}}, dao_{{ns}} / max(tao_{{ns}}, 1e-4));
        tao_{{ns}} += float({{param:aoStep}});
      }
      occ_{{ns}} = clamp(1.0 - float({{param:aoAmp}}) * (1.0 - sca_{{ns}}), 0.0, 1.0);
    }
    float tsOn_{{ns}} = float({{param:surfTexOn}});
    float tsu_{{ns}} = float({{param:surfTexScale}});
    vec3 texRaw_{{ns}};
    if (float({{param:surfTexMode}}) < 0.5) {
      vec3 an_{{ns}} = abs(nmc_{{ns}});
      vec3 nw_{{ns}} = an_{{ns}} / max(dot(an_{{ns}}, vec3(1.0)), 1e-4);
      // Always call texture() (do not gate on surfTexOn): some drivers strip samplers only used inside uniform branches.
      vec3 samX_{{ns}} = texture({{iChannel:param:surfTexChannel}}, pmc_{{ns}}.yz * tsu_{{ns}}).rgb;
      vec3 samY_{{ns}} = texture({{iChannel:param:surfTexChannel}}, pmc_{{ns}}.zx * tsu_{{ns}}).rgb;
      vec3 samZ_{{ns}} = texture({{iChannel:param:surfTexChannel}}, pmc_{{ns}}.xy * tsu_{{ns}}).rgb;
      texRaw_{{ns}} = samX_{{ns}} * nw_{{ns}}.x + samY_{{ns}} * nw_{{ns}}.y + samZ_{{ns}} * nw_{{ns}}.z;
    } else {
      vec2 tcyl_{{ns}} = vec2(atan(pmc_{{ns}}.x, pmc_{{ns}}.z) * 0.159154943, pmc_{{ns}}.y) * tsu_{{ns}};
      texRaw_{{ns}} = texture({{iChannel:param:surfTexChannel}}, tcyl_{{ns}}).rgb;
    }
    vec3 texMix_{{ns}} = mix(vec3(1.0), texRaw_{{ns}}, clamp(float({{param:surfTexBlend}}), 0.0, 1.0) * step(0.5, tsOn_{{ns}}));
//<<BEGIN_RM_SDF_ALBEDO>>
    texMix_{{ns}} *= {{sceneMatFn}}(pmc_{{ns}});
//<<END_RM_SDF_ALBEDO>>
    vec3 base_{{ns}} = vec3(0.06, 0.07, 0.1);
    vec3 sun_{{ns}} = vec3(0.85, 0.82, 0.78);
    vec3 pal_{{ns}} = 0.5 + 0.5 * cos(vec3(float({{param:palA}}), float({{param:palB}}), float({{param:palC}})) + df_{{ns}} * 6.28318 + vec3(0.0, 2.1, 4.2));
    vec3 sunMix_{{ns}} = mix(sun_{{ns}}, pal_{{ns}}, float({{param:palMix}}));
    vec3 lit_{{ns}} = (base_{{ns}} + df_{{ns}} * sha_{{ns}} * sunMix_{{ns}}) * texMix_{{ns}};
    if (float({{param:specOn}}) > 0.5) {
      vec3 V_{{ns}} = -rmd_{{ns}};
      vec3 H_{{ns}} = normalize(ldir_{{ns}} + V_{{ns}});
      lit_{{ns}} += float({{param:specStr}}) * pow(max(dot(nmc_{{ns}}, H_{{ns}}), 0.0), float({{param:specPow}})) * sunMix_{{ns}};
    }
    if (float({{param:curvAmp}}) > 0.001) {
      float cu_{{ns}} = ({{sceneSdf}}(pmc_{{ns}} + nmc_{{ns}} * float({{param:curvEps}})) + {{sceneSdf}}(pmc_{{ns}} - nmc_{{ns}} * float({{param:curvEps}}))) / max(float({{param:curvEps}}), 1e-5);
      lit_{{ns}} *= clamp(1.0 - float({{param:curvAmp}}) * max(cu_{{ns}}, 0.0), 0.25, 1.0);
    }
    clm_{{ns}} = amb_{{ns}} + occ_{{ns}} * lit_{{ns}};
`;

const RM_OPTIONAL_AND_FOG = `//<<BEGIN_RM_SKY>>
    if (float({{param:skyBounceOn}}) > 0.5 && float({{param:skyStr}}) > 0.001) {
      vec3 rdSky_{{ns}} = reflect(rmd_{{ns}}, nmc_{{ns}});
      float tSk_{{ns}} = float({{param:skyBias}});
      float missS_{{ns}} = 1.0;
      for (int isk_{{ns}} = 0; isk_{{ns}} < 16; isk_{{ns}}++) {
        if (float(isk_{{ns}}) >= float({{param:skySteps}})) break;
        vec3 pSk_{{ns}} = pmc_{{ns}} + nmc_{{ns}} * float({{param:skyBias}}) + rdSky_{{ns}} * tSk_{{ns}};
        float dSk_{{ns}} = {{sceneSdf}}(pSk_{{ns}});
        float hitEpsSk_{{ns}} = max(float({{param:eps}}), float({{param:relHitEps}}) * max(tSk_{{ns}}, 1e-4));
        if (dSk_{{ns}} < hitEpsSk_{{ns}}) { missS_{{ns}} = 0.0; break; }
        float dtSkR_{{ns}} = max(dSk_{{ns}} * float({{param:stepScale}}) * float({{param:distTrust}}), float({{param:minStep}}));
        float dtSk_{{ns}} = dtSkR_{{ns}};
        if (float({{param:maxStepAbs}}) > 0.0) dtSk_{{ns}} = min(dtSk_{{ns}}, float({{param:maxStepAbs}}));
        if (float({{param:maxStepRelT}}) > 0.0) dtSk_{{ns}} = min(dtSk_{{ns}}, float({{param:maxStepRelT}}) * max(tSk_{{ns}}, 1e-4));
        tSk_{{ns}} += dtSk_{{ns}};
        if (tSk_{{ns}} > float({{param:skyMaxT}})) break;
      }
      vec3 skyT_{{ns}} = vec3(float({{param:skyTopR}}), float({{param:skyTopG}}), float({{param:skyTopB}}));
      vec3 skyB_{{ns}} = vec3(float({{param:skyBotR}}), float({{param:skyBotG}}), float({{param:skyBotB}}));
      vec3 skyC_{{ns}} = mix(skyB_{{ns}}, skyT_{{ns}}, clamp(0.5 + 0.5 * rdSky_{{ns}}.y, 0.0, 1.0));
      clm_{{ns}} += missS_{{ns}} * skyC_{{ns}} * float({{param:skyStr}});
    }
//<<END_RM_SKY>>
//<<BEGIN_RM_REFL>>
    if (float({{param:reflOn}}) > 0.5 && float({{param:reflStr}}) > 0.001) {
      vec3 rvd_{{ns}} = reflect(rmd_{{ns}}, nmc_{{ns}});
      float rti_{{ns}} = float({{param:reflBias}});
      vec3 rcol_{{ns}} = vec3(0.0);
      float rhit_{{ns}} = 0.0;
      for (int ir_{{ns}} = 0; ir_{{ns}} < 8; ir_{{ns}}++) {
        if (float(ir_{{ns}}) >= float({{param:reflSteps}})) break;
        vec3 rpp_{{ns}} = pmc_{{ns}} + nmc_{{ns}} * float({{param:reflBias}}) + rvd_{{ns}} * rti_{{ns}};
        float rdi_{{ns}} = {{sceneSdf}}(rpp_{{ns}});
        float hitEpsR_{{ns}} = max(float({{param:eps}}), float({{param:relHitEps}}) * max(rti_{{ns}}, 1e-4));
        if (rdi_{{ns}} < hitEpsR_{{ns}}) {
          float nEpsUr_{{ns}} = float({{param:nEps}}) * (1.0 + float({{param:nEpsRel}}) * max(rti_{{ns}}, 1e-4));
          vec3 nnr_{{ns}};
          if (float({{param:nTetra}}) > 0.5) {
            vec2 ter_{{ns}} = vec2(1.0, -1.0) * 0.57735027 * nEpsUr_{{ns}};
            nnr_{{ns}} = normalize(
              ter_{{ns}}.xyy * {{sceneSdf}}(rpp_{{ns}} + ter_{{ns}}.xyy) +
              ter_{{ns}}.yyx * {{sceneSdf}}(rpp_{{ns}} + ter_{{ns}}.yyx) +
              ter_{{ns}}.yxy * {{sceneSdf}}(rpp_{{ns}} + ter_{{ns}}.yxy) +
              ter_{{ns}}.xxx * {{sceneSdf}}(rpp_{{ns}} + ter_{{ns}}.xxx));
          } else if (float({{param:iqNormal}}) > 0.5) {
            vec2 ver_{{ns}} = vec2(nEpsUr_{{ns}}, 0.0);
            nnr_{{ns}} = normalize(vec3(
              {{sceneSdf}}(rpp_{{ns}} + ver_{{ns}}.xyy) - {{sceneSdf}}(rpp_{{ns}} - ver_{{ns}}.xyy),
              {{sceneSdf}}(rpp_{{ns}} + ver_{{ns}}.yxy) - {{sceneSdf}}(rpp_{{ns}} - ver_{{ns}}.yxy),
              {{sceneSdf}}(rpp_{{ns}} + ver_{{ns}}.yyx) - {{sceneSdf}}(rpp_{{ns}} - ver_{{ns}}.yyx)));
          } else {
            nnr_{{ns}} = normalize(rpp_{{ns}});
          }
          float dfr_{{ns}} = max(dot(nnr_{{ns}}, ldir_{{ns}}), 0.0);
          float shar_{{ns}} = 1.0;
          if (float({{param:softShadow}}) > 0.5) {
            vec3 shRor_{{ns}} = rpp_{{ns}} + nnr_{{ns}} * float({{param:shadowNormalBias}}) + ldir_{{ns}} * float({{param:shadowLightBias}});
            float tshr_{{ns}} = float({{param:shadowStart}});
            float shEpsr_{{ns}} = float({{param:shadowHitEps}});
            float shRelaxR_{{ns}} = float({{param:shadowStepRelax}}) * float({{param:distTrust}});
            for (int ishr_{{ns}} = 0; ishr_{{ns}} < 40; ishr_{{ns}}++) {
              float dhr_{{ns}} = {{sceneSdf}}(shRor_{{ns}} + ldir_{{ns}} * tshr_{{ns}});
              float shShellR_{{ns}} = shEpsr_{{ns}} * (3.0 + 0.06 * tshr_{{ns}});
              shar_{{ns}} = min(shar_{{ns}}, smoothstep(0.0, shShellR_{{ns}}, dhr_{{ns}}));
              shar_{{ns}} = min(shar_{{ns}}, float({{param:shadowK}}) * max(dhr_{{ns}}, 0.0) / max(tshr_{{ns}}, 1e-4));
              tshr_{{ns}} += clamp(dhr_{{ns}} * shRelaxR_{{ns}}, float({{param:shadowStepMin}}), float({{param:shadowStepMax}}));
              if (tshr_{{ns}} > float({{param:shadowMax}})) break;
              if (shar_{{ns}} < 0.001) break;
            }
          }
          float occr_{{ns}} = 1.0;
          if (float({{param:aoOn}}) > 0.5) {
            float scar_{{ns}} = 1.0;
            float taor_{{ns}} = float({{param:aoStep}});
            for (int iaor_{{ns}} = 0; iaor_{{ns}} < 5; iaor_{{ns}}++) {
              float daor_{{ns}} = {{sceneSdf}}(rpp_{{ns}} + nnr_{{ns}} * taor_{{ns}});
              scar_{{ns}} = min(scar_{{ns}}, daor_{{ns}} / max(taor_{{ns}}, 1e-4));
              taor_{{ns}} += float({{param:aoStep}});
            }
            occr_{{ns}} = clamp(1.0 - float({{param:aoAmp}}) * (1.0 - scar_{{ns}}), 0.0, 1.0);
          }
          vec3 texRawR_{{ns}};
          if (float({{param:surfTexMode}}) < 0.5) {
            vec3 anr_{{ns}} = abs(nnr_{{ns}});
            vec3 nwr_{{ns}} = anr_{{ns}} / max(dot(anr_{{ns}}, vec3(1.0)), 1e-4);
            vec3 samXR_{{ns}} = texture({{iChannel:param:surfTexChannel}}, rpp_{{ns}}.yz * tsu_{{ns}}).rgb;
            vec3 samYR_{{ns}} = texture({{iChannel:param:surfTexChannel}}, rpp_{{ns}}.zx * tsu_{{ns}}).rgb;
            vec3 samZR_{{ns}} = texture({{iChannel:param:surfTexChannel}}, rpp_{{ns}}.xy * tsu_{{ns}}).rgb;
            texRawR_{{ns}} = samXR_{{ns}} * nwr_{{ns}}.x + samYR_{{ns}} * nwr_{{ns}}.y + samZR_{{ns}} * nwr_{{ns}}.z;
          } else {
            vec2 tcylR_{{ns}} = vec2(atan(rpp_{{ns}}.x, rpp_{{ns}}.z) * 0.159154943, rpp_{{ns}}.y) * tsu_{{ns}};
            texRawR_{{ns}} = texture({{iChannel:param:surfTexChannel}}, tcylR_{{ns}}).rgb;
          }
          vec3 texMixR_{{ns}} = mix(vec3(1.0), texRawR_{{ns}}, clamp(float({{param:surfTexBlend}}), 0.0, 1.0) * step(0.5, tsOn_{{ns}}));
          vec3 palr_{{ns}} = 0.5 + 0.5 * cos(vec3(float({{param:palA}}), float({{param:palB}}), float({{param:palC}})) + dfr_{{ns}} * 6.28318 + vec3(0.0, 2.1, 4.2));
          vec3 sunMixR_{{ns}} = mix(sun_{{ns}}, palr_{{ns}}, float({{param:palMix}}));
          vec3 litR_{{ns}} = (base_{{ns}} + dfr_{{ns}} * shar_{{ns}} * sunMixR_{{ns}}) * texMixR_{{ns}};
          if (float({{param:specOn}}) > 0.5) {
            vec3 VR_{{ns}} = -rvd_{{ns}};
            vec3 HR_{{ns}} = normalize(ldir_{{ns}} + VR_{{ns}});
            litR_{{ns}} += float({{param:specStr}}) * pow(max(dot(nnr_{{ns}}, HR_{{ns}}), 0.0), float({{param:specPow}})) * sunMixR_{{ns}};
          }
          if (float({{param:curvAmp}}) > 0.001) {
            float cur_{{ns}} = ({{sceneSdf}}(rpp_{{ns}} + nnr_{{ns}} * float({{param:curvEps}})) + {{sceneSdf}}(rpp_{{ns}} - nnr_{{ns}} * float({{param:curvEps}}))) / max(float({{param:curvEps}}), 1e-5);
            litR_{{ns}} *= clamp(1.0 - float({{param:curvAmp}}) * max(cur_{{ns}}, 0.0), 0.25, 1.0);
          }
          rcol_{{ns}} = amb_{{ns}} + occr_{{ns}} * litR_{{ns}};
          rhit_{{ns}} = 1.0;
          break;
        }
        float dtRfR_{{ns}} = max(rdi_{{ns}} * float({{param:reflStepScale}}) * float({{param:distTrust}}), float({{param:minStep}}));
        float dtRf_{{ns}} = dtRfR_{{ns}};
        if (float({{param:maxStepAbs}}) > 0.0) dtRf_{{ns}} = min(dtRf_{{ns}}, float({{param:maxStepAbs}}));
        if (float({{param:maxStepRelT}}) > 0.0) dtRf_{{ns}} = min(dtRf_{{ns}}, float({{param:maxStepRelT}}) * max(rti_{{ns}}, 1e-4));
        rti_{{ns}} += dtRf_{{ns}};
        if (rti_{{ns}} > float({{param:reflMaxDist}})) break;
      }
      float F0d_{{ns}} = 0.04;
      float cosTh_{{ns}} = clamp(max(dot(nmc_{{ns}}, -rmd_{{ns}}), 0.0), 0.0, 1.0);
      float Frsch_{{ns}} = F0d_{{ns}} + (1.0 - F0d_{{ns}}) * pow(1.0 - cosTh_{{ns}}, 5.0);
      float reflW_{{ns}} = float({{param:reflStr}}) * rhit_{{ns}} * mix(1.0, Frsch_{{ns}}, clamp(float({{param:reflFresnel}}), 0.0, 1.0));
      clm_{{ns}} = mix(clm_{{ns}}, rcol_{{ns}}, clamp(reflW_{{ns}}, 0.0, 1.0));
    }
//<<END_RM_REFL>>
//<<BEGIN_RM_GI>>
    if (float({{param:giOn}}) > 0.5 && float({{param:giStr}}) > 0.001) {
      vec3 giAcc_{{ns}} = vec3(0.0);
      vec3 gix_{{ns}} = cross(nmc_{{ns}}, vec3(0.901, 0.302, 0.187));
      gix_{{ns}} = gix_{{ns}} / max(length(gix_{{ns}}), 1e-4);
      vec3 giy_{{ns}} = normalize(cross(nmc_{{ns}}, gix_{{ns}}));
      gix_{{ns}} = normalize(cross(giy_{{ns}}, nmc_{{ns}}));
      for (int igi_{{ns}} = 0; igi_{{ns}} < 3; igi_{{ns}}++) {
        float ga_{{ns}} = float(igi_{{ns}}) * 2.0943951 + sin(gl_FragCoord.x * 0.07 + float(igi_{{ns}}) * 1.7) * 0.73;
        float gb_{{ns}} = float(igi_{{ns}}) * 1.0471976 + cos(gl_FragCoord.y * 0.09 + float(igi_{{ns}}) * 2.3) * 0.61;
        vec3 wi0_{{ns}} = normalize(gix_{{ns}} * cos(ga_{{ns}}) * 0.62 + giy_{{ns}} * sin(ga_{{ns}}) * 0.62 + nmc_{{ns}} * max(0.35, abs(sin(gb_{{ns}}))));
        vec3 wi_{{ns}} = normalize(mix(wi0_{{ns}}, nmc_{{ns}}, clamp(float({{param:giRough}}), 0.0, 1.0)));
        float ndwi_{{ns}} = max(dot(nmc_{{ns}}, wi_{{ns}}), 0.0);
        if (ndwi_{{ns}} < 0.02) continue;
        float tgi_{{ns}} = float({{param:giBias}});
        vec3 pgi0_{{ns}} = pmc_{{ns}} + nmc_{{ns}} * float({{param:giBias}});
        vec3 gicol_{{ns}} = vec3(0.0);
        for (int jgi_{{ns}} = 0; jgi_{{ns}} < 48; jgi_{{ns}}++) {
          if (float(jgi_{{ns}}) >= float({{param:giSteps}})) break;
          vec3 pg_{{ns}} = pgi0_{{ns}} + wi_{{ns}} * tgi_{{ns}};
          float dg_{{ns}} = {{sceneSdf}}(pg_{{ns}});
          float heG_{{ns}} = max(float({{param:eps}}), float({{param:relHitEps}}) * max(tgi_{{ns}}, 1e-4));
          if (dg_{{ns}} < heG_{{ns}}) {
            float nEpsUG_{{ns}} = float({{param:nEps}}) * (1.0 + float({{param:nEpsRel}}) * max(tgi_{{ns}}, 1e-4));
            vec3 nnG_{{ns}};
            if (float({{param:nTetra}}) > 0.5) {
              vec2 teG_{{ns}} = vec2(1.0, -1.0) * 0.57735027 * nEpsUG_{{ns}};
              nnG_{{ns}} = normalize(
                teG_{{ns}}.xyy * {{sceneSdf}}(pg_{{ns}} + teG_{{ns}}.xyy) +
                teG_{{ns}}.yyx * {{sceneSdf}}(pg_{{ns}} + teG_{{ns}}.yyx) +
                teG_{{ns}}.yxy * {{sceneSdf}}(pg_{{ns}} + teG_{{ns}}.yxy) +
                teG_{{ns}}.xxx * {{sceneSdf}}(pg_{{ns}} + teG_{{ns}}.xxx));
            } else if (float({{param:iqNormal}}) > 0.5) {
              vec2 veG_{{ns}} = vec2(nEpsUG_{{ns}}, 0.0);
              nnG_{{ns}} = normalize(vec3(
                {{sceneSdf}}(pg_{{ns}} + veG_{{ns}}.xyy) - {{sceneSdf}}(pg_{{ns}} - veG_{{ns}}.xyy),
                {{sceneSdf}}(pg_{{ns}} + veG_{{ns}}.yxy) - {{sceneSdf}}(pg_{{ns}} - veG_{{ns}}.yxy),
                {{sceneSdf}}(pg_{{ns}} + veG_{{ns}}.yyx) - {{sceneSdf}}(pg_{{ns}} - veG_{{ns}}.yyx)));
            } else {
              nnG_{{ns}} = normalize(pg_{{ns}});
            }
            float dfG_{{ns}} = max(dot(nnG_{{ns}}, ldir_{{ns}}), 0.0);
            float shaG_{{ns}} = 1.0;
            if (float({{param:softShadow}}) > 0.5) {
              vec3 shRoG_{{ns}} = pg_{{ns}} + nnG_{{ns}} * float({{param:shadowNormalBias}}) + ldir_{{ns}} * float({{param:shadowLightBias}});
              float tshG_{{ns}} = float({{param:shadowStart}});
              float shEpsG_{{ns}} = float({{param:shadowHitEps}});
              float shRelaxG_{{ns}} = float({{param:shadowStepRelax}}) * float({{param:distTrust}});
              for (int ishG_{{ns}} = 0; ishG_{{ns}} < 40; ishG_{{ns}}++) {
                float dhG_{{ns}} = {{sceneSdf}}(shRoG_{{ns}} + ldir_{{ns}} * tshG_{{ns}});
                float shShellG_{{ns}} = shEpsG_{{ns}} * (3.0 + 0.06 * tshG_{{ns}});
                shaG_{{ns}} = min(shaG_{{ns}}, smoothstep(0.0, shShellG_{{ns}}, dhG_{{ns}}));
                shaG_{{ns}} = min(shaG_{{ns}}, float({{param:shadowK}}) * max(dhG_{{ns}}, 0.0) / max(tshG_{{ns}}, 1e-4));
                tshG_{{ns}} += clamp(dhG_{{ns}} * shRelaxG_{{ns}}, float({{param:shadowStepMin}}), float({{param:shadowStepMax}}));
                if (tshG_{{ns}} > float({{param:shadowMax}})) break;
                if (shaG_{{ns}} < 0.001) break;
              }
            }
            vec3 texRawG_{{ns}};
            if (float({{param:surfTexMode}}) < 0.5) {
              vec3 anG_{{ns}} = abs(nnG_{{ns}});
              vec3 nwG_{{ns}} = anG_{{ns}} / max(dot(anG_{{ns}}, vec3(1.0)), 1e-4);
              vec3 samXG_{{ns}} = texture({{iChannel:param:surfTexChannel}}, pg_{{ns}}.yz * tsu_{{ns}}).rgb;
              vec3 samYG_{{ns}} = texture({{iChannel:param:surfTexChannel}}, pg_{{ns}}.zx * tsu_{{ns}}).rgb;
              vec3 samZG_{{ns}} = texture({{iChannel:param:surfTexChannel}}, pg_{{ns}}.xy * tsu_{{ns}}).rgb;
              texRawG_{{ns}} = samXG_{{ns}} * nwG_{{ns}}.x + samYG_{{ns}} * nwG_{{ns}}.y + samZG_{{ns}} * nwG_{{ns}}.z;
            } else {
              vec2 tcylG_{{ns}} = vec2(atan(pg_{{ns}}.x, pg_{{ns}}.z) * 0.159154943, pg_{{ns}}.y) * tsu_{{ns}};
              texRawG_{{ns}} = texture({{iChannel:param:surfTexChannel}}, tcylG_{{ns}}).rgb;
            }
            vec3 texMixG_{{ns}} = mix(vec3(1.0), texRawG_{{ns}}, clamp(float({{param:surfTexBlend}}), 0.0, 1.0) * step(0.5, tsOn_{{ns}}));
            vec3 palG_{{ns}} = 0.5 + 0.5 * cos(vec3(float({{param:palA}}), float({{param:palB}}), float({{param:palC}})) + dfG_{{ns}} * 6.28318 + vec3(0.0, 2.1, 4.2));
            vec3 sunMixG_{{ns}} = mix(sun_{{ns}}, palG_{{ns}}, float({{param:palMix}}));
            gicol_{{ns}} = (amb_{{ns}} + dfG_{{ns}} * shaG_{{ns}} * sunMixG_{{ns}}) * texMixG_{{ns}};
            if (float({{param:giSecondBounce}}) > 0.5) {
              vec3 wi2_{{ns}} = normalize(nnG_{{ns}} + gix_{{ns}} * 0.41 + giy_{{ns}} * 0.27);
              float t2_{{ns}} = float({{param:giBias}});
              vec3 p2b_{{ns}} = pg_{{ns}} + nnG_{{ns}} * float({{param:giBias}});
              for (int jg2_{{ns}} = 0; jg2_{{ns}} < 8; jg2_{{ns}}++) {
                if (float(jg2_{{ns}}) >= float({{param:giSteps2}})) break;
                vec3 p2_{{ns}} = p2b_{{ns}} + wi2_{{ns}} * t2_{{ns}};
                float d2_{{ns}} = {{sceneSdf}}(p2_{{ns}});
                float he2_{{ns}} = max(float({{param:eps}}), float({{param:relHitEps}}) * max(t2_{{ns}}, 1e-4));
                if (d2_{{ns}} < he2_{{ns}}) {
                  float nE2_{{ns}} = float({{param:nEps}}) * (1.0 + float({{param:nEpsRel}}) * max(t2_{{ns}}, 1e-4));
                  vec3 nn2_{{ns}};
                  if (float({{param:iqNormal}}) > 0.5) {
                    vec2 ve2_{{ns}} = vec2(nE2_{{ns}}, 0.0);
                    nn2_{{ns}} = normalize(vec3(
                      {{sceneSdf}}(p2_{{ns}} + ve2_{{ns}}.xyy) - {{sceneSdf}}(p2_{{ns}} - ve2_{{ns}}.xyy),
                      {{sceneSdf}}(p2_{{ns}} + ve2_{{ns}}.yxy) - {{sceneSdf}}(p2_{{ns}} - ve2_{{ns}}.yxy),
                      {{sceneSdf}}(p2_{{ns}} + ve2_{{ns}}.yyx) - {{sceneSdf}}(p2_{{ns}} - ve2_{{ns}}.yyx)));
                  } else {
                    nn2_{{ns}} = normalize(p2_{{ns}});
                  }
                  float df2_{{ns}} = max(dot(nn2_{{ns}}, ldir_{{ns}}), 0.0);
                  float sha2_{{ns}} = 1.0;
                  if (float({{param:softShadow}}) > 0.5) {
                    vec3 shRo2_{{ns}} = p2_{{ns}} + nn2_{{ns}} * float({{param:shadowNormalBias}}) + ldir_{{ns}} * float({{param:shadowLightBias}});
                    float ts2_{{ns}} = float({{param:shadowStart}});
                    float shEps2_{{ns}} = float({{param:shadowHitEps}});
                    float shRelax2_{{ns}} = float({{param:shadowStepRelax}}) * float({{param:distTrust}});
                    for (int is2_{{ns}} = 0; is2_{{ns}} < 20; is2_{{ns}}++) {
                      float dh2_{{ns}} = {{sceneSdf}}(shRo2_{{ns}} + ldir_{{ns}} * ts2_{{ns}});
                      float shShell2_{{ns}} = shEps2_{{ns}} * (3.0 + 0.06 * ts2_{{ns}});
                      sha2_{{ns}} = min(sha2_{{ns}}, smoothstep(0.0, shShell2_{{ns}}, dh2_{{ns}}));
                      sha2_{{ns}} = min(sha2_{{ns}}, float({{param:shadowK}}) * max(dh2_{{ns}}, 0.0) / max(ts2_{{ns}}, 1e-4));
                      ts2_{{ns}} += clamp(dh2_{{ns}} * shRelax2_{{ns}}, float({{param:shadowStepMin}}), float({{param:shadowStepMax}}));
                      if (ts2_{{ns}} > float({{param:shadowMax}}) * 0.5) break;
                      if (sha2_{{ns}} < 0.001) break;
                    }
                  }
                  vec3 tr2_{{ns}};
                  if (float({{param:surfTexMode}}) < 0.5) {
                    vec3 an2_{{ns}} = abs(nn2_{{ns}});
                    vec3 nw2_{{ns}} = an2_{{ns}} / max(dot(an2_{{ns}}, vec3(1.0)), 1e-4);
                    tr2_{{ns}} = texture({{iChannel:param:surfTexChannel}}, p2_{{ns}}.yz * tsu_{{ns}}).rgb * nw2_{{ns}}.x
                      + texture({{iChannel:param:surfTexChannel}}, p2_{{ns}}.zx * tsu_{{ns}}).rgb * nw2_{{ns}}.y
                      + texture({{iChannel:param:surfTexChannel}}, p2_{{ns}}.xy * tsu_{{ns}}).rgb * nw2_{{ns}}.z;
                  } else {
                    vec2 tc2_{{ns}} = vec2(atan(p2_{{ns}}.x, p2_{{ns}}.z) * 0.159154943, p2_{{ns}}.y) * tsu_{{ns}};
                    tr2_{{ns}} = texture({{iChannel:param:surfTexChannel}}, tc2_{{ns}}).rgb;
                  }
                  vec3 tm2_{{ns}} = mix(vec3(1.0), tr2_{{ns}}, clamp(float({{param:surfTexBlend}}), 0.0, 1.0) * step(0.5, tsOn_{{ns}}));
                  vec3 pal2_{{ns}} = 0.5 + 0.5 * cos(vec3(float({{param:palA}}), float({{param:palB}}), float({{param:palC}})) + df2_{{ns}} * 6.28318 + vec3(0.0, 2.1, 4.2));
                  vec3 sm2_{{ns}} = mix(sun_{{ns}}, pal2_{{ns}}, float({{param:palMix}}));
                  gicol_{{ns}} += float({{param:giSecondStr}}) * (amb_{{ns}} + df2_{{ns}} * sha2_{{ns}} * sm2_{{ns}}) * tm2_{{ns}};
                  break;
                }
                float dt2R_{{ns}} = max(d2_{{ns}} * float({{param:stepScale}}) * float({{param:distTrust}}), float({{param:minStep}}));
                float dt2_{{ns}} = dt2R_{{ns}};
                if (float({{param:maxStepAbs}}) > 0.0) dt2_{{ns}} = min(dt2_{{ns}}, float({{param:maxStepAbs}}));
                if (float({{param:maxStepRelT}}) > 0.0) dt2_{{ns}} = min(dt2_{{ns}}, float({{param:maxStepRelT}}) * max(t2_{{ns}}, 1e-4));
                t2_{{ns}} += dt2_{{ns}};
                if (t2_{{ns}} > float({{param:giMaxDist}}) * 0.5) break;
              }
            }
            break;
          }
          float dtGiR_{{ns}} = max(dg_{{ns}} * float({{param:stepScale}}) * float({{param:distTrust}}), float({{param:minStep}}));
          float dtGi_{{ns}} = dtGiR_{{ns}};
          if (float({{param:maxStepAbs}}) > 0.0) dtGi_{{ns}} = min(dtGi_{{ns}}, float({{param:maxStepAbs}}));
          if (float({{param:maxStepRelT}}) > 0.0) dtGi_{{ns}} = min(dtGi_{{ns}}, float({{param:maxStepRelT}}) * max(tgi_{{ns}}, 1e-4));
          tgi_{{ns}} += dtGi_{{ns}};
          if (tgi_{{ns}} > float({{param:giMaxDist}})) break;
        }
        giAcc_{{ns}} += gicol_{{ns}} * ndwi_{{ns}};
      }
      clm_{{ns}} += float({{param:giStr}}) * giAcc_{{ns}} * (0.5 * 0.318309886); // ~hemisphere / pi for 3 cosine-weighted-ish samples
    }
//<<END_RM_GI>>
    break;
  }
  dLst_{{ns}} = dmc_{{ns}};
  float dtMcRaw_{{ns}} = max(dmc_{{ns}} * float({{param:stepScale}}) * float({{param:distTrust}}), float({{param:minStep}}));
  float dtMc_{{ns}} = dtMcRaw_{{ns}};
  if (float({{param:maxStepAbs}}) > 0.0) dtMc_{{ns}} = min(dtMc_{{ns}}, float({{param:maxStepAbs}}));
  if (float({{param:maxStepRelT}}) > 0.0) dtMc_{{ns}} = min(dtMc_{{ns}}, float({{param:maxStepRelT}}) * max(tmc_{{ns}}, 1e-4));
  dtLst_{{ns}} = dtMc_{{ns}};
  tmc_{{ns}} += dtMc_{{ns}};
  if (tmc_{{ns}} > float({{param:maxDist}})) break;
}
if (hitMc_{{ns}} < 0.5 && float({{param:surfaceRecoverOn}}) > 0.5) {
  float hitEpsRB_{{ns}} = max(float({{param:eps}}), float({{param:relHitEps}}) * max(tmc_{{ns}}, 1e-4));
  float bandRB_{{ns}} = hitEpsRB_{{ns}} * float({{param:recoverBand}});
  if (dLst_{{ns}} > 0.0 && dLst_{{ns}} < bandRB_{{ns}} && dtLst_{{ns}} > 1e-8 && tmc_{{ns}} >= dtLst_{{ns}}) {
    float tLoRB_{{ns}} = tmc_{{ns}} - dtLst_{{ns}};
    float tHiRB_{{ns}} = tmc_{{ns}};
    for (int irb_{{ns}} = 0; irb_{{ns}} < 12; irb_{{ns}}++) {
      float tMidRB_{{ns}} = 0.5 * (tLoRB_{{ns}} + tHiRB_{{ns}});
      float dMidRB_{{ns}} = {{sceneSdf}}(rmo_{{ns}} + rmd_{{ns}} * tMidRB_{{ns}});
      if (dMidRB_{{ns}} < hitEpsRB_{{ns}}) tHiRB_{{ns}} = tMidRB_{{ns}}; else tLoRB_{{ns}} = tMidRB_{{ns}};
    }
    tmc_{{ns}} = tHiRB_{{ns}};
    vec3 pmcRB_{{ns}} = rmo_{{ns}} + rmd_{{ns}} * tmc_{{ns}};
    float dFinRB_{{ns}} = {{sceneSdf}}(pmcRB_{{ns}});
    float hitEpsFin_{{ns}} = max(float({{param:eps}}), float({{param:relHitEps}}) * max(tmc_{{ns}}, 1e-4));
    if (dFinRB_{{ns}} < hitEpsFin_{{ns}} && abs(dFinRB_{{ns}}) < 1e4) {
      float nEpsRB_{{ns}} = float({{param:nEps}}) * (1.0 + float({{param:nEpsRel}}) * max(tmc_{{ns}}, 1e-4));
      vec3 nrb_{{ns}};
      if (float({{param:nTetra}}) > 0.5) {
        vec2 teb_{{ns}} = vec2(1.0, -1.0) * 0.57735027 * nEpsRB_{{ns}};
        nrb_{{ns}} = normalize(
          teb_{{ns}}.xyy * {{sceneSdf}}(pmcRB_{{ns}} + teb_{{ns}}.xyy) +
          teb_{{ns}}.yyx * {{sceneSdf}}(pmcRB_{{ns}} + teb_{{ns}}.yyx) +
          teb_{{ns}}.yxy * {{sceneSdf}}(pmcRB_{{ns}} + teb_{{ns}}.yxy) +
          teb_{{ns}}.xxx * {{sceneSdf}}(pmcRB_{{ns}} + teb_{{ns}}.xxx));
      } else if (float({{param:iqNormal}}) > 0.5) {
        vec2 veb_{{ns}} = vec2(nEpsRB_{{ns}}, 0.0);
        nrb_{{ns}} = normalize(vec3(
          {{sceneSdf}}(pmcRB_{{ns}} + veb_{{ns}}.xyy) - {{sceneSdf}}(pmcRB_{{ns}} - veb_{{ns}}.xyy),
          {{sceneSdf}}(pmcRB_{{ns}} + veb_{{ns}}.yxy) - {{sceneSdf}}(pmcRB_{{ns}} - veb_{{ns}}.yxy),
          {{sceneSdf}}(pmcRB_{{ns}} + veb_{{ns}}.yyx) - {{sceneSdf}}(pmcRB_{{ns}} - veb_{{ns}}.yyx)));
      } else {
        nrb_{{ns}} = normalize(pmcRB_{{ns}});
      }
      float dfRb_{{ns}} = max(dot(nrb_{{ns}}, ldir_{{ns}}), 0.0);
      vec3 texMixRb_{{ns}} = vec3(1.0);
//<<BEGIN_RM_SDF_ALBEDO>>
      texMixRb_{{ns}} *= {{sceneMatFn}}(pmcRB_{{ns}});
//<<END_RM_SDF_ALBEDO>>
      vec3 baseRb_{{ns}} = vec3(0.06, 0.07, 0.1);
      vec3 sunRb_{{ns}} = vec3(0.85, 0.82, 0.78);
      vec3 palRb_{{ns}} = 0.5 + 0.5 * cos(vec3(float({{param:palA}}), float({{param:palB}}), float({{param:palC}})) + dfRb_{{ns}} * 6.28318 + vec3(0.0, 2.1, 4.2));
      vec3 sunMixRb_{{ns}} = mix(sunRb_{{ns}}, palRb_{{ns}}, float({{param:palMix}}));
      vec3 litRb_{{ns}} = (baseRb_{{ns}} + dfRb_{{ns}} * sunMixRb_{{ns}}) * texMixRb_{{ns}};
      clm_{{ns}} = amb_{{ns}} + litRb_{{ns}};
    }
  }
}
vec3 outRgb_{{ns}} = clm_{{ns}};
if (float({{param:fogOn}}) > 0.5) {
  float fogM_{{ns}} = 1.0 - exp(-tmc_{{ns}} * float({{param:fogDensity}}));
  vec3 fogC_{{ns}} = vec3(float({{param:fogR}}), float({{param:fogG}}), float({{param:fogB}}));
  outRgb_{{ns}} = mix(outRgb_{{ns}}, fogC_{{ns}}, fogM_{{ns}});
}
vec4 {{out:col}} = vec4(outRgb_{{ns}}, 1.0);`;

export const raymarchSceneTemplate = RM_CORE + RM_OPTIONAL_AND_FOG;
