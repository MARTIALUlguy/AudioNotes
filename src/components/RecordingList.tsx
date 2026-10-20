import { useEffect, useState } from 'react'
import { getAllRecordings, deleteRecording, type AudioRecording } from '../db/audioDb'

type TabType = 'transcript' | 'summary'

export function RecordingList() {
  const [recordings, setRecordings] = useState<AudioRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('transcript')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  /**
   * Charge les enregistrements from IndexedDB
   */
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        setLoading(true)
        const data = await getAllRecordings()
        setRecordings(data)
      } catch (error) {
        console.error('Erreur lors du chargement:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRecordings()
  }, [])

  /**
   * Formate la durée en MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  /**
   * Formate la date locale
   */
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  /**
   * Récupère la couleur du badge statut
   */
  const getStatusBadgeColor = (status: AudioRecording['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-500 text-white'
      case 'syncing':
        return 'bg-blue-500 text-white animate-pulse'
      case 'synced':
        return 'bg-success text-primary font-bold'
      case 'error':
        return 'bg-error text-white'
      default:
        return 'bg-gray-400 text-white'
    }
  }

  /**
   * Récupère le label du statut
   */
  const getStatusLabel = (status: AudioRecording['status']) => {
    switch (status) {
      case 'pending':
        return '⏳ En attente'
      case 'syncing':
        return '🔄 Synchronisation...'
      case 'synced':
        return '✅ Synchronisé'
      case 'error':
        return '❌ Erreur'
      default:
        return status
    }
  }

  /**
   * Lit l'enregistrement audio
   */
  const handlePlay = (recording: AudioRecording) => {
    const url = URL.createObjectURL(recording.blob)
    const audio = new Audio(url)

    // Arrêter la lecture précédente
    if (playingId && playingId !== recording.id) {
      const previousAudio = document.querySelector(`audio[data-id="${playingId}"]`) as HTMLAudioElement
      if (previousAudio) {
        previousAudio.pause()
      }
    }

    audio.play()
    setPlayingId(recording.id)

    audio.addEventListener('ended', () => {
      setPlayingId(null)
      URL.revokeObjectURL(url)
    })
  }

  /**
   * Télécharge l'enregistrement
   */
  const handleDownload = (recording: AudioRecording) => {
    const url = URL.createObjectURL(recording.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audio-${new Date(recording.createdAt).getTime()}.${recording.mimeType.split('/')[1] || 'webm'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Supprime un enregistrement
   */
  const handleDelete = async (id: string) => {
    try {
      await deleteRecording(id)
      setRecordings(prev => prev.filter(r => r.id !== id))
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  /**
   * Copie le texte dans le presse-papiers
   */
  const handleCopy = async (text: string, recordingId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(recordingId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Erreur lors de la copie:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-success"></div>
        <span className="ml-4 text-gray-400">Chargement des enregistrements...</span>
      </div>
    )
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎙️</div>
        <h3 className="text-xl font-bold text-gray-300 mb-2">Aucun enregistrement</h3>
        <p className="text-gray-400">
          Commencez par enregistrer du contenu audio avec le bouton ci-dessus.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recordings.map((recording) => (
        <div
          key={recording.id}
          className="bg-primary-light rounded-lg border border-accent/30 hover:border-accent/50 transition-all overflow-hidden"
        >
          {/* Header - Info principale */}
          <div className="p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Titre et date */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">🎙️</span>
                <div>
                  <p className="font-medium text-white truncate">
                    Enregistrement
                  </p>
                  <p className="text-sm text-gray-400">
                    📅 {formatDate(recording.createdAt)}
                  </p>
                </div>
              </div>

              {/* Durée et taille */}
              <div className="flex gap-4 text-sm text-gray-400 ml-7">
                <span>⏱️ {formatDuration(recording.duration)}</span>
                <span>💾 {(recording.blob.size / 1024).toFixed(2)} KB</span>
                <span className="text-xs text-gray-500">{recording.mimeType}</span>
              </div>
            </div>

            {/* Statut badge */}
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 ${getStatusBadgeColor(recording.status)}`}
            >
              {getStatusLabel(recording.status)}
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex gap-2 flex-wrap">
            {/* Bouton Play/Stop */}
            <button
              onClick={() => handlePlay(recording)}
              disabled={!!(playingId && playingId !== recording.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                playingId === recording.id
                  ? 'bg-error text-white'
                  : 'bg-success text-primary hover:bg-blue-400'
              } disabled:opacity-50`}
            >
              {playingId === recording.id ? '⏹️ Stop' : '▶️ Écouter'}
            </button>

            {/* Bouton Télécharger */}
            <button
              onClick={() => handleDownload(recording)}
              className="px-4 py-2 rounded-lg font-medium bg-accent hover:bg-accent/80 text-white transition-colors"
            >
              ⬇️ Télécharger
            </button>

            {/* Bouton Supprimer */}
            <button
              onClick={() => handleDelete(recording.id)}
              className="px-4 py-2 rounded-lg font-medium bg-error/20 hover:bg-error text-error hover:text-white transition-colors"
            >
              🗑️ Supprimer
            </button>

            {/* Bouton Accordéon si résumé disponible */}
            {recording.summary || recording.transcript ? (
              <button
                onClick={() =>
                  setExpandedId(expandedId === recording.id ? null : recording.id)
                }
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  expandedId === recording.id
                    ? 'bg-primary border border-success text-success'
                    : 'bg-accent/20 text-accent hover:bg-accent/30'
                }`}
              >
                {expandedId === recording.id ? '▼ Détails' : '▶ Détails'}
              </button>
            ) : null}
          </div>

          {/* Accordéon - Résumé et Transcription */}
          {expandedId === recording.id && (recording.summary || recording.transcript) && (
            <div className="px-4 pb-4 border-t border-accent/20 pt-4">
              {/* Onglets */}
              <div className="flex gap-2 mb-4 border-b border-accent/20">
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`px-3 py-2 font-medium text-sm transition-colors ${
                    activeTab === 'transcript'
                      ? 'text-success border-b-2 border-success'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  📄 Transcription
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-2 font-medium text-sm transition-colors ${
                    activeTab === 'summary'
                      ? 'text-success border-b-2 border-success'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  📝 Résumé
                </button>
              </div>

              {/* Contenu des onglets */}
              <div className="space-y-3">
                {/* Onglet Transcription */}
                {activeTab === 'transcript' && (
                  <div>
                    {recording.transcript ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-sm text-gray-300 bg-primary/50 rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                          {recording.transcript}
                        </div>
                        <button
                          onClick={() => handleCopy(recording.transcript!, recording.id)}
                          className={`self-start px-3 py-1 rounded text-sm font-medium transition-colors ${
                            copiedId === recording.id
                              ? 'bg-success text-primary'
                              : 'bg-accent/20 text-accent hover:bg-accent/30'
                          }`}
                        >
                          {copiedId === recording.id ? '✅ Copié' : '📋 Copier'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic bg-primary/30 rounded p-3">
                        ⏳ En attente de traitement...
                      </div>
                    )}
                  </div>
                )}

                {/* Onglet Résumé */}
                {activeTab === 'summary' && (
                  <div>
                    {recording.summary ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-sm text-gray-300 bg-primary/50 rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                          {recording.summary}
                        </div>
                        <button
                          onClick={() => handleCopy(recording.summary!, recording.id)}
                          className={`self-start px-3 py-1 rounded text-sm font-medium transition-colors ${
                            copiedId === recording.id
                              ? 'bg-success text-primary'
                              : 'bg-accent/20 text-accent hover:bg-accent/30'
                          }`}
                        >
                          {copiedId === recording.id ? '✅ Copié' : '📋 Copier'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic bg-primary/30 rounded p-3">
                        ⏳ En attente de traitement...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
