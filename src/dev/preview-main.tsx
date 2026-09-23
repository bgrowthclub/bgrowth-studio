import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { PrintableSummaryDevPreview } from './PrintableSummaryDevPreview'

// Entry point for dev-preview.html only (see repo root) — completely
// separate from src/main.tsx / src/App.tsx's module graph, so this harness
// can never affect, and is never affected by, the real production bundle.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrintableSummaryDevPreview />
  </StrictMode>,
)
