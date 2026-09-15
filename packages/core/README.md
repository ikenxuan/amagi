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
  <a href="https://ikenxuan.github.io/amagi/docs/v7/usage">文档</a> · 
  <a href="https://amagi.apifox.cn">API 参考</a> · 
  <a href="https://github.com/ikenxuan/amagi/issues">反馈问题</a>
</p>

---

> **v7 处于 beta。** npm 的 `latest` 仍是 6.x 稳定线，装 v7 要带标签：
> `pnpm add @ikenxuan/amagi@beta`。从 v6 升级请看[迁移指南](https://ikenxuan.github.io/amagi/docs/v7/usage/migration-v7)。

`@ikenxuan/amagi` 是一个独立发布的多平台 Node.js 数据获取 SDK，同时也内置了 HTTP 服务器功能。它为应用提供稳定、类型安全且经过严格参数校验的统一数据接口。

## 特性

- **多平台支持**：深度封装抖音、B站、快手、小红书等平台的主流核心数据接口。
- **双模式调用**：既可以作为 Node.js SDK 在代码中直接调用，也可以一键启动本地 HTTP 服务供跨语言/跨进程使用。
- **统一响应**：所有平台、所有调用返回同一个 `AmagiResult<T>` 判别联合 —— `success` 是唯一判别键，成功读 `data`、失败读 `error`，**顶层没有 `code`**（HTTP 状态在 `error.http.status`，平台原始码在 `error.platform.code`）。
- **参数校验**：底层基于 Zod，参数表由端点声明推导；校验失败返回失败信封，不抛异常。
- **事件与可观测**：每个实例自带一条事件总线（15 个事件），每次调用的 `meta` 带 `requestId`、耗时、重试与翻页的账本。
- **类型安全**：响应类型由真实响应样本派生，字段级精确；平台新增字段不算破坏性变更。
- **签名可验证**：抖音签名的解码与校验工具单独出一个入口 `@ikenxuan/amagi/signing`（纯函数，浏览器里也能跑），用来确认签名实现没有过期。
- **双模块输出**：同时支持 ESM 与 CJS。

## 安装

推荐使用 `pnpm`：

```bash
pnpm add @ikenxuan/amagi@beta
```

<details>
<summary>其他包管理器 / 安装稳定版</summary>

```bash
# 其他包管理器（同样是 v7 beta）
npm install @ikenxuan/amagi@beta
yarn add @ikenxuan/amagi@beta

# 稳定线（6.x）
pnpm add @ikenxuan/amagi
```

</details>

## 快速开始

### 作为 SDK 调用

```typescript
import amagi from '@ikenxuan/amagi'

// 1. 初始化客户端并配置各平台的 Cookies
const client = amagi({
  cookies: {
    bilibili: 'SESSDATA=xxx; bili_jct=yyy',
    douyin: 'ttwid=...'
    // kuaishou / xiaohongshu 同理
  }
})

// 2. 调用平台接口，按统一信封读结果
const video = await client.bilibili.fetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' })

if (video.success) {
  console.log(video.data) // 收窄后是端点声明里那个精确类型
} else {
  console.error(video.error.kind, video.error.message) // 失败分支只有 error
}
```

不想建实例时用静态 fetcher，Cookie 按次传：

```typescript
const video = await amagi.bilibiliFetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' }, 'SESSDATA=xxx')
```

监听调用（实例总线，负载恒带 `meta`）：

```typescript
client.on('api:success', (d) => {
  console.log(`[${d.meta.platform}] ${d.meta.endpoint} 耗时 ${d.meta.durationMs}ms`)
})
```

### 启动 HTTP 服务

```typescript
import amagi from '@ikenxuan/amagi'

const client = amagi({ cookies: { bilibili: 'SESSDATA=xxx' } })

client.startServer(4567)

// GET http://localhost:4567/api/bilibili/fetch_one_video?bvid=BV1xx411c7mD
// 路由一览与在线调试：https://amagi.apifox.cn
```

### 只想要签名工具

```typescript
import { decodeUrl, diagnoseSalt } from '@ikenxuan/amagi/signing'
```

## 文档资源

更详细的接口说明和高级用法，请参阅在线文档：

- [完整文档](https://ikenxuan.github.io/amagi/docs/v7/usage)
- [快速上手](https://ikenxuan.github.io/amagi/docs/v7/usage/getting-started)
- [v6 → v7 迁移指南](https://ikenxuan.github.io/amagi/docs/v7/usage/migration-v7)
- [开发与贡献文档](https://ikenxuan.github.io/amagi/docs/v7/dev)
- [Apifox 接口参考](https://amagi.apifox.cn)

## 参与贡献

本项目虽然是独立发布的 SDK，但目前的开发进度与维护重心主要受 `karin-plugin-kkk` 插件的业务需求驱动。当该插件出现新业务需要而本接口库尚未封装时，我才会对接口库进行针对性的更新和逻辑封装。目前插件侧的核心业务逻辑已基本完成，因此接口库的主动迭代会相对放缓。

如果你（作为下游开发者）需要封装其他未支持的接口或业务逻辑，你可以选择：

1. **自己 Fork 本项目**进行修改和定制。
2. 阅读 [开发与贡献文档](https://ikenxuan.github.io/amagi/docs/v7/dev) 后，向本项目提交 Pull Request 共同完善接口生态。

非常欢迎提交 Issue 或 Pull Request！

## 许可证

本项目基于 [GPL-3.0](LICENSE) 协议开源。
