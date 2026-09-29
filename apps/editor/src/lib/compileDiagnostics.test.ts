import { describe, expect, it } from 'vitest';
import { parseValidateAnchors } from './compileDiagnostics.js';

describe('parseValidateAnchors', () => {
	it('collects edge id from Edge prefix', () => {
		const e1 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
		const r = parseValidateAnchors([`Edge ${e1}: type mismatch float → vec3`]);
		expect([...r.edgeIds]).toEqual([e1]);
	});

	it('collects multiple edge ids from multi-wire suffix', () => {
		const e1 = '11111111-2222-3333-4444-555555555555';
		const e2 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
		const msg = `Pass image: node x has multiple wires into input "c" (2); only one source may feed each port; edges ${e1}, ${e2}`;
		const r = parseValidateAnchors([msg]);
		expect([...r.edgeIds].sort()).toEqual([e1, e2].sort());
	});

	it('collects edge id from single-edge suffix', () => {
		const e1 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
		const msg = `Pass image: node n input "uv" must come from main graph; edge ${e1}`;
		const r = parseValidateAnchors([msg]);
		expect([...r.edgeIds]).toEqual([e1]);
	});
});
