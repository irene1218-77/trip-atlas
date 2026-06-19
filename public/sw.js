const CACHE_IMMUTABLE = 'trip-atlas-immutable-v2'
const CACHE_API = 'trip-atlas-api-v1'

const NO_CACHE_HOSTS = [
  'maps.googleapis.com',
  'maps.gstatic.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const keep = [CACHE_IMMUTABLE, CACHE_API]
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip Google Maps and font CDNs
  if (NO_CACHE_HOSTS.some((h) => url.hostname.includes(h))) return

  // /api/* — network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_API).then((c) => c.put(event.request, clone))
          }
          return res
        })
        .catch(() => caches.match(event.request).then((c) => c || new Response('offline', { status: 503 })))
    )
    return
  }

  // Next.js immutable static chunks (content-hashed filenames) — cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_IMMUTABLE).then((c) => c.put(event.request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // HTML / navigation and everything else — network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_IMMUTABLE).then((c) => c.put(event.request, clone))
        }
        return res
      })
      .catch(() => caches.match(event.request).then((c) => c || new Response('offline', { status: 503 })))
  )
})
