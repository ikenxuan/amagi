# amagi（泥干嘛哈哈

* 抖音、B站的 web 端相关数据接口基于 Node.js 的实现，支持最低node版本为 v18

![amagi](https://socialify.git.ci/ikenxuan/amagi/image?font=Source%20Code%20Pro&forks=1&issues=1&language=1&name=1&owner=1&pattern=Floating%20Cogs&pulls=1&stargazers=1&theme=Auto)


[English](./README.md)、中文、[日本語](./README-JP.md)
## 使用
```
pnpm add @ikenxuan/amagi
```
## 快速上手

**_直接获取相关数据_**
```js
import { getDouyinData, getBilibiliData  } from '@ikenxuan/amagi'

const douyinck = '你的抖音ck'
const bilibilick = '你的B站ck'

const Douyin = await getDouyinData('单个视频作品数据', douyinck, { url: 'https://v.douyin.com/irHntHL7' })

const Bilibili = await getBilibiliData('单个视频作品数据', bilibilick, { url: 'https://b23.tv/9JvEHhJ' })
```
* 参数一详见 [**API数据类型枚举**](./src/types/DataType.ts)

* 传递对象的参数详见 [**抖音接口请求参数类型**](./src/types/DouyinAPIParams.ts)、[**B站接口请求参数类型**](./src/types/BilibiliAPIParams.ts) 或参照 [**API 文档**](https://amagi.apifox.cn)

---

**_本地部署一个服务端_**
* API 文档: [**Apifox**](https://amagi.apifox.cn)

```js
import amagi, { startClient } from '@ikenxuan/amagi'

const Client = await new amagi({
  douyin: '抖音ck',
  bilibili: 'B站ck'
}).initServer(true) // 是否开启调试模式

// 启动监听 4567 端口，端口可自定义
await startClient(Client.Instance, 4567)
```

## 开发构建
> **开发环境下，支持最低node版本为 v18**

* 安装依赖
```
pnpm install
```
* 构建
```
pnpm build
```

## License
[GPL-3.0](https://github.com/ikenxuan/amagi/blob/main/LICENSE)

## 声明
本库没有后门，本库不会上传有关你的任何信息到第三方。
所配置的ck只会用于请求官方API接口

该项目代码从 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 提取修改并发布

<h2>未经同意，禁止将本项目的开源代码用于任何商业目的。因使用本项目产生的一切问题与后果由使用者自行承担，项目开发者不承担任何责任</h2>