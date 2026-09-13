import { codeInspectorPlugin } from 'code-inspector-plugin'
import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
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
  async redirects() {
    return [
      // 分版后的旧链接兜底：v6 / v7 双版上线前的站点内容即 v6 口径，
      // 旧 URL 一律落到 v6；/docs 根路径则引导到 v7 使用文档
      { source: '/docs', destination: '/docs/v7/usage', permanent: false },
      { source: '/docs/usage/:path*', destination: '/docs/v6/usage/:path*', permanent: false },
      { source: '/docs/dev/:path*', destination: '/docs/v6/dev/:path*', permanent: false },
      { source: '/docs/ai/:path*', destination: '/docs/v6/ai/:path*', permanent: false },
      { source: '/docs/changelog/:path*', destination: '/docs/v6/changelog/:path*', permanent: false }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*'
      }
    ]
  },
  turbopack: {
    rules: codeInspectorPlugin({
      bundler: 'turbopack',
      showSwitch: true
    })
  }
}

export default withMDX(config)
