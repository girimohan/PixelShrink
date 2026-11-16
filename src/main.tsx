import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const rootElement = document.getElementById('root')!
const app = <React.StrictMode><App /></React.StrictMode>

if (import.meta.env.PROD) {
  hydrateRoot(rootElement, app)
} else {
  createRoot(rootElement).render(app)
}