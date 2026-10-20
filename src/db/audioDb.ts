import { openDB, DBSchema, IDBPDatabase } from 'idb'

/**
 * Schéma d'un enregistrement audio
 */
export interface AudioRecording {
  id: string
  blob: Blob
  mimeType: string
  createdAt: Date
  duration: number
  status: 'pending' | 'syncing' | 'synced' | 'error'
  summary: string | null
  transcript: string | null
}

/**
 * Schéma IndexedDB
 */
interface AudioDB extends DBSchema {
  recordings: {
    key: string
    value: AudioRecording
    indexes: {
      'by-date': Date
      'by-status': 'pending' | 'syncing' | 'synced' | 'error'
    }
  }
}

const DB_NAME = 'audio-recorder-db'
const DB_VERSION = 1
const STORE_NAME = 'recordings'

let db: IDBPDatabase<AudioDB> | null = null

/**
 * Initialise la base de données IndexedDB
 */
async function getDB(): Promise<IDBPDatabase<AudioDB>> {
  if (db) {
    return db
  }

  db = await openDB<AudioDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Créer le store s'il n'existe pas
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        // Créer les indexes
        store.createIndex('by-date', 'createdAt')
        store.createIndex('by-status', 'status')
      }
    },
  })

  return db
}

/**
 * Sauvegarde un enregistrement dans IndexedDB
 */
export async function saveRecording(recording: AudioRecording): Promise<void> {
  try {
    const database = await getDB()
    await database.put(STORE_NAME, recording)
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error)
    throw error
  }
}

/**
 * Récupère tous les enregistrements
 */
export async function getAllRecordings(): Promise<AudioRecording[]> {
  try {
    const database = await getDB()
    const recordings = await database.getAll(STORE_NAME)
    // Trier par date décroissante (plus récents en premiers)
    return recordings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } catch (error) {
    console.error('❌ Erreur lors de la lecture:', error)
    throw error
  }
}

/**
 * Récupère les enregistrements par statut
 */
export async function getRecordingsByStatus(
  status: 'pending' | 'syncing' | 'synced' | 'error'
): Promise<AudioRecording[]> {
  try {
    const database = await getDB()
    const recordings = await database.getAllFromIndex(STORE_NAME, 'by-status', status)
    return recordings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } catch (error) {
    console.error(`❌ Erreur lors de la lecture des statuts:`, error)
    throw error
  }
}

/**
 * Récupère un enregistrement par ID
 */
export async function getRecording(id: string): Promise<AudioRecording | undefined> {
  try {
    const database = await getDB()
    return await database.get(STORE_NAME, id)
  } catch (error) {
    console.error('❌ Erreur lors de la lecture:', error)
    throw error
  }
}

/**
 * Met à jour le statut d'un enregistrement
 */
export async function updateRecordingStatus(
  id: string,
  status: 'pending' | 'syncing' | 'synced' | 'error'
): Promise<void> {
  try {
    const database = await getDB()
    const recording = await database.get(STORE_NAME, id)

    if (!recording) {
      throw new Error(`Enregistrement ${id} non trouvé`)
    }

    recording.status = status
    await database.put(STORE_NAME, recording)
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du statut:', error)
    throw error
  }
}

/**
 * Met à jour le résumé et la transcription d'un enregistrement
 */
export async function updateRecordingResult(
  id: string,
  result: {
    summary?: string | null
    transcript?: string | null
  }
): Promise<void> {
  try {
    const database = await getDB()
    const recording = await database.get(STORE_NAME, id)

    if (!recording) {
      throw new Error(`Enregistrement ${id} non trouvé`)
    }

    if (result.summary !== undefined) {
      recording.summary = result.summary
    }

    if (result.transcript !== undefined) {
      recording.transcript = result.transcript
    }

    await database.put(STORE_NAME, recording)
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des résultats:', error)
    throw error
  }
}

/**
 * Supprime un enregistrement
 */
export async function deleteRecording(id: string): Promise<void> {
  try {
    const database = await getDB()
    await database.delete(STORE_NAME, id)
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error)
    throw error
  }
}

/**
 * Supprime tous les enregistrements
 */
export async function deleteAllRecordings(): Promise<void> {
  try {
    const database = await getDB()
    await database.clear(STORE_NAME)
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error)
    throw error
  }
}

/**
 * Compte le nombre d'enregistrements
 */
export async function countRecordings(): Promise<number> {
  try {
    const database = await getDB()
    return await database.count(STORE_NAME)
  } catch (error) {
    console.error('❌ Erreur lors du comptage:', error)
    throw error
  }
}

/**
 * Compte les enregistrements par statut
 */
export async function countRecordingsByStatus(
  status: 'pending' | 'syncing' | 'synced' | 'error'
): Promise<number> {
  try {
    const database = await getDB()
    return await database.countFromIndex(STORE_NAME, 'by-status', status)
  } catch (error) {
    console.error('❌ Erreur lors du comptage:', error)
    throw error
  }
}

/**
 * Exporte tous les enregistrements (pour backup)
 */
export async function exportRecordings(): Promise<AudioRecording[]> {
  try {
    return await getAllRecordings()
  } catch (error) {
    console.error('❌ Erreur lors de l\'export:', error)
    throw error
  }
}

/**
 * Teste la connexion à la DB
 */
export async function testConnection(): Promise<boolean> {
  try {
    const database = await getDB()
    await database.count(STORE_NAME)
    return true
  } catch (error) {
    console.error('❌ Erreur de connexion:', error)
    return false
  }
}
