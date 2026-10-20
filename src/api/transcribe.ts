const MAX_AUDIO_SIZE = 4 * 1024 * 1024

export async function transcribeAudio(blob: Blob, mimeType: string): Promise<string> {
  if (blob.size > MAX_AUDIO_SIZE) {
    throw new Error('Le fichier audio dépasse la limite de 4 Mo.')
  }

  const formData = new FormData()
  const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
  formData.append('audio', blob, `recording.${extension}`)

  let response: Response
  try {
    response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error('Impossible de joindre le serveur de transcription. Vérifie ta connexion.')
  }

  const responseText = await response.text()
  let data: unknown
  try {
    data = JSON.parse(responseText)
  } catch {
    throw new Error(
      response.ok
        ? 'Le serveur a renvoyé une réponse invalide.'
        : `Erreur du serveur de transcription (HTTP ${response.status}).`,
    )
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `Erreur du serveur de transcription (HTTP ${response.status}).`
    throw new Error(message)
  }

  if (
    typeof data !== 'object' ||
    data === null ||
    !('text' in data) ||
    typeof data.text !== 'string'
  ) {
    throw new Error('Le serveur n’a pas renvoyé de transcription.')
  }

  const text = data.text.trim()
  if (!text) {
    throw new Error('Aucune parole n’a été détectée dans cet enregistrement.')
  }

  return text
}
