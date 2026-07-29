import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// SEED Design foundations (design tokens) + only the recipes we actually use.
// base.css defines `--seed-*` tokens under `data-seed-color-mode`; it ships no
// global element reset, so it coexists with FitLog's existing dark theme.
import '@seed-design/css/base.css'
import '@seed-design/css/recipes/action-button.css'
// Re-map SEED brand role tokens to FitLog's lime; must load after base.css.
import './styles/seed-theme.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
