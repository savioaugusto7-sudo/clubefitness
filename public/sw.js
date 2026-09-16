// Clube Fitness Fisio - Service Worker Inteligente
// Versão: 1.0.2 - Resiliente e Blindado contra falhas de rede
const CACHE_NAME = 'clubefitness-cache-v3';

const STATIC_PRECACHE = [
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

// Instalação: Pré-cache dos ativos fundamentais estáticos (sem rotas SSR)
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await safeOpenCache();
        if (cache) {
          await cache.addAll(STATIC_PRECACHE).catch(() => {});
        }
      } catch (e) {}
    })()
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
  
  // 1. Ignorar requisições não-GET e esquemas não-HTTP
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // 2. Rotas de API, Autenticação e Queries Dinâmicas do Next.js:
  // NUNCA interceptar com respondWith. Deixar o navegador executar a rede nativa.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/api/auth/') ||
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') ||
    request.headers.get('Next-Router-State-Tree') ||
    request.headers.get('Next-Action')
  ) {
    return;
  }

  // 3. Navegação de Páginas HTML (ex: /dashboard, /ficha, /login): NETWORK-FIRST com fallback OFFLINE
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          return networkResponse;
        } catch (err) {
          const cachedResponse = await safeMatch(request);
          if (cachedResponse) return cachedResponse;

          const offlinePage = await safeMatch('/offline.html');
          if (offlinePage) return offlinePage;

          return new Response(
            '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Offline - Clube Fitness</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;background:#080b11;color:#f8fafc;"><h2>Você está offline</h2><p>Verifique sua conexão e recarregue a página.</p></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // 4. Ativos Estáticos (_next/static, icons, fontes, css, imagens): STALE-WHILE-REVALIDATE seguro
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
      (async () => {
        const cachedResponse = await safeMatch(request);
        
        const fetchPromise = (async () => {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse && networkResponse.status === 200) {
              const cache = await safeOpenCache();
              if (cache) {
                await cache.put(request, networkResponse.clone()).catch(() => {});
              }
            }
            return networkResponse;
          } catch (err) {
            return null;
          }
        })();

        // Retorna o cache imediatamente se houver, ou aguarda a rede sem quebrar
        if (cachedResponse) {
          return cachedResponse;
        }
        
        const res = await fetchPromise;
        if (res) return res;

        // Fallback limpo sem disparar unhandled promise rejection
        return new Response('', { status: 408, statusText: 'Request Timeout' });
      })()
    );
    return;
  }

  // 5. Demais recursos: Não interceptar, deixar o navegador tratar normalmente
  return;
});

// Atualização sob demanda caso o cliente solicite
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
