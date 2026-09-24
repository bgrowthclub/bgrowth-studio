import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { TemplatesScreenDevPreview } from './TemplatesScreenDevPreview'

// Entry point for templates-preview.html only (see repo root) — completely
// separate from src/main.tsx / src/App.tsx's module graph, so this harness
// can never affect, and is never affected by, the real production bundle.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="h-screen">
      <TemplatesScreenDevPreview />
    </div>
  </StrictMode>,
)
