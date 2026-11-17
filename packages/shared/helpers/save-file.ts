interface SaveFileHandle {
	createWritable: () => Promise<{
		write: (data: Blob) => Promise<void>;
		close: () => Promise<void>;
	}>;
}

interface SaveFileWindow extends Window {
	showSaveFilePicker?: (options: {
		suggestedName: string;
		types: Array<{ description: string; accept: Record<string, string[]> }>;
	}) => Promise<SaveFileHandle>;
}

export async function saveTextFile(name: string, text: string, type = 'text/plain'): Promise<void> {
	const internals = (
		window as unknown as {
			__TAURI_INTERNALS__?: {
				invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
			};
		}
	).__TAURI_INTERNALS__;

	if (internals?.invoke) {
		try {
			const saved = await internals.invoke('save_text_file', { name, text });

			if (typeof saved === 'boolean') {
				return;
			}
		} catch {
			// fallback to the browser API below
		}
	}

	const picker = (window as SaveFileWindow).showSaveFilePicker;
	const extension = type === 'text/csv' ? '.csv' : type === 'application/json' ? '.json' : '.txt';

	if (picker) {
		try {
			const handle = await picker({
				suggestedName: name,
				types: [{ description: 'Файл', accept: { [type]: [extension] } }],
			});
			const writable = await handle.createWritable();
			await writable.write(new Blob([text], { type: `${type};charset=utf-8` }));
			await writable.close();

			return;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				return;
			}
		}
	}

	const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
	const link = document.createElement('a');
	link.href = url;
	link.download = name;
	link.click();
	URL.revokeObjectURL(url);
}
