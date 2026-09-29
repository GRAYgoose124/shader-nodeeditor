import type { GraphPageActionApi, GraphPageActions } from './graphPageActionTypes.js';
import { createGraphPageActionsFlow } from './graphPageActionsFlow.js';
import { createGraphPageActionsIo } from './graphPageActionsIo.js';
import { createGraphPageActionsUniform } from './graphPageActionsUniform.js';

export type { GraphPageActionApi, GraphPageActions } from './graphPageActionTypes.js';

export function createGraphPageActions(api: GraphPageActionApi): GraphPageActions {
	return {
		...createGraphPageActionsFlow(api),
		...createGraphPageActionsIo(api),
		...createGraphPageActionsUniform(api),
	};
}
