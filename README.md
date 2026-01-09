# Amagi Monorepo

抖音、B站的 web 端相关数据接口基于 Node.js 的实现

## 📦 包列表

- [@ikenxuan/amagi](./packages/core) - 核心 API 包

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 构建所有包

```bash
pnpm build
```

### 开发模式

```bash
pnpm dev
```

## 📖 文档

- [核心包文档](./packages/core/README.md)
- [API 文档](https://ikenxuan.github.io/amagi/)

## 🔧 开发

### 项目结构

```
.
├── packages/
│   └── core/          # @ikenxuan/amagi 核心包
├── package.json       # 根配置
├── pnpm-workspace.yaml
└── tsconfig.json      # 根 TypeScript 配置
```

### 常用命令

```bash
# 构建所有包
pnpm build

# 构建核心包
pnpm build:core

# 开发模式
pnpm dev

# 代码检查
pnpm lint

# 修复代码风格
pnpm fix

# 生成文档
pnpm docs:build

# 启动文档服务
pnpm docs:serve

# 清理构建产物
pnpm clean
```

## 📝 License

GPL-3.0-only

## 🔗 链接

- [GitHub](https://github.com/ikenxuan/amagi)
- [Issues](https://github.com/ikenxuan/amagi/issues)
- [NPM](https://www.npmjs.com/package/@ikenxuan/amagi)
