import { useEffect, useState } from 'react'
import { AudioRecorder } from './components/AudioRecorder'
import { RecordingList } from './components/RecordingList'
import { transcribeAudio } from './api/transcribe'
import {
  saveRecording,
  updateRecordingTranscript,
  updateRecordingStatus,
  type AudioRecording,
} from './db/audioDb'
import type { Recording } from './hooks/useAudioRecorder'

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<Event | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [transcription, setTranscription] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('Prêt à enregistrer')

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setPwaInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  }, [])

  const transcribeRecording = async (recording: AudioRecording) => {
    setError('')
    setIsTranscribing(true)
    setRetryingId(recording.id)
    setStatusMessage('Transcription en cours...')

    try {
      await updateRecordingStatus(recording.id, 'syncing')
      setRefreshTrigger((value) => value + 1)

      const text = await transcribeAudio(recording.blob, recording.mimeType)
      await updateRecordingTranscript(recording.id, text)
      await updateRecordingStatus(recording.id, 'synced')

      setTranscription(text)
      setStatusMessage('Transcription terminée')
      setRefreshTrigger((value) => value + 1)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Une erreur inconnue est survenue.'
      setError(message)
      setStatusMessage('Audio conservé — transcription à relancer')

      try {
        await updateRecordingStatus(recording.id, 'error')
        setRefreshTrigger((value) => value + 1)
      } catch (storageError) {
        console.error('Impossible de mettre à jour le statut local :', storageError)
      }
      console.error('Erreur de transcription :', cause)
    } finally {
      setIsTranscribing(false)
      setRetryingId(null)
    }
  }

  const handleRecordingComplete = async (recording: Recording) => {
    setError('')
    setTranscription('')

    const localRecording: AudioRecording = {
      id: recording.id,
      blob: recording.blob,
      mimeType: recording.mimeType,
      createdAt: recording.createdAt,
      duration: recording.duration,
      status: 'pending',
      transcript: null,
    }

    try {
      await saveRecording(localRecording)
      setRefreshTrigger((value) => value + 1)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Impossible de sauvegarder cet audio.'
      setError(`L'enregistrement n'a pas pu être conservé : ${message}`)
      setStatusMessage('Erreur de sauvegarde')
      console.error('Erreur de sauvegarde locale :', cause)
      return
    }

    if (!navigator.onLine) {
      setStatusMessage('Audio conservé hors ligne — connexion requise pour transcrire')
      return
    }

    await transcribeRecording(localRecording)
  }

  const handleRetry = async (recording: AudioRecording) => {
    if (!navigator.onLine) {
      setError('Reconnecte-toi à Internet pour lancer la transcription.')
      return
    }
    await transcribeRecording(recording)
  }

  const handleCopyTranscription = async () => {
    try {
      await navigator.clipboard.writeText(transcription)
    } catch (cause) {
      setError('Impossible de copier la transcription dans le presse-papiers.')
      console.error('Erreur de copie :', cause)
    }
  }

  const handleInstallPwa = async () => {
    if (!pwaInstallPrompt) return

    const promptEvent = pwaInstallPrompt as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') setPwaInstallPrompt(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary-dark to-primary text-white flex flex-col">
      <header className="bg-gradient-to-r from-primary to-primary-dark border-b border-accent/30 sticky top-0 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">🎙️</span>
            <div>
              <h1 className="text-2xl font-bold text-success">AudioNote</h1>
              <p className="text-sm text-gray-400">Enregistrement et transcription vocale</p>
            </div>
          </div>
          <div className="flex items-center gap-2" aria-live="polite">
            <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-success' : 'bg-error'}`} />
            <span className="text-sm text-gray-300">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-error/20 border-b border-error/50 px-4 py-3 text-center text-sm text-gray-200">
          Tu peux enregistrer et conserver l’audio hors ligne. La transcription nécessite une connexion.
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 sm:py-8 space-y-6">
        <section className="card bg-gradient-to-br from-primary-light to-primary-dark border border-accent/20 shadow-xl text-center">
          <h2 className="text-xl font-bold text-accent mb-4">Enregistrement audio</h2>
          <p className="text-sm text-gray-300 mb-5" aria-live="polite">{statusMessage}</p>
          <div className="flex justify-center">
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              disabled={isTranscribing}
            />
          </div>
          {isTranscribing && (
            <p className="mt-5 text-sm text-accent" role="status">
              <span className="inline-block animate-spin mr-2" aria-hidden="true">🔄</span>
              Transcription en cours…
            </p>
          )}
          {error && (
            <div className="mt-5 bg-error/20 border border-error/50 rounded-lg p-3 text-left" role="alert">
              <p className="text-sm text-error">{error}</p>
              {error.includes('4 Mo') && (
                <p className="text-xs text-gray-300 mt-2">
                  Commence un nouvel enregistrement plus court. L’audio trop volumineux reste dans l’historique.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="card bg-primary-light/30 border border-accent/20">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-accent">Transcription</h2>
            {transcription && (
              <button
                onClick={handleCopyTranscription}
                className="px-3 py-2 rounded-lg bg-accent hover:bg-accent/80 text-white text-sm font-medium"
              >
                Copier
              </button>
            )}
          </div>
          <div className="min-h-36 max-h-96 overflow-y-auto p-4 rounded-lg bg-primary-light/50 border border-accent/20 whitespace-pre-wrap text-gray-200">
            {transcription || (
              <span className="text-gray-500">
                La transcription apparaîtra ici après l’enregistrement.
              </span>
            )}
          </div>
        </section>

        <section className="card bg-primary-light/30 border border-accent/20">
          <h2 className="text-xl font-bold text-accent mb-4">Historique</h2>
          <RecordingList
            key={refreshTrigger}
            onRetry={handleRetry}
            retryingId={retryingId}
          />
        </section>

        {pwaInstallPrompt && (
          <section className="card bg-gradient-to-r from-accent to-accent-light text-white">
            <h2 className="text-lg font-bold mb-2">Installer AudioNote</h2>
            <p className="text-sm mb-4">Ajoute l’application à l’écran d’accueil de ton appareil.</p>
            <button
              onClick={handleInstallPwa}
              className="px-4 py-2 bg-primary font-bold rounded-lg hover:bg-primary-light"
            >
              Installer
            </button>
          </section>
        )}
      </main>

      <footer className="border-t border-accent/30 bg-primary/50 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-5 text-center text-gray-400 text-sm">
          AudioNote · Transcription sécurisée par OpenAI
        </div>
      </footer>
    </div>
  )
}

export default App
