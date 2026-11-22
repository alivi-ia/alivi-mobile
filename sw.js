const CACHE='alivi-mobile-v3.4.0';
const FILES=['./','./index.html','./app.js','./app.js?v=3.4.0','./icon.svg','./manifest.webmanifest','./version.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('alivi-mobile-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;if(u.pathname.endsWith('/version.json')&&u.searchParams.has('check')){e.respondWith(fetch(e.request,{cache:'no-store'}));return}e.respondWith(fetch(e.request,{cache:"no-cache"}).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(async()=>await caches.match(e.request)|| (e.request.mode==='navigate'?await caches.match('./index.html'):Response.error())||Response.error()))});

self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL('./?page=alerts',self.registration.scope).href;e.waitUntil((async()=>{const all=await self.clients.matchAll({type:'window',includeUncontrolled:true});const c=all.find(x=>x.url.startsWith(self.registration.scope));if(c){await c.navigate(url);return c.focus()}return self.clients.openWindow(url)})())});
