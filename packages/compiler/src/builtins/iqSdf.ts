/**
 * GLSL distance snippets from Inigo Quilez's reference list.
 * @see https://iquilezles.org/articles/distfunctions/
 */
export const IQ_DISTFUNCTIONS_URL = 'https://iquilezles.org/articles/distfunctions/';

/** sdRoundBox — exact SDF */
export function glslRoundBox(p: string, hx: string, hy: string, hz: string, rad: string, out: string, ns: string): string {
	return (
		`vec3 q_rb_${ns} = abs(${p}) - vec3(float(${hx}), float(${hy}), float(${hz})) + float(${rad});\n` +
		`float ${out} = length(max(q_rb_${ns}, 0.0)) + min(max(q_rb_${ns}.x, max(q_rb_${ns}.y, q_rb_${ns}.z)), 0.0) - float(${rad});`
	);
}

/** sdPlane — normal normalized in shader */
export function glslPlane(p: string, nx: string, ny: string, nz: string, h: string, out: string): string {
	return `float ${out} = dot(${p}, normalize(vec3(float(${nx}), float(${ny}), float(${nz})))) + float(${h});`;
}

/** sdOctahedron — exact (iq) */
export function glslOctahedron(p: string, s: string, out: string, ns: string): string {
	return (
		`vec3 po_${ns} = abs(${p});\n` +
		`float mo_${ns} = po_${ns}.x + po_${ns}.y + po_${ns}.z - float(${s});\n` +
		`float ${out};\n` +
		`if (3.0 * po_${ns}.x >= mo_${ns} && 3.0 * po_${ns}.y >= mo_${ns} && 3.0 * po_${ns}.z >= mo_${ns}) {\n` +
		`  ${out} = mo_${ns} * 0.57735027;\n` +
		`} else {\n` +
		`  vec3 qo_${ns};\n` +
		`  if (3.0 * po_${ns}.x < mo_${ns}) qo_${ns} = po_${ns}.xyz;\n` +
		`  else if (3.0 * po_${ns}.y < mo_${ns}) qo_${ns} = po_${ns}.yzx;\n` +
		`  else qo_${ns} = po_${ns}.zxy;\n` +
		`  float ko_${ns} = clamp(0.5 * (qo_${ns}.z - qo_${ns}.y + float(${s})), 0.0, float(${s}));\n` +
		`  ${out} = length(vec3(qo_${ns}.x, qo_${ns}.y - float(${s}) + ko_${ns}, qo_${ns}.z - ko_${ns}));\n` +
		`}`
	);
}

/** sdCappedCone — vertical cone, iq */
export function glslCappedCone(p: string, h: string, r1: string, r2: string, out: string, ns: string): string {
	return (
		`vec2 qc_${ns} = vec2(length(${p}.xz), ${p}.y);\n` +
		`vec2 k1_${ns} = vec2(float(${r2}), float(${h}));\n` +
		`vec2 k2_${ns} = vec2(float(${r2}) - float(${r1}), 2.0 * float(${h}));\n` +
		`vec2 ca_${ns} = vec2(qc_${ns}.x - min(qc_${ns}.x, (qc_${ns}.y < 0.0) ? float(${r1}) : float(${r2})), abs(qc_${ns}.y) - float(${h}));\n` +
		`vec2 cb_${ns} = qc_${ns} - k1_${ns} + k2_${ns} * clamp(dot(k1_${ns} - qc_${ns}, k2_${ns}) / dot(k2_${ns}, k2_${ns}), 0.0, 1.0);\n` +
		`float sc_${ns} = (cb_${ns}.x < 0.0 && ca_${ns}.y < 0.0) ? -1.0 : 1.0;\n` +
		`float ${out} = sc_${ns} * sqrt(min(dot(ca_${ns}, ca_${ns}), dot(cb_${ns}, cb_${ns})));`
	);
}

/** sdRoundedCylinder — iq */
export function glslRoundedCylinder(p: string, ra: string, rb: string, hh: string, out: string, ns: string): string {
	return (
		`vec2 dr_${ns} = vec2(length(${p}.xz) - float(${ra}) + float(${rb}), abs(${p}.y) - float(${hh}) + float(${rb}));\n` +
		`float ${out} = min(max(dr_${ns}.x, dr_${ns}.y), 0.0) + length(max(dr_${ns}, 0.0)) - float(${rb});`
	);
}

/** sdLink — iq (symmetric on Y) */
export function glslLink(p: string, le: string, r1: string, r2: string, out: string, ns: string): string {
	return (
		`vec3 ql_${ns} = vec3(${p}.x, max(abs(${p}.y) - float(${le}), 0.0), ${p}.z);\n` +
		`float ${out} = length(vec2(length(ql_${ns}.xy) - float(${r1}), ql_${ns}.z)) - float(${r2});`
	);
}

/** sdCapsule — segment a→b, iq */
export function glslCapsuleSegment(
	p: string,
	ax: string,
	ay: string,
	az: string,
	bx: string,
	by: string,
	bz: string,
	ra: string,
	out: string,
	ns: string,
): string {
	return (
		`vec3 capA_${ns} = vec3(float(${ax}), float(${ay}), float(${az}));\n` +
		`vec3 capB_${ns} = vec3(float(${bx}), float(${by}), float(${bz}));\n` +
		`vec3 capPa_${ns} = ${p} - capA_${ns};\n` +
		`vec3 capBa_${ns} = capB_${ns} - capA_${ns};\n` +
		`float capH_${ns} = clamp(dot(capPa_${ns}, capBa_${ns}) / max(dot(capBa_${ns}, capBa_${ns}), 1e-8), 0.0, 1.0);\n` +
		`float ${out} = length(capPa_${ns} - capBa_${ns} * capH_${ns}) - float(${ra});`
	);
}

/** sdEllipsoid — inexact bound / iq */
export function glslEllipsoidBound(p: string, rx: string, ry: string, rz: string, out: string, ns: string): string {
	return (
		`vec3 er_${ns} = vec3(float(${rx}), float(${ry}), float(${rz}));\n` +
		`float ek0_${ns} = length(${p} / er_${ns});\n` +
		`float ek1_${ns} = length(${p} / (er_${ns} * er_${ns}));\n` +
		`float ${out} = ek0_${ns} * (ek0_${ns} - 1.0) / max(ek1_${ns}, 1e-8);`
	);
}

/** sdHexPrism — iq (vec2 h: x = hex radius, y = half-length along Z) */
export function glslHexPrism(p: string, hx: string, hz: string, out: string, ns: string): string {
	return (
		`const vec3 hexK_${ns} = vec3(-0.8660254, 0.5, 0.57735);\n` +
		`vec3 hexP_${ns} = abs(${p});\n` +
		`hexP_${ns}.xy -= 2.0 * min(dot(hexK_${ns}.xy, hexP_${ns}.xy), 0.0) * hexK_${ns}.xy;\n` +
		`vec2 hexD_${ns} = vec2(\n` +
		`  length(hexP_${ns}.xy - vec2(clamp(hexP_${ns}.x, -hexK_${ns}.z * float(${hx}), hexK_${ns}.z * float(${hx})), float(${hx}))) * sign(hexP_${ns}.y - float(${hx})),\n` +
		`  hexP_${ns}.z - float(${hz}));\n` +
		`float ${out} = min(max(hexD_${ns}.x, hexD_${ns}.y), 0.0) + length(max(hexD_${ns}, 0.0));`
	);
}

/** sdRhombus — iq (la, lb half-diagonals XY, h half Z, ra round) */
export function glslRhombus(p: string, la: string, lb: string, h: string, ra: string, out: string, ns: string): string {
	return (
		`vec3 rhP_${ns} = abs(${p});\n` +
		`vec2 rhB_${ns} = vec2(float(${la}), float(${lb}));\n` +
		`float rhF_${ns} = clamp((dot(rhB_${ns}, rhB_${ns} - 2.0 * rhP_${ns}.xy)) / dot(rhB_${ns}, rhB_${ns}), -1.0, 1.0);\n` +
		`vec2 rhQ_${ns} = vec2(\n` +
		`  length(rhP_${ns}.xy - 0.5 * rhB_${ns} * vec2(1.0 - rhF_${ns}, 1.0 + rhF_${ns})) * sign(rhP_${ns}.x * rhB_${ns}.y + rhP_${ns}.y * rhB_${ns}.x - rhB_${ns}.x * rhB_${ns}.y),\n` +
		`  rhP_${ns}.z - float(${h}));\n` +
		`float ${out} = min(max(rhQ_${ns}.x, rhQ_${ns}.y), 0.0) + length(max(rhQ_${ns}, 0.0)) - float(${ra});`
	);
}

/** Death star: sphere minus smaller sphere (approx IQ combo) */
export function glslDeathStarApprox(p: string, R: string, r: string, oz: string, out: string, ns: string): string {
	return (
		`float dsA_${ns} = length(${p}) - float(${R});\n` +
		`float dsB_${ns} = length(${p} - vec3(0.0, 0.0, float(${oz}))) - float(${r});\n` +
		`float ${out} = max(dsA_${ns}, -dsB_${ns});`
	);
}

/** Infinite cone along +Y (tip at origin, opening upward) — iq sdCone */
export function glslConeInfY(p: string, c: string, out: string, ns: string): string {
	return (
		`vec2 qc_${ns} = vec2(length(${p}.xz), ${p}.y);\n` +
		`vec2 sc_${ns} = normalize(vec2(float(${c}), 1.0));\n` +
		`float ${out} = max(dot(qc_${ns}, sc_${ns}), -qc_${ns}.y);`
	);
}

/** Oriented box: Euler XYZ (radians) then axis-aligned box */
export function glslOrientedBox(p: string, hx: string, hy: string, hz: string, rx: string, ry: string, rz: string, out: string, ns: string): string {
	return (
		`float ob_cx_${ns} = cos(float(${rx}));\n` +
		`float ob_sx_${ns} = sin(float(${rx}));\n` +
		`float ob_cy_${ns} = cos(float(${ry}));\n` +
		`float ob_sy_${ns} = sin(float(${ry}));\n` +
		`float ob_cz_${ns} = cos(float(${rz}));\n` +
		`float ob_sz_${ns} = sin(float(${rz}));\n` +
		`mat3 obRx_${ns} = mat3(1.0, 0.0, 0.0, 0.0, ob_cx_${ns}, -ob_sx_${ns}, 0.0, ob_sx_${ns}, ob_cx_${ns});\n` +
		`mat3 obRy_${ns} = mat3(ob_cy_${ns}, 0.0, ob_sy_${ns}, 0.0, 1.0, 0.0, -ob_sy_${ns}, 0.0, ob_cy_${ns});\n` +
		`mat3 obRz_${ns} = mat3(ob_cz_${ns}, -ob_sz_${ns}, 0.0, ob_sz_${ns}, ob_cz_${ns}, 0.0, 0.0, 0.0, 1.0);\n` +
		`vec3 obq_${ns} = obRx_${ns} * obRy_${ns} * obRz_${ns} * ${p};\n` +
		`vec3 obd_${ns} = abs(obq_${ns}) - vec3(float(${hx}), float(${hy}), float(${hz}));\n` +
		`float ${out} = length(max(obd_${ns}, 0.0)) + min(max(obd_${ns}.x, max(obd_${ns}.y, obd_${ns}.z)), 0.0);`
	);
}

/** sdTriPrism — iq (vec2 h: x = radius, y = half thickness Z) */
export function glslTriPrism(p: string, hr: string, hh: string, out: string, ns: string): string {
	return (
		`const float triK_${ns} = sqrt(3.0);\n` +
		`vec2 triH_${ns} = vec2(float(${hr}), float(${hh}));\n` +
		`triH_${ns}.x *= 0.5 * triK_${ns};\n` +
		`vec3 triP_${ns} = ${p};\n` +
		`triP_${ns}.xy /= triH_${ns}.x;\n` +
		`triP_${ns}.y -= 1.0 / triK_${ns};\n` +
		`triP_${ns}.x = abs(triP_${ns}.x) - 1.0;\n` +
		`if (triP_${ns}.x + triK_${ns} * triP_${ns}.y > 0.0) {\n` +
		`  triP_${ns}.xy = vec2(triP_${ns}.x - triK_${ns} * triP_${ns}.y, -triK_${ns} * triP_${ns}.x - triP_${ns}.y) / 2.0;\n` +
		`}\n` +
		`triP_${ns}.x -= clamp(triP_${ns}.x, -2.0, 0.0);\n` +
		`float triD1_${ns} = length(triP_${ns}.xy) * sign(-triP_${ns}.y) * triH_${ns}.x;\n` +
		`float triD2_${ns} = abs(triP_${ns}.z) - triH_${ns}.y;\n` +
		`float ${out} = length(max(vec2(triD1_${ns}, triD2_${ns}), 0.0)) + min(max(triD1_${ns}, triD2_${ns}), 0.0);`
	);
}
