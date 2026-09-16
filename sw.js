const CACHE_NAME = 'deliverymoto-v1';

// Se instala el Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Fuerza la activación inmediata
});

// Se activa el Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // Toma el control de la página rápido
});

// ESTO ES OBLIGATORIO PARA QUE GOOGLE CHROME DEJE INSTALAR LA APP
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            // Si no hay internet, no hace nada grave, pero cumple el requisito.
            return new Response("Estás sin conexión a internet.");
        })
    );
});
