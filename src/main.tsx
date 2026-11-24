import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme, readTheme } from './prefs'
import './styles.css'

// İlk boyamadan önce tema uygulanır: kayıtlı tercih yoksa sistem teması izlenir.
applyTheme(readTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
