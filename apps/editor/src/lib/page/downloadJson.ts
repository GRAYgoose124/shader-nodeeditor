export function downloadJsonBlob(filename: string, text: string, mime = 'application/json'): void {
	const blob = new Blob([text], { type: mime });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = filename;
	a.click();
	URL.revokeObjectURL(a.href);
}
