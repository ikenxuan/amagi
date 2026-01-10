<p align="center">
  <h1 align="center">@ikenxuan/amagi</h1>
</p>

<p align="center">
  抖音、B站、快手、小红书 Web 端数据接口的 Node.js 封装
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ikenxuan/amagi"><img src="https://img.shields.io/npm/v/@ikenxuan/amagi?style=flat-square&color=black" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ikenxuan/amagi"><img src="https://img.shields.io/npm/dm/@ikenxuan/amagi?style=flat-square&color=black" alt="npm downloads" /></a>
  <a href="https://github.com/ikenxuan/amagi/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ikenxuan/amagi?style=flat-square&color=black" alt="license" /></a>
</p>

<p align="center">
  <a href="https://amagi-docs.vercel.app">文档</a> · 
  <a href="https://amagi.apifox.cn">API 参考</a> · 
  <a href="https://github.com/ikenxuan/amagi/issues">反馈问题</a>
</p>

---

## 特性

- **多平台支持** — 抖音、B站、快手、小红书的主流数据接口
- **双模式调用** — SDK 直接调用或启动本地 HTTP 服务
- **类型安全** — 完整的 TypeScript 类型定义，支持 strict 模式
- **参数校验** — 基于 Zod 的严格参数验证，统一响应格式
- **事件驱动** — v6 全新事件系统，灵活的日志与监控
- **双模块输出** — 同时支持 ESM 与 CJS

## 快速开始

```bash
pnpm install @ikenxuan/amagi
```

```ts
import amagi from '@ikenxuan/amagi'

const client = amagi({
  cookies: {
    bilibili: 'SESSDATA=xxx; ...',
    douyin: 'ttwid=...; ...',
  }
})

// SDK 调用
const video = await client.bilibili.fetcher.fetchVideoInfo({
  bvid: 'BV1xx411c7mD'
})

// 或启动 HTTP 服务
client.startServer(4567)
```

## 文档

访问 [amagi-docs.vercel.app](https://amagi-docs.vercel.app) 查看完整文档。

- [安装指南](https://amagi-docs.vercel.app/docs/usage/installation)
- [快速上手](https://amagi-docs.vercel.app/docs/usage/getting-started)
- [API 参考](https://amagi-docs.vercel.app/docs/usage/api/bilibili)
- [v6 迁移指南](https://amagi-docs.vercel.app/docs/usage/migration-v6)

## 贡献

欢迎提交 Issue 和 Pull Request。详见 [开发文档](https://amagi-docs.vercel.app/docs/dev)。

## 许可证

[GPL-3.0](LICENSE)
