const CACHE_PREFIX='mira-signal-';
let CACHE_NAME='mira-signal-bootstrap';
let configPromise;

function isLocalDevelopmentUrl(url){
  const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  const values=url.searchParams.getAll('sw');
  return local&&!(values.length===1&&values[0]==='1');
}

async function isDevelopmentRequest(event,url){
  if(event.request.mode==='navigate')return isLocalDevelopmentUrl(url);
  if(!event.clientId)return false;
  const client=await self.clients.get(event.clientId);
  return client?isLocalDevelopmentUrl(new URL(client.url)):false;
}

async function loadRelease(){
  if(!configPromise)configPromise=(async()=>{let response;try{response=await fetch('./data/release-config.json',{cache:'no-store'})}catch{response=await caches.match('./data/release-config.json')}if(!response)throw new Error('release config unavailable');const release=await response.json();CACHE_NAME=release.cacheName;return release})();
  return configPromise;
}

self.addEventListener('install',event=>{event.waitUntil((async()=>{try{const release=await loadRelease();const manifest=await fetch(release.assetManifestPath,{cache:'no-store'}).then(r=>r.json());const cache=await caches.open(CACHE_NAME);await cache.addAll(manifest.required)}catch(error){console.warn('Precache deferred to app',error)}await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{try{await loadRelease()}catch{}const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));await self.clients.claim()})())});

async function cacheResponse(request,response){if(response?.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}return response}
async function networkFirst(request){try{return await cacheResponse(request,await fetch(request))}catch(error){const cached=await caches.match(request);if(cached)return cached;if(request.mode==='navigate'){const fallback=await caches.match('./index.html');if(fallback)return fallback}throw error}}
async function cacheFirst(request){const cached=await caches.match(request);if(cached)return cached;return cacheResponse(request,await fetch(request))}

self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;event.respondWith((async()=>{if(await isDevelopmentRequest(event,url))return fetch(event.request,{cache:'no-store'});try{await loadRelease()}catch{}const changingContent=event.request.mode==='navigate'||url.pathname.includes('/data/');return changingContent?networkFirst(event.request):cacheFirst(event.request)})())});
