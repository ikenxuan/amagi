# amagi
* **_~~抖音（坏掉了）~~、B站本地视频解析 API 基于 Node.js 的实现，支持最低node版本为v16_**

## 环境
> [Node.js](https://nodejs.org) **必要**

> [git](https://git-scm.com) _可选_

> [pnpm](https://pnpm.io) _可选_

## 使用
> [!IMPORTANT]
> Node.js版本约定为：
> Node.js => v16.20.2

### 直接使用
前往 [releases 页面](https://github.com/ikenxuan/amagi/releases) 找到最新版本的压缩文件（zip格式）下载

解压后打开 `config/config.yaml` 根据提示填写cookies

**根目录打开终端运行**

* 安装pnpm，已安装可跳过
```
npm install -g pnpm
```
* 安装依赖
```
pnpm install
```
* 启动
```
pnpm app
```

### 外部调用
**快速上手:**
```js
import { StartClient, CreateNewClient, AddRoute } from './index.js';

const main = async () => {
    let client = CreateNewClient({ log: true });
    const handler = (_request, reply) => {
        reply.send({ hello: 'hello, world!' });
    };
    const routeArray = [
        { method: 'GET', url: '/1', handler, },
        { method: 'GET', url: '/2', handler, },
        { method: 'GET', url: '/3', handler, },
        { method: 'GET', url: '/4', handler }
    ];
    client = AddRoute(client, routeArray);
    return await StartClient(client, { port: 4567 });
};

await main()
```
## 开发构建
> [!IMPORTANT]
> Node.js版本约定为：
> v18.20.4 <= Node.js  <= v22.x.x
* 克隆仓库
```
git clone git@github.com:ikenxuan/amagi.git
```
* 安装依赖
```
pnpm install
```
* 运行
```
pnpm dev
```

## 其他
该项目代码从 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 中提取修改并发布

**未经同意，禁止将本项目的开源代码用于任何商业目的。因使用本项目产生的一切问题与后果由使用者自行承担，项目开发者不承担任何责任**