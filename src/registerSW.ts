export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      if (!worker) return

      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(
            new CustomEvent('sw-update-available', { detail: registration }),
          )
        }
      })
    })
  } catch (cause) {
    console.error('Erreur lors de l’enregistrement du Service Worker :', cause)
  }
}
