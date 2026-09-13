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
    turbopackFileSystemCacheForBuild: false,

    // **这条是内存的关键，别删。** Turbopack 默认（`'childProcesses'`）把 webpack
    // 形态的 loader 放进一组**独立子进程**里跑，而本站的 MDX loader 每个进程都要
    // 各持一份 shiki + twoslash + TypeScript 编译器的运行期状态 —— 进程数跟核数走，
    // 于是内存随核数线性翻倍。改 `'workerThreads'` 让它们跑在同一个进程的线程里，
    // 这些状态只留一份。
    //
    // 本机 16 核实测（twoslash 开着、缓存已提交，两次背靠背同机对比）：
    //   子进程：编译 73 s，主进程 RSS 9.24 GB，全部 node 峰值 27.1 GB
    //   线程：  编译 47 s，主进程 RSS 3.04 GB，全部 node 峰值 18.8 GB
    // 并且验证过产物没坏：页面 HTML 里有 `twoslash-popup`、没有 `---cut---` 残留。
    turbopackPluginRuntimeStrategy: 'workerThreads'
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
