const CACHE='classpilot-v10-9-student-pwa-private-votes';
const SHELL=[
  './',
  './index.html',
  './student.html',
  './student.webmanifest',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  const request=event.request;
  const url=new URL(request.url);
  const isHtml=request.mode==='navigate' || url.pathname.endsWith('.html') || url.pathname==='/' || url.pathname==='';

  if(isHtml){
    // Always try the latest deployed HTML first.
    event.respondWith(
      fetch(request,{cache:'no-store'})
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
          return response;
        })
        .catch(()=>caches.match(request).then(r=>r||caches.match('./index.html')))
    );
    return;
  }

  // Static assets can remain cache-first.
  event.respondWith(
    caches.match(request).then(cached=>{
      if(cached) return cached;
      return fetch(request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
        return response;
      });
    })
  );
});
