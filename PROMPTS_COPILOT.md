# 🎯 Prompts Copilot — PWA Audio Recorder

> **Mode d'emploi:** Colle chaque prompt dans VS Code Copilot Chat (`Ctrl+Shift+I`) dans l'ordre.
> Attends que Copilot finisse et applique les changements avant de passer au suivant.

---

## PromptN5 1️⃣ — Setup projet React + Vite + PWA

```
Crée un nouveau projet React avec Vite et configure-le comme une PWA installable. Voici ce que j'attends :

- Initialise un projet React + Vite (TypeScript)
- Installe et configure `vite-plugin-pwa` avec Workbox
- Configure le manifest PWA avec :
  - name: "AudioNote"
  - short_name: "AudioNote"
  - display: "standalone"
  - theme_color: "#1a1a2e"
  - background_color: "#1a1a2e"
  - Une icône placeholder 192x192 et 512x512
- Configure Workbox en mode `generateSW` avec un precache des assets statiques
- Le service worker doit écouter l'événement `online` pour déclencher une synchro (on l'implémentera plus tard)
- Ajoute un fichier `vite.config.ts` complet avec le plugin PWA configuré

Génère tous les fichiers nécessaires : vite.config.ts, src/main.tsx, index.html, et le manifest.
```

---

## Prompt 2️⃣ — Enregistrement audio (MediaRecorder)

```
Dans ce projet React PWA, crée un hook custom `useAudioRecorder` et un composant `AudioRecorder`.

Hook `useAudioRecorder.ts` :
- Demande la permission micro via `getUserMedia({ audio: true })`
- Détecte si on est sur iOS Safari et utilise `audio/mp4` sinon utilise `audio/webm;codecs=opus`
- Expose : `startRecording()`, `stopRecording()`, `isRecording` (boolean), `duration` (secondes, mis à jour chaque seconde)
- À l'arrêt, retourne un objet `{ id: string (UUID v4), blob: Blob, mimeType: string, createdAt: Date }`
- Utilise `crypto.randomUUID()` pour l'id

Composant `AudioRecorder.tsx` :
- Bouton unique qui bascule Start/Stop avec une icône microphone
- Affiche la durée en format MM:SS pendant l'enregistrement
- Indicateur visuel (point rouge animé) quand enregistrement actif
- Appelle une prop `onRecordingComplete(recording)` quand l'enregistrement est terminé
- Gère les erreurs de permission micro avec un message utilisateur clair

Utilise Tailwind CSS pour le style.
```

---

## Prompt 3️⃣ — Stockage local IndexedDB

```
Crée un module `src/db/audioDb.ts` pour gérer le stockage des enregistrements audio dans IndexedDB via la librairie `idb`.

Installe d'abord : `npm install idb uuid`

Structure de la base :
- DB name: "audio-recorder-db", version 1
- Store: "recordings"
- Schema d'un enregistrement :
  {
    id: string,          // UUID
    blob: Blob,          // fichier audio
    mimeType: string,
    createdAt: Date,
    duration: number,    // en secondes
    status: 'pending' | 'syncing' | 'synced' | 'error',
    summary: string | null,     // résumé IA retourné par N8N
    transcript: string | null   // transcription retournée par N8N
  }

Expose ces fonctions async :
- `saveRecording(recording)` → void
- `getAllRecordings()` → Recording[]
- `updateRecordingStatus(id, status)` → void
- `updateRecordingResult(id, { summary, transcript })` → void
- `deleteRecording(id)` → void

Ensuite crée un composant `RecordingList.tsx` qui :
- Affiche la liste de tous les enregistrements depuis IndexedDB
- Pour chaque enregistrement : date, durée, badge de statut coloré (pending=gris, syncing=bleu animé, synced=vert, error=rouge)
- Bouton lecture audio (crée un blob URL)
- Bouton supprimer
- Si status=synced et summary disponible : affiche le résumé dans un accordéon
- Utilise Tailwind CSS
```

---

## Prompt 4️⃣ — Synchronisation vers N8N (Service Worker + Background Sync)

```
Implémente la synchronisation réseau des enregistrements audio vers un webhook N8N.

1. Crée `src/sync/syncManager.ts` :
- Fonction `syncPendingRecordings()` :
  - Récupère tous les enregistrements avec status `pending` depuis IndexedDB
  - Pour chacun : passe le status à `syncing`, envoie en POST multipart/form-data vers `import.meta.env.VITE_N8N_WEBHOOK_URL`
  - Le body multipart doit contenir : `audio` (le Blob), `id`, `createdAt`, `mimeType`
  - En cas de succès (200-299) : met le status à `synced`
  - En cas d'erreur : met le status à `error`
- Fonction `startPollingForResults(id)` :
  - Poll toutes les 5 secondes vers `VITE_N8N_STATUS_URL/:id`
  - Si la réponse contient `{ summary, transcript }` : appelle `updateRecordingResult()` et arrête le polling
  - Timeout après 120 secondes

2. Dans le Service Worker (via Workbox / vite-plugin-pwa) :
- Enregistre un Background Sync tag `sync-audio`
- Sur l'événement `sync` avec ce tag : appelle `syncPendingRecordings()`
- Écoute aussi l'événement `online` comme fallback

3. Crée `src/hooks/useSync.ts` :
- Expose `triggerSync()` qui enregistre le Background Sync tag ET appelle directement syncPendingRecordings() si online
- Expose `isSyncing` boolean

4. Ajoute un fichier `.env.example` :
VITE_N8N_WEBHOOK_URL=https://n8n.srv770518.hstgr.cloud/webhook/audio-upload
VITE_N8N_STATUS_URL=https://n8n.srv770518.hstgr.cloud/webhook/audio-status

Et crée également un fichier `.env` avec ces mêmes valeurs (ce sont les URLs de production directement).
```

---

## Prompt 5️⃣ — Assemblage final + UI principale

```
Assemble tous les composants en une UI principale cohérente dans `src/App.tsx`.

L'app doit avoir :
- Un header avec le nom "AudioNote" et une icône micro
- Indicateur de connexion (online/offline) en temps réel
- Le composant `AudioRecorder` en haut
- Quand un enregistrement est terminé : le sauvegarder en IndexedDB (status: pending) puis déclencher une sync
- En dessous : `RecordingList` qui se rafraîchit automatiquement après chaque nouvel enregistrement et après chaque sync
- Un bouton "Sync manuelle" qui appelle `triggerSync()` avec un spinner pendant la synchro
- Un message "Mode hors-ligne — vos enregistrements seront synchronisés dès la reconnexion" quand offline

Design sobre et mobile-first avec Tailwind, palette sombre (fond #1a1a2e, accents violet/bleu).

Assure-toi que tous les imports sont corrects et que l'app compile sans erreur TypeScript.
```

---

## Prompt 6️⃣ — Workflow N8N (documentation + import JSON)

> Ce prompt est différent : il génère le workflow N8N à importer directement.

```
Génère un workflow N8N exportable en JSON que je pourrai importer dans mon instance N8N.

Le workflow doit :
1. Déclencher sur un Webhook POST `/webhook/audio-upload` qui reçoit un multipart/form-data avec : audio (fichier), id (string), createdAt (string), mimeType (string)
2. Uploader le fichier audio sur Google Drive dans un dossier "AudioNotes"
3. Appeler l'API OpenAI Whisper (`/v1/audio/transcriptions`) pour transcrire l'audio
4. Appeler l'API OpenAI Chat (`/v1/chat/completions`, modèle gpt-4o-mini) avec ce prompt système : "Tu es un assistant qui résume des conversations. Génère un résumé concis en français en 3-5 phrases." et la transcription en message utilisateur
5. Stocker dans un nœud "Set" : { id, transcript, summary, status: "done" }
6. Exposer un second Webhook GET `/webhook/audio-status/:id` qui retourne le statut + résumé stocké

Génère le JSON complet du workflow N8N et explique comment configurer les credentials (Google Drive OAuth2, OpenAI API Key).
```

---

## Prompt 7️⃣ — Nettoyage + Affichage transcription/résumé

```
Effectue les tâches suivantes sur le projet :

### 1. NETTOYAGE
- Supprime tous les fichiers .md inutiles à la racine sauf README.md 
  (supprime : BIENVENUE.md, NEXT_STEPS.md, SERVICE_WORKER_GUIDE.md, 
  DOCUMENTATION_INDEX.md, N8N_SETUP_GUIDE.md, N8N_PWA_INTEGRATION.md, 
  N8N_ARCHITECTURE.md, N8N_QUICK_START.md, N8N_SYNC_GUIDE.md, 
  SYNC_IMPLEMENTATION_SUMMARY.md)
- Supprime les console.log de debug dans syncManager.ts, useSync.ts, 
  audioDb.ts et App.tsx (garde uniquement les console.error)

### 2. AFFICHAGE TRANSCRIPTION ET RÉSUMÉ
Dans src/components/RecordingList.tsx, modifie le composant pour que 
chaque enregistrement avec status='synced' affiche :

- Un accordéon/section dépliable sous les boutons avec deux onglets :
  "Transcription" et "Résumé"
- Onglet Transcription : affiche recording.transcript dans une zone 
  de texte scrollable (max-height: 200px), avec un bouton "Copier"
- Onglet Résumé : affiche recording.summary dans une zone de texte 
  scrollable, avec un bouton "Copier"
- Si transcript ou summary est null : affiche "En attente de traitement..."
- Style cohérent avec le design sombre existant (Tailwind CSS)
- Le bouton copier utilise navigator.clipboard.writeText()

### 3. POLLING AUTOMATIQUE
Dans src/sync/syncManager.ts, vérifie que après une sync réussie,
startPollingForResults() est bien appelé et que quand les résultats 
arrivent, setRefreshTrigger est déclenché dans App.tsx pour 
rafraîchir RecordingList automatiquement.
```

---

## Prompt 8️⃣ — README complet

```
Génère un fichier README.md complet et professionnel pour ce projet.

### Contenu obligatoire :

## 1. Présentation du projet
- Nom : AudioNote
- Description : PWA d'enregistrement audio avec transcription et résumé IA
- Stack technique : React 18, Vite, TypeScript, Tailwind CSS, IndexedDB, N8N, OpenAI (Whisper + GPT-4o-mini), Google Drive

## 2. Prérequis
- Node.js >= 18
- npm >= 9
- Un compte OpenAI pour les clés API (Whisper + Chat)
- Un compte Google Cloud pour Google Drive OAuth2
- Une instance N8N accessible (self-hosted ou cloud)

## 3. Installation

### Cloner et installer les dépendances
\`\`\`bash
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install -D sharp
node generate-icons.js
\`\`\`

### Variables d'environnement
Créer un fichier .env à la racine :
\`\`\`
VITE_N8N_WEBHOOK_URL=https://votre-instance-n8n/webhook/audio-upload
VITE_N8N_STATUS_URL=https://votre-instance-n8n/webhook/audio-status
\`\`\`

## 4. Lancement en développement
\`\`\`bash
npm run dev
\`\`\`
Ouvre http://localhost:5173

## 5. Build de production
\`\`\`bash
npm run build
\`\`\`
Les fichiers sont générés dans /dist

## 6. Configuration N8N
Expliquer comment importer le workflow :
- Importer n8n-workflow-export.json dans N8N
- Configurer les credentials : OpenAI API Key, Google Drive OAuth2
- Activer le workflow

## 7. Architecture
Décrire brièvement :
- PWA (offline-first) → IndexedDB → Sync vers N8N
- N8N : Google Drive Upload → Whisper (transcription) → GPT-4o-mini (résumé) → Réponse directe ou polling
- Affichage transcription + résumé dans l'UI

## 8. Fonctionnalités
- Enregistrement audio (webm/opus, fallback mp4 iOS)
- Stockage offline avec IndexedDB
- Synchronisation automatique au retour réseau
- Transcription audio via OpenAI Whisper
- Résumé IA via OpenAI GPT-4o-mini
- PWA installable sur Android et iOS
- Onglets Transcription/Résumé avec bouton copier

## 9. Notes techniques
- Le Service Worker est réactivé en développement ET en production
- Format audio : webm/opus sur Chrome/Android, mp4 sur iOS Safari
- Limit fichier : 25 MB (limite API OpenAI Whisper)
- Polling initial : 15s d'attente, puis toutes les 5s
- Alternativement : N8N peut retourner les résultats directement

Génère le README.md complet avec cette structure, en français, 
avec des emojis pour les titres et un style professionnel.
```

---

## 📌 Instance N8N Disponible

Pas besoin de Docker. Connecte-toi directement : **https://n8n.srv770518.hstgr.cloud/**

Après avoir généré le workflow JSON (Prompt 6) :
1. Importe-le dans N8N
2. Configure les credentials (OpenAI API Key, Google Drive OAuth2)
3. Active le workflow
4. Les URLs sont automatiquement disponibles

---

## ⚡ Raccourcis utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrer dev server (localhost:5173) |
| `npm run type-check` | Vérifier les erreurs TypeScript |
| `npm run build` | Build production |
| `npm run preview` | Prévisualiser la build |
| `node generate-icons.js` | Générer les icônes PNG |

---

**✨ Bonne chance ! Colle les prompts un par un et suis les instructions de Copilot.** 🚀
