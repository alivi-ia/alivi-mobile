const CACHE='alivi-mobile-v3.10.9';
const FILES=['./','./index.html','./app.js','./app.js?v=3.10.9','./icon.svg','./logo-mark.png','./alivi-icon-192-r2.png','./alivi-icon-512-r2.png','./alivi-icon-maskable-512-r2.png','./alivi-apple-touch-180-r2.png','./badge-96.png','./manifest.webmanifest','./version.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('alivi-mobile-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;if(u.pathname.endsWith('/version.json')&&u.searchParams.has('check')){e.respondWith(fetch(e.request,{cache:'no-store'}));return}e.respondWith(fetch(e.request,{cache:"no-cache"}).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(async()=>await caches.match(e.request)|| (e.request.mode==='navigate'?await caches.match('./index.html'):Response.error())||Response.error()))});

self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL('./?page=alerts',self.registration.scope).href;e.waitUntil((async()=>{const all=await self.clients.matchAll({type:'window',includeUncontrolled:true});const c=all.find(x=>x.url.startsWith(self.registration.scope));if(c){await c.navigate(url);return c.focus()}return self.clients.openWindow(url)})())});


// Firebase Messaging usa este mesmo Service Worker (escopo /alivi-mobile/).
// Recebemos SOMENTE mensagens com payload data para evitar duplicidade.
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
firebase.initializeApp({
 apiKey:'AIzaSyA-ZCZjAioKCSpN5HVEJjy_vvIWDpYYUrM',
 authDomain:'alivi-ia.firebaseapp.com',
 projectId:'alivi-ia',
 messagingSenderId:'1020176262495',
 appId:'1:1020176262495:web:ee55571390dbc2b67d02ea'
});
firebase.messaging().onBackgroundMessage(payload=>{
 const data=payload.data||{};
 const title=String(data.title||'ALIVI • Lembrete').slice(0,100);
 const body=String(data.body||'Você tem um aviso para conferir.').slice(0,220);
 return self.registration.showNotification(title,{
  body, tag:String(data.tag||'alivi-fcm'),icon:'./alivi-icon-192-r2.png',badge:'./badge-96.png',
  data:{url:new URL('./?page=alerts',self.registration.scope).href,page:'alerts'}
 });
});
