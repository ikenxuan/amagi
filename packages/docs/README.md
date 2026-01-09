# @ikenxuan/amagi 文档站点

基于 [Fumadocs](https://fumadocs.dev) 构建的 amagi 文档站点。

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 预览文档。

## 构建

```bash
pnpm build
```

## 文档结构

```
content/docs/
├── index.mdx           # 首页
├── installation.mdx    # 安装指南
├── getting-started.mdx # 快速开始
├── guide/              # 使用指南
│   ├── sdk.mdx         # SDK 使用
│   ├── http-server.mdx # HTTP 服务
│   ├── events.mdx      # 事件系统
│   ├── type-mode.mdx   # 类型模式
│   └── utilities.mdx   # 工具集
├── api/                # API 参考
│   ├── bilibili.mdx    # B站 API
│   ├── douyin.mdx      # 抖音 API
│   ├── kuaishou.mdx    # 快手 API
│   └── xiaohongshu.mdx # 小红书 API
├── development/        # 开发文档
│   ├── architecture.mdx # 架构设计
│   ├── contributing.mdx # 贡献指南
│   ├── building.mdx     # 构建指南
│   └── testing.mdx      # 测试指南
├── migration-v6.mdx    # v6 迁移指南
└── changelog.mdx       # 更新日志
```

## 添加新文档

1. 在 `content/docs/` 下创建 `.mdx` 文件
2. 添加 frontmatter：

```mdx
---
title: 文档标题
description: 文档描述
---

# 文档内容
```

3. 在对应目录的 `meta.json` 中添加页面引用

## 技术栈

- [Next.js](https://nextjs.org/) - React 框架
- [Fumadocs](https://fumadocs.dev/) - 文档框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [MDX](https://mdxjs.com/) - Markdown + JSX
