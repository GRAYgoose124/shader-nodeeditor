<script lang="ts">
	import type { BufferId, GraphMediaInput, GraphMeta, IChannelSlotBinding } from '@shadertoy/compiler';
	import { DEFAULT_PASS_ORDER } from '@shadertoy/compiler';
	import type { ShadertoyRunner } from '@shadertoy/runner';
	import { mediaFileById } from '$lib/editor/mediaFileById.js';

	let {
		graphMeta,
		activePass,
		patchGraphMeta,
		previewRunner,
	}: {
		graphMeta: GraphMeta;
		activePass: BufferId;
		patchGraphMeta: (fn: (d: GraphMeta) => void) => void;
		previewRunner: ShadertoyRunner | null;
	} = $props();

	const buffers: BufferId[] = ['image', 'bufA', 'bufB', 'bufC', 'bufD'];

	function newMediaId(): string {
		return crypto.randomUUID();
	}

	function addInput(kind: GraphMediaInput['kind']) {
		const id = newMediaId();
		patchGraphMeta((m) => {
			const list = [...(m.mediaInputs ?? [])];
			list.push({ id, kind, label: `${kind} ${list.length + 1}` });
			m.mediaInputs = list;
			const ich = { ...(m.iChannels ?? {}) };
			const passMap = { ...(ich[activePass] ?? {}) };
			let bound = false;
			for (let k = 0; k < 4; k++) {
				if (passMap[k as 0 | 1 | 2 | 3] === undefined) {
					if (kind === 'image' || kind === 'video') {
						passMap[k as 0 | 1 | 2 | 3] = { media: id };
						bound = true;
						break;
					}
				}
			}
			if (kind === 'audio' && !bound) {
				/* audio: no iChannel; uniforms only */
			}
			ich[activePass] = passMap;
			m.iChannels = ich;
		});
	}

	function removeMedia(mid: string) {
		patchGraphMeta((m) => {
			m.mediaInputs = (m.mediaInputs ?? []).filter((x) => x.id !== mid);
			const ich = { ...(m.iChannels ?? {}) };
			for (const p of DEFAULT_PASS_ORDER) {
				const pm = { ...(ich[p] ?? {}) };
				for (let k = 0; k < 4; k++) {
					const v = pm[k as 0 | 1 | 2 | 3];
					if (v && typeof v === 'object' && 'media' in v && (v as { media: string }).media === mid) {
						delete pm[k as 0 | 1 | 2 | 3];
					}
				}
				ich[p] = pm;
			}
			m.iChannels = ich;
		});
		mediaFileById.update((map) => {
			const n = new Map(map);
			n.delete(mid);
			return n;
		});
	}

	async function onPickFile(mediaId: string, file: File) {
		patchGraphMeta((m) => {
			const list = (m.mediaInputs ?? []).map((x) =>
				x.id === mediaId ? { ...x, fileName: file.name } : x,
			);
			m.mediaInputs = list;
		});
		mediaFileById.update((map) => new Map(map).set(mediaId, file));
		if (previewRunner) {
			try {
				await previewRunner.setMediaFromFile(mediaId, file);
			} catch (e) {
				console.warn(e);
			}
		}
	}

	function setChannel(pass: BufferId, slot: 0 | 1 | 2 | 3, value: string) {
		patchGraphMeta((m) => {
			const ich = { ...(m.iChannels ?? {}) };
			const pm = { ...(ich[pass] ?? {}) };
			if (value === '') {
				delete pm[slot];
			} else if (value.startsWith('media:')) {
				pm[slot] = { media: value.slice(6) };
			} else {
				pm[slot] = value as BufferId;
			}
			ich[pass] = pm;
			m.iChannels = ich;
		});
	}

	function bindingValue(v: IChannelSlotBinding | undefined): string {
		if (v === undefined) return '';
		if (typeof v === 'string') return v;
		return `media:${v.media}`;
	}
</script>

<h2>Media &amp; iChannels</h2>
<p class="muted small">
	Add image/video/audio, bind to <code>iChannel0–3</code> per pass (buffers or media). Audio drives
	<code>u_audioLevel</code> / band uniforms (see Audio levels node).
</p>

<div class="row">
	<button type="button" class="btn" onclick={() => addInput('image')}>+ Image</button>
	<button type="button" class="btn" onclick={() => addInput('video')}>+ Video</button>
	<button type="button" class="btn" onclick={() => addInput('audio')}>+ Audio</button>
</div>

<ul class="media-list">
	{#each graphMeta.mediaInputs ?? [] as m (m.id)}
		<li>
			<span class="tag">{m.kind}</span>
			<code class="id">{m.id.slice(0, 8)}…</code>
			{#if m.kind !== 'audio'}
				<label class="file">
					File
					<input
						type="file"
						accept={m.kind === 'video' ? 'video/*' : 'image/*'}
						onchange={(e) => {
							const f = (e.currentTarget as HTMLInputElement).files?.[0];
							if (f) void onPickFile(m.id, f);
						}}
					/>
				</label>
			{:else}
				<label class="file">
					File
					<input
						type="file"
						accept="audio/*"
						onchange={(e) => {
							const f = (e.currentTarget as HTMLInputElement).files?.[0];
							if (f) void onPickFile(m.id, f);
						}}
					/>
				</label>
			{/if}
			<span class="fn">{m.fileName ?? '—'}</span>
			<button type="button" class="btn danger" onclick={() => removeMedia(m.id)}>Remove</button>
		</li>
	{/each}
</ul>

<h3 class="sub">Channel map</h3>
<table class="grid">
	<thead>
		<tr>
			<th>Pass</th>
			<th>0</th>
			<th>1</th>
			<th>2</th>
			<th>3</th>
		</tr>
	</thead>
	<tbody>
		{#each DEFAULT_PASS_ORDER as pass (pass)}
			<tr class:act={pass === activePass}>
				<td>{pass}</td>
				{#each [0, 1, 2, 3] as slot (slot)}
					<td>
						<select
							value={bindingValue(graphMeta.iChannels?.[pass]?.[slot as 0 | 1 | 2 | 3])}
							onchange={(e) =>
								setChannel(pass, slot as 0 | 1 | 2 | 3, (e.currentTarget as HTMLSelectElement).value)}
						>
							<option value="">—</option>
							{#each buffers as b}
								<option value={b}>{b}</option>
							{/each}
							{#each graphMeta.mediaInputs ?? [] as mi (mi.id)}
								<option value="media:{mi.id}">media: {mi.label ?? mi.kind} ({mi.id.slice(0, 6)}…)</option>
							{/each}
						</select>
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.muted {
		color: #8b93a5;
		margin: 0 0 10px;
		line-height: 1.4;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 12px;
	}
	.btn {
		background: #252a33;
		border: 1px solid #3a4150;
		color: #e8eaed;
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 11px;
		cursor: pointer;
	}
	.btn.danger {
		border-color: #633;
		color: #f0b0b0;
	}
	.media-list {
		list-style: none;
		padding: 0;
		margin: 0 0 16px;
		font-size: 11px;
	}
	.media-list li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 6px 0;
		border-bottom: 1px solid #252a33;
	}
	.tag {
		background: #2a3140;
		padding: 2px 6px;
		border-radius: 4px;
		text-transform: uppercase;
		font-size: 10px;
	}
	.id {
		font-size: 10px;
		color: #9aa3b2;
	}
	.file input {
		display: none;
	}
	.file {
		cursor: pointer;
		color: #8cb4ff;
		text-decoration: underline;
		font-size: 11px;
	}
	.fn {
		color: #9aa3b2;
		flex: 1;
		min-width: 80px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.sub {
		margin: 12px 0 8px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #8b93a5;
	}
	.grid {
		width: 100%;
		border-collapse: collapse;
		font-size: 10px;
	}
	.grid th,
	.grid td {
		border: 1px solid #333842;
		padding: 4px;
	}
	.grid select {
		max-width: 120px;
		font-size: 10px;
		background: #1a1f28;
		color: #e8eaed;
		border: 1px solid #3a4150;
		border-radius: 4px;
	}
	tr.act td {
		background: rgba(60, 90, 140, 0.15);
	}
</style>
