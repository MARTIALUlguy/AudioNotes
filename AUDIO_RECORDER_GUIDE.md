# 🎙️ AudioRecorder - Guide d'Utilisation

## 🎯 Vue d'ensemble

Vous avez maintenant:

1. **Hook `useAudioRecorder`** - Gère la logique d'enregistrement audio
2. **Composant `AudioRecorder`** - Interface utilisateur pour enregistrer
3. **Tailwind CSS** - Framework de styles configuré

---

## 📁 Fichiers Créés

### Hook
```
src/hooks/useAudioRecorder.ts
```

Logique d'enregistrement audio avec:
- Détection automatique iOS Safari
- Gestion des permissions du microphone
- Durée en temps réel
- Retour d'un UUID v4 unique

### Composant
```
src/components/AudioRecorder.tsx
```

Interface UI avec:
- Bouton start/stop unique
- Affichage durée MM:SS
- Indicateur animé (point rouge)
- Gestion des erreurs

### Configuration Tailwind
```
tailwind.config.js
postcss.config.js
src/globals.css
```

Styles Tailwind + classes utilitaires personnalisées

---

## 🚀 Utilisation dans un Composant

### Basique

```tsx
import { useState } from 'react'
import { AudioRecorder } from './components/AudioRecorder'
import type { Recording } from './hooks/useAudioRecorder'

export function MyComponent() {
  const handleRecordingComplete = (recording: Recording) => {
    console.log('Enregistrement reçu:', recording)
    // recording.id        -> UUID unique
    // recording.blob      -> Blob audio
    // recording.mimeType  -> 'audio/webm' ou 'audio/mp4'
    // recording.createdAt -> Date
  }

  return (
    <AudioRecorder onRecordingComplete={handleRecordingComplete} />
  )
}
```

### Avec Gestion d'Enregistrements

```tsx
import { useState } from 'react'
import { AudioRecorder } from './components/AudioRecorder'
import type { Recording } from './hooks/useAudioRecorder'

export function RecordingManager() {
  const [recordings, setRecordings] = useState<Recording[]>([])

  const handleRecordingComplete = (recording: Recording) => {
    setRecordings(prev => [recording, ...prev])
    
    // Télécharger l'enregistrement
    const url = URL.createObjectURL(recording.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audio-${recording.id}.webm`
    a.click()
  }

  return (
    <div>
      <AudioRecorder onRecordingComplete={handleRecordingComplete} />
      <p>Total: {recordings.length} enregistrements</p>
    </div>
  )
}
```

---

## 🪝 Utilisation directe du Hook

Si vous voulez plus de contrôle, utilisez le hook directement:

```tsx
import { useAudioRecorder } from './hooks/useAudioRecorder'

export function CustomAudioUI() {
  const {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording
  } = useAudioRecorder()

  const handleStart = async () => {
    await startRecording()
  }

  const handleStop = async () => {
    const recording = await stopRecording()
    if (recording) {
      console.log('Enregistrement:', recording)
    }
  }

  return (
    <div>
      <p>Enregistrement: {isRecording ? 'OUI' : 'NON'}</p>
      <p>Durée: {duration}s</p>
      {error && <p className="text-red-500">{error}</p>}
      <button onClick={handleStart} disabled={isRecording}>
        Démarrer
      </button>
      <button onClick={handleStop} disabled={!isRecording}>
        Arrêter
      </button>
    </div>
  )
}
```

---

## 🎨 Types TypeScript

```tsx
// Hook State
interface AudioRecorderHook {
  isRecording: boolean      // Actuellement en enregistrement?
  duration: number          // Durée en secondes
  error: string | null      // Message d'erreur s'il y a
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Recording | null>
}

// Enregistrement Retourné
interface Recording {
  id: string                // UUID v4 unique
  blob: Blob               // Données audio
  mimeType: string         // 'audio/webm;codecs=opus' ou 'audio/mp4'
  createdAt: Date          // Timestamp
}

// Composant Props
interface AudioRecorderProps {
  onRecordingComplete: (recording: Recording) => void
}
```

---

## 🎯 Détection iOS Safari

Le hook détecte automatiquement iOS Safari et adapte:

| Navigateur | Format MIME | Codec |
|-----------|-----------|-------|
| iOS Safari | `audio/mp4` | AAC |
| Chrome/Firefox/Edge | `audio/webm` | Opus |
| Fallback | `audio/wav` | PCM |

---

## 🔄 Flux d'Enregistrement

```
1. Utilisateur clique le bouton
   ↓
2. Hook demande permission (getUserMedia)
   - Si refusée → Affiche message d'erreur
   - Si acceptée → Crée MediaRecorder
   ↓
3. Enregistrement actif
   - Hook met à jour `duration` chaque seconde
   - Bouton devient rouge avec animation
   ↓
4. Utilisateur clique à nouveau → Stop
   ↓
5. MediaRecorder arrête + chunks combinés → Blob
   ↓
6. `onRecordingComplete()` appelée avec Recording
   ↓
7. État réinitialisé, prêt pour nouvel enregistrement
```

---

## ⚠️ Gestion des Erreurs

Le composant gère automatiquement:

- ❌ **NotAllowedError** - Utilisateur a refusé l'accès au micro
- ❌ **NotFoundError** - Pas de microphone trouvé
- ❌ **NotSupportedError** - Navigateur ne supporte pas l'API
- ❌ **Erreurs d'enregistrement** - Problème lors de l'enregistrement

Message d'erreur clair affiché à l'utilisateur

---

## 🎨 Personnaliser les Styles

### Modifier le composant AudioRecorder

```tsx
// Changer la couleur du bouton
className={`
  ${isRecording ? 'bg-purple-500' : 'bg-green-500'}
  // ... autres classes
`}
```

### Ajouter des styles Tailwind

Dans `src/globals.css`:

```css
@layer components {
  .custom-button {
    @apply px-6 py-3 bg-accent text-white rounded-lg font-bold hover:bg-accent-light transition-colors;
  }
}
```

Utiliser: `<button className="custom-button">Click</button>`

---

## 📊 Caractéristiques du Hook

### ✅ Implémenté

- [x] Détection iOS Safari
- [x] Gestion des permissions
- [x] UUID v4 pour chaque enregistrement
- [x] Durée en temps réel
- [x] Gestion des erreurs
- [x] Cleanup automatique
- [x] Support de plusieurs formats audio

### 🔄 À Implémenter

- [ ] Amplitude visualization (wave)
- [ ] Compression audio avant transmission
- [ ] EncodedAudioContext pour effets
- [ ] Background Sync API integration
- [ ] IndexedDB storage de local

---

## 🔗 Intégration avec l'App

Le composant `App.tsx` utilise déjà `AudioRecorder`:

```tsx
import { AudioRecorder } from './components/AudioRecorder'

function App() {
  const [recordings, setRecordings] = useState([])

  const handleRecordingComplete = (recording) => {
    setRecordings(prev => [recording, ...prev])
  }

  return (
    <AudioRecorder onRecordingComplete={handleRecordingComplete} />
  )
}
```

L'app affiche aussi:
- 📝 Liste des enregistrements
- ⬇️ Bouton de téléchargement
- 🗑️ Bouton de suppression

---

## 📱 Responsive Design

Tailwind CSS rend le composant responsive:

```
Mobile (< 640px) | Tablet (640px-1024px) | Desktop (> 1024px)
    Bouton small  |    Bouton medium     |   Bouton large
    1 colonne    |    2 colonnes         |   3 colonnes
```

---

## 🚀 Prochaines Étapes

### Phase 1: Stockage Local
```typescript
// Sauvegarder les enregistrements localement
import { openDB } from 'idb'

async function saveRecording(recording: Recording) {
  const db = await openDB('audionote')
  await db.add('recordings', recording)
}
```

### Phase 2: Synchronisation
```typescript
// Envoyer au backend quand en ligne
window.addEventListener('online', async () => {
  const db = await openDB('audionote')
  const unsyncedRecordings = await db.getAll('recordings')
  
  for (const rec of unsyncedRecordings) {
    await fetch('/api/recordings', {
      method: 'POST',
      body: rec.blob
    })
  }
})
```

### Phase 3: Visualisation d'Onde
```typescript
// Ajouter une animation d'onde durante l'enregistrement
// Utiliser Web Audio API AnalyserNode
```

---

## 💡 Conseils

1. **Testez sur Mobile** - PWA fonctionne mieux sur mobile
2. **Testez en Mode Hors Ligne** - DevTools → Offline
3. **Testez les Permissions** - Refusez puis acceptez
4. **Inspectez les Blobs** - Console: `recording.blob`
5. **Testez les Formats** - Changerez de navigateur

---

## 📚 Ressources

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Hooks](https://react.dev/reference/react)

---

**Prêt à enregistrer du son?** 🎙️
