const CACHE_NAME = 'arasso-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png'
];

// CDN yang BOLEH di-cache
const CDN_WHITELIST = [
  'cdn.tailwindcss.com',
  'unpkg.com',
  'cdn.jsdelivr.net'
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // ❌ JANGAN cache Supabase & Gemini API
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com')
  ) {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  // ✅ CDN cache-first
  if (CDN_WHITELIST.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.match(req).then(cached =>
        cached ||
        fetch(req).then(res => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // ✅ HTML navigation (network-first)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
  }
});
