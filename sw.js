/* 撮影＆現像ハブ — Service Worker
   ・アプリシェルを事前キャッシュ（オフライン対応）
   ・ナビゲーションはネット優先（オンライン時は常に最新）→ 失敗時キャッシュ
   ・静的リソース（CSS/JS/アイコン/フォント）はキャッシュ優先＋裏で更新 */
var VERSION = 'photohub-v3';
var BASE = '/photo-hub/';
var SHELL = [
  BASE, BASE + 'index.html',
  BASE + 'assets/style.css', BASE + 'assets/main.js',
  BASE + 'manifest.webmanifest',
  BASE + 'icons/icon-192.png', BASE + 'icons/icon-512.png',
  BASE + 'icons/icon-maskable-512.png', BASE + 'icons/apple-touch-icon.png',
  BASE + 'icons/icon-32.png',
  BASE + 'mic-mini/index.html', BASE + 'lightroom/index.html',
  BASE + 'reference/workflow.html', BASE + 'reference/glossary.html',
  BASE + 'iphone/shoot.html',
  BASE + 'eos-r8/operate.html', BASE + 'eos-r8/shoot.html',
  BASE + 'pocket4/operate.html', BASE + 'pocket4/shoot.html',
  BASE + 'lightroom/develop.png',
  BASE + 'eos-r8/bg.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (cache) {
      // 個別に追加：1つ失敗してもインストールを止めない
      return Promise.all(SHELL.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;

  // ページ遷移：ネット優先 → 失敗時キャッシュ → 最後にトップ
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        if (sameOrigin && res && res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match(BASE + 'index.html');
        });
      })
    );
    return;
  }

  // 静的リソース：キャッシュ優先＋裏で更新（同一オリジン／フォント等）
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && (sameOrigin || url.hostname.indexOf('gstatic') !== -1 || url.hostname.indexOf('googleapis') !== -1)) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
