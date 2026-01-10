# @ikenxuan/amagi

[![npm version](https://img.shields.io/npm/v/@ikenxuan/amagi?style=flat-square&color=black)](https://www.npmjs.com/package/@ikenxuan/amagi)
[![npm downloads](https://img.shields.io/npm/dm/@ikenxuan/amagi?style=flat-square&color=black)](https://www.npmjs.com/package/@ikenxuan/amagi)

抖音、B站、快手、小红书 Web 端数据接口的 Node.js 封装。

## 安装

```bash
pnpm install @ikenxuan/amagi
```

## 使用

```ts
import amagi from '@ikenxuan/amagi'

const client = amagi({
  cookies: {
    bilibili: 'SESSDATA=xxx; ...',
    douyin: 'ttwid=...; ...',
    kuaishou: 'did=...; ...',
    xiaohongshu: 'a1=...; ...',
  }
})

// 获取 B站视频信息
const video = await client.bilibili.fetcher.fetchVideoInfo({
  bvid: 'BV1xx411c7mD'
})

// 启动 HTTP 服务
client.startServer(4567)
```

## 文档

- [完整文档](https://amagi-docs.vercel.app)
- [API 文档](https://amagi.apifox.cn)

## 许可证

[GPL-3.0](../../LICENSE)
