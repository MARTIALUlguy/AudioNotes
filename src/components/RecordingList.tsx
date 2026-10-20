import { useEffect, useRef, useState } from 'react'
import {
  deleteRecording,
  getAllRecordings,
  type AudioRecording,
} from '../db/audioDb'

interface RecordingListProps {
  onRetry: (recording: AudioRecording) => void
  retryingId: string | null
}

export function RecordingList({ onRetry, retryingId }: RecordingListProps) {
  const [recordings, setRecordings] = useState<AudioRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true

    getAllRecordings()
      .then((data) => {
        if (active) setRecordings(data)
      })
      .catch((cause) => {
        console.error('Erreur lors du chargement des enregistrements :', cause)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      audioRef.current?.pause()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  const handlePlay = async (recording: AudioRecording) => {
    if (playingId === recording.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    audioRef.current?.pause()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)

    const url = URL.createObjectURL(recording.blob)
    const audio = new Audio(url)
    audioRef.current = audio
    audioUrlRef.current = url
    audio.addEventListener('ended', () => {
      setPlayingId(null)
      URL.revokeObjectURL(url)
      audioUrlRef.current = null
    }, { once: true })

    try {
      await audio.play()
      setPlayingId(recording.id)
    } catch (cause) {
      URL.revokeObjectURL(url)
      audioUrlRef.current = null
      console.error('Erreur lors de la lecture audio :', cause)
    }
  }

  const handleDownload = (recording: AudioRecording) => {
    const url = URL.createObjectURL(recording.blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `audio-${recording.createdAt.getTime()}.${recording.mimeType.includes('mp4') ? 'mp4' : 'webm'}`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRecording(id)
      if (playingId === id) {
        audioRef.current?.pause()
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = null
        setPlayingId(null)
      }
      setRecordings((current) => current.filter((recording) => recording.id !== id))
    } catch (cause) {
      console.error('Erreur lors de la suppression :', cause)
    }
  }

  const handleCopy = async (text: string, recordingId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(recordingId)
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch (cause) {
      console.error('Erreur lors de la copie :', cause)
    }
  }

  const formatDuration = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  const statusLabel: Record<AudioRecording['status'], string> = {
    pending: 'À transcrire',
    syncing: 'Transcription en cours',
    synced: 'Transcrit',
    error: 'À réessayer',
  }

  const statusStyle: Record<AudioRecording['status'], string> = {
    pending: 'bg-gray-500 text-white',
    syncing: 'bg-blue-500 text-white animate-pulse',
    synced: 'bg-success text-primary font-bold',
    error: 'bg-error text-white',
  }

  if (loading) {
    return <p className="py-8 text-center text-gray-400">Chargement des enregistrements…</p>
  }

  if (recordings.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-4xl mb-3" aria-hidden="true">🎙️</p>
        <p className="font-semibold text-gray-300">Aucun enregistrement</p>
        <p className="text-sm text-gray-400 mt-1">Tes audios apparaîtront ici.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recordings.map((recording) => (
        <article
          key={recording.id}
          className="bg-primary-light rounded-lg border border-accent/30 overflow-hidden"
        >
          <div className="p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-white">🎙️ Enregistrement</p>
              <p className="text-sm text-gray-400 mt-1">
                {recording.createdAt.toLocaleString('fr-FR')}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {formatDuration(recording.duration)} · {(recording.blob.size / 1024).toFixed(0)} Ko
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusStyle[recording.status]}`}>
              {statusLabel[recording.status]}
            </span>
          </div>

          <div className="px-4 pb-4 flex flex-wrap gap-2">
            <button
              onClick={() => void handlePlay(recording)}
              className="px-3 py-2 rounded-lg bg-success text-primary text-sm font-medium"
            >
              {playingId === recording.id ? '⏹️ Arrêter' : '▶️ Écouter'}
            </button>
            <button
              onClick={() => handleDownload(recording)}
              className="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium"
            >
              Télécharger
            </button>
            {recording.status !== 'synced' && (
              <button
                onClick={() => onRetry(recording)}
                disabled={!navigator.onLine || retryingId !== null}
                className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {retryingId === recording.id ? 'Transcription…' : 'Relancer'}
              </button>
            )}
            {recording.transcript && (
              <button
                onClick={() => setExpandedId(expandedId === recording.id ? null : recording.id)}
                className="px-3 py-2 rounded-lg bg-accent/20 text-accent text-sm font-medium"
              >
                {expandedId === recording.id ? 'Masquer le texte' : 'Voir le texte'}
              </button>
            )}
            <button
              onClick={() => void handleDelete(recording.id)}
              className="px-3 py-2 rounded-lg bg-error/20 text-error text-sm font-medium"
            >
              Supprimer
            </button>
          </div>

          {expandedId === recording.id && recording.transcript && (
            <div className="px-4 pb-4 border-t border-accent/20 pt-4">
              <p className="text-sm text-gray-200 bg-primary/50 rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                {recording.transcript}
              </p>
              <button
                onClick={() => void handleCopy(recording.transcript!, recording.id)}
                className="mt-2 px-3 py-1 rounded bg-accent/20 text-accent text-sm"
              >
                {copiedId === recording.id ? 'Copié' : 'Copier la transcription'}
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
