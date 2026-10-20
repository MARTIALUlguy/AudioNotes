import { useState, useCallback, useRef, useEffect } from 'react'

export interface Recording {
  id: string
  blob: Blob
  mimeType: string
  createdAt: Date
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<Blob[]>([])

  /**
   * Détecte si on est sur iOS Safari
   */
  const isIOSSafari = useCallback((): boolean => {
    if (typeof navigator === 'undefined') return false
    
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
    
    return isIOS && isSafari
  }, [])

  /**
   * Récupère le type MIME approprié selon le navigateur
   */
  const getMimeType = useCallback((): string => {
    if (isIOSSafari()) {
      return 'audio/mp4'
    }
    
    // Utiliser opus pour WebM si supporté
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      return 'audio/webm;codecs=opus'
    }
    
    // Fallback
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      return 'audio/webm'
    }
    
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      return 'audio/mp4'
    }
    
    // Dernier fallback
    return 'audio/wav'
  }, [isIOSSafari])

  /**
   * Demande la permission d'accès au micro
   */
  const requestMicrophonePermission = useCallback(
    async (): Promise<MediaStream | null> => {
      try {
        setError(null)
        
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        
        return stream
      } catch (err) {
        let errorMessage = 'Erreur lors de l\'accès au microphone'
        
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            errorMessage = 'Permission d\'accès au microphone refusée. Veuillez accepter dans les paramètres du navigateur.'
          } else if (err.name === 'NotFoundError') {
            errorMessage = 'Aucun microphone trouvé sur cet appareil'
          } else if (err.name === 'NotSupportedError') {
            errorMessage = 'Votre navigateur ne supporte pas l\'enregistrement audio'
          }
        }
        
        setError(errorMessage)
        console.error('❌ Erreur microphone:', errorMessage, err)
        return null
      }
    },
    [],
  )

  /**
   * Démarre l'enregistrement audio
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      chunksRef.current = []
      setDuration(0)

      // Demander l'accès au micro
      const stream = await requestMicrophonePermission()
      if (!stream) return

      streamRef.current = stream

      // Créer le MediaRecorder
      const mimeType = getMimeType()
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      })

      mediaRecorderRef.current = mediaRecorder

      // Événement: données d'audio disponibles
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Événement: enregistrement stoppé
      mediaRecorder.onstop = () => {
        // Gestion du stop est faite dans stopRecording()
      }

      mediaRecorder.onerror = (event: Event) => {
        const errorEvent = event as any
        const errorMsg = `Erreur d'enregistrement: ${errorEvent.error || 'Erreur inconnue'}`
        setError(errorMsg)
        console.error('❌', errorMsg)
        setIsRecording(false)
      }

      // Démarrer l'enregistrement
      mediaRecorder.start()
      setIsRecording(true)

      // Mettre à jour la durée chaque seconde
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Erreur inconnue lors du démarrage'
      setError(errorMsg)
      console.error('❌ Erreur startRecording:', err)
      setIsRecording(false)
    }
  }, [requestMicrophonePermission, getMimeType])

  /**
   * Arrête l'enregistrement et retourne le blob audio
   */
  const stopRecording = useCallback(
    async (): Promise<Recording | null> => {
      try {
        setError(null)

        if (!mediaRecorderRef.current || !streamRef.current) {
          console.warn('⚠️  Aucun enregistrement en cours')
          return null
        }

        // Arrêter l'intervalle de durée
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
          durationIntervalRef.current = null
        }

        // Attendre que le mediaRecorder se ferme complètement
        return new Promise((resolve) => {
          const mediaRecorder = mediaRecorderRef.current!

          mediaRecorder.onstop = () => {
            // Créer le blob audio
            const mimeType = getMimeType()
            const blob = new Blob(chunksRef.current, { type: mimeType })

            // Arrêter tous les tracks
            streamRef.current?.getTracks().forEach((track) => {
              track.stop()
            })

            // Fermer l'audio context si créé
            if (audioContextRef.current) {
              audioContextRef.current.close()
              audioContextRef.current = null
            }

            const recording: Recording = {
              id: crypto.randomUUID(),
              blob,
              mimeType,
              createdAt: new Date(),
            }

            // Réinitialiser l'état
            setIsRecording(false)
            mediaRecorderRef.current = null
            streamRef.current = null
            chunksRef.current = []

            resolve(recording)
          }

          // Arrêter l'enregistrement
          mediaRecorder.stop()
        })
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Erreur inconnue lors de l\'arrêt'
        setError(errorMsg)
        console.error('❌ Erreur stopRecording:', err)
        setIsRecording(false)
        return null
      }
    },
    [getMimeType],
  )

  /**
   * Cleanup: arrêter les tracks et les timers
   */
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
        })
      }

      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
  }
}
