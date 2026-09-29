import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			/** Bundler uses compiler TypeScript source so stale `packages/compiler/dist` never omits builtins. */
			'@shadertoy/compiler': path.resolve(__dirname, '../../packages/compiler/src/index.ts'),
			/** Same for runner — avoids stale `packages/runner/dist` when `vite dev` skips `predev` rebuild. */
			'@shadertoy/runner': path.resolve(__dirname, '../../packages/runner/src/index.ts'),
		},
	},
});
