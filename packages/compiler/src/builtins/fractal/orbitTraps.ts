import type { NodeTypeDef } from '../../types.js';

export const fractalOrbitTrapNodes: NodeTypeDef[] = [
	{
		id: 'mandelbrot_orbit_trap',
		label: 'Mandelbrot orbit trap',
		category: 'Fractal',
		description: 'Min distance from orbit (z) to a trap point while iterating.',
		inputs: [{ id: 'uv', type: 'vec2', label: 'UV → complex plane' }],
		outputs: [
			{ id: 'trap', type: 'float', label: 'Norm. trap dist' },
			{ id: 'esc', type: 'float', label: 'Escape (smooth)' },
		],
		params: [
			{ id: 'cx', label: 'Center X', glslType: 'float', default: -0.5, min: -2, max: 1, step: 0.01, binding: 'uniform' },
			{ id: 'cy', label: 'Center Y', glslType: 'float', default: 0, min: -1.5, max: 1.5, step: 0.01, binding: 'uniform' },
			{ id: 'scale', label: 'Zoom', glslType: 'float', default: 2.5, min: 0.1, max: 8, step: 0.05, binding: 'uniform' },
			{ id: 'tx', label: 'Trap X', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'ty', label: 'Trap Y', glslType: 'float', default: 0, min: -2, max: 2, step: 0.02, binding: 'uniform' },
			{ id: 'trapScale', label: 'Trap scale', glslType: 'float', default: 4, min: 0.5, max: 24, step: 0.1, binding: 'uniform' },
			{ id: 'maxIter', label: 'Max iter', glslType: 'float', default: 80, min: 8, max: 512, step: 1, binding: 'literal' },
		],
		template: `// node: {{nodeId}} — orbit trap / https://iquilezles.org/articles/fractalsorbittraps/
  vec2 cot_{{ns}} = ({{in:uv}} - 0.5) * float({{param:scale}}) + vec2(float({{param:cx}}), float({{param:cy}}));
  vec2 zot_{{ns}} = vec2(0.0);
  vec2 totr_{{ns}} = vec2(float({{param:tx}}), float({{param:ty}}));
  float dmin_{{ns}} = 1e10;
  float escot_{{ns}} = 0.0;
  float z2ot_{{ns}} = 0.0;
  for (int iot_{{ns}} = 0; iot_{{ns}} < 512; iot_{{ns}}++) {
    if (float(iot_{{ns}}) >= float({{param:maxIter}})) break;
    zot_{{ns}} = vec2(zot_{{ns}}.x * zot_{{ns}}.x - zot_{{ns}}.y * zot_{{ns}}.y, 2.0 * zot_{{ns}}.x * zot_{{ns}}.y) + cot_{{ns}};
    z2ot_{{ns}} = dot(zot_{{ns}}, zot_{{ns}});
    dmin_{{ns}} = min(dmin_{{ns}}, length(zot_{{ns}} - totr_{{ns}}));
    if (z2ot_{{ns}} > 4.0) { escot_{{ns}} = (float(iot_{{ns}}) + 1.0 - log2(log2(z2ot_{{ns}}) * 0.5)) / float({{param:maxIter}}); break; }
  }
  float {{out:trap}} = clamp(sqrt(dmin_{{ns}}) * float({{param:trapScale}}), 0.0, 1.0);
  float {{out:esc}} = escot_{{ns}};`,
	},
];

