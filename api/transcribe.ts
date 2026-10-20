import OpenAI, { toFile } from 'openai'

const MAX_AUDIO_SIZE = 4 * 1024 * 1024

function jsonResponse(body: { error: string } | { text: string }, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse({ error: 'Le service de transcription n’est pas configuré.' }, 500)
  }

  if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
    return jsonResponse({ error: 'La requête doit contenir un fichier audio.' }, 400)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return jsonResponse({ error: 'Le formulaire audio est invalide.' }, 400)
  }

  const audio = formData.get('audio')
  if (!(audio instanceof File) || audio.size === 0) {
    return jsonResponse({ error: 'Aucun fichier audio valide n’a été reçu.' }, 400)
  }

  if (audio.size > MAX_AUDIO_SIZE) {
    return jsonResponse(
      { error: 'Le fichier audio dépasse la limite de 4 Mo. Crée un nouvel enregistrement plus court.' },
      413,
    )
  }

  if (!audio.type.startsWith('audio/')) {
    return jsonResponse({ error: 'Le format du fichier doit être audio.' }, 415)
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const audioFile = await toFile(await audio.arrayBuffer(), audio.name, {
      type: audio.type.split(';')[0],
    })
    const result = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-mini-transcribe',
      language: 'fr',
    })

    return jsonResponse({ text: result.text })
  } catch (cause) {
    console.error('OpenAI transcription request failed:', cause)
    return jsonResponse(
      { error: 'La transcription a échoué. Vérifie la clé API, le quota et réessaie.' },
      502,
    )
  }
}
