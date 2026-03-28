import { consola } from 'consola'
if (import.meta.env.DEV) {
  consola.level = 4
}
consola.wrapAll()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@/components/ui/tooltip'
import './assets/base.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <TooltipProvider delay={0}>
        <p>hello world</p>
      </TooltipProvider>
  </StrictMode>
)
