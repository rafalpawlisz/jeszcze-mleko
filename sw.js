// Service worker: cache-first for our own files, network for everything else.
//
// IMPORTANT: bump CACHE_VERSION after every change to the app files, otherwise
// users keep getting the old version.
const CACHE_VERSION = 'v16';
const CACHE_NAME = `jeszcze-mleko-${CACHE_VERSION}`;

// On localhost cache-first would be a trap: after every edit the browser would
// keep serving the old version and you would hunt for a bug that isn't there.
// So locally our own files go network-first — the cache stays purely as an
// offline fallback, which keeps offline mode testable.
const IS_DEV = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);

const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './departments.js',
  './history.js',
  './i18n.js',
  './firebase-config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// The SDK modules are cached despite being cross-origin — without them the app
// cannot start offline at all, because the `import` in app.js simply won't run.
// The URLs carry a version number, so this cache can never go stale.
//
// MUST match the version imported in app.js.
const SDK_VERSION = '12.17.0';
const SDK_MODULES = ['app', 'app-check', 'auth', 'firestore'].map(
  (module) => `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-${module}.js`,
);
const SDK_MODULE_SET = new Set(SDK_MODULES);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        // The app shell is mandatory — if it fails, the install should fail too.
        await cache.addAll(APP_SHELL);
        // The SDK is optional: a temporary CDN hiccup must not block the
        // install, and the modules land in the cache on first fetch anyway.
        await cache.addAll(SDK_MODULES).catch((error) => {
          console.warn('Could not pre-cache the SDK', error);
        });
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isOwnAsset = url.origin === self.location.origin;
  const isSdkModule = SDK_MODULE_SET.has(url.href);

  // Everything else from other origins — Firestore, Auth, App Check, reCAPTCHA —
  // goes straight to the network and is NOT cached. A cached App Check token or
  // Firestore response guarantees trouble: denied requests and stale data.
  // (Offline is handled by Firestore's own IndexedDB cache, not by this one.)
  if (!isOwnAsset && !isSdkModule) return;

  // The SDK modules are pinned to a version number, so their cache can never go
  // stale — always serve those from cache, including locally (it is a few
  // hundred kB on every start).
  const networkFirst = IS_DEV && isOwnAsset;

  event.respondWith(networkFirst ? fromNetwork(request) : fromCache(request));
});

function cachePut(request, response) {
  // 'basic' = same origin, 'cors' = SDK module with full CORS headers.
  // 'opaque' responses are skipped — there is no way to tell if they are valid.
  if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
}

async function fromCache(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    cachePut(request, response);
    return response;
  } catch (error) {
    return offlineFallback(request, error);
  }
}

async function fromNetwork(request) {
  try {
    const response = await fetch(request);
    cachePut(request, response);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request, error);
  }
}

async function offlineFallback(request, error) {
  // Offline with nothing in the cache: navigations get the app shell, which is
  // what lets the PWA start without a network. Nothing else has a sane stand-in.
  if (request.mode === 'navigate') {
    const shell = await caches.match('./index.html');
    if (shell) return shell;
  }
  throw error;
}
