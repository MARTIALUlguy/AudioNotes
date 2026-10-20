import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
import './App.css'
import { registerServiceWorker } from './registerSW.ts'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Enregistrer le service worker et configurer les événements
registerServiceWorker()
