import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GameSessionProvider } from './context/GameSessionContext.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameSessionProvider>
      <App />
    </GameSessionProvider>
  </StrictMode>,
)
export {}
