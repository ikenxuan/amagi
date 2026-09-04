/**
 * `packages/web` 的浏览器侧构建。
 *
 * 三件事：React、Tailwind CSS v4（用官方 Vite 插件，v4 起不需要 PostCSS 配置也没有
 * `tailwind.config.js`），以及把 `/api/*` 代理到 Node 那半边。
 *
 * **代理是这个文件存在的关键**：前端与 server 是两个进程（`pnpm dev` 与 `pnpm server`），
 * 浏览器侧只通过 HTTP 跟 server 说话。不是洁癖 —— 前端要的三样东西（端点清单、
 * 由 zod schema 派生的表单描述、类型 diff）全部产在 Node 那侧：`zod.toJSONSchema()`
 * 要真的 zod schema 对象，`planCorpusTypes` 要真的样本，这两件在浏览器里都做不到。
 */
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Node 侧默认端口，与 `server/index.ts` 的 `DEFAULT_PORT` 一致 */
const SERVER_PORT = 7345

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${SERVER_PORT}`,
        changeOrigin: true
      }
    }
  }
})
