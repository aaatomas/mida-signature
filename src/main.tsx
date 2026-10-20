import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import { SessionProvider } from './context/SessionContext'
import { LocaleProvider } from './locale'
import { ThemeModeProvider } from './themeMode'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <ThemeModeProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </ThemeModeProvider>
    </LocaleProvider>
  </StrictMode>,
)
