import { codeInspectorPlugin } from 'code-inspector-plugin'
import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: {
    // 静态生成与页面数据收集的并发 worker 数。**默认值跟核数走**（本机 16 核 →
    // 15），每个 worker 各自持有 shiki / twoslash / typescript 的运行期状态，
    // 峰值内存随之线性上涨。
    //
    // 钉成 2 是为了 CI：GitHub 托管 runner 只有 2 vCPU / 7 GiB，而 `pnpm build`
    // 曾经在那上面被杀掉（2026-09-12 那次 run 的日志：编译阶段跑到 151 秒时
    // `Process completed with exit code 143` = SIGTERM，OOM killer 干的）。
    // 本机 16 核上实测：4 个 worker 时峰值 ~12 GB（热缓存），2 个更稳；
    // 耗时只多几秒 —— 编译的瓶颈在 MDX 编译本身，不在并行度。
    cpus: 2
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
