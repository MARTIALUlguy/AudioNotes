# AudioNote — Application de notes vocales transcrites

## Présentation

AudioNote est une application web progressive (PWA) qui permet d’enregistrer des notes vocales depuis un ordinateur ou un téléphone, de les conserver localement et d’obtenir leur transcription en français. Le projet met en œuvre une chaîne complète, du microphone jusqu’à un service de transcription hébergé, avec une interface adaptée au mobile.

## Liens

- **Application en production :** [audio-notes-martial.vercel.app](https://audio-notes-martial.vercel.app)
- **Code source :** [github.com/MARTIALUlguy/AudioNotes](https://github.com/MARTIALUlguy/AudioNotes)

## Fonctionnalités

- Capture audio à l’aide des API navigateur `getUserMedia` et `MediaRecorder`.
- Choix du format audio selon les capacités du navigateur, avec prise en compte d’iOS Safari.
- Sauvegarde locale des enregistrements dans IndexedDB avant la demande de transcription.
- Transcription française par le modèle `whisper-large-v3-turbo` de Groq.
- Consultation, lecture, téléchargement et suppression des enregistrements.
- Affichage et copie du texte transcrit ; possibilité de relancer une transcription échouée.
- Installation comme PWA et mise en cache des ressources statiques.
- Enregistrement et consultation de l’historique hors ligne ; la transcription nécessite une connexion Internet.

## Technologies

| Domaine | Technologies |
|---|---|
| Interface | React 18, TypeScript |
| Outils de développement | Vite, npm |
| Style | Tailwind CSS |
| Enregistrement | Web Media APIs : `getUserMedia`, `MediaRecorder`, `Blob` |
| Stockage local | IndexedDB avec la bibliothèque `idb` |
| Progressive Web App | Web App Manifest, Service Worker, Workbox, `vite-plugin-pwa` |
| API serveur | Fonction serverless Vercel en TypeScript |
| Reconnaissance vocale | Groq API, modèle Whisper `whisper-large-v3-turbo` |
| Déploiement | Vercel avec HTTPS |

## Architecture technique

```text
Navigateur
  ├─ Microphone → MediaRecorder → fichier audio (Blob)
  ├─ IndexedDB → conserve l’audio et la transcription
  └─ POST multipart/form-data vers /api/transcribe
                         │
                         ▼
                 Fonction Vercel
                 ├─ Valide la requête et la taille du fichier
                 ├─ Lit GROQ_API_KEY côté serveur
                 └─ Appelle l’API Groq / Whisper
                         │
                         ▼
             Transcription renvoyée à l’interface
```

L’interface n’appelle pas Groq directement. La fonction serverless sert de relais et garde `GROQ_API_KEY` côté serveur : la clé n’est pas incluse dans le code JavaScript livré au navigateur. Les audios sont stockés localement dans le navigateur et envoyés au service de transcription uniquement à la demande.

## Choix techniques et limites actuelles

- **PWA et IndexedDB :** l’utilisateur peut enregistrer et retrouver ses fichiers sans connexion. Une transcription est lancée lorsque le réseau est disponible ; un enregistrement en échec reste accessible et peut être réessayé.
- **API serverless :** aucune clé fournisseur n’est exposée au client et aucun serveur applicatif permanent n’est nécessaire.
- **Limite d’envoi :** la fonction limite actuellement les fichiers transmis à **4 Mo** pour respecter les contraintes de requête de l’hébergement. Les fichiers plus volumineux restent lisibles et téléchargeables localement, mais ne peuvent pas être transcrits dans leur état actuel.
- **Stockage navigateur :** l’historique est propre au navigateur et au domaine. Effacer les données du site peut supprimer les audios et les transcriptions.

## Résumé court pour un portfolio

> **AudioNote** est une PWA de notes vocales développée avec React et TypeScript. Elle enregistre l’audio via les API média du navigateur, le sauvegarde dans IndexedDB et le transcrit en français grâce à Whisper (`whisper-large-v3-turbo`) via Groq. Une fonction serverless Vercel protège la clé API et assure la communication avec le service de transcription. L’application propose une expérience mobile installable, la consultation et le téléchargement des enregistrements, ainsi qu’un mode hors ligne pour la capture et l’historique.

## Compétences mobilisées

- Développement frontend avec React et TypeScript.
- Utilisation des API audio du navigateur et gestion des permissions microphone.
- Persistance de fichiers binaires côté client avec IndexedDB.
- Conception d’une API serverless et intégration d’un service externe de reconnaissance vocale.
- Gestion des secrets côté serveur et configuration d’un déploiement HTTPS.
- Création d’une PWA et prise en compte des états en ligne / hors ligne.
