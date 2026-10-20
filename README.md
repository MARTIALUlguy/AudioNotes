# 🎙️ AudioNote — PWA d'enregistrement audio avec IA

> **AudioNote** est une Progressive Web App qui permet d'enregistrer de l'audio, de le transcrire automatiquement et de générer des résumés intelligents. Offline-first, installable sur Android et iOS, synchronisation automatique avec N8N.

![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)
![Node](https://img.shields.io/badge/node-%3E%3D18-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🌟 Fonctionnalités

✅ **Enregistrement audio** · Micro-friendly, auto-détection iOS Safari  
✅ **Stockage offline** · IndexedDB avec synchronisation différée  
✅ **Transcription IA** · OpenAI Whisper (multilingue)  
✅ **Résumés intelligents** · OpenAI GPT-4o-mini (français/anglais)  
✅ **PWA installable** · Sur Android, iOS, Windows, macOS  
✅ **Google Drive** · Backup automatique de tous les audios  
✅ **Synchronisation automatique** · Au retour réseau, ou manuel  
✅ **UI sombre** · Design mobile-first, Tailwind CSS  

---

## 📋 Prérequis

- **Node.js** >= 18
- **npm** >= 9
- **Compte OpenAI** : clé API pour Whisper + GPT-4o-mini
  - https://platform.openai.com/account/api-keys
- **Google Cloud Project** : OAuth2 credentials pour Google Drive
  - https://console.cloud.google.com
- **Instance N8N** : self-hosted ou cloud
  - https://n8n.io

---

## 🚀 Installation

### 1️⃣ Cloner le repo

```bash
git clone <votre-repo>
cd application_enregistrement_audio
```

### 2️⃣ Installer les dépendances

```bash
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install -D sharp
node generate-icons.js
```

### 3️⃣ Configurer les variables d'environnement

Créer `.env` à la racine (copier depuis `.env.example`):

```env
# N8N Webhook URLs
VITE_N8N_FORM_URL=https://votre-instance-n8n/webhook/audio-form
VITE_N8N_WEBHOOK_URL=https://n8n.srv770518.hstgr.cloud/webhook/audio-upload
VITE_N8N_STATUS_URL=https://n8n.srv770518.hstgr.cloud/webhook/audio-status
```

Remplace `VITE_N8N_FORM_URL` par l'URL du webhook N8N qui traite l'audio et renvoie les champs du formulaire immobilier. Cette variable est requise par le parcours principal de l'application.

### 4️⃣ Lancer le dev server

```bash
npm run dev
```

Ouvre http://localhost:5173/ 🎉

---

## 📦 Build Production

```bash
npm run build
npm run preview
```

Les fichiers sont générés dans `/dist` (prêt à déployer).

---

## ☁️ Déploiement sur Vercel

Le dépôt est configuré pour être déployé comme une application Vite statique. Le fichier `vercel.json` réécrit les chemins d'une application monopage vers `index.html`; les fichiers générés, dont le service worker PWA, restent servis normalement.

1. Pousse le projet sur GitHub, GitLab ou Bitbucket.
2. Dans Vercel, choisis **Add New → Project**, puis importe le dépôt.
3. Vérifie les paramètres de build :
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
   - **Install Command** : `npm install`
4. Dans **Settings → Environment Variables**, ajoute les URLs de tes webhooks N8N :

   | Variable | Obligatoire pour le parcours principal | Valeur |
   |----------|----------------------------------------|--------|
   | `VITE_N8N_FORM_URL` | Oui | URL du webhook N8N qui traite l'audio et renvoie les données immobilières |
   | `VITE_N8N_WEBHOOK_URL` | Selon l'usage de la synchronisation | URL du webhook de dépôt audio |
   | `VITE_N8N_STATUS_URL` | Selon l'usage de la synchronisation | URL du webhook de statut des traitements |

   Les variables `VITE_*` sont intégrées au bundle envoyé au navigateur : elles ne doivent contenir que des URLs publiques, jamais de clés API ou d'identifiants. Configure les secrets OpenAI et Google Drive dans les credentials N8N. Vérifie également que N8N autorise les requêtes CORS depuis le domaine Vercel.
5. Déploie le projet. Après toute modification des variables, relance un déploiement pour reconstruire l'application.
6. Ouvre l'URL HTTPS fournie par Vercel et autorise l'accès au microphone. HTTPS est nécessaire pour `getUserMedia` et pour l'installation de la PWA.

Le frontend est hébergé sur Vercel; le traitement audio et les intégrations IA/Google Drive restent exécutés par N8N.

---

## ⚙️ Configuration N8N

### 0️⃣ Importer le workflow

1. Ouvre https://n8n.srv770518.hstgr.cloud/
2. Clique **"Import"** → sélectionne `n8n-workflow-export.json`
3. Le workflow apparaît avec 12 nœuds

### 1️⃣ Configurer OpenAI API Key

Dans le nœud **"OpenAI - Whisper Transcription"** :

1. Clique l'icône 🔑 (credentials)
2. **"Add new credential"** → **"OpenAI API"**
3. Colle ta clé API (sk-...)
4. Clique **"Test"** (doit montrer ✅ vert)

Répète pour le nœud **"OpenAI - Chat Summarization"**

### 2️⃣ Configurer Google Drive OAuth2

Dans le nœud **"Google Drive - Upload Audio"** :

1. Clique l'icône 🔑 (credentials)
2. **"Add new credential"** → **"Google Drive OAuth2"**
3. Remplis **Client ID** et **Client Secret** (depuis Google Cloud)
4. Clique **"Continue"** → autoriser dans Google
5. Sélectionne/crée le dossier **"AudioNotes"**

### 3️⃣ Activer le workflow

1. Clique **"Restart workflow"**
2. Statut doit afficher **"Ready"**
3. Les webhooks sont maintenant actifs ✅

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         AudioNote PWA (React + Vite)            │
│                                                 │
│  🎙️ AudioRecorder                              │
│       ↓ (Blob audio)                           │
│  🗄️ IndexedDB (offline storage)                │
│       ↓ (status: pending)                      │
│  📤 useSync() hook                              │
│       ↓ POST multipart/form-data               │
└─────────────────────────────────────────────────┘
              ↓         ↑
         (FormData)  (JSON)
              ↓         ↑
┌─────────────────────────────────────────────────┐
│              N8N Workflow                       │
│                                                 │
│  🌐 Webhook POST /webhook/audio-upload         │
│       ↓                                         │
│  📁 Google Drive (backup)                       │
│       ↓                                         │
│  🎤 Whisper API (transcription)                 │
│       ↓                                         │
│  🧠 GPT-4o-mini (résumé IA)                     │
│       ↓                                         │
│  💾 Store Results (variables)                   │
│       ↓                                         │
│  🌐 Webhook GET /webhook/audio-status/:id      │
└─────────────────────────────────────────────────┘
              ↓         ↑
         (JSON)    (query param)
              ↓         ↑
┌─────────────────────────────────────────────────┐
│    Recording updated in IndexedDB               │
│    UI refreshes automatically ✨                │
│    RecordingList shows transcript + summary    │
└─────────────────────────────────────────────────┘
```

---

## 📱 Mode d'emploi

### 1️⃣ Enregistrer un audio

```
1. Clique le bouton 🎙️ "Démarrer l'enregistrement"
2. Parle/enregistre ce que tu veux
3. Clique "⏹️ Arrêter" quand c'est fini
```

Ton audio est **automatiquement sauvegardé** en IndexedDB (status: ⏳ En attente).

### 2️⃣ Synchronisation automatique

```
🌐 Si connecté (online):
   → L'audio est uploadé immédiatement vers N8N
   → Status passe à 🔄 Synchronisation...

📳 Si déconnecté (offline):
   → L'audio reste stocké localement
   → À la reconnexion, sync automatique
```

### 3️⃣ Attendre les résultats

```
⏳ La première vérification = +15 secondes
   (temps pour Whisper + GPT-4o-mini)

🔄 Puis polling automatique toutes les 5 secondes

✅ Quand transcription + résumé arrivent:
   → Status passe à ✅ Synchronisé
   → Onglet "Transcription" et "Résumé" déverrouillés
```

### 4️⃣ Consulter transcription et résumé

```
1. Clique le bouton "▶ Détails" sur un enregistrement synced
2. Sélectionne l'onglet:
   📄 Transcription: le texte complet reconnu
   📝 Résumé: 3-5 phrases en français
3. Clique 📋 Copier pour copier le texte
```

---

## 🗂️ Structure du projet

```
application_enregistrement_audio/
├── src/
│   ├── components/
│   │   ├── AudioRecorder.tsx       # Enregistrement audio
│   │   └── RecordingList.tsx       # Affichage/gestion enregistrements
│   ├── hooks/
│   │   ├── useAudioRecorder.ts     # Hook MediaRecorder
│   │   └── useSync.ts              # Hook synchronisation
│   ├── db/
│   │   └── audioDb.ts              # Module IndexedDB (CRUD)
│   ├── sync/
│   │   ├── syncManager.ts          # Logique sync N8N
│   │   └── index.ts                # Exports
│   ├── App.tsx                     # Composant principal
│   ├── registerSW.ts               # Service Worker registration
│   └── main.tsx                    # Entry point
├── public/
│   ├── icon-192.png                # Icône 192x192
│   ├── icon-192-maskable.png       # Icône maskable
│   ├── icon-512.png                # Icône 512x512
│   ├── icon-512-maskable.png       # Icône maskable
│   └── manifest.json               # Web App Manifest
├── vite.config.ts                  # Vite + PWA config
├── tailwind.config.js              # Tailwind CSS config
├── tsconfig.json                   # TypeScript config
├── .env                            # Variables d'environnement
├── n8n-workflow-export.json        # Workflow N8N à importer
└── README.md                       # Ce fichier
```

---

## 📊 Stack technique

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 18.3.1 |
| **Build tool** | Vite | 5.4.21 |
| **Language** | TypeScript | 5.2.2 |
| **Styling** | Tailwind CSS | 3.4.1 |
| **Database** | IndexedDB | idb 8.0.0 |
| **PWA** | vite-plugin-pwa | 0.20.3 |
| **Service Worker** | Workbox | 7.1.0 |
| **Orchestration** | N8N | cloud |
| **AI - Transcription** | OpenAI Whisper | - |
| **AI - Résumé** | OpenAI GPT-4o-mini | - |
| **Backup** | Google Drive API | - |

---

## 🔧 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarrer dev server (http://localhost:5173) |
| `npm run type-check` | Vérifier les erreurs TypeScript |
| `npm run build` | Build production |
| `npm run preview` | Prévisualiser la build |
| `node generate-icons.js` | Générer les icônes PNG |

---

## 💡 Notes techniques

### Service Worker

- **Développement** : Service Worker **activé** (configure-toi pour pouvoir tester le SW)
- **Production** : Service Worker **activé automatiquement** en mode PWA
- **Stratégie cache** : `injectManifest` (contrôle full du SW custom)

### Format audio

```
┌─ iOS Safari  → audio/mp4 (limitation du navigateur)
├─ Chrome/Android → audio/webm;codecs=opus (meilleure compression)
└─ Firefox → audio/webm;codecs=opus
```

### Limites API

```
🎤 Whisper:
   • Max 25 MB par fichier
   • Languages: 99+ langues
   • Format: MP3, MP4, MPEG, MPGA, M4A, OGG, FLAC, WAV, WebM

📝 GPT-4o-mini:
   • Tokens: 128K context window
   • Latency: ~500ms en moyenne
   • Coût: $0.15/1M input tokens, $0.60/1M output tokens

📁 Google Drive:
   • Limite de quotum par utilisateur
   • Rate limit: 1000 requêtes/100 secondes
```

### Polling

```
🔄 Stratégie de synchronisation:

1️⃣ Audio uploadé vers N8N
2️⃣ Attente 15 secondes (traitement Whisper + GPT)
3️⃣ Polling automatique:
   • Essai 1-24: toutes les 5 secondes
   • Timeout total: 120 secondes
4️⃣ Résultats sauvegardés en IndexedDB
5️⃣ UI rafraîchie automatiquement
```

---

## 🚨 Troubleshooting

### "Aucun microphone détecté"

```
✅ Vérifier:
  - Permission navigateur (Paramètres → Confidentialité → Microphone)
  - Microphone branché et fonctionnel
  - HTTPS activé (obligatoire pour getUserMedia)
```

### "N8N retourne erreur 401"

```
✅ Vérifier:
  - OpenAI API Key valide et active
  - Quotum API OpenAI suffisant
  - N8N peut accéder à internet
```

### "Transcription/Résumé vide"

```
✅ Vérifier:
  - Audio uploadé avec succès (status = synced)
  - Webhook GET retourne du JSON valide
  - N8N workflow actif et running
```

### "PWA ne s'installe pas"

```
✅ Vérifier:
  - HTTPS activé
  - manifest.json valide
  - Service Worker enregistré (DevTools → Application → Service Workers)
  - Icônes PNG présentes dans /public
```

---

## 📈 Performance

| Métrique | Valeur |
|----------|--------|
| **Bundle** | ~170 KB (gzip 54 KB) |
| **CSS** | ~26 KB (gzip 6 KB) |
| **Service Worker** | ~18 KB (gzip 6 KB) |
| **Time to interactive** | ~800ms |
| **Lighthouse PWA** | 95+ |

---

## 🔐 Sécurité

- ✅ **HTTPS obligatoire** pour PWA et getUserMedia
- ✅ **API Keys en ENV** (jamais commitées)
- ✅ **CORS** configuré sur N8N
- ✅ **Service Worker** isolé du contexte principal
- ✅ **IndexedDB** limité au domaine

---

## 📞 Support & Ressources

| Ressource | Lien |
|-----------|------|
| **N8N Docs** | https://docs.n8n.io |
| **OpenAI API** | https://platform.openai.com/docs |
| **Whisper Model** | https://platform.openai.com/docs/guides/speech-to-text |
| **GPT-4o-mini** | https://platform.openai.com/docs/models/gpt-4o-mini |
| **Google Drive API** | https://developers.google.com/drive |
| **React Docs** | https://react.dev |
| **Tailwind CSS** | https://tailwindcss.com |
| **IndexedDB MDN** | https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API |
| **PWA MDN** | https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps |

---

## 📄 Licence

MIT © 2025 AudioNote

---

**Fait avec ❤️ et beaucoup de ☕**
