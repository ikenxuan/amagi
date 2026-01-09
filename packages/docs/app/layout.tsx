import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: '@ikenxuan/amagi 文档',
    template: '%s | @ikenxuan/amagi',
  },
  description: '抖音、B站、快手、小红书 Web 端相关数据接口的 Node.js 封装与服务',
  keywords: ['douyin', 'bilibili', 'kuaishou', 'xiaohongshu', 'api', 'nodejs'],
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
