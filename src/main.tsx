import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registrarServiceWorker } from './lib/pwa'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Depois do primeiro render: registrar o SW na subida disputa banda com o
// bundle e atrasa a primeira tela justamente no celular, que e onde o PWA
// importa.
registrarServiceWorker()
