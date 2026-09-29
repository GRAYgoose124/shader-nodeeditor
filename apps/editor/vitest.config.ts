import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'src/lib'),
			'@shadertoy/compiler': path.resolve(__dirname, '../../packages/compiler/src/index.ts'),
			'@shadertoy/runner': path.resolve(__dirname, '../../packages/runner/src/index.ts'),
		},
	},
	test: {
		environment: 'node',
		include: ['src/lib/**/*.test.ts'],
	},
});
