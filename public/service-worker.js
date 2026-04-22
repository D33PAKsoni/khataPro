/* =========================================================
   KHATA SANGRAH - SERVICE WORKER v1.0
   Strategy: Cache-First for static assets, Network-First for API
   ========================================================= */

const CACHE_NAME = 'khata-sangrah-v1';
const STATIC_CACHE = 'khata-static-v1';
const API_CACHE = 'khata-api-v1';

// Assets to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
];

// =========================================================
// INSTALL: Precache static assets
// =========================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Khata Sangrah Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache what we can, but don't fail installation if some assets are missing
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn(`[SW] Failed to cache: ${url}`, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// =========================================================
// ACTIVATE: Clean up old caches
// =========================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// =========================================================
// FETCH: Route requests
// =========================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API calls - always go to network for data freshness
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(request, API_CACHE, 30));
    return;
  }

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) return;

  // Navigation requests: Network first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): Cache first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/static/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Default: Network first
  event.respondWith(networkFirst(request, STATIC_CACHE, 10));
});

// =========================================================
// STRATEGY: Cache First
// =========================================================
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Network failed, no cache available:', request.url);
    return new Response('Offline', { status: 503 });
  }
}

// =========================================================
// STRATEGY: Network First with cache fallback
// =========================================================
async function networkFirst(request, cacheName, timeoutSeconds = 10) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), timeoutSeconds * 1000)
  );

  try {
    const response = await Promise.race([fetch(request), timeoutPromise]);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// =========================================================
// BACKGROUND SYNC (for queued transactions when offline)
// =========================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
});

async function syncPendingTransactions() {
  // This would sync transactions queued in IndexedDB while offline
  console.log('[SW] Syncing pending transactions...');
}

// =========================================================
// PUSH NOTIFICATIONS (for weekly backup reminder)
// =========================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Khata Sangrah', {
      body: data.body || 'Time to back up your data!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'khata-reminder',
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
