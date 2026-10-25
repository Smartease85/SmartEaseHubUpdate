/* SmartEase Cart Lights: network-first documents, cache assets best-effort. */
const CACHE_NAME='smartease-cart-lights-v13';
const ASSETS=['./','./index.html','./cart-zones.js','./cart-zones.css','./halloween.html','./manifest.webmanifest','./LICENSE.txt'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('smartease-cart-lights-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate'||event.request.destination==='document'){
  event.respondWith(fetch(event.request).then(response=>{const clone=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,clone));return response;}).catch(()=>caches.match(event.request)));
 }else event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
