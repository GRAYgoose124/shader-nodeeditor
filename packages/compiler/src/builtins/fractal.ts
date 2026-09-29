import type { NodeTypeDef } from '../types.js';

import { fractalColorNodes } from './fractal/color.js';
import { fractalEscapeNodes } from './fractal/escape.js';
import { fractalNewtonNodes } from './fractal/newton.js';
import { fractalOrbitTrapNodes } from './fractal/orbitTraps.js';

export const fractalNodes: NodeTypeDef[] = [
	...fractalEscapeNodes,
	...fractalOrbitTrapNodes,
	...fractalColorNodes,
	...fractalNewtonNodes,
];
