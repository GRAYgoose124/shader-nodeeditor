"""Generate apps/editor/src/lib/presets/*.ts from defaultFlow.ts (0-based line slices)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "apps/editor/src/lib/defaultFlow.ts"
OUT = ROOT / "apps/editor/src/lib/presets"
lines = SRC.read_text(encoding="utf-8").splitlines(keepends=True)


def join_chunks(chunks: list[tuple[int, int]]) -> str:
	return "".join("".join(lines[a:b]) for a, b in chunks)


OUT.mkdir(parents=True, exist_ok=True)

(OUT / "utils.ts").write_text(
	"""import type { Edge } from '@xyflow/svelte';

export function makeEdge(
	source: string,
	target: string,
	sourceHandle: string,
	targetHandle: string,
): Edge {
	return { id: crypto.randomUUID(), source, target, sourceHandle, targetHandle };
}
""",
	encoding="utf-8",
)

packs = {
	"starters": {
		"imports": """import type { Edge, Node } from '@xyflow/svelte';
import type { GraphDocument } from '@shadertoy/compiler';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';
""",
		"chunks": [
			(14, 33),
			(33, 91),
			(91, 168),
			(168, 234),
			(391, 441),
			(441, 485),
			(485, 520),
			(520, 725),
			(725, 733),
		],
	},
	"buffers": {
		"imports": """import type { Edge, Node } from '@xyflow/svelte';
import type { GraphDocument } from '@shadertoy/compiler';
import { suesqueSandboxFieldGraphDocument } from '@shadertoy/compiler';
import { createGraphNode, docToFlowNodesAndEdges, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';
""",
		"chunks": [
			(235, 273),
			(274, 288),
			(943, 1025),
		],
	},
	"phase7": {
		"imports": """import type { Edge, Node } from '@xyflow/svelte';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';
""",
		"chunks": [
			(289, 334),
			(334, 375),
			(375, 391),
			(733, 751),
		],
	},
	"procedural2d": {
		"imports": """import type { Edge, Node } from '@xyflow/svelte';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';
""",
		"chunks": [
			(751, 830),
			(830, 881),
			(881, 909),
			(909, 943),
			(1386, 1412),
		],
	},
	"showcase": {
		"imports": """import type { Edge, Node } from '@xyflow/svelte';
import type { GraphDocument } from '@shadertoy/compiler';
import { createGraphNode, toFlowNode, type ShaderNodeData } from '../flowDoc.js';
import { makeEdge } from './utils.js';
""",
		"chunks": [
			(1025, 1194),
			(1194, 1203),
			(1203, 1375),
			(1375, 1385),
		],
	},
}

for name, spec in packs.items():
	(OUT / f"{name}.ts").write_text(spec["imports"] + "\n" + join_chunks(spec["chunks"]), encoding="utf-8")

(OUT / "index.ts").write_text(
	"""export { makeEdge } from './utils.js';
export * from './starters.js';
export * from './buffers.js';
export * from './phase7.js';
export * from './procedural2d.js';
export * from './showcase.js';
""",
	encoding="utf-8",
)

print("OK", OUT)
