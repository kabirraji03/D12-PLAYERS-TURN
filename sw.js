const CACHE='d12-turn-v1.0.3';
const CANONICAL_BASE='https://playersturn.d12cueclub.com/';
const SHELL=['./','./index.html','./app.css?v=1.0.0','./app.js?v=1.0.0','./manifest.webmanifest','./d12-app-icon.svg','./patch-v1-0-1.js?v=1.0.1','./patch-v1-0-2.js?v=1.0.2','./patch-v1-0-3.js?v=1.0.3'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c)).catch(()=>{});return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=e.notification?.data?.url||CANONICAL_BASE;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async cs=>{
    const sameOrigin=cs.find(c=>{try{return new URL(c.url).origin===new URL(url).origin}catch{return false}});
    if(sameOrigin){
      if('navigate' in sameOrigin){try{await sameOrigin.navigate(url)}catch{}}
      return sameOrigin.focus();
    }
    return self.clients.openWindow(url);
  }));
});
