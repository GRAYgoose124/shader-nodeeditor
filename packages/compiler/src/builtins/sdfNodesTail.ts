import type { NodeTypeDef } from '../types.js';

import { sdfCsgSmoothNodes } from './sdfNodes/csg.js';
import { sdfExampleNodes } from './sdfNodes/examples.js';
import { sdfRayNodes } from './sdfNodes/ray.js';
import { sdfOpsNodes } from './sdfNodes/sdfOps.js';
import { sdfVisualizeNodes } from './sdfNodes/visualize.js';

export const sdfNodesTail: NodeTypeDef[] = [
	...sdfCsgSmoothNodes,
	...sdfOpsNodes,
	...sdfRayNodes,
	...sdfVisualizeNodes,
	...sdfExampleNodes,
];
