import { source } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const pages = source.getPages();
  
  const index = pages.map((page) => {
    return `- [${page.data.title}](${page.url})`;
  }).join('\n');

  const content = `# Amagi 文档

Amagi 是一个多平台社交媒体 API 聚合工具，支持 Bilibili、Douyin、Kuaishou、Xiaohongshu 等平台。

## 文档索引

${index}

## 完整文档

访问 /llms-full.txt 获取所有文档的完整内容。

## 单个页面

在任何文档页面 URL 后添加 .mdx 即可获取该页面的 Markdown 内容。

例如：
- /docs/usage/getting-started.mdx
- /docs/usage/guide/sdk.mdx
- /docs/usage/api/bilibili.mdx

## 链接

- GitHub: https://github.com/ikenxuan/amagi
- 文档站点: https://amagi-docs.vercel.app
- MCP Server: https://amagi-docs.vercel.app/api/mcp
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
