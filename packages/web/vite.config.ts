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
const DEFAULT_SERVER_PORT = 7345

/**
 * 代理目标端口。
 *
 * **必须能被覆盖**：`server/index.ts` 收 `--port`，而这里原先写死 7345 —— 于是
 * `pnpm console --port 7346` 会让代理打到一个没人监听的端口，界面上每个请求都
 * `Failed to fetch`，而两侧的启动日志都说自己起好了。`scripts/console.mts` 起 Vite 时
 * 把真实端口从这个环境变量传进来，两条命令单独跑时它不存在、回落到默认值。
 */
const serverPort = Number(process.env.AMAGI_CONSOLE_API_PORT ?? DEFAULT_SERVER_PORT)
if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65_535) {
  throw new Error(`AMAGI_CONSOLE_API_PORT 要是 1..65535 的整数，收到的是 ${JSON.stringify(process.env.AMAGI_CONSOLE_API_PORT)}`)
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${serverPort}`,
        changeOrigin: true
      }
    }
  }
})
