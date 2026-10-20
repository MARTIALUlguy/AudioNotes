/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new CacheFirst({ cacheName: 'static-resources' }),
)

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'images-cache' }),
)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
