import type { NodeTypeDef } from '../../types.js';

export const sdfPrimitiveNodes: NodeTypeDef[] = [
	{
		id: 'sdf_sphere',
		label: 'SDF Sphere',
		category: 'SDF',
		description: 'Composable sphere primitive (prefer over SDF primitive → sphere in new graphs).',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [{ id: 'r', label: 'Radius', glslType: 'float', default: 0.5, min: 0.001, max: 10, step: 0.01, binding: 'uniform' }],
		canvasParams: ['r'],
		template: `// node: {{nodeId}}\nfloat {{out:d}} = length({{in:p}}) - float({{param:r}});`,
	},
	{
		id: 'sdf_octahedron',
		label: 'SDF Octahedron',
		category: 'SDF',
		description:
			'Composable octahedron (same as SDF primitive → octahedron). With `sdf_tessellate_feedback`, a direct `sdf_param_p → p` wire uses **scene** `p` in the motif (not the KIFS fold coordinate) so the cage stays world-fixed.',
		docUrl: 'https://iquilezles.org/articles/distfunctions/',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position', motifSampling: 'world' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [
			{ id: 'oct_s', label: 'Size', glslType: 'float', default: 0.45, min: 0.05, max: 4, step: 0.01, binding: 'uniform' },
		],
		canvasParams: ['oct_s'],
		template: `// node: {{nodeId}} — sdOctahedron / https://iquilezles.org/articles/distfunctions/
vec3 po_{{ns}} = abs({{in:p}});
float mo_{{ns}} = po_{{ns}}.x + po_{{ns}}.y + po_{{ns}}.z - float({{param:oct_s}});
float {{out:d}};
if (3.0 * po_{{ns}}.x >= mo_{{ns}} && 3.0 * po_{{ns}}.y >= mo_{{ns}} && 3.0 * po_{{ns}}.z >= mo_{{ns}}) {
	{{out:d}} = mo_{{ns}} * 0.57735027;
} else {
	vec3 qo_{{ns}};
	if (3.0 * po_{{ns}}.x < mo_{{ns}}) qo_{{ns}} = po_{{ns}}.xyz;
	else if (3.0 * po_{{ns}}.y < mo_{{ns}}) qo_{{ns}} = po_{{ns}}.yzx;
	else qo_{{ns}} = po_{{ns}}.zxy;
	float ko_{{ns}} = clamp(0.5 * (qo_{{ns}}.z - qo_{{ns}}.y + float({{param:oct_s}})), 0.0, float({{param:oct_s}}));
	{{out:d}} = length(vec3(qo_{{ns}}.x, qo_{{ns}}.y - float({{param:oct_s}}) + ko_{{ns}}, qo_{{ns}}.z - ko_{{ns}}));
}`,
	},
	{
		id: 'sdf_box',
		label: 'SDF Box',
		category: 'SDF',
		description: 'Composable axis-aligned box (prefer over SDF primitive → box).',
		inputs: [{ id: 'p', type: 'vec3' }],
		outputs: [{ id: 'd', type: 'float' }],
		params: [
			{ id: 'hx', label: 'Half X', glslType: 'float', default: 0.3, min: 0.01, max: 5, step: 0.01, binding: 'uniform' },
			{ id: 'hy', label: 'Half Y', glslType: 'float', default: 0.3, min: 0.01, max: 5, step: 0.01, binding: 'uniform' },
			{ id: 'hz', label: 'Half Z', glslType: 'float', default: 0.3, min: 0.01, max: 5, step: 0.01, binding: 'uniform' },
		],
		template: `// node: {{nodeId}}
float {{out:d}} = length(max(abs({{in:p}}) - vec3(float({{param:hx}}), float({{param:hy}}), float({{param:hz}})), 0.0)) + min(max(abs({{in:p}}).x - float({{param:hx}}), max(abs({{in:p}}).y - float({{param:hy}}), abs({{in:p}}).z - float({{param:hz}}))), 0.0);`,
	},
	{
		id: 'sdf_torus',
		label: 'SDF Torus',
		category: 'SDF',
		inputs: [{ id: 'p', type: 'vec3' }],
		outputs: [{ id: 'd', type: 'float' }],
		params: [
			{ id: 'R', label: 'Major R', glslType: 'float', default: 0.35, min: 0.02, max: 3, step: 0.01, binding: 'uniform' },
			{ id: 'r', label: 'Minor r', glslType: 'float', default: 0.12, min: 0.02, max: 1.5, step: 0.01, binding: 'uniform' },
		],
		canvasParams: ['R', 'r'],
		template: `// node: {{nodeId}} — iq sdTorus
float {{out:d}} = length(vec2(length({{in:p}}.xz) - float({{param:R}}), {{in:p}}.y)) - float({{param:r}});`,
	},
	{
		id: 'sdf_torus_knot',
		label: 'SDF Torus knot',
		category: 'SDF',
		description:
			'Smooth tube around a (p,q) torus knot: coarse t scan then Newton refinement on ‖p−K(t)‖² using analytic K′, K″ (continuous curve, not a faceted polyline). Default (2,3) is the trefoil.',
		docUrl: 'https://en.wikipedia.org/wiki/Torus_knot',
		inputs: [{ id: 'p', type: 'vec3', label: 'Position' }],
		outputs: [{ id: 'd', type: 'float', label: 'Distance' }],
		params: [
			{ id: 'R', label: 'Torus major R', glslType: 'float', default: 0.38, min: 0.05, max: 4, step: 0.01, binding: 'uniform' },
			{ id: 'a', label: 'Embedding minor a', glslType: 'float', default: 0.22, min: 0.02, max: 2, step: 0.01, binding: 'uniform' },
			{ id: 'r', label: 'Tube radius r', glslType: 'float', default: 0.07, min: 0.01, max: 0.8, step: 0.005, binding: 'uniform' },
			{
				id: 'windP',
				label: 'Winding p',
				glslType: 'float',
				default: 2,
				min: 1,
				max: 12,
				step: 1,
				binding: 'literal',
			},
			{
				id: 'windQ',
				label: 'Winding q',
				glslType: 'float',
				default: 3,
				min: 1,
				max: 12,
				step: 1,
				binding: 'literal',
			},
			{
				id: 'samples',
				label: 'Coarse samples',
				glslType: 'float',
				default: 64,
				min: 8,
				max: 128,
				step: 1,
				binding: 'literal',
			},
			{
				id: 'refineIters',
				label: 'Newton iters',
				glslType: 'float',
				default: 10,
				min: 0,
				max: 16,
				step: 1,
				binding: 'literal',
			},
		],
		canvasParams: ['R', 'a', 'r'],
		template: `// node: {{nodeId}} — torus (p,q) knot: coarse t + Newton on ‖p−K‖²
float Rtk_{{ns}} = float({{param:R}});
float atk_{{ns}} = float({{param:a}});
float rtk_{{ns}} = float({{param:r}});
float ptk_{{ns}} = float({{param:windP}});
float qtk_{{ns}} = float({{param:windQ}});
int ntk_{{ns}} = int({{param:samples}});
int nrk_{{ns}} = int({{param:refineIters}});
float tau_{{ns}} = 6.28318530718;
float tBest_{{ns}} = 0.0;
float bestSq_{{ns}} = 1e30;
for (int itk_{{ns}} = 0; itk_{{ns}} < 128; itk_{{ns}}++) {
  if (itk_{{ns}} >= ntk_{{ns}}) break;
  float tt0_{{ns}} = float(itk_{{ns}}) * tau_{{ns}} / float(ntk_{{ns}});
  float ut0_{{ns}} = ptk_{{ns}} * tt0_{{ns}};
  float vt0_{{ns}} = qtk_{{ns}} * tt0_{{ns}};
  vec3 K0_{{ns}} = vec3(
    (Rtk_{{ns}} + atk_{{ns}} * cos(vt0_{{ns}})) * cos(ut0_{{ns}}),
    (Rtk_{{ns}} + atk_{{ns}} * cos(vt0_{{ns}})) * sin(ut0_{{ns}}),
    atk_{{ns}} * sin(vt0_{{ns}})
  );
  float dsq0_{{ns}} = dot({{in:p}} - K0_{{ns}}, {{in:p}} - K0_{{ns}});
  if (dsq0_{{ns}} < bestSq_{{ns}}) {
    bestSq_{{ns}} = dsq0_{{ns}};
    tBest_{{ns}} = tt0_{{ns}};
  }
}
float dMin_{{ns}} = 1e10;
for (int isd_{{ns}} = 0; isd_{{ns}} < 2; isd_{{ns}}++) {
  float tk_{{ns}} = (isd_{{ns}} < 1)
    ? tBest_{{ns}}
    : mod(tBest_{{ns}} + 0.5 * tau_{{ns}} / max(float(ntk_{{ns}}), 1.0), tau_{{ns}});
  for (int ir_{{ns}} = 0; ir_{{ns}} < 16; ir_{{ns}}++) {
    if (ir_{{ns}} >= nrk_{{ns}}) break;
    float u_{{ns}} = ptk_{{ns}} * tk_{{ns}};
    float v_{{ns}} = qtk_{{ns}} * tk_{{ns}};
    float Ku_{{ns}} = cos(u_{{ns}});
    float Su_{{ns}} = sin(u_{{ns}});
    float Kv_{{ns}} = cos(v_{{ns}});
    float Sv_{{ns}} = sin(v_{{ns}});
    float A_{{ns}} = Rtk_{{ns}} + atk_{{ns}} * Kv_{{ns}};
    vec3 K_{{ns}} = vec3(A_{{ns}} * Ku_{{ns}}, A_{{ns}} * Su_{{ns}}, atk_{{ns}} * Sv_{{ns}});
    vec3 w_{{ns}} = {{in:p}} - K_{{ns}};
    vec3 Kp_{{ns}} = vec3(
      -atk_{{ns}} * qtk_{{ns}} * Sv_{{ns}} * Ku_{{ns}} - A_{{ns}} * ptk_{{ns}} * Su_{{ns}},
      -atk_{{ns}} * qtk_{{ns}} * Sv_{{ns}} * Su_{{ns}} + A_{{ns}} * ptk_{{ns}} * Ku_{{ns}},
      atk_{{ns}} * qtk_{{ns}} * Kv_{{ns}}
    );
    vec3 Kpp_{{ns}} = vec3(
      -atk_{{ns}} * qtk_{{ns}} * qtk_{{ns}} * Kv_{{ns}} * Ku_{{ns}} + 2.0 * atk_{{ns}} * ptk_{{ns}} * qtk_{{ns}} * Sv_{{ns}} * Su_{{ns}} - ptk_{{ns}} * ptk_{{ns}} * A_{{ns}} * Ku_{{ns}},
      -atk_{{ns}} * qtk_{{ns}} * qtk_{{ns}} * Kv_{{ns}} * Su_{{ns}} - 2.0 * atk_{{ns}} * ptk_{{ns}} * qtk_{{ns}} * Sv_{{ns}} * Ku_{{ns}} - ptk_{{ns}} * ptk_{{ns}} * A_{{ns}} * Su_{{ns}},
      -atk_{{ns}} * qtk_{{ns}} * qtk_{{ns}} * Sv_{{ns}}
    );
    float den_{{ns}} = dot(Kp_{{ns}}, Kp_{{ns}}) - dot(w_{{ns}}, Kpp_{{ns}});
    float denS_{{ns}} = abs(den_{{ns}}) < 1e-10 ? (den_{{ns}} >= 0.0 ? 1e-10 : -1e-10) : den_{{ns}};
    float step_{{ns}} = dot(w_{{ns}}, Kp_{{ns}}) / denS_{{ns}};
    tk_{{ns}} += clamp(step_{{ns}}, -0.45, 0.45);
    tk_{{ns}} = mod(tk_{{ns}}, tau_{{ns}});
  }
  float uF_{{ns}} = ptk_{{ns}} * tk_{{ns}};
  float vF_{{ns}} = qtk_{{ns}} * tk_{{ns}};
  vec3 KF_{{ns}} = vec3(
    (Rtk_{{ns}} + atk_{{ns}} * cos(vF_{{ns}})) * cos(uF_{{ns}}),
    (Rtk_{{ns}} + atk_{{ns}} * cos(vF_{{ns}})) * sin(uF_{{ns}}),
    atk_{{ns}} * sin(vF_{{ns}})
  );
  dMin_{{ns}} = min(dMin_{{ns}}, length({{in:p}} - KF_{{ns}}) - rtk_{{ns}});
}
float {{out:d}} = dMin_{{ns}};`,
	},
];

