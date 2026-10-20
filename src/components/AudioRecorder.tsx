import { useState } from 'react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import type { Recording } from '../hooks/useAudioRecorder'

export interface AudioRecorderProps {
  onRecordingComplete: (recording: Recording) => void | Promise<void>
  disabled?: boolean
}

export function AudioRecorder({
  onRecordingComplete,
  disabled = false,
}: AudioRecorderProps) {
  const { isRecording, duration, error, startRecording, stopRecording } =
    useAudioRecorder()
  const [hasPermissionError, setHasPermissionError] = useState(false)

  /**
   * Formate la durée en MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  /**
   * Gère le clic sur le bouton
   */
  const handleToggleRecording = async () => {
    if (isRecording) {
      // Arrêter l'enregistrement
      const recording = await stopRecording()
      if (recording) {
        setHasPermissionError(false)
        await onRecordingComplete(recording)
      }
    } else {
      // Démarrer l'enregistrement
      setHasPermissionError(false)
      await startRecording()
    }
  }

  // Vérifier s'il y a une erreur de permission
  if (error && error.includes('permission') && !hasPermissionError) {
    setHasPermissionError(true)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Bouton d'enregistrement */}
      <button
        onClick={handleToggleRecording}
        disabled={hasPermissionError || disabled}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center
          font-bold text-lg transition-all duration-200
          ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50'
              : 'bg-success hover:bg-blue-400 text-primary-dark shadow-lg shadow-success/50'
          }
          ${hasPermissionError || disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        `}
        title={isRecording ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement'}
      >
        {/* Indicateur visuel point rouge */}
        {isRecording && (
          <div
            className="absolute inset-0 rounded-full bg-red-500 animate-record-pulse"
            aria-hidden="true"
          />
        )}

        {/* Icône microphone */}
        <div className="relative z-10">
          {isRecording ? (
            // Icône arrêt (carré)
            <svg
              className="w-10 h-10"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="6" y="6" width="12" height="12" />
            </svg>
          ) : (
            // Icône microphone
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4"
              />
            </svg>
          )}
        </div>
      </button>

      {/* Affichage de la durée */}
      {isRecording && (
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-success tracking-wider">
            {formatDuration(duration)}
          </div>
          <div className="mt-2 text-sm text-gray-400">
            Enregistrement en cours...
          </div>
        </div>
      )}

      {/* Message d'erreur de permission */}
      {hasPermissionError && (
        <div className="w-full max-w-sm bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 flex items-center pt-0.5">
              <svg
                className="w-5 h-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-200">
                {error || 'Permission d\'accès au microphone refusée'}
              </p>
              <p className="mt-1 text-xs text-red-300">
                Veuillez accepter l'accès au microphone dans les paramètres de votre navigateur.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info état */}
      {!isRecording && !hasPermissionError && (
        <div className="text-center text-gray-400 text-sm">
          <p>Cliquez pour commencer l'enregistrement</p>
        </div>
      )}
    </div>
  )
}
