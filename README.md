# 开发中，墓前不可用
# [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 各平台接口的 TypeScript 实现

## 环境
> [Node.js](https://nodejs.org) **必要**

> [git](https://git-scm.com) _可选_

> [pnpm](https://pnpm.io) _可选_

## 使用
> [!IMPORTANT]
> Node.js版本约定为：
> Node.js > v16.20.2
前往 [releases 页面](https://github.com/ikenxuan/amagi/releases) 找到最新版本的压缩文件（zip格式）下载

解压后打开 `config/config.yaml` 填写ck的值为你的抖音web端cookie

**根目录打开终端运行**

* 安装pnpm，已安装可跳过
```
npm install -g pnpm
```
* 安装生产依赖
```
pnpm install -P
```
* 启动
```
pnpm app
```

## 开发构建
> [!IMPORTANT]
> Node.js版本约定为：
> v18.20.4 < Node.js  <= v22.x.x
* 克隆仓库
```
git clone git@github.com:ikenxuan/amagi.git
```
* 安装开发依赖
```
pnpm install
```
* 运行
```
pnpm dev
```