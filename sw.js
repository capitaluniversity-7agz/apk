// ===== Service Worker - نظام حجز المعامل =====
// الإصدار - غيّر الرقم لما تحدّث الملفات
const CACHE_NAME = 'lab-booking-v1';

// الملفات اللي هيتحفظ أوفلاين
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

// ===== تثبيت الـ Service Worker =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching assets');
      // نحاول نكاش الملفات، ولو فشل بعضها مش مشكلة
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => 
          cache.add(url).catch(err => console.log('[SW] Failed to cache:', url))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ===== تفعيل الـ Service Worker =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== استقبال الطلبات (Fetch Strategy) =====
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات الـ API (زي UltraMsg) - لازم تتعمل أونلاين
  if (event.request.url.includes('ultramsg.com') ||
      event.request.url.includes('api.') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // لو موجود في الكاش - استخدمه
      if (cachedResponse) {
        return cachedResponse;
      }
      // لو مش موجود - اجيبه من الإنترنت واحفظه
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // لو مفيش إنترنت ومفيش كاش - رجّع صفحة أوفلاين
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ===== مزامنة البيانات في الخلفية =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    console.log('[SW] Background sync triggered');
  }
});
