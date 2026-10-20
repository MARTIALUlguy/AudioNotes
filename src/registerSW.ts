/**
 * Service Worker Registration et Gestion des Événements
 * Écoute les événements `online` et `offline` pour synchroniser les données
 */

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers non supportés dans ce navigateur')
    return
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/sw.js',
      { scope: '/' }
    )

    console.log('Service Worker enregistré avec succès:', registration.scope)

    // Événement: Service Worker activé
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('Nouvelle version du Service Worker disponible')
          // Notifier l'utilisateur d'une mise à jour disponible
          window.dispatchEvent(
            new CustomEvent('sw-update-available', { detail: registration })
          )
        }
      })
    })

    // Événement: Application en ligne - Déclencher la synchronisation
    window.addEventListener('online', () => {
      console.log('✅ Application connectée - Synchronisation en cours...')
      
      // Envoyer un message au Service Worker pour déclencher la synchronisation
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_DATA',
          payload: {
            timestamp: new Date().toISOString(),
            event: 'reconnected'
          }
        })
      }

      // Dispatcher un événement personnalisé
      window.dispatchEvent(
        new CustomEvent('app-sync-triggered', {
          detail: { reason: 'reconnected', timestamp: Date.now() }
        })
      )
    })

    // Événement: Application hors ligne
    window.addEventListener('offline', () => {
      console.log('🔴 Application déconnectée - Mode hors ligne activé')
      
      // Dispatcher un événement personnalisé
      window.dispatchEvent(
        new CustomEvent('app-offline', {
          detail: { timestamp: Date.now() }
        })
      )
    })

    // Écouter les messages du Service Worker
    navigator.serviceWorker.addEventListener('message', async (event) => {
      const { type, data } = event.data

      switch (type) {
        case 'SYNC_REQUESTED':
          console.log('📱 Service Worker demande la synchronisation:', data.reason)
          // Déclencher la synchronisation depuis le module sync
          try {
            const { syncPendingRecordings } = await import('./sync')
            await syncPendingRecordings()
          } catch (error) {
            console.error('Erreur import/sync:', error)
          }
          break

        case 'SYNC_COMPLETE':
          console.log('✅ Synchronisation terminée:', data)
          window.dispatchEvent(
            new CustomEvent('sw-sync-complete', { detail: data })
          )
          break

        case 'SYNC_ERROR':
          console.error('❌ Erreur lors de la synchronisation:', data)
          window.dispatchEvent(
            new CustomEvent('sw-sync-error', { detail: data })
          )
          break

        case 'CACHE_UPDATED':
          console.log('📦 Cache mis à jour:', data)
          window.dispatchEvent(
            new CustomEvent('sw-cache-updated', { detail: data })
          )
          break

        default:
          console.log('Message du SW:', type, data)
      }
    })

    // Contrôleur prêt
    if (navigator.serviceWorker.controller) {
      console.log('Service Worker active et contrôle la page')
    } else {
      console.log('Service Worker en attente de prise de contrôle...')
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du Service Worker:', error)
  }
}

/**
 * Utility: Demander une synchronisation en arrière-plan
 * À utiliser après un enregistrement audio par exemple
 * 
 * Retourne true si enregistré, false si non disponible (SW désactivé, etc.)
 * Ne bloque JAMAIS - retourne immédiatement
 */
export async function requestBackgroundSync(tag: string = 'audio-sync'): Promise<boolean> {
  try {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready
      await (registration as any).sync.register(tag)
      console.log(`✅ Background Sync '${tag}' enregistré`)
      return true
    }
    console.warn('⚠️ Background Sync API non disponible (SW désactivé?)')
    return false
  } catch (error) {
    console.warn(
      '⚠️ Erreur Background Sync:',
      error instanceof Error ? error.message : String(error)
    )
    return false
  }
}

/**
 * Utility: Envoyer un message au Service Worker
 */
export function sendMessageToSW(type: string, data?: unknown) {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type,
      data: data || {}
    })
  }
}

/**
 * Utility: Vérifier les mises à jour du Service Worker
 */
export async function checkForSWUpdates() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
      registration.update()
    }
    console.log('Vérification des mises à jour du SW en cours...')
  } catch (error) {
    console.error('Erreur lors de la vérification des mises à jour:', error)
  }
}
