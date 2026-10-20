# AudioNote

AudioNote est une application web progressive (PWA) qui enregistre des notes vocales, conserve les fichiers localement et les transcrit en français avec l’API OpenAI. L’audio reste dans le navigateur; il est transmis au serveur Vercel uniquement pour demander sa transcription.

## Fonctionnalités

- Enregistrement avec le microphone, sur ordinateur et mobile.
- Sauvegarde des audios et transcriptions dans IndexedDB.
- Transcription des enregistrements existants, avec possibilité de relancer après une erreur.
- Lecture, téléchargement et copie des transcriptions.
- Installation comme PWA et interface d’enregistrement utilisable hors ligne. La transcription requiert Internet.

## Prérequis

- Node.js 20 ou une version plus récente.
- npm.
- Un compte Vercel pour l’hébergement.
- Une clé API OpenAI avec accès au modèle `gpt-4o-mini-transcribe` et une facturation API active.

## Développement local

Installer les dépendances :

```bash
npm install
```

Configurer la clé API côté serveur dans Vercel :

```bash
npx vercel login
npx vercel link
npx vercel env add OPENAI_API_KEY development
```

Saisir la clé dans l’invite, sans la préfixer par `VITE_`. Pour lancer le frontend et la fonction API Vercel ensemble :

```bash
npx vercel dev
```

Ne lance pas le projet avec `npm run dev` pour tester la transcription : le serveur de développement Vite seul ne sert pas la fonction `/api/transcribe`.

## Déploiement sur Vercel

Le projet doit être lié à un dépôt Git pour le déploiement continu, ou déployé depuis le terminal avec la CLI Vercel.

1. Ajoute `OPENAI_API_KEY` dans **Vercel → Project → Settings → Environment Variables**. Coche les environnements nécessaires (Production et Preview). Cette variable est secrète et ne doit jamais commencer par `VITE_`.
2. Déploie depuis le projet lié :

   ```bash
   npx vercel --prod
   ```

Vercel détecte Vite. La commande de build est `npm run build`, le dossier de sortie est `dist`. La fonction située dans `api/transcribe.ts` est publiée sur `/api/transcribe`; l’application ne nécessite pas de fallback de routage SPA.

HTTPS est nécessaire pour l’accès au microphone. Si tu modifies la clé API dans Vercel, redéploie le projet.

L’endpoint de transcription est public sur le déploiement. Pour éviter un usage abusif de la clé API et des coûts inattendus, active une limite de requêtes sur `/api/transcribe` dans les protections Vercel, et garde un plafond de dépenses côté OpenAI.

## Limite de taille

La fonction limite les fichiers audio à **4 Mo**, pour rester sous la limite de requête des fonctions Vercel. Les audios plus longs restent enregistrés localement et peuvent être lus ou téléchargés, mais l’application ne les découpe pas : fais un nouvel enregistrement plus court pour le transcrire. La clé OpenAI n’est utilisée que par la fonction serveur et n’est jamais envoyée au navigateur.

## Structure utile

```text
api/transcribe.ts          Fonction Vercel qui appelle OpenAI
src/api/transcribe.ts      Client de l’API de transcription
src/components/            Enregistreur et historique
src/db/audioDb.ts          Stockage IndexedDB local
src/hooks/useAudioRecorder.ts
src/sw.ts                  Cache PWA des ressources statiques
```

## Commandes

| Commande | Description |
|---|---|
| `npm run build` | Vérifie le TypeScript frontend et API, puis construit la PWA |
| `npm run type-check` | Vérifie le TypeScript du frontend et de la fonction API |
| `npm run preview` | Prévisualise les fichiers de build Vite |
| `npx vercel dev` | Lance le frontend avec les fonctions API Vercel en local |

Les fichiers audio sont conservés dans le stockage local du navigateur. Effacer les données du site peut supprimer les enregistrements.
