<p align="center">
  <h1 align="center">@ikenxuan/amagi</h1>
</p>

<p align="center">
  抖音、B站、快手和小红书 Web 端数据接口的强大 Node.js 封装
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

`@ikenxuan/amagi` 是一个独立发布的多平台 Node.js 数据获取 SDK，同时也内置了 HTTP 服务器功能。它为应用提供稳定、类型安全且经过严格参数校验的统一数据接口。

## 特性

- **多平台支持**：深度封装抖音、B站、快手、小红书等平台的主流核心数据接口。
- **双模式调用**：既可以作为 Node.js SDK 在代码中直接调用，也可以一键启动本地 HTTP 服务供跨语言/跨进程使用。
- **类型安全**：采用 TypeScript 编写，提供完善的参数与响应类型定义。
- **参数校验**：底层基于 Zod 进行严格的入参和返回值校验，确保数据格式统一可靠。
- **事件驱动**：内置全新的事件系统，方便上层业务进行灵活的日志记录、拦截与运行监控。
- **双模块输出**：完美兼容 CommonJS (CJS) 与 ECMAScript Modules (ESM) 生态。

## 安装

推荐使用 `pnpm` 进行安装：

```bash
pnpm add @ikenxuan/amagi
```

<details>
<summary>使用其他包管理器</summary>

```bash
# npm
npm install @ikenxuan/amagi

# yarn
yarn add @ikenxuan/amagi
```

</details>

## 快速开始

### 作为 SDK 调用

直接在 Node.js 环境中引入并初始化 Amagi：

```typescript
import amagi from '@ikenxuan/amagi'

// 1. 初始化客户端并配置相关平台的 Cookies
const client = amagi({
  cookies: {
    bilibili: 'SESSDATA=xxx; ...',
    douyin: 'ttwid=...; ...',
    // xiaohongshu: '...',
    // kuaishou: '...'
  }
})

// 2. 调用平台专属接口获取数据
async function fetchVideo() {
  const video = await client.bilibili.fetcher.fetchVideoInfo({
    bvid: 'BV1xx411c7mD'
  })
  console.log(video)
}

fetchVideo()
```

### 启动 HTTP 服务

如果希望通过 HTTP API 的形式提供服务（例如给其他非 Node.js 应用调用）：

```typescript
import amagi from '@ikenxuan/amagi'

const client = amagi({
  // 配置项...
})

// 一键启动 HTTP 服务器
client.startServer(4567) 
// 服务将运行在 http://localhost:4567
```

## 文档资源

更详细的接口说明和高级用法，请参阅在线文档：

- [完整文档](https://amagi-docs.vercel.app)
- [快速上手](https://amagi-docs.vercel.app/docs/usage/getting-started)
- [Apifox 接口参考](https://amagi.apifox.cn)

## 参与贡献

本项目虽然是独立发布的 SDK，但目前的开发进度与维护重心主要受 `karin-plugin-kkk` 插件的业务需求驱动。当该插件出现新业务需要而本接口库尚未封装时，我才会对接口库进行针对性的更新和逻辑封装。目前插件侧的核心业务逻辑已基本完成，因此接口库的主动迭代会相对放缓。

如果你（作为下游开发者）需要封装其他未支持的接口或业务逻辑，你可以选择：
1. **自己 Fork 本项目**进行修改和定制。
2. 阅读 [开发与贡献文档](https://amagi-docs.vercel.app/docs/dev) 后，向本项目提交 Pull Request 共同完善接口生态。

非常欢迎提交 Issue 或 Pull Request！

## 许可证

本项目基于 [GPL-3.0](LICENSE) 协议开源。
