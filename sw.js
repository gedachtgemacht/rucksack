const VERSION = 'dev';
/* rucksack. Service Worker: cached die Shell, index.html zuerst aus dem Netz, offline aus dem Cache. */
const CACHE = 'rucksack-' + VERSION;
const SHELL = ['./', 'index.html', 'rechnen.js', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', ev => {
  self.skipWaiting();
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(namen => Promise.all(namen.filter(n => n.startsWith('rucksack-') && n !== CACHE).map(n => caches.delete(n))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const istSeite = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (istSeite) {
    /* Netz zuerst, damit eine neue Version sofort ankommt. Offline aus dem Cache. */
    ev.respondWith(
      fetch(req)
        .then(antwort => {
          if (antwort.ok) {
            const kopie = antwort.clone();
            caches.open(CACHE).then(c => c.put('index.html', kopie));
          }
          return antwort;
        })
        .catch(() => caches.match('index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  /* Übrige Shell: Cache zuerst, sonst Netz. */
  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then(treffer => treffer || fetch(req).then(antwort => {
      if (antwort.ok) {
        const kopie = antwort.clone();
        caches.open(CACHE).then(c => c.put(req, kopie));
      }
      return antwort;
    }))
  );
});
