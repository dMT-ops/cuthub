/*
 * Service worker do CutHub.
 *
 * Escrito à mão, sem `vite-plugin-pwa`, por uma razão medida: o plugin traria
 * Workbox e uma etapa de build nova para entregar o que aqui cabe em 60
 * linhas — e um service worker é a peça do front que mais estraga quando a
 * gente não entende exatamente o que ela faz.
 *
 * A REGRA QUE EVITA O DESASTRE CLÁSSICO
 *
 * Navegação é **network-first**. O erro mais comum de PWA é cachear o HTML e
 * deixar o usuário preso numa versão antiga do app para sempre, sem nenhuma
 * forma de ele se livrar disso. Aqui a rede sempre ganha na hora de servir a
 * página; o cache do HTML existe só para o caso de estar offline.
 *
 * Os arquivos de `/assets/` podem ser cache-first sem medo, porque o Vite põe
 * hash no nome: build novo gera nome novo, e o antigo nunca é pedido de volta.
 */

const VERSAO = 'cuthub-v1';
const CACHE_SHELL = `${VERSAO}-shell`;
const CACHE_ASSETS = `${VERSAO}-assets`;

self.addEventListener('install', (evento) => {
  // Assume o posto sem esperar a aba antiga fechar. Combina com o
  // network-first: não há risco de servir shell velho de propósito.
  self.skipWaiting();
  evento.waitUntil(caches.open(CACHE_SHELL).then((cache) => cache.add('/index.html')));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;

  // Só GET e só a própria origem. O Supabase é outra origem e não passa por
  // aqui — cachear resposta de API seria mostrar agenda desatualizada, que é
  // pior do que não ter offline nenhum.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    evento.respondWith(
      (async () => {
        try {
          const resposta = await fetch(req);
          const cache = await caches.open(CACHE_SHELL);
          cache.put('/index.html', resposta.clone());
          return resposta;
        } catch {
          // Offline: entrega a última casca conhecida. O app sobe e mostra o
          // próprio estado de erro, em vez do dinossauro do navegador.
          const cache = await caches.open(CACHE_SHELL);
          const guardada = await cache.match('/index.html');
          if (guardada) return guardada;
          throw new Error('Sem rede e sem cópia local da página.');
        }
      })()
    );
    return;
  }

  // Nome com hash: se está no cache, é exatamente o arquivo pedido.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    evento.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_ASSETS);
        const guardado = await cache.match(req);
        if (guardado) return guardado;

        const resposta = await fetch(req);
        if (resposta.ok) cache.put(req, resposta.clone());
        return resposta;
      })()
    );
  }
});
