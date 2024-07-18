# 某音本地数据接口的 TypeScript 实现

## 环境
> [git](https://git-scm.com) **必要**

> [node.js => v16](https://nodejs.org) **必要**

> [pnpm](https://pnpm.io) _可选_

## 使用
前往 [releases 页面](https://github.com/ikenxuan/amagi/releases) 找到最新版本的压缩文件（zip格式）下载
解压后打开 `config/config.yaml` 填写ck的值为你的抖音web端cookie
**根目录打开终端运行**


* 安装pnpm，已安装可跳过
```
npm install -g pnpm
```
* 安装依赖
```
pnpm install -P
```
* 启动
```
pnpm app
```

## 开发构建

* 克隆仓库
```
git clone git@github.com:ikenxuan/amagi.git
```
* 编译源码
```
pnpm build
```
* 运行
```
pnpm app
```