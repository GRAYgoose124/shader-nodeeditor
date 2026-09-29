<script lang="ts">
	import '@xyflow/svelte/dist/style.css';
	import 'dockview-core/dist/styles/dockview.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Shadertoy node editor</title>
</svelte:head>

<div class="app">
	{@render children()}
</div>

<style>
	:global(html, body) {
		margin: 0;
		height: 100%;
		overflow: hidden;
		background: #0e1014;
		color: #e8eaed;
		font-family:
			system-ui,
			'Segoe UI',
			Roboto,
			sans-serif;
	}
	.app {
		box-sizing: border-box;
		height: 100%;
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
</style>
