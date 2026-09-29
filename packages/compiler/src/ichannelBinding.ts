import type { BufferId, ChannelBindingResolved, IChannelSlotBinding } from './types.js';

const BUFFER_IDS = new Set<BufferId>(['image', 'bufA', 'bufB', 'bufC', 'bufD']);

/** Parse JSON / meta value into a resolved channel source. */
export function resolveIChannelBinding(raw: IChannelSlotBinding | undefined): ChannelBindingResolved | undefined {
	if (raw === undefined) return undefined;
	if (typeof raw === 'string') {
		if (BUFFER_IDS.has(raw as BufferId)) {
			return { kind: 'buffer', bufferId: raw as BufferId };
		}
		return undefined;
	}
	if (typeof raw === 'object' && raw !== null && 'media' in raw && typeof (raw as { media: unknown }).media === 'string') {
		return { kind: 'media', mediaId: (raw as { media: string }).media };
	}
	return undefined;
}
