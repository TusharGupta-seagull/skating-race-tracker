/// <reference types="vite/client" />
import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Initialize DB on startup
import './db'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
