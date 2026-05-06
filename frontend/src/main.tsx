import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

async function prepare() {
  // MSW desactivado: el frontend apunta al backend real vía proxy de Vite
  // Para reactivar mocks: descomentar las líneas siguientes
  // if (import.meta.env.DEV) {
  //   const { worker } = await import('./mocks/browser')
  //   await worker.start({ onUnhandledRequest: 'bypass' })
  // }
}

prepare().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
