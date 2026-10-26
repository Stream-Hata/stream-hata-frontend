const VERSION_URL = '/version.json';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function checkVersion() {
	try {
		const response = await fetch(`${VERSION_URL}?sw=${Date.now()}`, { cache: 'no-store' });
		const payload = await response.json();
		const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

		for (const client of clients) {
			client.postMessage({ type: 'APP_VERSION', build: payload.build, version: payload.version });
		}
	} catch {
		// Network is unavailable; the page will retry on its next poll.
	}
}

self.addEventListener('message', (event) => {
	if (event.data?.type === 'CHECK_VERSION') {
		event.waitUntil(checkVersion());
	}
});

self.addEventListener('periodicsync', (event) => {
	if (event.tag === 'app-version-check') {
		event.waitUntil(checkVersion());
	}
});
