import type { UniformManifestEntry } from './types.js';
import { globalUniformDeclBlock } from './globalUniforms.js';

export const VERTEX_SHADER = `#version 300 es
precision highp float;
const vec2 _st_verts[3] = vec2[](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 v_uv;
void main() {
  vec2 p = _st_verts[gl_VertexID];
  v_uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

export const FRAG_HEADER = `#version 300 es
precision highp float;
${globalUniformDeclBlock()}
in vec2 v_uv;
out vec4 fragColor;

float smin(float a, float b, float k) {
  k = max(k, 1e-5);
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float smin_exp(float a, float b, float k) {
  k = max(k, 1e-5);
  float res = exp(-k * a) + exp(-k * b);
  return -log(max(res, 1e-20)) / k;
}

float iq_hash31(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

float smax_exp(float a, float b, float k) {
  return -smin_exp(-a, -b, k);
}

float iq_vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = iq_hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = iq_hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = iq_hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = iq_hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = iq_hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = iq_hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = iq_hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = iq_hash31(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float iq_fbm3(vec3 x, float lac, float gn) {
  float a = 0.0;
  float amp = 0.5;
  float f = 1.0;
  for (int i = 0; i < 5; i++) {
    a += amp * iq_vnoise(x * f);
    f *= lac;
    amp *= gn;
  }
  return a;
}

vec2 iq_voronoi3_f12(vec3 x) {
  vec3 n = floor(x);
  vec3 f = fract(x);
  vec2 mr = vec2(8.0, 8.0);
  for (int kk = -1; kk <= 1; kk++)
  for (int jj = -1; jj <= 1; jj++)
  for (int ii = -1; ii <= 1; ii++) {
    vec3 g = vec3(float(ii), float(jj), float(kk));
    vec3 cell = n + g;
    vec3 o = vec3(
      iq_hash31(cell),
      iq_hash31(cell + vec3(17.0, 31.0, 7.0)),
      iq_hash31(cell + vec3(43.0, 11.0, 23.0))) * 0.5 + 0.25;
    vec3 r = g + o - f;
    float d = dot(r, r);
    if (d < mr.x) { mr.y = mr.x; mr.x = d; }
    else if (d < mr.y) mr.y = d;
  }
  return sqrt(mr);
}

vec3 iq_rand_grad3(vec3 i) {
  return normalize(vec3(
    iq_hash31(i + vec3(0.0, 0.0, 0.0)),
    iq_hash31(i + vec3(31.0, 17.0, 7.0)),
    iq_hash31(i + vec3(11.0, 23.0, 29.0))) * 2.0 - 1.0);
}

float iq_gnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = dot(iq_rand_grad3(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0));
  float n100 = dot(iq_rand_grad3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0));
  float n010 = dot(iq_rand_grad3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0));
  float n110 = dot(iq_rand_grad3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0));
  float n001 = dot(iq_rand_grad3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0));
  float n101 = dot(iq_rand_grad3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0));
  float n011 = dot(iq_rand_grad3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0));
  float n111 = dot(iq_rand_grad3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z);
}

float iq_fbm3_g(vec3 x, float lac, float gn) {
  float s = 0.0;
  float amp = 0.5;
  float f = 1.0;
  for (int i = 0; i < 4; i++) {
    s += amp * iq_gnoise(x * f);
    f *= lac;
    amp *= gn;
  }
  return s;
}

vec3 iq_fbm3_grad_fd(vec3 x, float lac, float gn, float e) {
  float ex = iq_fbm3(x + vec3(e, 0.0, 0.0), lac, gn) - iq_fbm3(x - vec3(e, 0.0, 0.0), lac, gn);
  float ey = iq_fbm3(x + vec3(0.0, e, 0.0), lac, gn) - iq_fbm3(x - vec3(0.0, e, 0.0), lac, gn);
  float ez = iq_fbm3(x + vec3(0.0, 0.0, e), lac, gn) - iq_fbm3(x - vec3(0.0, 0.0, e), lac, gn);
  return vec3(ex, ey, ez) / max(2.0 * e, 1e-6);
}
`;

export function glslUniformDecl(u: UniformManifestEntry): string {
	switch (u.type) {
		case 'float':
			return `uniform float ${u.name};`;
		case 'int':
			return `uniform int ${u.name};`;
		case 'vec2':
			return `uniform vec2 ${u.name};`;
		case 'vec3':
			return `uniform vec3 ${u.name};`;
		case 'vec4':
			return `uniform vec4 ${u.name};`;
		case 'mat4':
			return `uniform mat4 ${u.name};`;
		default:
			return `uniform float ${u.name};`;
	}
}

export function indentBlock(src: string, spaces: string): string {
	return src
		.split('\n')
		.map((ln) => (ln.trim() ? spaces + ln : ln))
		.join('\n');
}
