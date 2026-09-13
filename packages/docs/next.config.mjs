import { codeInspectorPlugin } from 'code-inspector-plugin'
import { createMDX } from 'fumadocs-mdx/next'

// 站点位置（前缀 / 对外地址）的唯一事实源，见那个文件的注释：
// 应用代码不能反过来 import 这个配置文件，否则 esbuild 的二进制会被打进客户端包。
import { BASE_PATH } from './site.config.mjs'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,

  // ── 静态导出（GitHub Pages 只发静态文件）────────────────────────────
  //
  // `output: 'export'` 之后这些**都不能用**，所以下面几件事在别处解决：
  //   - `redirects()` → 导出后由 `scripts/post-export.mjs` 生成 meta-refresh 页
  //   - `rewrites()`  → 同上，`/docs/x.mdx` 由复制 `llms.mdx/docs/**` 得到
  //   - `middleware`（`proxy.ts`）→ 删掉，`Accept` 内容协商在静态站上没有承载点
  //   - 任何 `export const prerender = false` 的路由 → `/api/mcp` 已挪成独立脚本
  output: 'export',
  basePath: BASE_PATH,
  // **刻意不开 `trailingSlash`。** 开了会让每个路由产出 `<name>/index.html`，
  // 于是 `/llms.mdx/docs/v6/changelog` 要同时当**文件**（那一页的 markdown）
  // 和**目录**（它下面的 `6.1.3` / `6.2.0` 等子页），导出时直接
  // `EPERM: copyfile ... -> out/llms.mdx/docs/v6/changelog`（实测）。
  // 不开的话 Next 产出 `changelog.html` + `changelog/6.1.3.html`，两者不撞；
  // GitHub Pages 本来就把 `/x` 解析到 `x.html`，不需要额外的目录索引。
  // 静态导出下 Next 的图片优化服务不存在，必须关掉
  images: { unoptimized: true },

  experimental: {
    // 静态生成与页面数据收集的并发 worker 数。默认值跟核数走（本机 16 核 → 15）。
    // 钉成 2 是给 CI 留余量：公开仓库的 `ubuntu-latest` 是 4 vCPU / 16 GiB，
    // 而 `pnpm build:docs` 在那上面撞过 OOM —— 日志里是编译阶段跑到 151 秒时
    // `Process completed with exit code 143`（SIGTERM，被内核回收）。
    cpus: 2,

    // Turbopack 16.3 起默认在**构建期**就建一套 SST 持久缓存，写在 `.next/cache`。
    // CI 的 runner 不会把 `.next/cache` 带过来，本地也没人指望它 —— 建它是纯付出。
    turbopackFileSystemCacheForBuild: false

    // **`turbopackPluginRuntimeStrategy: 'workerThreads'` 试过，已撤。**
    // 它确实省内存（本机 16 核：主进程 RSS 9.24 → 3.04 GB，全部 node 峰值
    // 27.1 → 18.8 GB，编译 73 → 47 s），但**会死锁**：本地跑了 5 次挂了 3 次，
    // 卡在 `Creating an optimized production build` 一动不动（20 秒内 CPU 时间
    // 零增长），只能 Ctrl-C。挂的那三次里有两次是完整的 `build:docs`、一次是
    // 单独 `next build`；两次成功**都带着 `--experimental-debug-memory-usage`**
    // —— 那个旗标会插进内存报告与快照机制，调度不一样。
    //
    // 一个偶发挂起比 OOM 更糟：OOM 至少留一行 exit code，挂起只会烧满超时。
    // 所以宁可慢（本机编译 109 s vs 47 s）也不要它。真要再试，先确认
    // 「连续 10 次 `pnpm build:docs` 都过」再谈。
  },
  serverExternalPackages: ['typescript', 'twoslash'],

  // 从前这里有 `redirects()`（5 条分版兜底）与 `rewrites()`（`/docs/*.mdx` → markdown 路由）。
  // **静态导出两者都不支持** —— Next 直接报错，GitHub Pages 也没有服务端重写。
  // 那两件事现在都由导出后脚本干，数据与理由都在 `scripts/post-export.mjs`：
  //   - 旧链接 → 生成带 `<meta http-equiv="refresh">` 的静态页
  //   - `/docs/*.mdx` → 把 `llms.mdx/docs/**` 的产物复制一份到那个地址下

  turbopack: {
    rules: codeInspectorPlugin({
      bundler: 'turbopack',
      showSwitch: true
    })
  }
}

export default withMDX(config)
