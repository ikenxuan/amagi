import { createMDX } from 'fumadocs-mdx/next';
import { codeInspectorPlugin } from 'code-inspector-plugin';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  serverExternalPackages: ['typescript', 'twoslash'],
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
    ];
  },
  turbopack: {
    rules: codeInspectorPlugin({
      bundler: 'turbopack',
      showSwitch: true
    }),
  },
};

export default withMDX(config);
