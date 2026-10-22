/**
 * Lomed service worker.
 *
 * Strategy (per spec §5.4 — addresses MUST findings A-M3 + P-M6):
 *
 *   sw.js, manifest.webmanifest:    network-first   (always able to update)
 *   data/*.json:                    cache-first     (offline-first reading)
 *   index.html, css/, js/, fonts/:  cache-first     (app shell)
 *
 * The CACHE_VERSION constant is templated by the deploy workflow from a
 * SHA-256 hash of `app/` + `data/` content. Bumping it on every commit is
 * NOT correct — only when content actually changes.
 *
 * On activate, old caches are deleted and `clients.claim()` runs so the new
 * SW takes control. The frontend listens for `controllerchange` and shows
 * an "Update ready — tap to reload" toast.
 */

const CACHE_VERSION = "__CACHE_VERSION__"; // deploy-time substitution
const IS_DEV_BUILD = CACHE_VERSION === "__CACHE_VERSION__" || CACHE_VERSION === "dev";
const APP_CACHE = `lomed-app-${CACHE_VERSION}`;

// Core shell — must precache successfully or install must fail.
// Paths are relative to sw.js location. After deploy, sw.js is at the site
// root and app/data/ collapses to /data/, so ./data/books.json works in BOTH
// dev (served from app/) and prod.
const CORE_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/reader.css",
  "./css/hebrew-fonts.css",
  "./js/app.js",
  "./js/data.js",
  "./js/storage.js",
  "./js/modes.js",
  "./js/reader.js",
  "./js/ui.js",
  "./js/vendor/alpine.min.js",
  "./data/books.json",
  "./data/ruth.json",
];

// Optional assets — may not yet be present locally (e.g. SBL Hebrew font
// requires manual download). Cached if available; missing is not fatal.
const OPTIONAL_SHELL = [
  "./fonts/SBLHebrew.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);

      // CORE_SHELL must succeed atomically: if any required asset fails to
      // cache, install rejects and the previous SW stays in control. Without
      // this guarantee, a transient deploy hiccup could brick the offline
      // experience by activating a partial cache.
      await cache.addAll(CORE_SHELL);

      // OPTIONAL_SHELL is best-effort: missing icons or fonts shouldn't
      // block install. We silently skip on failure but log per-asset for
      // observability.
      for (const url of OPTIONAL_SHELL) {
        try {
          await cache.add(url);
        } catch (err) {
          console.info(`[sw] optional asset skipped: ${url}`, err.message);
        }
      }

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("lomed-app-") && k !== APP_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-first for the SW itself and the manifest — they MUST be allowed
  // to update. The browser also re-checks sw.js every 24h by spec, but this
  // defense ensures even an aggressive cache can't strand users.
  if (url.pathname.endsWith("/sw.js") || url.pathname.endsWith("/manifest.webmanifest")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Stale-while-revalidate for book data — silent freshness when online,
  // instant cached response when offline.
  if (url.pathname.includes("/data/")) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Cache-first for the app shell — version-bumped only on real content
  // changes via CACHE_VERSION. No background revalidation, so we don't
  // burn bytes refreshing static assets the user already has.
  event.respondWith(cacheFirstNoRevalidate(event.request));
});

async function cacheFirstNoRevalidate(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const resp = await fetch(request);
    if (resp.ok && resp.type !== "opaque") {
      cache.put(request, resp.clone()).catch(() => {});
    }
    return resp;
  } catch (_err) {
    return new Response("Offline and not cached.", { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((resp) => {
      if (resp.ok && resp.type !== "opaque") {
        cache.put(request, resp.clone()).catch(() => {});
      }
      return resp;
    })
    .catch(() => null);

  if (cached) return cached;
  const fresh = await networkPromise;
  return fresh || new Response("Offline and not cached.", { status: 503 });
}

async function networkFirst(request) {
  try {
    const resp = await fetch(request);
    if (resp.ok) {
      const cache = await caches.open(APP_CACHE);
      cache.put(request, resp.clone()).catch(() => {});
    }
    return resp;
  } catch (_err) {
    const cache = await caches.open(APP_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("Service worker unreachable.", { status: 503 });
  }
}
