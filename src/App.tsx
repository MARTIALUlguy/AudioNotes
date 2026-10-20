import { useState, useEffect } from 'react'
import { AudioRecorder } from './components/AudioRecorder'
import { RecordingList } from './components/RecordingList'
import { saveRecording } from './db/audioDb'
import { sendAudioForFormFill } from './sync/syncManager'
import type { Recording } from './hooks/useAudioRecorder'
import type { FormData } from './types/form'
import './App.css'

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<Event | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // État du formulaire immobilier
  const [formData, setFormData] = useState<FormData>({
    typeLogement: null,
    anneeConstruction: null,
    surface: null,
    niveauxChaufees: null,
    mitoyennete: null,
    typeToit: null,
  })

  // Transcription reçue de N8N
  const [transcription, setTranscription] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [recordingStatus, setRecordingStatus] = useState('En attente')

  // Écouter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Écouter l'événement beforeinstallprompt pour l'installation PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setPwaInstallPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Écouter l'événement recording-synced pour rafraîchir la RecordingList
  useEffect(() => {
    const handleRecordingSynced = () => {
      setRefreshTrigger(prev => prev + 1)
    }

    window.addEventListener('recording-synced', handleRecordingSynced as EventListener)

    return () => {
      window.removeEventListener('recording-synced', handleRecordingSynced as EventListener)
    }
  }, [])

  /**
   * Traite l'enregistrement audio complété
   * Appelle sendAudioForFormFill() qui retourne:
   * { id, transcript, summary, typeLogement, anneeConstruction, surface, niveauxChaufees, mitoyennete, typeToit }
   */
  const handleRecordingComplete = async (recording: Recording) => {
    setIsAnalyzing(true)
    setRecordingStatus('Analyse en cours...')
    setError('')
    setTranscription('')
    setFormData({
      typeLogement: null,
      anneeConstruction: null,
      surface: null,
      niveauxChaufees: null,
      mitoyennete: null,
      typeToit: null,
    })

    try {
      // Envoyer l'audio à N8N pour extraction via VITE_N8N_FORM_URL
      // Retour: { transcript, summary, typeLogement, anneeConstruction, surface, niveauxChaufees, mitoyennete, typeToit }
      const result = await sendAudioForFormFill(recording.blob, recording.mimeType)

      // Mettre à jour la transcription (utiliser result.transcript, pas transcription)
      if (result.transcript) {
        setTranscription(result.transcript)
      }

      // Extraire et mettre à jour les données du formulaire immobilier
      const updatedForm: FormData = {
        typeLogement: result.typeLogement || null,
        anneeConstruction: result.anneeConstruction || null,
        surface: result.surface || null,
        niveauxChaufees: result.niveauxChaufees || null,
        mitoyennete: result.mitoyennete || null,
        typeToit: result.typeToit || null,
      }
      setFormData(updatedForm)

      // Sauvegarder dans IndexedDB avec status 'synced'
      // Plus besoin d'appeler syncPendingRecordings() séparément
      await saveRecording({
        id: recording.id,
        blob: recording.blob,
        mimeType: recording.mimeType,
        createdAt: recording.createdAt,
        duration: Math.round((recording.blob.size * 8) / 128000),
        status: 'synced',
        summary: result.summary || null,
        transcript: result.transcript || null,
      })

      // Forcer la mise à jour de la RecordingList
      setRefreshTrigger(prev => prev + 1)

      // Mettre à jour le status
      setRecordingStatus('Terminé ✓')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(`Erreur lors de l'analyse: ${message}`)
      setRecordingStatus('Erreur')
      console.error('❌ Erreur lors du traitement de l\'enregistrement:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  /**
   * Gère la mise à jour des champs du formulaire
   */
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  /**
   * Vérifie si tous les champs du formulaire sont remplis
   */
  const isFormComplete = (): boolean => {
    return (
      formData.typeLogement !== null &&
      formData.anneeConstruction !== null &&
      formData.surface !== null &&
      formData.niveauxChaufees !== null &&
      formData.mitoyennete !== null &&
      formData.typeToit !== null
    )
  }

  /**
   * Copie la transcription au presse-papiers
   */
  const handleCopyTranscription = async () => {
    if (!transcription) return
    try {
      await navigator.clipboard.writeText(transcription)
      // Feedback visuel (peut être amélioré avec un toast)
      alert('✅ Transcription copiée!')
    } catch (err) {
      console.error('❌ Erreur lors de la copie:', err)
    }
  }

  /**
   * Valide et soumet le formulaire
   */
  const handleSubmit = () => {
    if (!isFormComplete()) {
      setError('Veuillez remplir tous les champs du formulaire')
      return
    }

    console.log('✅ Formulaire soumis:', formData)
    // TODO: Envoyer les données à un endpoint
  }

  const handleInstallPWA = async () => {
    if (!pwaInstallPrompt) return
    
    const event = pwaInstallPrompt as any
    event.prompt()
    const { outcome } = await event.userChoice
    
    if (outcome === 'accepted') {
      setPwaInstallPrompt(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary-dark to-primary text-white flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary-dark border-b border-accent/30 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl">🎙️</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-success">AudioNote</h1>
                <p className="text-xs sm:text-sm text-gray-400">Analyse Immobilière Automatique</p>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isOnline ? 'bg-success animate-pulse' : 'bg-error animate-pulse'
                }`}
              />
              <span className={`text-sm font-medium hidden sm:inline ${isOnline ? 'text-success' : 'text-error'}`}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-error/20 border-b border-error/50 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <span className="text-lg mt-0.5">🔴</span>
            <div className="flex-1">
              <p className="font-semibold text-error">Mode hors-ligne</p>
              <p className="text-sm text-gray-300 mt-1">
                Vos enregistrements seront synchronisés dès la reconnexion.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - 3 Column Layout (desktop) / Stacked (mobile) */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MOBILE ORDER 1 / DESKTOP LEFT — Micro */}
          <section className="lg:col-start-1 lg:row-start-1">
            {/* Recording Card */}
            <div className="card bg-gradient-to-br from-primary-light to-primary-dark border border-accent/20 shadow-xl">
              <h2 className="text-lg sm:text-xl font-bold text-accent mb-4">🎤 Enregistrement</h2>
              
              {/* Status Badge */}
              <div className="mb-4 p-3 bg-primary-light/50 rounded-lg text-center">
                <p className="text-sm font-medium text-gray-300">État: <span className="text-accent font-bold">{recordingStatus}</span></p>
              </div>

              {/* Audio Recorder Component */}
              <div className="flex justify-center mb-6">
                <AudioRecorder onRecordingComplete={handleRecordingComplete} />
              </div>

              {/* Loading State */}
              {isAnalyzing && (
                <div className="bg-accent/20 border border-accent/50 rounded-lg p-3 flex items-center gap-2">
                  <span className="inline-block animate-spin">🔄</span>
                  <p className="text-sm text-accent">Analyse en cours...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-error/20 border border-error/50 rounded-lg p-3">
                  <p className="text-sm text-error">❌ {error}</p>
                </div>
              )}
            </div>
          </section>

          {/* MOBILE ORDER 2 / DESKTOP RIGHT — Formulaire Immobilier */}
          <section className="card bg-primary-light/30 border border-accent/20 flex flex-col space-y-4 lg:col-start-3 lg:row-start-1">
            <h2 className="text-lg sm:text-xl font-bold text-accent mb-2 flex items-center gap-2">
              🏠 Propriété
            </h2>

            {/* Type de Logement */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Type {formData.typeLogement && <span className="ml-2 text-success">✓</span>}
              </label>
              <div className="flex gap-2">
                {['Maison', 'Appartement'].map((type) => (
                  <button
                    key={type}
                    onClick={() => updateField('typeLogement', type as 'Maison' | 'Appartement')}
                    className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.typeLogement === type
                        ? 'bg-green-600 border border-green-400 text-white'
                        : 'bg-primary-light/50 border border-accent/30 text-gray-300 hover:border-accent/60'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Année de Construction */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Année {formData.anneeConstruction && <span className="ml-2 text-success">✓</span>}
              </label>
              <select
                value={formData.anneeConstruction || ''}
                onChange={(e) => updateField('anneeConstruction', e.target.value as any)}
                className="w-full px-3 py-2 bg-primary-light/50 border border-accent/30 rounded-lg text-gray-200 focus:border-accent focus:outline-none text-sm"
              >
                <option value="">Sélectionner...</option>
                {['Avant 1975', '1975-1988', '1989-2000', '2001-2012', 'Après 2012'].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Surface */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Surface (m²) {formData.surface && <span className="ml-2 text-success">✓</span>}
              </label>
              <input
                type="number"
                value={formData.surface || ''}
                onChange={(e) => updateField('surface', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Entrez..."
                className="w-full px-3 py-2 bg-primary-light/50 border border-accent/30 rounded-lg text-gray-200 placeholder-gray-500 focus:border-accent focus:outline-none text-sm"
              />
            </div>

            {/* Niveaux Chauffés */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Niveaux {formData.niveauxChaufees && <span className="ml-2 text-success">✓</span>}
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <button
                    key={level}
                    onClick={() => updateField('niveauxChaufees', level as any)}
                    className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.niveauxChaufees === level
                        ? 'bg-green-600 border border-green-400 text-white'
                        : 'bg-primary-light/50 border border-accent/30 text-gray-300 hover:border-accent/60'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Mitoyenneté */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Mitoyenneté {formData.mitoyennete && <span className="ml-2 text-success">✓</span>}
              </label>
              <select
                value={formData.mitoyennete || ''}
                onChange={(e) => updateField('mitoyennete', e.target.value as any)}
                className="w-full px-3 py-2 bg-primary-light/50 border border-accent/30 rounded-lg text-gray-200 focus:border-accent focus:outline-none text-sm"
              >
                <option value="">Sélectionner...</option>
                {['Isolé', '1 côté', '2 côtés', 'Maison de ville'].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Type de Toit */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Toit {formData.typeToit && <span className="ml-2 text-success">✓</span>}
              </label>
              <select
                value={formData.typeToit || ''}
                onChange={(e) => updateField('typeToit', e.target.value as any)}
                className="w-full px-3 py-2 bg-primary-light/50 border border-accent/30 rounded-lg text-gray-200 focus:border-accent focus:outline-none text-sm"
              >
                <option value="">Sélectionner...</option>
                {['Combles perdus', 'Combles aménagés', 'Toit plat'].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!isFormComplete()}
              className={`mt-auto w-full px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                isFormComplete()
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isFormComplete() ? '✅ Valider le formulaire' : '⏳ Complétez le formulaire'}
            </button>
          </section>

          {/* MOBILE ORDER 3 / DESKTOP CENTER — Transcription */}
          <section className="card bg-primary-light/30 border border-accent/20 flex flex-col lg:col-start-2 lg:row-start-1">
            <h2 className="text-lg sm:text-xl font-bold text-accent mb-4 flex items-center gap-2">
              📄 Transcription
            </h2>

            {/* Transcription Textarea */}
            <div className="flex-1 flex flex-col">
              <textarea
                value={transcription}
                readOnly
                placeholder="La transcription apparaîtra ici après l'enregistrement..."
                className="flex-1 w-full p-3 bg-primary-light/50 border border-accent/30 rounded-lg text-gray-200 placeholder-gray-500 resize-none focus:outline-none"
              />
            </div>

            {/* Copy Button */}
            {transcription && (
              <button
                onClick={handleCopyTranscription}
                className="mt-3 w-full px-4 py-2 bg-accent hover:bg-accent-light text-primary font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                📋 Copier la transcription
              </button>
            )}
          </section>

          {/* MOBILE ORDER 4 / DESKTOP LEFT (ROW 2) — Recording History */}
          <section className="card bg-primary-light/30 border border-accent/20 lg:col-start-1 lg:row-start-2">
            <h3 className="text-lg font-bold text-accent mb-4">📋 Historique</h3>
            <RecordingList key={refreshTrigger} />
          </section>
        </div>

        {/* Install PWA Prompt */}
        {pwaInstallPrompt && (
          <section className="mt-8 card bg-gradient-to-r from-accent via-accent-light to-accent border border-accent/50 shadow-lg">
            <div className="flex items-start gap-4">
              <span className="text-3xl">📥</span>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">Installer AudioNote</h2>
                <p className="text-sm text-gray-100 mb-4">
                  Accédez à l'application directement depuis votre écran d'accueil.
                </p>
                <button
                  onClick={handleInstallPWA}
                  className="w-full px-4 py-2 bg-primary font-bold rounded-lg hover:bg-primary-light transition-colors"
                >
                  Installer maintenant
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-accent/30 bg-primary/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-400 text-xs sm:text-sm space-y-2">
          <p>&copy; 2026 AudioNote. Tous les droits réservés.</p>
          <p>React 18 • Vite • PWA • IndexedDB • Tailwind CSS • N8N Sync</p>
        </div>
      </footer>
    </div>
  )
}

export default App

