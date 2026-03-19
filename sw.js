const CACHE_NAME = 'hat-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js'
  // Si tenés un archivo CSS externo (ej: styles.css), agregalo acá: '/styles.css'
];

// Instala el Service Worker y guarda en caché los archivos principales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Intercepta las peticiones de red (para que funcione rápido y offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve la versión en caché si existe, sino va a internet
        return response || fetch(event.request);
      })
  );
});
