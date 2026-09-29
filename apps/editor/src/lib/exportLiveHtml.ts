import type { CompileResult } from '@shadertoy/compiler';
import liveExportRuntime from './liveExportRuntime.js?raw';

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export type ExportLiveHtmlOptions = {
	/** <title> and suggested download name base */
	title?: string;
	canvasWidth?: number;
	canvasHeight?: number;
	/** When provided, exported page applies these animations each frame. */
	paramAnimations?: Record<string, unknown> | null;
};

/**
 * Single-file HTML with embedded WebGL2 runner and compiled passes from `compileGraph`.
 * Throws if `result.errors.length > 0`.
 */
export function buildExportLiveHtmlDocument(
	result: CompileResult,
	opts: ExportLiveHtmlOptions = {},
): string {
	if (result.errors.length > 0) {
		throw new Error(result.errors.join('\n'));
	}

	const bundle = {
		manifest: result.manifest,
		passes: result.passes,
		paramAnimations: opts.paramAnimations ?? null,
	};
	const json = JSON.stringify(bundle);
	const b64 = btoa(unescape(encodeURIComponent(json)));

	const title = escapeHtml(opts.title ?? 'Shader export');
	const cw = opts.canvasWidth ?? 1280;
	const ch = opts.canvasHeight ?? 720;

	const b64Literal = JSON.stringify(b64);

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
html,body{margin:0;min-height:100%;background:#0a0c0f;color:#b8c0cc;font-family:system-ui,Segoe UI,sans-serif;}
.wrap{display:flex;flex-direction:column;align-items:stretch;padding:12px;box-sizing:border-box;min-height:100vh;gap:10px;}
.stage-col{width:100%;max-width:min(100vw - 24px,1920px);margin:0 auto;display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;}
.stage-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px;}
.fs-btn{background:#252a33;border:1px solid #3a4150;color:#e8eaed;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;}
.fs-btn:hover{background:#2e3440;}
.stage{width:100%;max-width:min(100vw - 24px,1920px);aspect-ratio:${cw} / ${ch};max-height:min(85vh,calc((min(100vw - 24px,1920px)) * ${ch} / ${cw}));background:#000;border-radius:8px;box-shadow:0 4px 28px rgba(0,0,0,.55);overflow:hidden;}
.stage:fullscreen{aspect-ratio:unset;max-height:none;width:100vw;height:100vh;max-width:none;border-radius:0;}
canvas#exp{display:block;width:100%;height:100%;background:#000;}
.foot{font-size:11px;opacity:.55;text-align:center;max-width:42rem;margin:0 auto;}
.err{white-space:pre-wrap;color:#f88;padding:12px;max-width:min(90vw,42rem);font-size:12px;margin:0 auto;}
</style>
</head>
<body>
<div class="wrap">
<div class="stage-col">
<div class="stage-toolbar">
<button type="button" class="fs-btn" id="st-fs" title="Fill the screen with the shader">Fullscreen</button>
</div>
<div class="stage" id="st-stage">
<canvas id="exp" width="${cw}" height="${ch}"></canvas>
</div>
</div>
<p class="foot">Exported graph · WebGL2 · opens offline</p>
<div id="err" class="err" hidden></div>
</div>
<script>window.__GRAPH_B64=${b64Literal};<\/script>
<script>${liveExportRuntime}<\/script>
<script>
(function(){
	var st=document.getElementById('st-stage');
	var btn=document.getElementById('st-fs');
	if(!st||!btn)return;
	function syncLbl(){btn.textContent=document.fullscreenElement? 'Exit fullscreen':'Fullscreen';}
	btn.addEventListener('click',function(){
		if(!document.fullscreenElement){var p=st.requestFullscreen&&st.requestFullscreen();if(p&&p.catch)p.catch(function(){});}
		else{var x=document.exitFullscreen&&document.exitFullscreen();if(x&&x.catch)x.catch(function(){});}
	});
	document.addEventListener('fullscreenchange',syncLbl);
	syncLbl();
})();
<\/script>
</body>
</html>`;
}
