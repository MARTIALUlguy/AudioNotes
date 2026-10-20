# 💾 IndexedDB + RecordingList - Documentation

## 📦 Installation Complétée

```bash
npm install idb uuid
```

Les dépendances ont été ajoutées à `package.json`.

---

## 📁 Fichiers Créés

### Module IndexedDB
```
src/db/
├── audioDb.ts           [NEW] Gestion IndexedDB pour les enregistrements
└── index.ts             [NEW] Export des fonctions
```

### Composant RecordingList
```
src/components/
├── RecordingList.tsx    [NEW] Affichage de la liste depuis IndexedDB
└── index.ts             [MODIFIÉ] Ajout export RecordingList
```

### Fichiers Modifiés
```
src/App.tsx              [MODIFIÉ] Intègre RecordingList + IndexedDB
```

---

## 🗄️ Structure IndexedDB

### Base de Données
```
Database: "audio-recorder-db" (v1)
Store: "recordings"
```

### Schéma d'un Enregistrement
```typescript
interface AudioRecording {
  id: string                              // UUID v4
  blob: Blob                              // Fichier audio
  mimeType: string                        // 'audio/webm' ou 'audio/mp4'
  createdAt: Date                         // Timestamp ISO
  duration: number                        // Durée en secondes
  status: 'pending' | 'syncing' | 'synced' | 'error'
  summary: string | null                  // Résumé IA (N8N)
  transcript: string | null               // Transcription (N8N)
}
```

### Indexes
```
- by-date: sur createdAt (pour trier par date)
- by-status: sur status (pour filtrer par statut)
```

---

## 🔧 Fonctions du Module audioDb.ts

### Sauvegarder
```typescript
import { saveRecording } from './db/audioDb'

await saveRecording({
  id: uuid(),
  blob: audioBlob,
  mimeType: 'audio/webm',
  createdAt: new Date(),
  duration: 45.2,
  status: 'pending',
  summary: null,
  transcript: null
})
```

### Récupérer
```typescript
import { getAllRecordings, getRecording, getRecordingsByStatus } from './db/audioDb'

// Tous les enregistrements (trié par date décroissante)
const all = await getAllRecordings()

// Par ID
const recording = await getRecording('uuid-123')

// Par statut
const pending = await getRecordingsByStatus('pending')
const synced = await getRecordingsByStatus('synced')
```

### Mettre à Jour
```typescript
import { updateRecordingStatus, updateRecordingResult } from './db/audioDb'

// Mettre à jour le statut
await updateRecordingStatus('uuid-123', 'syncing')
await updateRecordingStatus('uuid-123', 'synced')

// Mettre à jour résumé/transcription (retour N8N)
await updateRecordingResult('uuid-123', {
  summary: 'Un résumé IA du contenu...',
  transcript: 'Transcription complète du texte...'
})
```

### Supprimer
```typescript
import { deleteRecording, deleteAllRecordings } from './db/audioDb'

await deleteRecording('uuid-123')
await deleteAllRecordings()
```

### Utilitaires
```typescript
import { countRecordings, countRecordingsByStatus, exportRecordings, testConnection } from './db/audioDb'

// Compter
const total = await countRecordings()
const pending = await countRecordingsByStatus('pending')

// Exporter (pour backup)
const data = await exportRecordings()

// Tester la connexion
const ok = await testConnection()
```

---

## 🎨 Composant RecordingList

### Usage Simple
```tsx
import { RecordingList } from './components'

function App() {
  return <RecordingList />
}
```

### Features
- ✅ Charge les enregistrements depuis IndexedDB
- ✅ Affiche la date formatée locale (fr-FR)
- ✅ Affiche la durée MM:SS
- ✅ Affiche la taille en KB
- ✅ Badge de statut coloré + animé
- ✅ Bouton lecture audio (avec stop)
- ✅ Bouton téléchargement
- ✅ Bouton suppression
- ✅ Accordéon pour résumé/transcription
- ✅ Loading spinner
- ✅ Message vide si aucun enregistrement

### États du Statut
| Statut | Badge | Icône |
|--------|-------|-------|
| pending | 🟰 Gris | ⏳ En attente |
| syncing | 🔵 Bleu animé | 🔄 Synchronisation... |
| synced | 🟢 Vert | ✅ Synchronisé |
| error | 🔴 Rouge | ❌ Erreur |

---

## 🔄 Flux d'Utilisation

### 1. Enregistrement Audio
```
Utilisateur clique "Enregistrer"
           ↓
Hook useAudioRecorder capture l'audio
           ↓
Retourne Recording { id, blob, mimeType, createdAt }
           ↓
App.tsx reçoit handleRecordingComplete
```

### 2. Sauvegarde dans IndexedDB
```
handleRecordingComplete appelé
           ↓
saveRecording() → IndexedDB
  - id: UUID v4
  - blob: audio
  - status: 'pending'
  - summary, transcript: null
           ↓
setRefreshTrigger() → recharge RecordingList
```

### 3. Affichage dans UI
```
RecordingList charge getAllRecordings()
           ↓
Affiche chaque enregistrement:
  - Date formatée
  - Durée MM:SS
  - Taille KB
  - Badge statut coloré
  - Actions: Play, Download, Delete
  - Accordéon si résumé/transcript
```

### 4. Synchronisation (Futur)
```
Quand online event déclenché
           ↓
Récupérer les recordings status='pending'
           ↓
Envoyer à l'API / N8N
           ↓
updateRecordingStatus('syncing')
updateRecordingResult({ summary, transcript })
updateRecordingStatus('synced')
           ↓
RecordingList se met à jour automatiquement
```

---

## 📱 Intégration dans l'App

### App.tsx
```tsx
import { AudioRecorder } from './components'
import { RecordingList } from './components'
import { saveRecording } from './db/audioDb'

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRecordingComplete = async (recording: Recording) => {
    await saveRecording({
      id: recording.id,
      blob: recording.blob,
      mimeType: recording.mimeType,
      createdAt: recording.createdAt,
      duration: estimateDuration(recording.blob),
      status: 'pending',
      summary: null,
      transcript: null,
    })
    
    // Forcer mise à jour RecordingList
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <>
      <AudioRecorder onRecordingComplete={handleRecordingComplete} />
      <RecordingList key={refreshTrigger} />
    </>
  )
}
```

---

## 🎙️ Cycle Complet

```
┌─────────────────────────────────────────────────────────┐
│                  Utilisateur                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
         ┌──────────────────┐
         │ AudioRecorder    │
         │ Enregistrer audio│
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────────────┐
         │ Recording créé            │
         │ { id, blob, mimeType ... }│
         └────────┬─────────────────┘
                  │
                  ▼
         ┌──────────────────────────────┐
         │ saveRecording() → IndexedDB   │
         │ status: 'pending'            │
         └────────┬─────────────────────┘
                  │
                  ▼
         ┌──────────────────────────────┐
         │ RecordingList charge depuis DB│
         │ Affiche dans la liste        │
         └────────┬─────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌────────┐  ┌────────┐  ┌──────────────┐
│ Lecture│  │Download│  │ Suppression  │
│ Audio  │  │ Fichier│  │ deleteRecord │
└────────┘  └────────┘  └──────────────┘

    Quand Sync (online event)
         ▼
┌──────────────────────────────────────┐
│ updateRecordingStatus('syncing')     │
│ Envoyer à N8N/Backend               │
│ Récupérer summary + transcript       │
│ updateRecordingResult()              │
│ updateRecordingStatus('synced')      │
└──────────────┬───────────────────────┘
               │
               ▼
         RecordingList se met à jour
```

---

## 🔐 Capacité de Stockage

### IndexedDB Limite
- Chrome: ~50MB par origine
- Firefox: ~50MB par origine
- Safari: ~50MB par origine
- Edge: ~50MB par origine

### Avec Compression
Vous pouvez réduire la taille audio:
```typescript
// Pour économiser l'espace
// Convertir 16-bit PCM → 8-bit µ-law compression
// Réduit de ~50%
```

---

## 🧪 Tests

### Test Sauvegarde
```typescript
import { saveRecording, getAllRecordings } from './db/audioDb'

const recording = {
  id: crypto.randomUUID(),
  blob: new Blob(['test'], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  createdAt: new Date(),
  duration: 10,
  status: 'pending' as const,
  summary: null,
  transcript: null
}

await saveRecording(recording)
const all = await getAllRecordings()
console.log(all) // []. devrait afficher l'enregistrement
```

### Test Suppresssion
```typescript
import { deleteAllRecordings, countRecordings } from './db/audioDb'

await deleteAllRecordings()
const count = await countRecordings()
console.log(count) // 0
```

---

## 📚 Architecture

### Tier Layer

```
┌─────────────────────────────────────────┐
│          App.tsx (UI)                   │
│  - handleRecordingComplete()            │
│  - Appelle saveRecording()              │
└─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│       Components (UI)                   │
│  - AudioRecorder: enregistre            │
│  - RecordingList: affiche depuis DB     │
└─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│     audioDb.ts (Business Logic)         │
│  - saveRecording()                      │
│  - getAllRecordings()                   │
│  - updateRecordingStatus()              │
│  - deleteRecording()                    │
└─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  idb (Database Layer)                   │
│  - IndexedDB API wrapper                │
│  - Gère la DB "audio-recorder-db"       │
└─────────────────────────────────────────┘
```

---

## 🚀 Prochaines Étapes

### 1. Synchronisation
```typescript
// Dans registerSW.ts
window.addEventListener('online', async () => {
  const pending = await getRecordingsByStatus('pending')
  
  for (const rec of pending) {
    await updateRecordingStatus(rec.id, 'syncing')
    
    try {
      // Envoyer à l'API
      const response = await fetch('/api/sync', {
        method: 'POST',
        body: rec.blob,
        headers: { 'X-Recording-ID': rec.id }
      })
      
      const { summary, transcript } = await response.json()
      
      await updateRecordingResult(rec.id, {
        summary,
        transcript
      })
      
      await updateRecordingStatus(rec.id, 'synced')
    } catch (error) {
      await updateRecordingStatus(rec.id, 'error')
    }
  }
})
```

### 2. Export/Import Backup
```typescript
// Backup
const data = await exportRecordings()
localStorage.setItem('backup', JSON.stringify(data))

// Restore
const backup = JSON.parse(localStorage.getItem('backup'))
for (const rec of backup) {
  await saveRecording(rec)
}
```

### 3. Pagination
```typescript
// Ajouter limite dans getAllRecordings()
export async function getAllRecordings(limit = 50, offset = 0) {
  const all = await database.getAll(STORE_NAME)
  return all.slice(offset, offset + limit)
}
```

### 4. Recherche
```typescript
// Ajouter index texte
export async function searchRecordings(query: string) {
  const all = await getAllRecordings()
  return all.filter(r => 
    r.summary?.includes(query) || 
    r.transcript?.includes(query)
  )
}
```

---

## 📚 Ressources

- [idb GitHub](https://github.com/jakearchibald/idb)
- [MDN - IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [uuid - NPM](https://www.npmjs.com/package/uuid)
- [DBSchema Interface](https://github.com/jakearchibald/idb#database-schema)

---

## ✅ Résumé

Vous avez maintenant:

✅ Module **audioDb.ts** complet pour IndexedDB  
✅ Composant **RecordingList** qui affiche depuis DB  
✅ **App.tsx** intégré avec sauvegarde automatique  
✅ **8 fonctions CRUD** complètes  
✅ **Gestion des statuts** pour sync futur  
✅ **Stockage persistent** local  

**Prêt pour la synchronisation avec N8N!** 🎙️

---

**Date:** 3 avril 2026  
**Status:** ✅ Complet
