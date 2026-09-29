import {
	glslCapsuleSegment,
	glslCappedCone,
	glslConeInfY,
	glslDeathStarApprox,
	glslEllipsoidBound,
	glslHexPrism,
	glslLink,
	glslOctahedron,
	glslOrientedBox,
	glslPlane,
	glslRhombus,
	glslRoundBox,
	glslRoundedCylinder,
	glslTriPrism,
	IQ_DISTFUNCTIONS_URL,
} from './builtins/iqSdf.js';
import { getParamChoice, paramById, resolveParamFloatGlsl } from './compile/params.js';
import { outVar, sanitizeNodeId } from './ident.js';
import type { GraphNode, NodeTypeDef, UniformManifestEntry } from './types.js';

export function expandSdfPrimitive(
	node: GraphNode,
	def: NodeTypeDef,
	wm: Map<string, string>,
	uniforms: UniformManifestEntry[],
	appendDefaultMat = false,
	animatedKeys: Set<string> = new Set(),
): string {
	const pExpr = wm.get('p');
	if (!pExpr) return '';
	const shape = getParamChoice(node, paramById(def, 'shape'));
	const out = outVar(node.id, 'd');
	const ns = sanitizeNodeId(node.id);
	const head = `// node: ${node.id}\n// ref: ${IQ_DISTFUNCTIONS_URL}`;
	const matSuffix = appendDefaultMat ? `\nvec3 ${outVar(node.id, 'mat')} = vec3(1.0);` : '';

	let body: string;
	switch (shape) {
		case 'sphere': {
			const r = resolveParamFloatGlsl(node, paramById(def, 'r'), wm, uniforms, animatedKeys);
			body = `${head}\nfloat ${out} = length(${pExpr}) - float(${r});`;
			break;
		}
		case 'box': {
			const hx = resolveParamFloatGlsl(node, paramById(def, 'hx'), wm, uniforms, animatedKeys);
			const hy = resolveParamFloatGlsl(node, paramById(def, 'hy'), wm, uniforms, animatedKeys);
			const hz = resolveParamFloatGlsl(node, paramById(def, 'hz'), wm, uniforms, animatedKeys);
			body =
				`${head}\nfloat ${out} = length(max(abs(${pExpr}) - vec3(float(${hx}), float(${hy}), float(${hz})), 0.0))` +
				` + min(max(abs(${pExpr}).x - float(${hx}), max(abs(${pExpr}).y - float(${hy}), abs(${pExpr}).z - float(${hz}))), 0.0);`;
			break;
		}
		case 'round_box': {
			const hx = resolveParamFloatGlsl(node, paramById(def, 'hx'), wm, uniforms, animatedKeys);
			const hy = resolveParamFloatGlsl(node, paramById(def, 'hy'), wm, uniforms, animatedKeys);
			const hz = resolveParamFloatGlsl(node, paramById(def, 'hz'), wm, uniforms, animatedKeys);
			const rr = resolveParamFloatGlsl(node, paramById(def, 'round_r'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslRoundBox(pExpr, hx, hy, hz, rr, out, ns)}`;
			break;
		}
		case 'plane': {
			const nx = resolveParamFloatGlsl(node, paramById(def, 'nx'), wm, uniforms, animatedKeys);
			const ny = resolveParamFloatGlsl(node, paramById(def, 'ny'), wm, uniforms, animatedKeys);
			const nz = resolveParamFloatGlsl(node, paramById(def, 'nz'), wm, uniforms, animatedKeys);
			const ph = resolveParamFloatGlsl(node, paramById(def, 'plane_h'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslPlane(pExpr, nx, ny, nz, ph, out)}`;
			break;
		}
		case 'octahedron': {
			const os = resolveParamFloatGlsl(node, paramById(def, 'oct_s'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslOctahedron(pExpr, os, out, ns)}`;
			break;
		}
		case 'torus': {
			const R = resolveParamFloatGlsl(node, paramById(def, 'R'), wm, uniforms, animatedKeys);
			const r = resolveParamFloatGlsl(node, paramById(def, 'r'), wm, uniforms, animatedKeys);
			body = `${head}\nfloat ${out} = length(vec2(length(${pExpr}.xz) - float(${R}), ${pExpr}.y)) - float(${r});`;
			break;
		}
		case 'cylinder_y': {
			const r = resolveParamFloatGlsl(node, paramById(def, 'r'), wm, uniforms, animatedKeys);
			body = `${head}\nfloat ${out} = length(${pExpr}.xz) - float(${r});`;
			break;
		}
		case 'capped_cylinder_y': {
			const r = resolveParamFloatGlsl(node, paramById(def, 'r'), wm, uniforms, animatedKeys);
			const h = resolveParamFloatGlsl(node, paramById(def, 'h'), wm, uniforms, animatedKeys);
			body =
				`${head}\nvec2 sd_ccyl_${ns} = abs(vec2(length(${pExpr}.xz), ${pExpr}.y)) - vec2(float(${r}), float(${h}));\n` +
				`float ${out} = min(max(sd_ccyl_${ns}.x, sd_ccyl_${ns}.y), 0.0) + length(max(sd_ccyl_${ns}, 0.0));`;
			break;
		}
		case 'capsule_y': {
			const r = resolveParamFloatGlsl(node, paramById(def, 'r'), wm, uniforms, animatedKeys);
			const h = resolveParamFloatGlsl(node, paramById(def, 'h'), wm, uniforms, animatedKeys);
			body =
				`${head}\nvec2 sd_caps_${ns} = vec2(length(${pExpr}.xz) - float(${r}), abs(${pExpr}.y) - float(${h}));\n` +
				`float ${out} = length(max(sd_caps_${ns}, 0.0)) + min(max(sd_caps_${ns}.x, sd_caps_${ns}.y), 0.0);`;
			break;
		}
		case 'rounded_cylinder_y': {
			const ra = resolveParamFloatGlsl(node, paramById(def, 'r'), wm, uniforms, animatedKeys);
			const rb = resolveParamFloatGlsl(node, paramById(def, 'rcyl_rb'), wm, uniforms, animatedKeys);
			const hh = resolveParamFloatGlsl(node, paramById(def, 'h'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslRoundedCylinder(pExpr, ra, rb, hh, out, ns)}`;
			break;
		}
		case 'capped_cone_y': {
			const ch = resolveParamFloatGlsl(node, paramById(def, 'cone_h'), wm, uniforms, animatedKeys);
			const cr1 = resolveParamFloatGlsl(node, paramById(def, 'cone_r1'), wm, uniforms, animatedKeys);
			const cr2 = resolveParamFloatGlsl(node, paramById(def, 'cone_r2'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslCappedCone(pExpr, ch, cr1, cr2, out, ns)}`;
			break;
		}
		case 'link_y': {
			const le = resolveParamFloatGlsl(node, paramById(def, 'link_le'), wm, uniforms, animatedKeys);
			const r1 = resolveParamFloatGlsl(node, paramById(def, 'R'), wm, uniforms, animatedKeys);
			const r2 = resolveParamFloatGlsl(node, paramById(def, 'r'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslLink(pExpr, le, r1, r2, out, ns)}`;
			break;
		}
		case 'capsule_segment': {
			const ax = resolveParamFloatGlsl(node, paramById(def, 'cap_ax'), wm, uniforms, animatedKeys);
			const ay = resolveParamFloatGlsl(node, paramById(def, 'cap_ay'), wm, uniforms, animatedKeys);
			const az = resolveParamFloatGlsl(node, paramById(def, 'cap_az'), wm, uniforms, animatedKeys);
			const bx = resolveParamFloatGlsl(node, paramById(def, 'cap_bx'), wm, uniforms, animatedKeys);
			const by = resolveParamFloatGlsl(node, paramById(def, 'cap_by'), wm, uniforms, animatedKeys);
			const bz = resolveParamFloatGlsl(node, paramById(def, 'cap_bz'), wm, uniforms, animatedKeys);
			const cr = resolveParamFloatGlsl(node, paramById(def, 'cap_r'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslCapsuleSegment(pExpr, ax, ay, az, bx, by, bz, cr, out, ns)}`;
			break;
		}
		case 'ellipsoid_bound': {
			const ex = resolveParamFloatGlsl(node, paramById(def, 'ell_rx'), wm, uniforms, animatedKeys);
			const ey = resolveParamFloatGlsl(node, paramById(def, 'ell_ry'), wm, uniforms, animatedKeys);
			const ez = resolveParamFloatGlsl(node, paramById(def, 'ell_rz'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslEllipsoidBound(pExpr, ex, ey, ez, out, ns)}`;
			break;
		}
		case 'hex_prism_y': {
			const hx = resolveParamFloatGlsl(node, paramById(def, 'hex_r'), wm, uniforms, animatedKeys);
			const hz = resolveParamFloatGlsl(node, paramById(def, 'hex_h'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslHexPrism(pExpr, hx, hz, out, ns)}`;
			break;
		}
		case 'tri_prism_y': {
			const tr = resolveParamFloatGlsl(node, paramById(def, 'tri_r'), wm, uniforms, animatedKeys);
			const th = resolveParamFloatGlsl(node, paramById(def, 'tri_h'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslTriPrism(pExpr, tr, th, out, ns)}`;
			break;
		}
		case 'rhombus': {
			const rla = resolveParamFloatGlsl(node, paramById(def, 'rh_la'), wm, uniforms, animatedKeys);
			const rlb = resolveParamFloatGlsl(node, paramById(def, 'rh_lb'), wm, uniforms, animatedKeys);
			const rhh = resolveParamFloatGlsl(node, paramById(def, 'rh_h'), wm, uniforms, animatedKeys);
			const rra = resolveParamFloatGlsl(node, paramById(def, 'rh_ra'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslRhombus(pExpr, rla, rlb, rhh, rra, out, ns)}`;
			break;
		}
		case 'death_star': {
			const dR = resolveParamFloatGlsl(node, paramById(def, 'ds_R'), wm, uniforms, animatedKeys);
			const dr = resolveParamFloatGlsl(node, paramById(def, 'ds_r'), wm, uniforms, animatedKeys);
			const doz = resolveParamFloatGlsl(node, paramById(def, 'ds_oz'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslDeathStarApprox(pExpr, dR, dr, doz, out, ns)}`;
			break;
		}
		case 'cone_inf_y': {
			const cc = resolveParamFloatGlsl(node, paramById(def, 'cone_c'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslConeInfY(pExpr, cc, out, ns)}`;
			break;
		}
		case 'oriented_box': {
			const hx = resolveParamFloatGlsl(node, paramById(def, 'hx'), wm, uniforms, animatedKeys);
			const hy = resolveParamFloatGlsl(node, paramById(def, 'hy'), wm, uniforms, animatedKeys);
			const hz = resolveParamFloatGlsl(node, paramById(def, 'hz'), wm, uniforms, animatedKeys);
			const rx = resolveParamFloatGlsl(node, paramById(def, 'ob_rx'), wm, uniforms, animatedKeys);
			const ry = resolveParamFloatGlsl(node, paramById(def, 'ob_ry'), wm, uniforms, animatedKeys);
			const rz = resolveParamFloatGlsl(node, paramById(def, 'ob_rz'), wm, uniforms, animatedKeys);
			body = `${head}\n${glslOrientedBox(pExpr, hx, hy, hz, rx, ry, rz, out, ns)}`;
			break;
		}
		default: {
			const r = resolveParamFloatGlsl(node, paramById(def, 'r'), wm, uniforms, animatedKeys);
			body = `${head}\nfloat ${out} = length(${pExpr}) - float(${r});`;
			break;
		}
	}
	return body + matSuffix;
}
