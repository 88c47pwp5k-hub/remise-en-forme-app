// Service Worker — Remise en forme PWA
// Stratégie : Cache First pour les assets statiques, Network First pour les données JSON

const CACHE_NAME = 'remise-en-forme-v1';

// Fichiers à mettre en cache immédiatement à l'installation
const PRECACHE_URLS = [
  '/index.html',
  '/modules/exercice.html',
  '/data/exercice.json',
  '/css/style.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ---- Installation : mise en cache initiale ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS.map(url => {
        // Utiliser un Request sans CORS strict pour les ressources locales
        return new Request(url, { cache: 'reload' });
      })).catch(err => {
        // Pas bloquant : si une ressource manque, on continue
        console.warn('[SW] Précache partiel :', err);
      });
    })
  );
  // Prendre le contrôle immédiatement
  self.skipWaiting();
});

// ---- Activation : nettoyage des anciens caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch : stratégie selon le type de ressource ----
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les extensions de navigateur
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // Pour les données JSON → Network First (pour pouvoir les mettre à jour facilement)
  if (url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Pour tout le reste → Cache First (perf optimale, offline)
  event.respondWith(cacheFirst(request));
});

// Cache First : sert depuis le cache, réseau en fallback
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Ressource hors ligne non cachée — retourner une page d'erreur minimale
    return new Response('<h1>Hors ligne</h1><p>Reconnecte-toi pour charger cette page.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

// Network First : réseau prioritaire, cache en fallback
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }
}
