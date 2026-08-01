import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

const params = new URLSearchParams(window.location.search)

// Public fill mode: ?template=ID (no login needed)
// Studio mode: ?user=email (builder/admin)
const ownerEmail = params.get('user') ?? 'benterprisesusa@gmail.com'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App ownerEmail={ownerEmail} />
  </StrictMode>,
)
