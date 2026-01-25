import Link from 'next/link';
import { highlight } from 'fumadocs-core/highlight';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { Popup, PopupContent, PopupTrigger } from 'fumadocs-twoslash/ui';

export default async function HomePage() {
  const codeExample = `import amagi from '@ikenxuan/amagi'

const client = amagi({
  cookies: { bilibili: '...', douyin: '...' }
})

// 获取 B站视频信息
const video = await client.bilibili.fetcher.fetchVideoInfo({
  bvid: 'BV1xx411c7mD'
})

// 启动 HTTP 服务
client.startServer(4567)`;

  const html = await highlight(codeExample, {
    lang: 'ts',
    themes: { light: 'github-light', dark: 'github-dark' },
    transformers: [transformerTwoslash({ explicitTrigger: false })],
    components: {
      Popup,
      PopupContent,
      PopupTrigger,
    },
  });
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-24 md:py-32">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-sm text-amber-600 dark:text-amber-400 mb-6">
            <span className="mr-2">⚠️</span>
            <span>v6 Alpha - 测试版文档</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-linear-to-r from-fd-foreground to-fd-muted-foreground bg-clip-text text-transparent">
              @ikenxuan/amagi
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mx-auto mb-8">
            抖音、B站、快手、小红书 Web 端数据接口的 Node.js 封装。
            <br className="hidden md:block" />
            支持 SDK 调用与 HTTP 服务两种方式。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/docs/usage"
              className="inline-flex items-center justify-center rounded-lg bg-fd-foreground px-6 py-3 text-sm font-medium text-fd-background transition-opacity hover:opacity-90"
            >
              开始使用
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="https://github.com/ikenxuan/amagi"
              className="inline-flex items-center justify-center rounded-lg border border-fd-border px-6 py-3 text-sm font-medium transition-colors hover:bg-fd-accent"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="mr-2 w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* Code Preview */}
      <section className="px-4 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-fd-border bg-fd-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-fd-border bg-fd-muted/30">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              <span className="ml-2 text-xs text-fd-muted-foreground">index.ts</span>
            </div>
            <div className="p-4 text-sm overflow-x-auto [&_pre]:bg-transparent! [&_code]:bg-transparent!">
              {html}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 border-t border-fd-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">特性</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<PlatformIcon />}
              title="多平台支持"
              description="抖音、B站、快手、小红书的主流数据接口，统一的调用方式"
            />
            <FeatureCard
              icon={<CodeIcon />}
              title="SDK + HTTP"
              description="支持 SDK 直接调用或启动本地 HTTP 服务，灵活选择"
            />
            <FeatureCard
              icon={<ShieldIcon />}
              title="参数校验"
              description="基于 Zod 的严格参数验证，统一的响应格式"
            />
            <FeatureCard
              icon={<TypeIcon />}
              title="类型安全"
              description="完整的 TypeScript 类型定义，支持 strict 模式"
            />
            <FeatureCard
              icon={<PackageIcon />}
              title="双模块输出"
              description="同时支持 ESM 与 CJS，兼容各种项目环境"
            />
            <FeatureCard
              icon={<EventIcon />}
              title="事件驱动"
              description="v6 全新事件系统，灵活的日志与监控"
            />
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="px-4 py-16 border-t border-fd-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">快速导航</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuickLink href="/docs/usage/installation" title="安装" description="快速安装 amagi" />
            <QuickLink href="/docs/usage/getting-started" title="快速上手" description="5 分钟入门指南" />
            <QuickLink href="/docs/usage/api/bilibili" title="API 参考" description="查看所有接口" />
            <QuickLink href="/docs/dev" title="开发文档" description="参与贡献" />
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="px-4 py-12 border-t border-fd-border mt-auto">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-fd-muted-foreground">
          <Link href="https://github.com/ikenxuan/amagi" className="hover:text-fd-foreground transition-colors" target="_blank">
            GitHub
          </Link>
          <Link href="https://amagi.apifox.cn" className="hover:text-fd-foreground transition-colors" target="_blank">
            API 文档
          </Link>
          <Link href="https://www.npmjs.com/package/@ikenxuan/amagi" className="hover:text-fd-foreground transition-colors" target="_blank">
            NPM
          </Link>
          <Link href="/docs/usage/changelog" className="hover:text-fd-foreground transition-colors">
            更新日志
          </Link>
        </div>
      </section>
    </main>
  );
}


// Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-fd-border p-6 transition-colors hover:bg-fd-accent/50 cursor-default">
      <div className="w-10 h-10 rounded-lg bg-fd-accent flex items-center justify-center mb-4 text-fd-foreground">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-fd-muted-foreground">{description}</p>
    </div>
  );
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-fd-border p-4 transition-colors hover:bg-fd-accent/50 cursor-pointer"
    >
      <h3 className="font-semibold mb-1 group-hover:text-fd-primary transition-colors">{title}</h3>
      <p className="text-sm text-fd-muted-foreground">{description}</p>
    </Link>
  );
}

// Icons
function PlatformIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function EventIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}
