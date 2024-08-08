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

// 初始化
const client = await new amagi({
  douyin: '抖音ck',
  bilibili: 'B站ck'
}).initServer(true) // 是否开启调试模式

// 启动监听
await StartClient(client, { port: 4567 })
```
## 开发构建
> Node.js版本 <= v18.20.4

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