#!/usr/bin/env node
/**
 * Scan a sibling (or any) fragment_shaders/shaders tree and emit corpus/fragment-shaders-inventory.json
 * with heuristic tags for graph-conversion prioritization.
 *
 * Usage:
 *   node scripts/fragment-shader-corpus.mjs /path/to/fragment_shaders/shaders
 *
 * If omitted, uses FRAGMENT_SHADERS_ROOT env or ../../fragment_shaders/shaders from repo root.
 */
import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

function tagContent(pathRel, text) {
	const tags = new Set();
	const lower = text.toLowerCase();
	const base = pathRel.split('/').pop() ?? '';

	if (/texelfetch\s*\(/i.test(text)) tags.add('feedback_texel');
	if (/\bbuffer[a-d]\b/i.test(base) || /\/common\.glsl$/i.test(pathRel)) tags.add('multipass');
	if (/\biChannel\d+\b/i.test(text) && /buf[a-d]|buffer[a-d]/i.test(text)) {
		tags.add('multipass');
	}
	if (/raymarch|sd[a-z]*\s*\(|castray|trace\s*\(/i.test(text)) tags.add('raymarch_sdf');
	if (/^\s*#include\b/m.test(text)) tags.add('includes');
	if (/ichanneltime|sampler2d\s+.*sound|audio/i.test(lower)) tags.add('audio');
	if (/\btexture\s*\(\s*iChannel/i.test(text)) tags.add('texture_sample');
	if (tags.size === 0 || (!tags.has('raymarch_sdf') && !tags.has('multipass'))) {
		tags.add('full_screen_proc');
	}
	return [...tags].sort();
}

async function* walkGlsl(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const e of entries) {
		const p = join(dir, e.name);
		if (e.isDirectory()) yield* walkGlsl(p);
		else if (e.isFile() && e.name.endsWith('.glsl')) yield p;
	}
}

async function main() {
	const arg = process.argv[2];
	const fallback = join(repoRoot, '..', 'fragment_shaders', 'shaders');
	const root = arg ?? process.env.FRAGMENT_SHADERS_ROOT ?? fallback;

	let st;
	try {
		st = await stat(root);
	} catch {
		console.error(`fragment-shader-corpus: not a directory: ${root}`);
		process.exit(1);
	}
	if (!st.isDirectory()) {
		console.error(`fragment-shader-corpus: not a directory: ${root}`);
		process.exit(1);
	}

	const out = [];
	for await (const abs of walkGlsl(root)) {
		const rel = relative(root, abs).replaceAll('\\', '/');
		let text = '';
		try {
			text = await readFile(abs, 'utf8');
		} catch {
			continue;
		}
		out.push({
			path: rel,
			tags: tagContent(rel, text),
		});
	}
	out.sort((a, b) => a.path.localeCompare(b.path));

	const payload = {
		generatedBy: 'scripts/fragment-shader-corpus.mjs',
		shadersRoot: root,
		count: out.length,
		files: out,
	};

	const dest = join(repoRoot, 'corpus', 'fragment-shaders-inventory.json');
	await mkdir(dirname(dest), { recursive: true });
	await writeFile(dest, JSON.stringify(payload, null, 2) + '\n', 'utf8');
	console.log(`Wrote ${out.length} entries → ${dest}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
