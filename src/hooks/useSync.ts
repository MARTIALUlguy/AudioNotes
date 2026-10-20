/**
 * Hook React pour la gestion de la synchronisation
 * Expose triggerSync() et isSyncing
 */

import { useState, useCallback, useEffect } from 'react'
import { syncPendingRecordings, getActivePollingCount } from '../sync'
import { requestBackgroundSync } from '../registerSW'

/**
 * Hook pour déclencher la synchronisation
 * 
 * Processus:
 * 1. Enregistre le Background Sync tag 'sync-audio'
 * 2. Si online: appelle directement syncPendingRecordings()
 * 3. Expose isSyncing state et triggerSync function
 */
export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)

  /**
   * Déclenche la synchronisation
   */
  const triggerSync = useCallback(async () => {
    try {
      setIsSyncing(true)

      // Try/catch SÉPARÉ pour Background Sync - ne bloque JAMAIS
      try {
        await requestBackgroundSync('sync-audio')
      } catch (error) {
        // Background Sync non disponible, sync directe uniquement
      }

      // Toujours continuer ici, peu importe le résultat de Background Sync
      if (navigator.onLine) {
        await syncPendingRecordings()
      }
    } catch (error) {
      console.error(
        '❌ Erreur dans triggerSync():',
        error instanceof Error ? error.message : String(error)
      )
    } finally {
      setIsSyncing(false)
    }
  }, [])

  /**
   * Écouter les changements de l'état online/offline
   */
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Reconnexion détectée')
      await triggerSync()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [triggerSync])

  return {
    triggerSync,
    isSyncing,
    activePollingCount: getActivePollingCount()
  }
}
