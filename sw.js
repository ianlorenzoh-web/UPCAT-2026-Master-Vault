/* ================================================================
   UPCAT 2027 MASTER VAULT — Service Worker (sw.js)
   Production-grade: Caching, Offline, Push Notifications,
   Background Sync, Deep Link support.
   Place this file at the ROOT of your project (same level as index.html)
   ================================================================ */

const SW_VERSION    = 'v3.0.0';
const CACHE_STATIC  = `upcat-static-${SW_VERSION}`;
const CACHE_DYNAMIC = `upcat-dynamic-${SW_VERSION}`;
const CACHE_FONTS   = `upcat-fonts-${SW_VERSION}`;

/* ----------------------------------------------------------------
   FILES TO PRE-CACHE (App Shell)
   These are cached immediately on install — your core app files.
   ---------------------------------------------------------------- */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/offline.html',
  /* Icons */
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  /* If you have additional local assets, add them here: */
  /* '/image.jpg', */
  /* '/image__1_.jpg', */
];

/* ----------------------------------------------------------------
   EXTERNAL URLS TO CACHE (Fonts, Icons CDN)
   ---------------------------------------------------------------- */
const EXTERNAL_CACHE_URLS = [
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
];

/* ----------------------------------------------------------------
   INSTALL — Pre-cache the app shell
   ---------------------------------------------------------------- */
self.addEventListener('install', event => {
  console.log(`[SW ${SW_VERSION}] Installing...`);
  event.waitUntil(
    Promise.all([
      /* Cache core app files */
      caches.open(CACHE_STATIC).then(cache => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(PRECACHE_URLS);
      }),
      /* Cache external fonts/icons — best-effort (don't fail install if CDN is down) */
      caches.open(CACHE_FONTS).then(cache => {
        return Promise.allSettled(
          EXTERNAL_CACHE_URLS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Could not cache:', url, err))
          )
        );
      })
    ]).then(() => {
      console.log(`[SW ${SW_VERSION}] Install complete. Forcing activation.`);
      return self.skipWaiting(); // Activate immediately
    })
  );
});

/* ----------------------------------------------------------------
   ACTIVATE — Clean up old caches
   ---------------------------------------------------------------- */
self.addEventListener('activate', event => {
  console.log(`[SW ${SW_VERSION}] Activating...`);
  const validCaches = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_FONTS];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => !validCaches.includes(name))
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => {
      console.log(`[SW ${SW_VERSION}] Now controlling all clients.`);
      return self.clients.claim(); // Take control of all open tabs immediately
    })
  );
});

/* ----------------------------------------------------------------
   FETCH — Caching Strategies
   ---------------------------------------------------------------- */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET and Chrome extension requests */
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  /* --- Strategy: Cache First (app shell + static assets) --- */
  if (isAppShell(url)) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  /* --- Strategy: Stale-While-Revalidate (fonts, icons CDN) --- */
  if (isFontOrCDN(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_FONTS));
    return;
  }

  /* --- Strategy: Network First with Cache Fallback (dynamic content) --- */
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirstWithFallback(request, CACHE_DYNAMIC));
    return;
  }

  /* --- Default: Network First for external requests --- */
  event.respondWith(networkFirstWithFallback(request, CACHE_DYNAMIC));
});

/* ----------------------------------------------------------------
   CACHING STRATEGY IMPLEMENTATIONS
   ---------------------------------------------------------------- */

/** Cache First: Serve from cache, fallback to network */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return offlineFallback(request);
  }
}

/** Stale-While-Revalidate: Serve cache immediately, update in background */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await networkFetch || offlineFallback(request);
}

/** Network First: Try network, fallback to cache, then offline page */
async function networkFirstWithFallback(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/** Serve offline.html for navigation requests when offline */
async function offlineFallback(request) {
  if (request.mode === 'navigate') {
    const cached = await caches.match('/offline.html');
    if (cached) return cached;
  }
  return new Response('Offline — please reconnect.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
}

/* ----------------------------------------------------------------
   HELPER: URL Matching
   ---------------------------------------------------------------- */
function isAppShell(url) {
  return url.origin === self.location.origin && (
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.json') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/screenshots/')
  );
}

function isFontOrCDN(url) {
  return url.hostname.includes('fonts.googleapis.com') ||
         url.hostname.includes('fonts.gstatic.com') ||
         url.hostname.includes('cdnjs.cloudflare.com');
}

/* ----------------------------------------------------------------
   PUSH NOTIFICATIONS
   ---------------------------------------------------------------- */
self.addEventListener('push', event => {
  let data = { title: 'UPCAT Vault', body: 'Study reminder!', icon: '/icons/icon-192x192.png', badge: '/icons/icon-96x96.png' };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag || 'upcat-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [100, 50, 100],
    data: { url: data.url || '/', timestamp: Date.now() },
    actions: [
      { action: 'open',    title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss'  }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/* Handle notification click */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      /* Reuse existing window if already open */
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      /* Otherwise open new window */
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

/* ----------------------------------------------------------------
   BACKGROUND SYNC — Queues tasks when offline
   ---------------------------------------------------------------- */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgressData());
  }
});

async function syncProgressData() {
  /* Progress data is stored locally in localStorage (no server needed).
     This hook is reserved for future server-sync if you add a backend. */
  console.log('[SW] Background sync fired: sync-progress');
}

/* ----------------------------------------------------------------
   MESSAGE — Handle communication from the main thread
   ---------------------------------------------------------------- */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  }
});
