import { codeInspectorPlugin } from 'code-inspector-plugin'
import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
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
