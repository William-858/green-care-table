// 115年農村社區綠色照顧推動計畫 - 自評表批次產生器
// Service Worker：讓 App 可離線運作
const CACHE_NAME = 'green-care-eval-v1';

// 要快取的資源：主 HTML + CDN 依賴 + icon
const CACHE_URLS = [
  './',
  './index.html',
  './社區自評表批次產生器.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap',
];

// 安裝：預先快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 使用 addAll；若有單一失敗會整批失敗，改用個別 add + catch
      return Promise.all(
        CACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] 預快取失敗（略過）:', url, err.message))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 啟用：清掉舊版 cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: 快取優先，網路備援；抓到新資源就更新快取
self.addEventListener('fetch', event => {
  // 只處理 GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(networkResp => {
        // 只快取成功且是 basic/cors 的回應
        if (networkResp && networkResp.status === 200 &&
            (networkResp.type === 'basic' || networkResp.type === 'cors')) {
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
        }
        return networkResp;
      }).catch(() => cached); // 網路失敗就用快取
      return cached || fetchPromise;
    })
  );
});
