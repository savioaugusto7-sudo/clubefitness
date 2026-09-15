// Clube Fitness Fisio - Service Worker Inteligente
// Versão: 1.0.1
const CACHE_NAME = 'clubefitness-cache-v2';

const STATIC_PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

const safeOpenCache = async () => {
  try {
    if (typeof caches === 'undefined' || !caches.open) return null;
    return await caches.open(CACHE_NAME);
  } catch (e) {
    return null;
  }
};

const safeMatch = async (req) => {
  try {
    if (typeof caches === 'undefined' || !caches.match) return null;
    return await caches.match(req);
  } catch (e) {
    return null;
  }
};

// Instalação: Pré-cache dos ativos fundamentais do App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    safeOpenCache().then((cache) => {
      if (cache) {
        return cache.addAll(STATIC_PRECACHE).catch(() => {});
      }
    }).catch(() => {})
  );
  self.skipWaiting();
});

// Ativação: Limpeza de caches antigos e claim imediato dos clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        if (typeof caches !== 'undefined' && caches.keys) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames
              .filter((name) => name !== CACHE_NAME)
              .map((name) => caches.delete(name).catch(() => {}))
          );
        }
      } catch (e) {}
      await self.clients.claim();
    })()
  );
});

// Interceptação de requisições de rede
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // 2. Rotas de API e Autenticação: SEMPRE NETWORK-ONLY
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/api/auth/')) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ success: false, error: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // 3. Navegação de Páginas HTML (ex: /dashboard, /ficha, /login): NETWORK-FIRST com fallback OFFLINE
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            safeOpenCache().then((cache) => cache && cache.put(request, copy).catch(() => {})).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await safeMatch(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const offlinePage = await safeMatch('/offline.html');
          return offlinePage || new Response('Você está offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 4. Ativos Estáticos (_next/static, icons, fontes, css, imagens): CACHE-FIRST com revalidação
  const isStatic = 
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font';

  if (isStatic) {
    event.respondWith(
      safeMatch(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              safeOpenCache().then((cache) => cache && cache.put(request, copy).catch(() => {})).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }).catch(() => fetch(request))
    );
    return;
  }

  // 5. Padrão para os demais recursos
  event.respondWith(
    safeMatch(request).then((cachedResponse) => {
      return cachedResponse || fetch(request);
    }).catch(() => fetch(request))
  );
});

// Atualização sob demanda caso o cliente solicite
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
