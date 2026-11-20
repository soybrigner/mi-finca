/* Mi Finca: guarda la app en el celular para que abra sin internet.
   Los datos (ganado, leche, fotos…) los guarda Firebase en el celular y los sube solos cuando hay señal. */
const V = 'mifinca-8b3dbd95';
const SDK = ['app', 'auth', 'firestore'].map(n => 'https://www.gstatic.com/firebasejs/10.14.1/firebase-' + n + '-compat.js');
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'firebase-config.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await Promise.all(SDK.map(u => c.add(new Request(u, { mode: 'cors', credentials: 'omit' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for(const k of await caches.keys()) if(k !== V && k.indexOf('mifinca-') === 0) await caches.delete(k);
    await self.clients.claim();
  })());
});

const ASSET_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('fetch', e => {
  const r = e.request;
  if(r.method !== 'GET') return;
  const u = new URL(r.url);

  // la página: primero internet (así llegan las versiones nuevas); si tarda o no hay, la guardada
  if(r.mode === 'navigate'){
    e.respondWith((async () => {
      const net = fetch(r).then(res => { if(res && res.ok){ const cp = res.clone(); caches.open(V).then(c => c.put('index.html', cp)); } return res; });
      const first = await Promise.race([net.catch(() => null), new Promise(ok => setTimeout(() => ok(null), 3500))]);
      if(first) return first;
      const cached = await caches.match('index.html') || await caches.match('./');
      return cached || net.catch(() => new Response('Sin internet y todavía no se ha guardado la app. Ábrela una vez con internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    })());
    return;
  }

  // archivos de la app y librerías: lo guardado al instante y se actualiza por detrás
  if(u.origin === location.origin || ASSET_HOSTS.indexOf(u.hostname) >= 0){
    e.respondWith((async () => {
      const c = await caches.open(V), hit = await c.match(r, { ignoreSearch: u.origin === location.origin });
      const upd = fetch(r).then(res => { if(res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => null);
      if(hit){ e.waitUntil(upd); return hit; }
      return (await upd) || new Response('', { status: 504 });
    })());
  }
});
