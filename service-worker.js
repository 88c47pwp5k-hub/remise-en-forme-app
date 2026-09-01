// Service Worker — Remise en forme PWA
// Stratégie : Cache First pour les assets statiques, Network First pour les données JSON

const CACHE_NAME = 'remise-en-forme-v5';

// Dériver le chemin de base depuis la portée du SW (fonctionne en local ET sur GitHub Pages)
// Ex: '/' en local, '/remise-en-forme-app/' sur GitHub Pages
const BASE = new URL(self.registration.scope).pathname;

const PRECACHE_PATHS = [
  '',                        // index.html (= BASE seul)
  'modules/exercice.html',
  'modules/etirement.html',
  'modules/hydratation.html',
  'modules/nutrition.html',
  'modules/suivi.html',
  'modules/portugais.html',
  'data/exercice.json',
  'data/etirement.json',
  'css/style.css',
  'css/assistant.css',
  'js/assistant.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

const PRECACHE_URLS = PRECACHE_PATHS.map(p => BASE + p);

// ---- Installation : mise en cache initiale ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => console.warn('[SW] Précache partiel :', err));
    })
  );
  self.skipWaiting();
});

// ---- Activation : nettoyage des anciens caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---- Fetch : stratégie selon le type de ressource ----
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // JSON → Network First (données éditables sans changer le cache)
  if (url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Tout le reste → Cache First (offline + perf)
  event.respondWith(cacheFirst(request));
});

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
    return new Response('<h1>Hors ligne</h1><p>Reconnecte-toi pour charger cette page.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

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
