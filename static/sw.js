const CACHE = 'link-intel-v1';
const ASSETS = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Handle share target POST — forward to server
  if (url.pathname === '/share' && e.request.method === 'POST') {
    e.respondWith(
      (async () => {
        const formData = await e.request.formData();
        const shareUrl = formData.get('url') || formData.get('text') || '';
        const title = formData.get('title') || '';
        const body = new URLSearchParams({ url: shareUrl, title, text: formData.get('text') || '' });
        const response = await fetch('/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
        return response;
      })()
    );
    return;
  }

  // Never cache API calls or navigations
  if (url.pathname.startsWith('/api/') || e.request.mode === 'navigate') return;
  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
