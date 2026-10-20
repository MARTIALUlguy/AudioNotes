/**
 * Gestionnaire de Synchronisation des Enregistrements Audios
 * Envoie les enregistrements vers le webhook N8N
 */

import { 
  getRecordingsByStatus, 
  updateRecordingStatus, 
  updateRecordingResult, 
  getAllRecordings 
} from '../db/audioDb'

/**
 * Énumération des statuts de synchronisation (à usage documentaire)
 * Les valeurs actuelles: 'pending' | 'syncing' | 'synced' | 'error'
 */

/**
 * Configuration des URLs N8N depuis les variables d'environnement
 */
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL
const N8N_STATUS_URL = import.meta.env.VITE_N8N_STATUS_URL

/**
 * Map pour tracker les timers des polls en cours
 */
const activePollingTimers = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Valide la configuration des URLs N8N
 */
function validateConfig(): boolean {
  if (!N8N_WEBHOOK_URL || !N8N_STATUS_URL) {
    console.error(
      '❌ Configuration N8N manquante.\n' +
      'Assurez-vous que VITE_N8N_WEBHOOK_URL et VITE_N8N_STATUS_URL sont définies dans .env'
    )
    return false
  }
  return true
}

/**
 * Synchronise tous les enregistrements en attente vers N8N
 * 
 * Processus:
 * 1. Récupère tous les enregistrements avec status 'pending'
 * 2. Pour chacun, passe le status à 'syncing'
 * 3. Envoie en multipart/form-data vers N8N
 * 4. En cas de succès: status -> 'synced', lance le polling pour les résultats
 * 5. En cas d'erreur: status -> 'error'
 */
export async function syncPendingRecordings(): Promise<void> {
  if (!validateConfig()) {
    console.error('❌ Configuration N8N invalide')
    return
  }

  try {
    const pending = await getRecordingsByStatus('pending')
    
    if (pending.length === 0) {
      return
    }

    for (const recording of pending) {
      try {
        // Passer le status à 'syncing'
        await updateRecordingStatus(recording.id, 'syncing')

        // Créer le FormData pour le multipart
        const formData = new FormData()
        formData.append('audio', recording.blob)
        formData.append('id', recording.id)
        formData.append('createdAt', recording.createdAt.toISOString())
        formData.append('mimeType', recording.mimeType)

        // Envoyer vers N8N
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          body: formData
          // Note: Ne pas définir Content-Type, le navigateur le fera automatiquement
        })

        if (response.ok) {
          const responseData = await response.json()
          
          // Vérifier si la réponse contient déjà les résultats
          if (responseData.transcript && responseData.summary) {
            // Sauvegarder immédiatement les résultats
            await updateRecordingResult(recording.id, {
              transcript: responseData.transcript,
              summary: responseData.summary
            })
            await updateRecordingStatus(recording.id, 'synced')
            
            // Dispatcher un événement pour notifier App.tsx
            window.dispatchEvent(
              new CustomEvent('recording-synced', { detail: { recordingId: recording.id } })
            )
          } else {
            // Succès: status -> 'synced', lancer le polling pour les résultats
            await updateRecordingStatus(recording.id, 'synced')
            startPollingForResults(recording.id)
          }
        } else {
          // Erreur HTTP
          const errorText = await response.text().catch(() => 'unknown')
          throw new Error(`HTTP ${response.status}: ${response.statusText} | ${errorText}`)
        }
      } catch (error) {
        console.error(
          `❌ Erreur synchronisation ${recording.id}:`,
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : ''
        )
        await updateRecordingStatus(recording.id, 'error')
      }
    }

  } catch (error) {
    console.error(
      '❌ Erreur globale synchronisation:',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : ''
    )
  }
}

/**
 * Poll pour récupérer les résultats (résumé + transcription)
 * S'arrête quand les résultats sont disponibles ou après timeout de 120s
 * 
 * @param recordingId - ID de l'enregistrement
 * @param pollInterval - Intervalle de poll en ms (défaut: 5000ms)
 * @param maxAttempts - Nombre max de tentatives (défaut: 24 = 120s avec intervalle 5s)
 */
export async function startPollingForResults(
  recordingId: string,
  pollInterval: number = 5000,
  maxAttempts: number = 24
): Promise<void> {
  if (!validateConfig()) return

  // Arrêter un polling existant pour cet ID
  if (activePollingTimers.has(recordingId)) {
    const timer = activePollingTimers.get(recordingId)
    if (timer !== undefined) clearTimeout(timer)
    activePollingTimers.delete(recordingId)
  }

  let attempts = 0

  const poll = async () => {
    try {
      attempts++
      const statusUrl = `${N8N_STATUS_URL}?id=${recordingId}`

      const response = await fetch(statusUrl)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📦 [poll] Réponse JSON:', JSON.stringify(data, null, 2))
      console.log('📦 [poll] data.transcript:', data.transcript)
      console.log('📦 [poll] data.summary:', data.summary)

      // Vérifier si les résultats sont disponibles
      if (data.summary && data.transcript) {
        console.log(`✅ [poll] Résultats trouvés - Sauvegarde en cours...`)
        // Mettre à jour l'enregistrement avec les résultats
        await updateRecordingResult(recordingId, {
          summary: data.summary,
          transcript: data.transcript
        })
        
        // Dispatcher un événement pour notifier App.tsx
        window.dispatchEvent(
          new CustomEvent('recording-synced', { detail: { recordingId } })
        )
        
        // Arrêter le polling
        activePollingTimers.delete(recordingId)
        return
      }

      // Pas encore disponible, continuer le polling
      if (attempts < maxAttempts) {
        const timer = setTimeout(poll, pollInterval)
        activePollingTimers.set(recordingId, timer as any)
      } else {
        // Timeout atteint
        console.warn(
          `⏱️ Timeout du polling pour ${recordingId} après ${attempts * (pollInterval / 1000)}s`
        )
        activePollingTimers.delete(recordingId)
      }

    } catch (error) {
      console.error(
        `Erreur polling ${recordingId}:`,
        error instanceof Error ? error.message : String(error)
      )

      // Continuer à essayer sauf si on a atteint le timeout
      if (attempts < maxAttempts) {
        const timer = setTimeout(poll, pollInterval)
        activePollingTimers.set(recordingId, timer as any)
      } else {
        console.warn(`⏱️ Polling abandonné pour ${recordingId} après timeout`)
        activePollingTimers.delete(recordingId)
      }
    }
  }

  // Attendre 15s avant le premier poll (temps pour que N8N traite)
  const initialTimer = setTimeout(poll, 15000)
  activePollingTimers.set(`${recordingId}-initial`, initialTimer as any)
}

/**
 * Arrête tous les pollings en cours
 */
export function stopAllPolling(): void {
  console.log('🛑 Arrêt de tous les pollings...')
  activePollingTimers.forEach((timer) => {
    if (timer !== undefined) clearTimeout(timer)
  })
  activePollingTimers.clear()
  console.log('✅ Tous les pollings arrêtés')
}

/**
 * Obtient le nombre de pollings actuellement actifs
 */
export function getActivePollingCount(): number {
  return activePollingTimers.size
}

/**
 * Récupère le statut de tous les enregistrements
 */
export async function getSyncStatus(): Promise<{
  pending: number
  syncing: number
  synced: number
  error: number
  total: number
}> {
  try {
    const all = await getAllRecordings()

    return {
      pending: all.filter(r => r.status === 'pending').length,
      syncing: all.filter(r => r.status === 'syncing').length,
      synced: all.filter(r => r.status === 'synced').length,
      error: all.filter(r => r.status === 'error').length,
      total: all.length
    }
  } catch (error) {
    console.error('Erreur getSyncStatus:', error)
    return { pending: 0, syncing: 0, synced: 0, error: 0, total: 0 }
  }
}

/**
 * Réessaye la synchronisation pour tous les enregistrements en erreur
 */
export async function retrySyncErrors(): Promise<void> {
  try {
    const errors = await getRecordingsByStatus('error')

    if (errors.length === 0) {
      console.log('ℹ️ Aucun enregistrement en erreur à réessayer')
      return
    }

    console.log(`🔄 Réessai de ${errors.length} enregistrement(s) en erreur...`)

    for (const recording of errors) {
      // Réinitialiser le status à 'pending' pour réessai
      await updateRecordingStatus(recording.id, 'pending')
      console.log(`↩️ ${recording.id} → pending (réessai)`)
    }

    // Lancer la synchronisation
    await syncPendingRecordings()

  } catch (error) {
    console.error(
      'Erreur retrySyncErrors:',
      error instanceof Error ? error.message : String(error)
    )
  }
}

/**
 * Envoie un audio vers N8N pour extraction des données du formulaire immobilier
 * 
 * @param blob - Blob audio à envoyer
 * @param mimeType - Type MIME de l'audio
 * @returns Données du formulaire extraites par N8N
 */
export async function sendAudioForFormFill(
  blob: Blob,
  mimeType: string
): Promise<Record<string, any>> {
  const N8N_FORM_URL = import.meta.env.VITE_N8N_FORM_URL

  if (!N8N_FORM_URL) {
    throw new Error('VITE_N8N_FORM_URL non configurée dans .env')
  }

  try {
    const formData = new FormData()
    formData.append('audio', blob)
    formData.append('mimeType', mimeType)

    const response = await fetch(N8N_FORM_URL, {
      method: 'POST',
      body: formData
      // Note: Ne pas définir Content-Type, le navigateur le fera automatiquement
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown')
      throw new Error(`HTTP ${response.status}: ${response.statusText} | ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(
      '❌ Erreur sendAudioForFormFill:',
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }
}
