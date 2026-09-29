import type { NodeTypeDef } from '../types.js';

import { sdfCsgHardNodes } from './sdfNodes/csg.js';
import { sdfNodesMainInline } from './sdfNodes/mainInline.js';
import { sdfMaterialNodes } from './sdfNodes/material.js';
import { sdfPrimitiveNodes } from './sdfNodes/primitives.js';
import { sdfPrimitiveComboNode } from './sdfNodes/sdfPrimitiveCombo.js';
import { sdfSceneGraphNodes } from './sdfNodes/sceneGraph.js';
import { sdfDomainVariationNodes } from './sdfNodes/domainVariations.js';

export const sdfNodesMain: NodeTypeDef[] = [
	sdfPrimitiveComboNode,
	...sdfPrimitiveNodes,
	...sdfMaterialNodes,
	...sdfCsgHardNodes,
	...sdfSceneGraphNodes,
	...sdfDomainVariationNodes,
	...sdfNodesMainInline,
];
