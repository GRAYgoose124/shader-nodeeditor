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
import { ensureFloatUniform, getParamChoice, paramById } from './compileParams.js';
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
			const r = ensureFloatUniform(node, paramById(def, 'r'), uniforms, animatedKeys);
			body = `${head}\nfloat ${out} = length(${pExpr}) - float(${r});`;
			break;
		}
		case 'box': {
			const hx = ensureFloatUniform(node, paramById(def, 'hx'), uniforms, animatedKeys);
			const hy = ensureFloatUniform(node, paramById(def, 'hy'), uniforms, animatedKeys);
			const hz = ensureFloatUniform(node, paramById(def, 'hz'), uniforms, animatedKeys);
			body =
				`${head}\nfloat ${out} = length(max(abs(${pExpr}) - vec3(float(${hx}), float(${hy}), float(${hz})), 0.0))` +
				` + min(max(abs(${pExpr}).x - float(${hx}), max(abs(${pExpr}).y - float(${hy}), abs(${pExpr}).z - float(${hz}))), 0.0);`;
			break;
		}
		case 'round_box': {
			const hx = ensureFloatUniform(node, paramById(def, 'hx'), uniforms, animatedKeys);
			const hy = ensureFloatUniform(node, paramById(def, 'hy'), uniforms, animatedKeys);
			const hz = ensureFloatUniform(node, paramById(def, 'hz'), uniforms, animatedKeys);
			const rr = ensureFloatUniform(node, paramById(def, 'round_r'), uniforms, animatedKeys);
			body = `${head}\n${glslRoundBox(pExpr, hx, hy, hz, rr, out, ns)}`;
			break;
		}
		case 'plane': {
			const nx = ensureFloatUniform(node, paramById(def, 'nx'), uniforms, animatedKeys);
			const ny = ensureFloatUniform(node, paramById(def, 'ny'), uniforms, animatedKeys);
			const nz = ensureFloatUniform(node, paramById(def, 'nz'), uniforms, animatedKeys);
			const ph = ensureFloatUniform(node, paramById(def, 'plane_h'), uniforms, animatedKeys);
			body = `${head}\n${glslPlane(pExpr, nx, ny, nz, ph, out)}`;
			break;
		}
		case 'octahedron': {
			const os = ensureFloatUniform(node, paramById(def, 'oct_s'), uniforms, animatedKeys);
			body = `${head}\n${glslOctahedron(pExpr, os, out, ns)}`;
			break;
		}
		case 'torus': {
			const R = ensureFloatUniform(node, paramById(def, 'R'), uniforms, animatedKeys);
			const r = ensureFloatUniform(node, paramById(def, 'r'), uniforms, animatedKeys);
			body = `${head}\nfloat ${out} = length(vec2(length(${pExpr}.xz) - float(${R}), ${pExpr}.y)) - float(${r});`;
			break;
		}
		case 'cylinder_y': {
			const r = ensureFloatUniform(node, paramById(def, 'r'), uniforms, animatedKeys);
			body = `${head}\nfloat ${out} = length(${pExpr}.xz) - float(${r});`;
			break;
		}
		case 'capped_cylinder_y': {
			const r = ensureFloatUniform(node, paramById(def, 'r'), uniforms, animatedKeys);
			const h = ensureFloatUniform(node, paramById(def, 'h'), uniforms, animatedKeys);
			body =
				`${head}\nvec2 sd_ccyl_${ns} = abs(vec2(length(${pExpr}.xz), ${pExpr}.y)) - vec2(float(${r}), float(${h}));\n` +
				`float ${out} = min(max(sd_ccyl_${ns}.x, sd_ccyl_${ns}.y), 0.0) + length(max(sd_ccyl_${ns}, 0.0));`;
			break;
		}
		case 'capsule_y': {
			const r = ensureFloatUniform(node, paramById(def, 'r'), uniforms, animatedKeys);
			const h = ensureFloatUniform(node, paramById(def, 'h'), uniforms, animatedKeys);
			body =
				`${head}\nvec2 sd_caps_${ns} = vec2(length(${pExpr}.xz) - float(${r}), abs(${pExpr}.y) - float(${h}));\n` +
				`float ${out} = length(max(sd_caps_${ns}, 0.0)) + min(max(sd_caps_${ns}.x, sd_caps_${ns}.y), 0.0);`;
			break;
		}
		case 'rounded_cylinder_y': {
			const ra = ensureFloatUniform(node, paramById(def, 'r'), uniforms, animatedKeys);
			const rb = ensureFloatUniform(node, paramById(def, 'rcyl_rb'), uniforms, animatedKeys);
			const hh = ensureFloatUniform(node, paramById(def, 'h'), uniforms, animatedKeys);
			body = `${head}\n${glslRoundedCylinder(pExpr, ra, rb, hh, out, ns)}`;
			break;
		}
		case 'capped_cone_y': {
			const ch = ensureFloatUniform(node, paramById(def, 'cone_h'), uniforms, animatedKeys);
			const cr1 = ensureFloatUniform(node, paramById(def, 'cone_r1'), uniforms, animatedKeys);
			const cr2 = ensureFloatUniform(node, paramById(def, 'cone_r2'), uniforms, animatedKeys);
			body = `${head}\n${glslCappedCone(pExpr, ch, cr1, cr2, out, ns)}`;
			break;
		}
		case 'link_y': {
			const le = ensureFloatUniform(node, paramById(def, 'link_le'), uniforms, animatedKeys);
			const r1 = ensureFloatUniform(node, paramById(def, 'R'), uniforms, animatedKeys);
			const r2 = ensureFloatUniform(node, paramById(def, 'r'), uniforms, animatedKeys);
			body = `${head}\n${glslLink(pExpr, le, r1, r2, out, ns)}`;
			break;
		}
		case 'capsule_segment': {
			const ax = ensureFloatUniform(node, paramById(def, 'cap_ax'), uniforms, animatedKeys);
			const ay = ensureFloatUniform(node, paramById(def, 'cap_ay'), uniforms, animatedKeys);
			const az = ensureFloatUniform(node, paramById(def, 'cap_az'), uniforms, animatedKeys);
			const bx = ensureFloatUniform(node, paramById(def, 'cap_bx'), uniforms, animatedKeys);
			const by = ensureFloatUniform(node, paramById(def, 'cap_by'), uniforms, animatedKeys);
			const bz = ensureFloatUniform(node, paramById(def, 'cap_bz'), uniforms, animatedKeys);
			const cr = ensureFloatUniform(node, paramById(def, 'cap_r'), uniforms, animatedKeys);
			body = `${head}\n${glslCapsuleSegment(pExpr, ax, ay, az, bx, by, bz, cr, out, ns)}`;
			break;
		}
		case 'ellipsoid_bound': {
			const ex = ensureFloatUniform(node, paramById(def, 'ell_rx'), uniforms, animatedKeys);
			const ey = ensureFloatUniform(node, paramById(def, 'ell_ry'), uniforms, animatedKeys);
			const ez = ensureFloatUniform(node, paramById(def, 'ell_rz'), uniforms, animatedKeys);
			body = `${head}\n${glslEllipsoidBound(pExpr, ex, ey, ez, out, ns)}`;
			break;
		}
		case 'hex_prism_y': {
			const hx = ensureFloatUniform(node, paramById(def, 'hex_r'), uniforms, animatedKeys);
			const hz = ensureFloatUniform(node, paramById(def, 'hex_h'), uniforms, animatedKeys);
			body = `${head}\n${glslHexPrism(pExpr, hx, hz, out, ns)}`;
			break;
		}
		case 'tri_prism_y': {
			const tr = ensureFloatUniform(node, paramById(def, 'tri_r'), uniforms, animatedKeys);
			const th = ensureFloatUniform(node, paramById(def, 'tri_h'), uniforms, animatedKeys);
			body = `${head}\n${glslTriPrism(pExpr, tr, th, out, ns)}`;
			break;
		}
		case 'rhombus': {
			const rla = ensureFloatUniform(node, paramById(def, 'rh_la'), uniforms, animatedKeys);
			const rlb = ensureFloatUniform(node, paramById(def, 'rh_lb'), uniforms, animatedKeys);
			const rhh = ensureFloatUniform(node, paramById(def, 'rh_h'), uniforms, animatedKeys);
			const rra = ensureFloatUniform(node, paramById(def, 'rh_ra'), uniforms, animatedKeys);
			body = `${head}\n${glslRhombus(pExpr, rla, rlb, rhh, rra, out, ns)}`;
			break;
		}
		case 'death_star': {
			const dR = ensureFloatUniform(node, paramById(def, 'ds_R'), uniforms, animatedKeys);
			const dr = ensureFloatUniform(node, paramById(def, 'ds_r'), uniforms, animatedKeys);
			const doz = ensureFloatUniform(node, paramById(def, 'ds_oz'), uniforms, animatedKeys);
			body = `${head}\n${glslDeathStarApprox(pExpr, dR, dr, doz, out, ns)}`;
			break;
		}
		case 'cone_inf_y': {
			const cc = ensureFloatUniform(node, paramById(def, 'cone_c'), uniforms, animatedKeys);
			body = `${head}\n${glslConeInfY(pExpr, cc, out, ns)}`;
			break;
		}
		case 'oriented_box': {
			const hx = ensureFloatUniform(node, paramById(def, 'hx'), uniforms, animatedKeys);
			const hy = ensureFloatUniform(node, paramById(def, 'hy'), uniforms, animatedKeys);
			const hz = ensureFloatUniform(node, paramById(def, 'hz'), uniforms, animatedKeys);
			const rx = ensureFloatUniform(node, paramById(def, 'ob_rx'), uniforms, animatedKeys);
			const ry = ensureFloatUniform(node, paramById(def, 'ob_ry'), uniforms, animatedKeys);
			const rz = ensureFloatUniform(node, paramById(def, 'ob_rz'), uniforms, animatedKeys);
			body = `${head}\n${glslOrientedBox(pExpr, hx, hy, hz, rx, ry, rz, out, ns)}`;
			break;
		}
		default: {
			const r = ensureFloatUniform(node, paramById(def, 'r'), uniforms, animatedKeys);
			body = `${head}\nfloat ${out} = length(${pExpr}) - float(${r});`;
			break;
		}
	}
	return body + matSuffix;
}
