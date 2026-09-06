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
  build: {
    /**
     * **Monaco 那个 chunk 不进 `<link rel="modulepreload">`。**
     *
     * 上面把它收成一个 chunk 之后出现了一个副作用：它变成了一个「被多处共享的 chunk」，
     * 于是 Vite 把它写进 `index.html` 的 preload 名单 —— 首屏集合从 645 KB 跳到 **4.9 MB**，
     * 而那份代码在人按下「发送」之前一个字节都用不到（`JsonViewer` 是懒加载的）。
     *
     * 这不只是体积判据的事：preload 的语义是「浏览器在首屏之前就去取」，
     * 而一个 4.3 MB 的 chunk 会真的跟首屏那几个文件抢带宽。
     *
     * `resolveDependencies` 是 Vite 给这件事的官方口子：它按 chunk 过滤 preload 名单，
     * **不影响真正的 `import()`** —— 点开时照样加载得到。
     */
    modulePreload: {
      resolveDependencies: (_filename, deps) => deps.filter((dep) => !/(^|\/)monaco-/.test(dep))
    },
    /*
     * **`monaco-*.css`（161 KB）仍然留在 head 里，那是刻意的。**
     *
     * 上面那条只管 `modulepreload`（JS）。懒加载 chunk 带的 CSS 由 Vite 一律提到 head 的
     * `<link rel="stylesheet">` —— 那不是 preload，也不进「入口 JS」那条预算。
     * 摘掉它的代价是 chunk 落地的那一瞬间编辑器渲成无样式（FOUC），
     * 而留着的代价是首屏多一个 161 KB 的样式表 —— 在一个本机开发工具上，后者显然更划算。
     */
    rolldownOptions: {
      output: {
        /**
         * **把 Monaco 的全部代码收进一个叫 `monaco` 的 chunk。**
         *
         * 不这么做的话它会散成 **100 多个** chunk：`editor.api`（2.6 MB）、五个 worker，
         * 外加 80 多个语言定义（`solidity` / `pgsql` / `abap` / …，各几 KB）。
         * 那些小 chunk 的名字里**没有 `monaco` 这三个字**，minify 之后内容里也没有 ——
         * 于是 CI 那条「Monaco 单列一条预算、其余守 840 KB」的判据没有任何可靠的办法
         * 把它们认出来（按文件名认漏一片，按内容 grep 也漏一片）。
         *
         * 收成一个之后，那条判据是一行 `cat dist/assets/monaco-*.js`：
         * **Monaco 的每一个字节都在里面，而其余产物里一个字节都没有。**
         * 那正是「其余」那条线仍然能拦 Node 依赖泄漏的前提（判据在
         * `.github/workflows/release.yml`，理由在 `src/components/JsonViewer.tsx` 文件头）。
         *
         * 顺带的好处：100 多个 HTTP 请求变成 1 个。代价是那个 chunk 一次全下来 ——
         * 而这是个只在本机跑的开发工具（`private: true`，永不发布），chunk 就在同一台机器上。
         *
         * **worker 不受这里影响**：Vite 的 `?worker` 走的是另一条构建管线（`build.worker`），
         * 它们仍然各自一个文件。判据那侧因此也要把 `*.worker-*.js` 一起算进 Monaco 那一条。
         */
        // `codeSplitting` 而不是 `advancedChunks`：后者在 rolldown 1.2.6 里已经 deprecated
        // （构建时会 WARN），而两者都给的话前者胜
        codeSplitting: {
          groups: [{ name: 'monaco', test: /node_modules[\\/]monaco-editor[\\/]/ }]
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${serverPort}`,
        changeOrigin: true
      }
    }
  }
})
