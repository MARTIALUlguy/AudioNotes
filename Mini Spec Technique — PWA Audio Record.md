# Mini Spec Technique — PWA Audio Recorder (POC)

---

## 🎯 Objectif

Valider la faisabilité d'une PWA React capable de :

1. Enregistrer un audio via micro
2. Stocker l'audio localement (offline-first)
3. Synchroniser vers N8N + Google Drive dès que la connexion est disponible
4. Déclencher une transcription + résumé IA via N8N

---

## Stack technique

| Brique                 | Choix                                |
| ---------------------- | ------------------------------------ |
| Framework              | React + Vite                         |
| PWA                    | `vite-plugin-pwa` (Workbox)          |
| Stockage local         | IndexedDB via `idb`                  |
| Enregistrement audio   | Web API `MediaRecorder`              |
| Sync réseau            | Background Sync API (Service Worker) |
| Backend trigger        | Webhook N8N                          |
| Stockage fichier       | Google Drive (via N8N)               |
| Transcription + résumé | Whisper / OpenAI via N8N             |

---

## Architecture fonctionnelle

```
[Mobile / PWA]
     │
     ├─ Micro → MediaRecorder → Blob (WebM/Opus)
     │
     ├─ IndexedDB ← stockage local immédiat
     │
     └─ Service Worker
           │
           ├─ Network available ? → POST multipart → N8N Webhook
           └─ Offline ? → Background Sync Queue (retry auto)

[N8N Workflow]
     │
     ├─ Réception fichier audio
     ├─ Upload → Google Drive
     ├─ Whisper → Transcription texte
     └─ LLM → Résumé → stocké / renvoyé à la PWA
```

---

## Fonctionnalités du POC

### F1 — Enregistrement audio

- Bouton Start / Stop
- Utilisation de `MediaRecorder` avec format `audio/webm;codecs=opus`
- Affichage durée en temps réel
- Sauvegarde du Blob dans IndexedDB avec statut `pending`

### F2 — File d'attente locale

- Chaque enregistrement a un état : `pending` / `syncing` / `synced` / `error`
- Liste des enregistrements visible dans l'UI avec statut
- Possibilité de relancer manuellement une synchro

### F3 — Synchronisation réseau

- Service Worker écoute l'événement `online`
- Utilisation de la **Background Sync API** (`SyncManager`) pour retry automatique
- Envoi en `multipart/form-data` vers le webhook N8N
- Mise à jour du statut dans IndexedDB après succès

### F4 — Transcription & résumé (côté N8N)

- N8N reçoit le fichier → upload Google Drive → appel Whisper → appel LLM
- Le résumé est retourné via un second endpoint (polling ou webhook retour)
- Affiché dans la PWA sous l'enregistrement correspondant

---

## Contraintes & limites du POC

- **Background Sync API** : supportée sur Android Chrome, **pas sur iOS Safari** → fallback `online` event listener
- Format audio : WebM/Opus non supporté sur iOS → détecter et basculer sur `audio/mp4`
- Taille max recommandée pour le POC : **< 50 Mo** par fichier
- Pas d'authentification utilisateur dans ce POC

---

## Endpoints N8N à prévoir

| Route                       | Méthode | Description                        |
| --------------------------- | ------- | ---------------------------------- |
| `/webhook/audio-upload`     | POST    | Reçoit le fichier audio + metadata |
| `/webhook/audio-status/:id` | GET     | Retourne statut + résumé si dispo  |

---

## Livrables du POC

- [ ] App React PWA installable sur mobile
- [ ] Enregistrement fonctionnel + stockage local
- [ ] Sync vers N8N + Google Drive validée
- [ ] Transcription + résumé affiché dans l'UI
- [ ] Workflow N8N documenté

---

## Points de validation (Definition of Done POC)

1. L'app fonctionne hors ligne (enregistrement + stockage)
2. La sync se déclenche automatiquement au retour réseau
3. Le résumé IA est affiché en moins de 60s après sync
4. L'app est installable sur Android et iOS

---

Tu veux que je crée les todos associés dans Notion, ou que j'affine une section en particulier ?
