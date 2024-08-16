# amagi（泥干嘛哈哈

* 热门平台视频解析 API 基于 Node.js 的实现，支持最低node版本为 v16
* 抖音、B站

![amagi](https://socialify.git.ci/ikenxuan/amagi/image?font=Source%20Code%20Pro&forks=1&issues=1&language=1&name=1&owner=1&pattern=Floating%20Cogs&pulls=1&stargazers=1&theme=Auto)



## 使用
```
pnpm add @ikenxuan/amagi
```
## 快速上手
```js
import amagi, { StartClient } from '@ikenxuan/amagi'

// 初始化 amagi 实例，传入 ck
const Client = await new amagi({
  douyin: '抖音ck',
  bilibili: 'B站ck'
}).initServer(true) // 是否开启调试模式

// 调用 StartClient 方法，可在本地部署一个 api 接口的 http 服务
await StartClient(Client.Instance, 4567)
```

* 如果你想直接获取数据
```js
import { GetDouyinData, GetBilibiliData  } from '@ikenxuan/amagi'

const douyinck = '你的抖音ck'
const bilibilick = '你的B站ck'

const Douyin = await GetDouyinData('单个视频作品数据', douyinck, { url: 'https://v.douyin.com/irHntHL7' })

const Bilibili = await GetBilibiliData('单个视频作品数据', bilibilick, { url: 'https://www.bilibili.com/video/BV13S42197ja' })
```
type 参数详见 [**API数据类型枚举**](./src/types/DataType.ts)

result 方法传递对象的参数详见 [**抖音接口请求参数类型**](./src/types/DouyinAPIParams.ts)、[**B站接口请求参数类型**](./src/types/BilibiliAPIParams.ts) 

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
该项目代码从 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 提取修改并发布

<h2>未经同意，禁止将本项目的开源代码用于任何商业目的。因使用本项目产生的一切问题与后果由使用者自行承担，项目开发者不承担任何责任</h2>