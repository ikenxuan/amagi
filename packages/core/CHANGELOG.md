# Changelog

## [6.2.0](https://github.com/ikenxuan/amagi/compare/v6.1.3...v6.2.0) (2026-06-30)


### ✨ 新功能

* **小红书:** 未传递用户ck或用户ck登录状态过期时使用游客ck兜底重试请求。不保证可用性 ([88b387c](https://github.com/ikenxuan/amagi/commit/88b387c47fc8b2d07433d50e088599163f8c59d8))


### 🐛 错误修复

* deps update ([45b3fb0](https://github.com/ikenxuan/amagi/commit/45b3fb024d3c43136bfbec246fc701bc0f2fe688))
* deps update ([1318462](https://github.com/ikenxuan/amagi/commit/1318462ca3bd7d3e39d98a32ebc672ca08b78812))
* update layout.shared.tsx to remove trailing commas ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* 依赖更新 ([42c294e](https://github.com/ikenxuan/amagi/commit/42c294eb72c6dee6b4aed444b11a6be818c3d5d3))
* 移出小红书ck过期自动重试逻辑，进保留获取游客ck的工具接口。 ([9187def](https://github.com/ikenxuan/amagi/commit/9187def34c419d942995ac1c85977bccdb327393))


### 🧰 其他更新

* add oxfmt and oxlint configuration files for code formatting and linting ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update cn.ts to remove unnecessary line breaks ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update mdx-components.tsx for consistent formatting ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update next.config.mjs for consistent formatting ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update package.json to set module type and update linting scripts ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update pnpm-lock.yaml to remove unused eslint dependencies ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update postcss.config.mjs for consistent formatting ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update source.config.ts for consistent formatting ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update source.ts for consistent formatting ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update tsconfig.json to simplify include patterns ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* 接口响应类型更新 ([184343c](https://github.com/ikenxuan/amagi/commit/184343c887aa5c7b70f1d48ce28e5023675d7eaf))


### ♻️ 代码重构

* remove eslint config and update linting tools ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update document-service.ts for consistent formatting ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))
* update types.ts to remove trailing semicolons ([52cf795](https://github.com/ikenxuan/amagi/commit/52cf79598bfeedae064ed4e0ed5df2868cca19a6))

## [6.1.3](https://github.com/ikenxuan/amagi/compare/v6.1.2...v6.1.3) (2026-05-11)

### 🐛 错误修复

- man! ([bc83610](https://github.com/ikenxuan/amagi/commit/bc8361057a7e0dcc851b12986c9a9cd935a8d282))
- replace removed bilibili dynamic card endpoint ([#177](https://github.com/ikenxuan/amagi/issues/177)) ([5e017f9](https://github.com/ikenxuan/amagi/commit/5e017f98ce92750e18d060d22108ea6de07f629c))
- 依赖更新 ([86d36d8](https://github.com/ikenxuan/amagi/commit/86d36d85daea6fef26a32b58aedff100f5c138e9))
- 兼容性提高 ([5d86425](https://github.com/ikenxuan/amagi/commit/5d86425e7944b3f94635da7bbe25b789191aa1e4))
- 完善部分接口响应类型 ([d7933d4](https://github.com/ikenxuan/amagi/commit/d7933d47a64007919331fedb8015cd83225b2441))

### 🧰 其他更新

- add tsdown ([9367ad1](https://github.com/ikenxuan/amagi/commit/9367ad17e7ad83b7356aeedd968c92298498a813))

### ♻️ 代码重构

- 重写接口响应类型目录结构。 ([#178](https://github.com/ikenxuan/amagi/issues/178)) ([d8d0f25](https://github.com/ikenxuan/amagi/commit/d8d0f255a58f5187c2bf8e7d22d9301855eeca1a))

## [6.1.2](https://github.com/ikenxuan/amagi/compare/v6.1.1...v6.1.2) (2026-04-08)

### 🐛 错误修复

- ci. ([8b0d550](https://github.com/ikenxuan/amagi/commit/8b0d550d8f68e3118be61a9e2887f98c9bb7816a))

## [6.1.1](https://github.com/ikenxuan/amagi/compare/v6.1.0...v6.1.1) (2026-04-08)

### 🐛 错误修复

- git 钩子 ([059a827](https://github.com/ikenxuan/amagi/commit/059a827f0a438e1cc1351d3689ec60460c0354a9))

## [6.1.0](https://github.com/ikenxuan/amagi/compare/v6.0.0...v6.1.0) (2026-04-07)

### ✨ 新功能

- kuaishou user live ([#171](https://github.com/ikenxuan/amagi/issues/171)) ([a7ed0e1](https://github.com/ikenxuan/amagi/commit/a7ed0e1fe3881a395fc22d6a4c282a6659fdd92d))
- **kuaishou:** add pure protocol signing for live_api ([#170](https://github.com/ikenxuan/amagi/issues/170)) ([4d168fa](https://github.com/ikenxuan/amagi/commit/4d168fa5c4a92cdc361e7f721b301b21b4fd56d0))

### 📝 文档更新

- README ([adb13d2](https://github.com/ikenxuan/amagi/commit/adb13d21eba1ab2f71f0f8d195e14bcd381f6f79))

## [6.0.0](https://github.com/ikenxuan/amagi/compare/v6.0.0...v6.0.0) (2026-03-11)

### ✨ 新功能

- **amagi:** refactor fetchers architecture ([#163](https://github.com/ikenxuan/amagi/issues/163)) ([be02fcf](https://github.com/ikenxuan/amagi/commit/be02fcf380a2f6080ac47a4408fb0fa0567e2e52))
- 抖音新增获取指定用户喜欢列表 ([1b0f09f](https://github.com/ikenxuan/amagi/commit/1b0f09f9080325ee8b2569aac6101423e2e9abb1))
- 抖音新增获取用户推荐列表。获取视频列表支持传递number参数以获取指定数量 ([3870cad](https://github.com/ikenxuan/amagi/commit/3870cad3711669d0679cd7b3e58f393610acfbdd))

### 🐛 错误修复

- ci ([8b0af3a](https://github.com/ikenxuan/amagi/commit/8b0af3acc83b4324ebec592353c19a23f74cd809))
- **douyin:** correct hasMore condition check for pagination ([263cc38](https://github.com/ikenxuan/amagi/commit/263cc382bfc3eeea481720daa0a998ee415d763c))
- 更新某书算法版本 ([be07393](https://github.com/ikenxuan/amagi/commit/be07393f4f267f248dec8ba409d554f6bb85b6fc))
- 细节优化 ([a7b8de2](https://github.com/ikenxuan/amagi/commit/a7b8de280eda07ca4feca7c39d438ce6e412588c))

### 📝 文档更新

- update ([f5fdc62](https://github.com/ikenxuan/amagi/commit/f5fdc62663f1a28a8f0772e2c6d3e2cff111de8d))
- update ([ee2d102](https://github.com/ikenxuan/amagi/commit/ee2d102b9105559826c1fa5ab8c711971164de77))
- update docs ([5d380cf](https://github.com/ikenxuan/amagi/commit/5d380cf77aca2f66476116a9fac26541bc46bbc0))
- update docs ([9d1d56c](https://github.com/ikenxuan/amagi/commit/9d1d56c1de20744ffa2185402955fbfc1b3517e0))

### 🧰 其他更新

- **main:** release 6.0.0 ([#166](https://github.com/ikenxuan/amagi/issues/166)) ([899f3d7](https://github.com/ikenxuan/amagi/commit/899f3d74e9011e36ad1b9c6062d11c1212fb2f63))
- **main:** release 6.0.0 ([#167](https://github.com/ikenxuan/amagi/issues/167)) ([35111a1](https://github.com/ikenxuan/amagi/commit/35111a138923bb313aa72584b501467835763952))
- release v6.0.0-beta.0 ([566468a](https://github.com/ikenxuan/amagi/commit/566468ad30fa4cbf5c7255a69507252207755a01))
- release v6.0.0-beta.1 ([cd49c7e](https://github.com/ikenxuan/amagi/commit/cd49c7ea3f01725796dddb7bce31f275adaaec97))
- **release:** v6.0.0-beta.2 ([0b5e5d0](https://github.com/ikenxuan/amagi/commit/0b5e5d0e1737fce3af3844dce16943fee7caf36b))
- **release:** v6.0.0-beta.3 ([1e9b353](https://github.com/ikenxuan/amagi/commit/1e9b353408a7a57e9659d55336825c5eea8068bd))

### ♻️ 代码重构

- **amagi:** consolidate fetcher method overload types ([f8abb12](https://github.com/ikenxuan/amagi/commit/f8abb12ad9424247d87035d32207c50b0d173309))
