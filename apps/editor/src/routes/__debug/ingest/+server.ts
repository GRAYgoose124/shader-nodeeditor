import { appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function POST({ request }: { request: Request }): Promise<Response> {
	try {
		const body = await request.text();
		// Write to repo root debug log (debug session 14511e).
		const logPath = fileURLToPath(new URL('../../../../../../debug-14511e.log', import.meta.url));
		await appendFile(logPath, body.trim() + '\n', 'utf8');
		return new Response('ok', { status: 200 });
	} catch (e) {
		return new Response(e instanceof Error ? e.message : String(e), { status: 500 });
	}
}

