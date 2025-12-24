
const CACHE_NAME = 'al-shahbandar-cache-v6';
const RUNTIME_CACHE = 'al-shahbandar-runtime-v6';

// Static assets to cache on install
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  // icons were removed from manifest to avoid dev download errors
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened static asset cache');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(err => {
        console.error('Failed to cache resources during install:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement strategies
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip Firestore requests - let the SDK handle offline persistence
  if (url.hostname.includes('firestore.googleapis.com')) {
    return;
  }
  
  // Cache-first strategy for static assets (app shell)
  if (URLS_TO_CACHE.some(cachedUrl => url.pathname === new URL(self.location).pathname.replace(/[^/]*$/, '') + cachedUrl.replace(/^\//, ''))) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Return from cache or fetch from network
          return response || fetch(event.request).then(networkResponse => {
            if (networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          });
        })
    );
    return;
  }
  
  // Network-first strategy for other resources (like fonts, dynamic imports)
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Cache successful responses for offline fallback
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails, try to serve from any cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache, respond with a generic offline message (or a fallback page)
          return new Response('You are offline and this resource is not cached.', { 
            status: 404, 
            statusText: 'Not Found' 
          });
        });
      })
  );
});
