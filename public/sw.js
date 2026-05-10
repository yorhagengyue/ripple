// Ripple PWA — minimal service worker
// Network-first for HTML (always fresh content on deploy).
// Stale-while-revalidate for hashed assets (fast load + background refresh).
// API requests (/api/*) bypass the SW entirely so Kimi/Supabase traffic stays live.

const VERSION = 'ripple-v2';
const HTML_CACHE = `${VERSION}-html`;
const ASSET_CACHE = `${VERSION}-assets`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never touch cross-origin or API calls
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  const isHtml =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHtml) {
    event.respondWith(htmlStrategy(req));
  } else {
    event.respondWith(assetStrategy(req));
  }
});

// Network first, fall back to cache, fall back to cached '/' shell
async function htmlStrategy(req) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      const cache = await caches.open(HTML_CACHE);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch {
    const cache = await caches.open(HTML_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    const shell = await cache.match('/');
    if (shell) return shell;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Stale-while-revalidate
async function assetStrategy(req) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || new Response('', { status: 504 });
}

// ---------------- Web Push ----------------
self.addEventListener('push', (event) => {
  let payload = { title: 'Ripple', body: 'New reading from your watch.', url: '/chat' };
  if (event.data) {
    try { payload = { ...payload, ...event.data.json() }; }
    catch { payload.body = event.data.text() || payload.body; }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/ripple-icon.svg',
      badge: '/icons/ripple-icon-maskable.svg',
      tag: payload.tag || 'ripple-nudge',
      renotify: true,
      data: { url: payload.url || '/chat' },
      // iOS respects vibrate only when added via manifest; harmless on other platforms
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/chat';

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // If a Ripple window is already open, focus it and route to /chat
    for (const client of all) {
      try {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          await client.focus();
          if ('navigate' in client) client.navigate(target);
          return;
        }
      } catch { /* ignore */ }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
