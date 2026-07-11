/* ──────────────────────────────────────────────────────────────────────────
 * The Next Whiz — Service Worker (Task 19-B)
 * Vanilla service worker for PWA offline support. No workbox, just the
 * native Cache Storage + Fetch APIs.
 *
 * Strategy summary:
 *   • install   → precache the app shell (HTML + manifest + icons)
 *   • activate  → delete any cache not matching the current version
 *   • fetch     → route-aware stale-while-revalidate:
 *       - navigations (HTML)        : cache-first → network → offline shell
 *       - static assets (JS/CSS/img): cache-first → network (populate cache)
 *       - fonts                     : cache-first, long-lived
 *       - API (/api/*)              : network-first → cache fallback
 *
 * Bump CACHE_NAME version whenever the app shell changes so old caches are
 * purged on the next activation.
 * ────────────────────────────────────────────────────────────────────────── */

const CACHE_NAME = "nextwhiz-v1";

/* App shell — the minimal set of resources needed to boot the UI offline.
 * These are precached at install time so the app shell renders even with no
 * network. We intentionally keep the list short: Next.js JS chunks are
 * fetched on demand and cached on first hit (see fetch handler). */
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

/* ─────────────────────────── install ────────────────────────────
 * Precache the app shell. We use addAll so if any single request fails
 * the whole install fails (we want a consistent cache or none). */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // addAll is atomic — any 404 aborts the install.
      await cache.addAll(APP_SHELL);
      // Take over immediately so the SW controls the page on first load.
      await self.skipWaiting();
    })()
  );
});

/* ─────────────────────────── activate ───────────────────────────
 * Purge any cache that doesn't match the current CACHE_NAME. This is how
 * we roll forward — bump CACHE_NAME and the old caches are garbage
 * collected on activation. */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      // Claim open clients so the new SW applies to already-open tabs.
      await self.clients.claim();
    })()
  );
});

/* ─────────────────────────── fetch ──────────────────────────────
 * Route-aware stale-while-revalidate. We split requests into four
 * buckets because they have very different freshness requirements. */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET — never intercept POST/PUT/DELETE (mutations must hit
  // the server; caching them would silently break writes).
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin requests. Cross-origin (fonts.googleapis.com,
  // images from CDNs, etc.) are passed straight to the network — caching
  // them here would require CORS-aware handling and opaque responses.
  if (url.origin !== self.location.origin) return;

  // ── (1) API requests: network-first ────────────────────────────
  // API data is the source of truth and changes often. Always try the
  // network first; fall back to cache only when offline.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // ── (2) Navigations (HTML pages): cache-first → network → offline shell
  // Mode "navigate" fires on top-level page loads and client-side route
  // transitions. Serve cached HTML instantly, refresh in background.
  if (req.mode === "navigate") {
    event.respondWith(navigationHandler(req));
    return;
  }

  // ── (3) Fonts: cache-first, long expiry ────────────────────────
  // Fonts rarely change and are expensive to refetch. Cache them
  // indefinitely — the cache name bump on deploy cycles them out.
  const dest = req.destination;
  if (dest === "font") {
    event.respondWith(cacheFirst(req));
    return;
  }

  // ── (4) Static assets (JS/CSS/images/etc.): cache-first ────────
  // Next.js emits hashed filenames so cached chunks stay valid forever.
  // Cache-first gives instant loads on repeat visits.
  if (
    dest === "style" ||
    dest === "script" ||
    dest === "image" ||
    req.destination === ""
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Anything else: just hit the network.
  // (Default browser behaviour — no caching.)
});

/* ────────────────── cache-first strategy ──────────────────
 * Used for static assets + fonts. Returns the cached response if present,
 * otherwise fetches from network and populates the cache for next time. */
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    // Only cache successful, same-type responses (avoid caching errors or
    // opaque responses that we can't read).
    if (res && res.status === 200 && res.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    // Network failed and nothing in cache — propagate so the browser shows
    // its native offline page.
    throw err;
  }
}

/* ──────────── navigation (HTML) handler ────────────
 * Cache-first for instant load. If cache miss, try network. If network
 * also fails (offline), fall back to the cached "/" app shell so the UI
 * still renders. */
async function navigationHandler(req) {
  const cached = await caches.match(req);
  if (cached) {
    // Stale-while-revalidate: serve cache, refresh in background.
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res));
        }
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    // Offline + no cache for this exact URL → fall back to app shell.
    const fallback = await caches.match("/");
    if (fallback) return fallback;
    throw err;
  }
}

/* ──────────── network-first strategy (API) ────────────
 * Always try the network first so the user gets fresh data when online.
 * Fall back to cache only if the network is unreachable. We don't cache
 * non-200 responses (don't want to serve a 500 from cache later). */
async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw err;
  }
}

/* ──────────── message channel (for future skipWaiting trigger) ────────────
 * Allow the page to ask the waiting SW to activate immediately (used by
 * the "new version available" flow if we add one later). */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
