const CACHE_NAME = 'hat-cache-v2'; // Le subimos la versión para que el navegador lo actualice
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
  // Si tenés el styles.css o la librería sortable locales, sumalas acá ej: './styles.css'
];

// ... (el resto del código install y fetch queda igual) ...

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
