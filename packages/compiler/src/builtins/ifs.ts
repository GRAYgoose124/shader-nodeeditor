import type { NodeTypeDef } from '../types.js';

import { ifsControl2dNodes } from './ifs/control2d.js';
import { ifsFold2dNodes } from './ifs/folds2d.js';
import { ifsKifs3dNodes } from './ifs/kifs3d.js';
import { ifsMaps2dNodes } from './ifs/maps2d.js';
import { ifsMaps3dNodes } from './ifs/maps3d.js';
import { ifsRender2dNodes } from './ifs/render2d.js';

export const ifsNodes: NodeTypeDef[] = [
	...ifsFold2dNodes,
	...ifsMaps2dNodes,
	...ifsControl2dNodes,
	...ifsRender2dNodes,
	...ifsKifs3dNodes,
	...ifsMaps3dNodes,
];
