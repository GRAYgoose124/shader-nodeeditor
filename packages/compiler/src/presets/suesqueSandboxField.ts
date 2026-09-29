import type { GraphDocument, GraphEdge, GraphNode } from '../types.js';

/**
 * Suesque sandbox **field** feedback preset: full graph as a `GraphDocument` (stable node ids).
 * CHG/STENCIL step from `fragment_shaders/shaders/suesque_sandbox/old.glsl` default branch (non-MOUSE, non-SPONTANEOUS),
 * matching **`OP` / `BR|RG|GB` / `P1|P2|P3`** exactly:
 * - After `float r = col.x, g = col.y, b = col.z`, **`BR = OP(b,r,g)`** uses **`b` = blue = `.z`**, not `.y`.
 */
const passB = 'bufA' as const;
const passI = 'image' as const;

function nn(
	id: string,
	typeId: string,
	pos: { x: number; y: number },
	data: Record<string, unknown> = {},
	pass: typeof passB | typeof passI = passB,
): GraphNode {
	return { id, typeId, pass, position: { ...pos }, data };
}

function ee(id: string, source: string, sh: string, target: string, th: string): GraphEdge {
	return { id, source, sourceHandle: sh, target, targetHandle: th };
}

export function suesqueSandboxFieldGraphDocument(): GraphDocument {
	const nodes: GraphNode[] = [
		nn('sq-uv', 'uv', { x: 40, y: 280 }),
		nn('sq-fc', 'frag_coord_xy', { x: 40, y: 120 }),
		nn('sq-tf', 'sample_channel_texel', { x: 220, y: 80 }, { channel: 0 }),
		nn(
			'sq-cv',
			'conv3x3_texel',
			{ x: 220, y: 200 },
			{ channel: 0, wrapMode: '0', wCenter: -1, wCardinal: 0.2, wDiagonal: 0.05 },
		),
		nn('sq-rho', 'float_const', { x: 220, y: 320 }, { value: 1.12 }),
		nn('sq-lapS', 'vec4_mul_float', { x: 400, y: 240 }),
		nn('sq-ad', 'vec4_add', { x: 560, y: 160 }),
		nn('sq-s1', 'vec4_const', { x: 400, y: 400 }, { r: 0.87, g: 0.87, b: 0.87, a: 0 }),
		nn('sq-s2', 'vec4_const', { x: 400, y: 500 }, { r: 0.13, g: 0.13, b: 0.13, a: 0 }),
		nn('sq-s3', 'vec4_const', { x: 400, y: 600 }, { r: 0.13, g: 0.13, b: 0.13, a: 0 }),
		nn('sq-mu', 'float_const', { x: 400, y: 700 }, { value: 0.33 }),

		nn('sq-spl', 'vec4_channels', { x: 560, y: 320 }),
		nn('sq-cR', 'float_cos', { x: 720, y: 220 }),
		nn('sq-sR', 'float_sin', { x: 720, y: 280 }),
		nn('sq-cG', 'float_cos', { x: 720, y: 340 }),
		nn('sq-sG', 'float_sin', { x: 720, y: 400 }),
		nn('sq-cB', 'float_cos', { x: 720, y: 460 }),
		nn('sq-sB', 'float_sin', { x: 720, y: 520 }),

		nn('sq-bcrA', 'float_mul', { x: 880, y: 260 }),
		nn('sq-bcrB', 'float_mul', { x: 880, y: 320 }),
		nn('sq-bcr', 'float_add', { x: 1040, y: 290 }),
		nn('sq-rgrA', 'float_mul', { x: 880, y: 400 }),
		nn('sq-rgrB', 'float_mul', { x: 880, y: 460 }),
		nn('sq-rgr', 'float_add', { x: 1040, y: 430 }),
		nn('sq-gbrA', 'float_mul', { x: 880, y: 540 }),
		nn('sq-gbrB', 'float_mul', { x: 880, y: 600 }),
		nn('sq-gbr', 'float_add', { x: 1040, y: 570 }),

		nn('sq-p1m', 'float_mul', { x: 1200, y: 360 }),
		nn('sq-p1', 'float_sub', { x: 1360, y: 300 }),
		nn('sq-p2m', 'float_mul', { x: 1200, y: 480 }),
		nn('sq-p2', 'float_sub', { x: 1360, y: 420 }),
		nn('sq-p3m', 'float_mul', { x: 1200, y: 600 }),
		nn('sq-p3', 'float_sub', { x: 1360, y: 540 }),

		nn('sq-pVec', 'vec4_from_xyz_w', { x: 1520, y: 420 }, { w: 0 }),
		nn('sq-swBr', 'vec4_swizzle', { x: 1680, y: 320 }, { pattern: 'zxyw' }),
		nn('sq-swRg', 'vec4_swizzle', { x: 1680, y: 420 }, { pattern: 'xyzw' }),
		nn('sq-swGb', 'vec4_swizzle', { x: 1680, y: 520 }, { pattern: 'yzxw' }),

		nn('sq-brM', 'vec4_mul', { x: 1840, y: 320 }),
		nn('sq-rgM', 'vec4_mul', { x: 1840, y: 420 }),
		nn('sq-gbM', 'vec4_mul', { x: 1840, y: 520 }),

		nn('sq-chgAB', 'vec4_add', { x: 2000, y: 380 }),
		nn('sq-chg', 'vec4_add', { x: 2160, y: 400 }),

		nn('sq-ad2', 'vec4_add', { x: 2320, y: 200 }),
		nn('sq-fr', 'frame', { x: 720, y: 560 }),
		nn('sq-msk', 'mask_frame_below', { x: 880, y: 520 }, { edge: 100 }),
		nn(
			'sq-d1',
			'splat_uv_disk_vec4',
			{ x: 560, y: 640 },
			{ cx: 0.33, cy: 0.33, radius: 0.005, r: 1, g: 0, b: 0, alpha: 0 },
		),
		nn(
			'sq-d2',
			'splat_uv_disk_vec4',
			{ x: 720, y: 640 },
			{ cx: 0.5, cy: 0.75, radius: 0.005, r: 0, g: 1, b: 0, alpha: 0 },
		),
		nn(
			'sq-d3',
			'splat_uv_disk_vec4',
			{ x: 880, y: 640 },
			{ cx: 0.66, cy: 0.33, radius: 0.005, r: 0, g: 0, b: 1, alpha: 0 },
		),
		nn('sq-i12', 'vec4_add', { x: 1040, y: 600 }),
		nn('sq-iSum', 'vec4_add', { x: 1200, y: 560 }),
		nn('sq-iSc', 'vec4_mul_float', { x: 1040, y: 480 }),
		nn('sq-ad3', 'vec4_add', { x: 2480, y: 200 }),
		nn('sq-de', 'vec4_scale', { x: 2640, y: 200 }, { s: 0.9812 }),
		nn('sq-out', 'frag_output', { x: 2820, y: 200 }),

		nn('sq-fcI', 'frag_coord_xy', { x: 40, y: 40 }, {}, passI),
		nn('sq-tfI', 'sample_channel_texel', { x: 280, y: 40 }, { channel: 0 }, passI),
		nn('sq-outI', 'frag_output', { x: 520, y: 40 }, {}, passI),
	];

	const edges: GraphEdge[] = [
		ee('sq-e0', 'sq-fc', 'xy', 'sq-tf', 'pixel'),
		ee('sq-e0b', 'sq-fc', 'xy', 'sq-cv', 'pixel'),
		ee('sq-e1', 'sq-cv', 'out', 'sq-lapS', 'a'),
		ee('sq-e2', 'sq-rho', 'v', 'sq-lapS', 's'),
		ee('sq-e3', 'sq-tf', 'rgba', 'sq-ad', 'a'),
		ee('sq-e4', 'sq-lapS', 'out', 'sq-ad', 'b'),
		ee('sq-eAdSpl', 'sq-ad', 'out', 'sq-spl', 'rgba'),

		ee('sq-ee1', 'sq-spl', 'x', 'sq-cR', 'x'),
		ee('sq-ee2', 'sq-spl', 'x', 'sq-sR', 'x'),
		ee('sq-ee3', 'sq-spl', 'y', 'sq-cG', 'x'),
		ee('sq-ee4', 'sq-spl', 'y', 'sq-sG', 'x'),
		ee('sq-ee5', 'sq-spl', 'z', 'sq-cB', 'x'),
		ee('sq-ee6', 'sq-spl', 'z', 'sq-sB', 'x'),

		ee('sq-eb0', 'sq-spl', 'z', 'sq-bcrA', 'a'),
		ee('sq-eb1', 'sq-cR', 'out', 'sq-bcrA', 'b'),
		ee('sq-eb2', 'sq-spl', 'z', 'sq-bcrB', 'a'),
		ee('sq-eb3', 'sq-sG', 'out', 'sq-bcrB', 'b'),
		ee('sq-eb4', 'sq-bcrA', 'out', 'sq-bcr', 'a'),
		ee('sq-eb5', 'sq-bcrB', 'out', 'sq-bcr', 'b'),

		ee('sq-er0', 'sq-spl', 'x', 'sq-rgrA', 'a'),
		ee('sq-er1', 'sq-cG', 'out', 'sq-rgrA', 'b'),
		ee('sq-er2', 'sq-spl', 'x', 'sq-rgrB', 'a'),
		ee('sq-er3', 'sq-sB', 'out', 'sq-rgrB', 'b'),
		ee('sq-er4', 'sq-rgrA', 'out', 'sq-rgr', 'a'),
		ee('sq-er5', 'sq-rgrB', 'out', 'sq-rgr', 'b'),

		ee('sq-eg0', 'sq-spl', 'y', 'sq-gbrA', 'a'),
		ee('sq-eg1', 'sq-cB', 'out', 'sq-gbrA', 'b'),
		ee('sq-eg2', 'sq-spl', 'y', 'sq-gbrB', 'a'),
		ee('sq-eg3', 'sq-sR', 'out', 'sq-gbrB', 'b'),
		ee('sq-eg4', 'sq-gbrA', 'out', 'sq-gbr', 'a'),
		ee('sq-eg5', 'sq-gbrB', 'out', 'sq-gbr', 'b'),

		ee('sq-ep0', 'sq-rgr', 'out', 'sq-p1m', 'a'),
		ee('sq-ep0b', 'sq-mu', 'v', 'sq-p1m', 'b'),
		ee('sq-ep1', 'sq-bcr', 'out', 'sq-p1', 'a'),
		ee('sq-ep1b', 'sq-p1m', 'out', 'sq-p1', 'b'),
		ee('sq-ep2', 'sq-gbr', 'out', 'sq-p2m', 'a'),
		ee('sq-ep2b', 'sq-mu', 'v', 'sq-p2m', 'b'),
		ee('sq-ep3', 'sq-rgr', 'out', 'sq-p2', 'a'),
		ee('sq-ep3b', 'sq-p2m', 'out', 'sq-p2', 'b'),
		ee('sq-ep4', 'sq-bcr', 'out', 'sq-p3m', 'a'),
		ee('sq-ep4b', 'sq-mu', 'v', 'sq-p3m', 'b'),
		ee('sq-ep5', 'sq-gbr', 'out', 'sq-p3', 'a'),
		ee('sq-ep5b', 'sq-p3m', 'out', 'sq-p3', 'b'),

		ee('sq-ev0', 'sq-p1', 'out', 'sq-pVec', 'x'),
		ee('sq-ev1', 'sq-p2', 'out', 'sq-pVec', 'y'),
		ee('sq-ev2', 'sq-p3', 'out', 'sq-pVec', 'z'),
		ee('sq-ew0', 'sq-pVec', 'rgba', 'sq-swBr', 'v'),
		ee('sq-ew1', 'sq-pVec', 'rgba', 'sq-swRg', 'v'),
		ee('sq-ew2', 'sq-pVec', 'rgba', 'sq-swGb', 'v'),

		ee('sq-em0', 'sq-swBr', 'out', 'sq-brM', 'a'),
		ee('sq-em0b', 'sq-s1', 'rgba', 'sq-brM', 'b'),
		ee('sq-em1', 'sq-swRg', 'out', 'sq-rgM', 'a'),
		ee('sq-em1b', 'sq-s2', 'rgba', 'sq-rgM', 'b'),
		ee('sq-em2', 'sq-swGb', 'out', 'sq-gbM', 'a'),
		ee('sq-em2b', 'sq-s3', 'rgba', 'sq-gbM', 'b'),

		ee('sq-ec0', 'sq-brM', 'out', 'sq-chgAB', 'a'),
		ee('sq-ec1', 'sq-rgM', 'out', 'sq-chgAB', 'b'),
		ee('sq-ec2', 'sq-chgAB', 'out', 'sq-chg', 'a'),
		ee('sq-ec3', 'sq-gbM', 'out', 'sq-chg', 'b'),

		ee('sq-ea0', 'sq-ad', 'out', 'sq-ad2', 'a'),
		ee('sq-ea1', 'sq-chg', 'out', 'sq-ad2', 'b'),

		ee('sq-ed0', 'sq-uv', 'uv', 'sq-d1', 'uv'),
		ee('sq-ed1', 'sq-uv', 'uv', 'sq-d2', 'uv'),
		ee('sq-ed2', 'sq-uv', 'uv', 'sq-d3', 'uv'),
		ee('sq-ed3', 'sq-d1', 'out', 'sq-i12', 'a'),
		ee('sq-ed4', 'sq-d2', 'out', 'sq-i12', 'b'),
		ee('sq-ed5', 'sq-i12', 'out', 'sq-iSum', 'a'),
		ee('sq-ed6', 'sq-d3', 'out', 'sq-iSum', 'b'),
		ee('sq-ed7', 'sq-fr', 'f', 'sq-msk', 'frame'),
		ee('sq-ed8', 'sq-iSum', 'out', 'sq-iSc', 'a'),
		ee('sq-ed9', 'sq-msk', 'm', 'sq-iSc', 's'),
		ee('sq-eaa0', 'sq-ad2', 'out', 'sq-ad3', 'a'),
		ee('sq-eaa1', 'sq-iSc', 'out', 'sq-ad3', 'b'),
		ee('sq-edec0', 'sq-ad3', 'out', 'sq-de', 'a'),
		ee('sq-edec1', 'sq-de', 'out', 'sq-out', 'color'),
		ee('sq-evw0', 'sq-fcI', 'xy', 'sq-tfI', 'pixel'),
		ee('sq-evw1', 'sq-tfI', 'rgba', 'sq-outI', 'color'),
	];

	return {
		version: 1,
		meta: {
			name: 'suesque-sandbox-field',
			iChannels: {
				bufA: { 0: 'bufA' },
				image: { 0: 'bufA' },
			},
		},
		nodes,
		edges,
	};
}
