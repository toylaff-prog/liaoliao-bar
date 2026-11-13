// 離線快取：外部函式庫優先用快取（載入最快），網頁本身優先抓最新版（改版後馬上生效）。
var V = 'llbar-v2';
var CORE = ['./', 'index.html', 'app.js', 'config.js', 'manifest.webmanifest', 'lib/three.min.js', 'lib/OrbitControls.js', 'lib/peerjs.min.js', 'lib/qrcode.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function put(r, x) { if (x && x.ok) { var cp = x.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); } return x; }
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  var stat = /\/lib\//.test(u.pathname) || /\.(png|webmanifest)$/.test(u.pathname);
  e.respondWith(stat
    ? caches.match(r, { ignoreSearch: true }).then(function (h) { return h || fetch(r).then(function (x) { return put(r, x); }); })
    : fetch(r).then(function (x) { return put(r, x); }).catch(function () {
        return caches.match(r, { ignoreSearch: true }).then(function (h) { return h || caches.match('index.html'); });
      }));
});
