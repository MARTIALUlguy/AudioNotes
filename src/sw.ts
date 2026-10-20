/**
 * Service Worker personnalisé pour AudioNote PWA
 * Gère:
 * - Cache des assets
 * - Background Sync pour les enregistrements audio
 * - Synchronisation au retour online
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

/**
 * Import de Workbox
 * Les imports seront injectés par Workbox lors de la génération
 */
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

/**
 * Nettoyage des anciens caches
 */
cleanupOutdatedCaches()

/**
 * Précache des assets générés par Vite
 * La variable __WB_MANIFEST est injectée par workbox
 */
precacheAndRoute(self.__WB_MANIFEST)

/**
 * Stratégie: Cache First pour les ressources statiques
 */
registerRoute(
  ({ request }) =>
    request.destination === 'style' || request.destination === 'script',
  new CacheFirst({
    cacheName: 'static-resources'
  })
)

/**
 * Stratégie: Cache First pour les images
 */
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache'
  })
)

/**
 * Stratégie: Network First pour les API calls
 */
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5
  })
)

/**
 * Événement: Installation du Service Worker
 */
self.addEventListener('install', () => {
  console.log('[SW] Installation')
  self.skipWaiting()
})

/**
 * Événement: Activation du Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation')
  event.waitUntil(self.clients.claim())
})

/**
 * Événement: Background Sync
 * Déclenché quand:
 * 1. Le tag 'sync-audio' est enregistré et l'app se ferme
 * 2. L'app revient online après une disconnexion
 */
self.addEventListener('sync', async (event: any) => {
  console.log('[SW] Événement sync:', { tag: event.tag })

  if (event.tag === 'sync-audio') {
    event.waitUntil(
      (async () => {
        try {
          console.log('[SW] Synchronisation des enregistrements audio...')

          // Envoyer un message à tous les clients
          const clients_list = await self.clients.matchAll()

          for (const client of clients_list) {
            client.postMessage({
              type: 'SYNC_REQUESTED',
              data: {
                reason: 'background-sync',
                timestamp: Date.now()
              }
            })
          }

          console.log('[SW] Message de synchronisation envoyé aux clients')
        } catch (error) {
          console.error('[SW] Erreur sync:', error)
          throw error
        }
      })()
    )
  }
})

/**
 * Événement: Messages du client
 * Gère les commandes du client JavaScript
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data

  console.log('[SW] Message reçu:', type)

  switch (type) {
    case 'SYNC_DATA':
      console.log('[SW] Demande de synchronisation manuelle:', data)
      break

    case 'CLEAR_CACHE':
      console.log('[SW] Demande de nettoyage du cache')
      break

    default:
      console.log('[SW] Type de message inconnu:', type)
  }
})

console.log('[SW] Service Worker chargé')
