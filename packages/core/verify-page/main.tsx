/**
 * 风控验证页入口（React）。由 `scripts/gen-verify-page.mts` 用 Vite 打成单个 IIFE + CSS，
 * 烘焙进 `src/verify/page.generated.ts`；数据由 renderVerifyPage 内联到 `window.__AMAGI_VERIFY__`。
 */
import { createRoot } from 'react-dom/client'

import type { VerifyPageData } from '../src/verify/data'
import { App } from './App'

import './page.css'

declare global {
  interface Window {
    __AMAGI_VERIFY__?: VerifyPageData
  }
}

const data = window.__AMAGI_VERIFY__
const mount = document.getElementById('app')
if (data && mount) createRoot(mount).render(<App data={data} />)
