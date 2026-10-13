self.addEventListener('install',e=>e.waitUntil(caches.open('edgewforce-v1')));
self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&e.request.url.includes('/assets/'))e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const c=x.clone();caches.open('edgewforce-v1').then(cache=>cache.put(e.request,c));return x}))) });
self.addEventListener('push',e=>{let d={title:'EdgeWForce',body:'New workforce notification'};try{d=e.data.json()}catch{}e.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:'/favicon.svg'}))});
