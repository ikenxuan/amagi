import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'

import './index.css'

const root = document.getElementById('root')
if (root === null) throw new Error('#root 不在 —— index.html 被改坏了')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
