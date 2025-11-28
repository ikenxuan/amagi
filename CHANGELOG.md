# Changelog

## [5.11.1](https://github.com/ikenxuan/amagi/compare/v5.11.0...v5.11.1) (2025-11-28)


### 🐛 错误修复

* **networks:** Improve network error detection with amagiError validation ([557d61e](https://github.com/ikenxuan/amagi/commit/557d61e9c7e7308960a5b28169c6753d8382f590))

## [5.11.0](https://github.com/ikenxuan/amagi/compare/v5.10.1...v5.11.0) (2025-11-28)


### ✨ 新功能

* **networks:** Add automatic retry mechanism for network requests ([ded0db6](https://github.com/ikenxuan/amagi/commit/ded0db60d355b194368a09e30b215da34fce398e))

## [5.10.1](https://github.com/ikenxuan/amagi/compare/v5.10.0...v5.10.1) (2025-11-27)


### ♻️ 代码重构

* **bilibili:** Restructure dynamic info types with discriminated union ([807e236](https://github.com/ikenxuan/amagi/commit/807e236b1145121acd61052c8e6ee3fe9351019e))

## [5.10.0](https://github.com/ikenxuan/amagi/compare/v5.9.1...v5.10.0) (2025-11-21)


### ✨ 新功能

* **douyin:** Add search type support for user and video searches ([cb41949](https://github.com/ikenxuan/amagi/commit/cb41949afac57e188857fac06c3b345aec45a9ea))


### 🐛 错误修复

* 细优 ([586567f](https://github.com/ikenxuan/amagi/commit/586567f1b42d460438514bf15b4804568f3e03de))
* 细优 ([0d825e9](https://github.com/ikenxuan/amagi/commit/0d825e96db917393d01439dd9053f4678a0ca249))
* 细优 ([4adf560](https://github.com/ikenxuan/amagi/commit/4adf560521d6fded3939c76a0d7387927c72c12d))
* 细优 ([e409864](https://github.com/ikenxuan/amagi/commit/e409864ba2a8671ca8bc6bb510f3123774c03860))
* 细优 ([0777147](https://github.com/ikenxuan/amagi/commit/077714728275a357052e32783b48ec7c3065a2e8))


### ♻️ 代码重构

* **douyin:** Restructure search result types with generic type inference ([392a65f](https://github.com/ikenxuan/amagi/commit/392a65fe14b7efc2c1b9cd9a1e319d412011ad92))

## [5.9.1](https://github.com/ikenxuan/amagi/compare/v5.9.0...v5.9.1) (2025-11-21)


### 🐛 错误修复

* 细节优化 ([baa7d76](https://github.com/ikenxuan/amagi/commit/baa7d76086da6824ba9e3f945b69b065bab9770d))

## [5.9.0](https://github.com/ikenxuan/amagi/compare/v5.8.1...v5.9.0) (2025-11-20)


### ✨ 新功能

* Add version tracking to Amagi client ([d027c2b](https://github.com/ikenxuan/amagi/commit/d027c2bbbcb4df30d4ae9a81cdfd634659dedd60))

## [5.8.1](https://github.com/ikenxuan/amagi/compare/v5.8.0...v5.8.1) (2025-11-16)


### 🐛 错误修复

* 修复抖音直播间信息参数验证问题 ([20d1785](https://github.com/ikenxuan/amagi/commit/20d1785cce760aaae32412556cbe68b54e9951b1))
* 改炸了 ([97a17d1](https://github.com/ikenxuan/amagi/commit/97a17d1499dcf81b3ef20eba33d89d73c0dc6da8))


### 📝 文档更新

* 更新类型注释和文档 ([20d1785](https://github.com/ikenxuan/amagi/commit/20d1785cce760aaae32412556cbe68b54e9951b1))


### 🎨 代码样式

* 优化代码格式和导入语句 ([20d1785](https://github.com/ikenxuan/amagi/commit/20d1785cce760aaae32412556cbe68b54e9951b1))


### ♻️ 代码重构

* **douyinAPI:** 直播间信息数据接口修改为只允许传递room_id和web_rid获取数据，通过sec_uid获取的方式已废弃 ([20d1785](https://github.com/ikenxuan/amagi/commit/20d1785cce760aaae32412556cbe68b54e9951b1))
* 统一各平台路由生成方式，使用配置映射 ([20d1785](https://github.com/ikenxuan/amagi/commit/20d1785cce760aaae32412556cbe68b54e9951b1))
* 重构类型定义和验证逻辑，提高可维护性 ([20d1785](https://github.com/ikenxuan/amagi/commit/20d1785cce760aaae32412556cbe68b54e9951b1))

## [5.8.0](https://github.com/ikenxuan/amagi/compare/v5.7.2...v5.8.0) (2025-11-01)


### ✨ 新功能

* **bilibili:** 添加获取指定评论回复接口 ([dac3c86](https://github.com/ikenxuan/amagi/commit/dac3c86b8bce595a5c98050da656df40353b03cb))

## [5.7.2](https://github.com/ikenxuan/amagi/compare/v5.7.1...v5.7.2) (2025-10-31)


### 🐛 错误修复

* 更新抖音搜索接口、格式化文件 ([719f3fc](https://github.com/ikenxuan/amagi/commit/719f3fc2dfa2905807d6c89c2a824a9269275bd5))

## [5.7.1](https://github.com/ikenxuan/amagi/compare/v5.7.0...v5.7.1) (2025-10-30)


### 🐛 错误修复

* **api:** Remove default type mode in API method signatures ([ab4bddf](https://github.com/ikenxuan/amagi/commit/ab4bddf624e3d4db40943149bf507c2486e18742))

## [5.7.0](https://github.com/ikenxuan/amagi/compare/v5.6.3...v5.7.0) (2025-10-28)


### ✨ 新功能

* **Bilibili动态:** 添加DYNAMIC_TYPE_ARTICLE类型支持 ([73786d4](https://github.com/ikenxuan/amagi/commit/73786d493648228ffea7e52bf8cccdec1ec014fd))
* 添加专栏相关接口 close [#142](https://github.com/ikenxuan/amagi/issues/142) ([#143](https://github.com/ikenxuan/amagi/issues/143)) ([bf747ed](https://github.com/ikenxuan/amagi/commit/bf747edc894764ee3d629ea90d924fa9b99d064f))


### 🐛 错误修复

* **xiaohongshu:** 修正笔记类型验证逻辑 ([bf747ed](https://github.com/ikenxuan/amagi/commit/bf747edc894764ee3d629ea90d924fa9b99d064f))


### ♻️ 代码重构

* **build:** 迁移构建系统从tsup到tsdown ([1348e0a](https://github.com/ikenxuan/amagi/commit/1348e0abf86e93a682bb2058cc04f0ad8498bcfa))

## [5.6.3](https://github.com/ikenxuan/amagi/compare/v5.6.2...v5.6.3) (2025-10-18)


### 🐛 错误修复

* **networks:** 更新axios依赖并改进响应处理 ([3834ed4](https://github.com/ikenxuan/amagi/commit/3834ed4e4af0e0d221f00ddd64b68e3ab7c6abf1))


### 📝 文档更新

* 更新文档 ([e4992b3](https://github.com/ikenxuan/amagi/commit/e4992b33b22718bbea7a31c29b3f6c50665134e1))

## [5.6.2](https://github.com/ikenxuan/amagi/compare/v5.6.1...v5.6.2) (2025-10-12)


### 🐛 错误修复

* export ([801cbff](https://github.com/ikenxuan/amagi/commit/801cbff4f3b33bb0781ccfcdba7af0ba69e9f35d))

## [5.6.1](https://github.com/ikenxuan/amagi/compare/v5.6.0...v5.6.1) (2025-10-12)


### 🐛 错误修复

* 二级评论返回类型 ([5c1b5a9](https://github.com/ikenxuan/amagi/commit/5c1b5a9f3da50fc0f5a493c02d2f40d6d5630043))

## [5.6.0](https://github.com/ikenxuan/amagi/compare/v5.5.1...v5.6.0) (2025-10-12)


### ✨ 新功能

* **douyin:** 添加X-Bogus签名支持并优化签名逻辑 ([7263eb1](https://github.com/ikenxuan/amagi/commit/7263eb13eb608921eb8f4f966e6923831e865d28))

## [5.5.1](https://github.com/ikenxuan/amagi/compare/v5.5.0...v5.5.1) (2025-10-10)


### 🐛 错误修复

* 错误日志 ([49d7693](https://github.com/ikenxuan/amagi/commit/49d7693cfc0f46e6a1d5938b70df04b354f9f48d))

## [5.5.0](https://github.com/ikenxuan/amagi/compare/v5.4.2...v5.5.0) (2025-10-10)


### ✨ 新功能

* **xiaohongshu:** 初步新增小红书平台支持 close [#134](https://github.com/ikenxuan/amagi/issues/134) ([#135](https://github.com/ikenxuan/amagi/issues/135)) ([74da370](https://github.com/ikenxuan/amagi/commit/74da37087e2da050063734170bb1558831c2bec0))


### 🐛 错误修复

* docs ([6e0477c](https://github.com/ikenxuan/amagi/commit/6e0477cd044b8db95c38dc20104c254e5f2ef588))

## [5.4.2](https://github.com/ikenxuan/amagi/compare/v5.4.1...v5.4.2) (2025-09-17)


### 🐛 错误修复

* 导出chalk ([55983d7](https://github.com/ikenxuan/amagi/commit/55983d7c692dae21a394a9d209c66fc3944604a2))

## [5.4.1](https://github.com/ikenxuan/amagi/compare/v5.4.0...v5.4.1) (2025-09-17)


### 🐛 错误修复

* 导出chalk ([d325bb3](https://github.com/ikenxuan/amagi/commit/d325bb3d6156cae392649519d2f3ad1fc8c8c50f))
* 细优错误日志 ([ccb1090](https://github.com/ikenxuan/amagi/commit/ccb1090977c4b230bb8c7dbc2b61d3094d9b9ca9))

## [5.4.0](https://github.com/ikenxuan/amagi/compare/v5.3.0...v5.4.0) (2025-09-16)


### ✨ 新功能

* **抖音:** 添加获取视频弹幕数据功能 ([2663c54](https://github.com/ikenxuan/amagi/commit/2663c54552d347f0bf04efa646c32606463627b5))


### 🐛 错误修复

* **DataFetchers:** 修复抖音数据获取失败时的错误处理逻辑 ([52535b4](https://github.com/ikenxuan/amagi/commit/52535b408c4df2acc1829bb4cac9e5227a8e3562))

## [5.3.0](https://github.com/ikenxuan/amagi/compare/v5.2.0...v5.3.0) (2025-08-30)


### ✨ 新功能

* **douyin:** 新增文字作品数据支持 ([1adef80](https://github.com/ikenxuan/amagi/commit/1adef80fd0c8aab9ff096ebd4a67561806d0d183))


### 📝 文档更新

* 更新文档生成配置及README ([1adef80](https://github.com/ikenxuan/amagi/commit/1adef80fd0c8aab9ff096ebd4a67561806d0d183))


### ♻️ 代码重构

* 优化类型定义和注释格式 ([1adef80](https://github.com/ikenxuan/amagi/commit/1adef80fd0c8aab9ff096ebd4a67561806d0d183))


### 🎡 持续集成

* 添加文档生成与部署工作流 ([1adef80](https://github.com/ikenxuan/amagi/commit/1adef80fd0c8aab9ff096ebd4a67561806d0d183))

## [5.2.0](https://github.com/ikenxuan/amagi/compare/v5.1.1...v5.2.0) (2025-08-24)


### ✨ 新功能

* **types:** 添加Bilibili动态相关内容卡片类型枚举 ([018f530](https://github.com/ikenxuan/amagi/commit/018f5301955f856928a9300083979b74a40bcf47))

## [5.1.1](https://github.com/ikenxuan/amagi/compare/v5.1.0...v5.1.1) (2025-08-22)


### 🐛 错误修复

* **bilibili:** 修正cookie参数大小写问题并优化视频流请求参数 ([96852ac](https://github.com/ikenxuan/amagi/commit/96852acfbb112e3af5972a53346f6a9bbdb1ac4f))

## [5.1.0](https://github.com/ikenxuan/amagi/compare/v5.0.4...v5.1.0) (2025-08-22)


### ✨ 新功能

* **Bilibili/Dynamic:** 添加转发动态种子动态主体类型枚举 ([84b4053](https://github.com/ikenxuan/amagi/commit/84b4053f6355edef15f5e57bb4c1400c744e1e6a))
* **types:** 重构Bilibili动态类型定义并添加转发类型支持 ([046355d](https://github.com/ikenxuan/amagi/commit/046355d23b417f57ece8946c478f8786ea5380db))

## [5.0.4](https://github.com/ikenxuan/amagi/compare/v5.0.3...v5.0.4) (2025-08-20)


### 🐛 错误修复

* **bilibili:** 动态接口补全features参数 ([411bfa0](https://github.com/ikenxuan/amagi/commit/411bfa0051f048a0683973e6c774ae1f85f3a998))

## [5.0.3](https://github.com/ikenxuan/amagi/compare/v5.0.2...v5.0.3) (2025-08-06)


### ♻️ 代码重构

* **bilibili:** 优化二维码状态检查的类型定义和错误处理 ([ef89b78](https://github.com/ikenxuan/amagi/commit/ef89b786f5358f4e9053006197e0f11d9cb01734))

## [5.0.2](https://github.com/ikenxuan/amagi/compare/v5.0.1...v5.0.2) (2025-08-03)


### 🐛 错误修复

* 移除User-Agent中的Edge标识以提升兼容性 ([b1ade2c](https://github.com/ikenxuan/amagi/commit/b1ade2c67107114a44e4d9f649a1a5dae1796839))

## [5.0.1](https://github.com/ikenxuan/amagi/compare/v5.0.0...v5.0.1) (2025-07-31)


### ♻️ 代码重构

* **douyin:** 重构抖音API模块以支持自定义User-Agent ([9d44cf5](https://github.com/ikenxuan/amagi/commit/9d44cf538c6fb4889ac067afb34939f326829809))

## [5.0.0](https://github.com/ikenxuan/amagi/compare/v4.5.2...v5.0.0) (2025-07-16)


### ⚠ BREAKING CHANGES

* 重构代码结构并优化网络请求处理，为所有平台API添加RequestConfig参数支持自定义请求配置

### ✨ 新功能

* 重构代码结构并优化网络请求处理，为所有平台API添加RequestConfig参数支持自定义请求配置 ([8624091](https://github.com/ikenxuan/amagi/commit/862409187ad04dad0004e19a5e16d4356917cf97))

## [4.5.2](https://github.com/ikenxuan/amagi/compare/v4.5.1...v4.5.2) (2025-07-10)


### 🐛 错误修复

* **bilibili:** B站评论使用懒加载接口，需要传递ck才可构造请求 ([f036c04](https://github.com/ikenxuan/amagi/commit/f036c04dc17647425b9eaab464de0efa32075a7b))


### 🎡 持续集成

* fix ([d4a65b0](https://github.com/ikenxuan/amagi/commit/d4a65b06d0f1f643e9f8b33c6b3a3b485aba8e93))

## [4.5.1](https://github.com/ikenxuan/amagi/compare/v4.5.0...v4.5.1) (2025-07-07)


### ♻️ 代码重构

* **validation:** 移除DouyinLiveRoomParamsSchema并使用DouyinUserParamsSchema替代 ([9977c12](https://github.com/ikenxuan/amagi/commit/9977c12a5ea229f4314705f06f0c66801c84e937))


### 🎡 持续集成

* fix ([41585b0](https://github.com/ikenxuan/amagi/commit/41585b08b4605b83da001876260ad9e35e0a0f17))

## [4.5.0](https://github.com/ikenxuan/amagi/compare/v4.4.19...v4.5.0) (2025-07-04)


### ✨ 新功能

* **api:** 为各平台API添加绑定cookie的工厂方法和类型定义 ([ab8b82b](https://github.com/ikenxuan/amagi/commit/ab8b82bd6972e9ae3659c936796780e60ab920c2))
* **server:** 为Amagi客户端添加绑定Cookie的平台工具集 ([85c7c3f](https://github.com/ikenxuan/amagi/commit/85c7c3f2222667180175b83e6757b9417fc4d249))
* 在响应中添加请求路径信息 ([dfc8ddc](https://github.com/ikenxuan/amagi/commit/dfc8ddca8f75848429b1c7f8ddda35c89cac4dae))
* 毁灭性更新：重构抖音、B站和快手平台的API返回格式，使用统一的ApiResponse结构；使用 `zod` 验证传递参数合法性 ([f4dc71f](https://github.com/ikenxuan/amagi/commit/f4dc71f7e10365515bee9fbdf21fd19f4f61358b))
* 添加v5版本支持并重构模块导入路径 ([9d03a0a](https://github.com/ikenxuan/amagi/commit/9d03a0a69930c5d5248bc9ef9711f073dc4f9875))


### 🐛 错误修复

* **api:** 统一平台API实现并使用共享数据获取逻辑 ([7dc3a1b](https://github.com/ikenxuan/amagi/commit/7dc3a1b21fbada09a3b4be2f1bf98f8b40f2d9f7))
* 修复bilibili错误码类型检查问题 ([9d03a0a](https://github.com/ikenxuan/amagi/commit/9d03a0a69930c5d5248bc9ef9711f073dc4f9875))
* 修复部分接口类型推导 ([001c8a7](https://github.com/ikenxuan/amagi/commit/001c8a7389ab56bbd10c060a98cac932c8cf2327))
* 兼容性提高 ([0c45b58](https://github.com/ikenxuan/amagi/commit/0c45b580678ef88c0b2ace1f3cc2f9a6d59df3d6))
* 兼容性提高 ([bce4d00](https://github.com/ikenxuan/amagi/commit/bce4d004fa9329b821f223237874ad07d4722071))
* 兼容性提高 ([13b3ac6](https://github.com/ikenxuan/amagi/commit/13b3ac6f78326a71eb86999596a45c09d880b152))


### 📝 文档更新

* 更新注释和导出说明 ([9d03a0a](https://github.com/ikenxuan/amagi/commit/9d03a0a69930c5d5248bc9ef9711f073dc4f9875))


### ♻️ 代码重构

* **api:** 重构API响应格式为成功/错误分离结构 ([1152636](https://github.com/ikenxuan/amagi/commit/1152636c411869fd718332a1cdbf663ce9d01a77))
* **api:** 重构平台API返回格式为统一响应结构 ([91c820c](https://github.com/ikenxuan/amagi/commit/91c820c542c9204b8e559bf09a7546bc2df51b5c))
* **server:** 重构createAmagiClient使用新的绑定cookieAPI方法 ([ab8b82b](https://github.com/ikenxuan/amagi/commit/ab8b82bd6972e9ae3659c936796780e60ab920c2))
* **types:** 将平台参数类型定义移动到独立文件 ([4a0c1cf](https://github.com/ikenxuan/amagi/commit/4a0c1cfc5527e926d1732c6b3c3b7eb4fc7743fd))
* **validation:** 重构参数类型定义与验证逻辑 ([dca4162](https://github.com/ikenxuan/amagi/commit/dca416297c3e669c0f317eac7a9a838df396d09b))
* **validation:** 重构验证模块并移除冗余代码 ([3511940](https://github.com/ikenxuan/amagi/commit/351194076adccd18eab06ad4cae17bcd2d5df327))
* 优化错误处理类型和错误码映射 ([9d03a0a](https://github.com/ikenxuan/amagi/commit/9d03a0a69930c5d5248bc9ef9711f073dc4f9875))
* 添加 release-please 配置文件用于自动化发布 ([10765b1](https://github.com/ikenxuan/amagi/commit/10765b118b6a800dcf93bb3bb03a0347bedf01e7))
* **类型系统:** 改进类型模式定义并增强类型安全性 ([4815173](https://github.com/ikenxuan/amagi/commit/48151738ac67d70cb618f5452cde064984183ab8))


### 📦️ 构建系统

* 更新构建配置以支持多版本打包 ([9d03a0a](https://github.com/ikenxuan/amagi/commit/9d03a0a69930c5d5248bc9ef9711f073dc4f9875))
* 添加release-please-manifest.json文件管理版本 ([ab8b82b](https://github.com/ikenxuan/amagi/commit/ab8b82bd6972e9ae3659c936796780e60ab920c2))


### 🎡 持续集成

* fix ([8ab824e](https://github.com/ikenxuan/amagi/commit/8ab824e915abf91aec3dc8d36152fa1bb747e982))
* fix ([3571974](https://github.com/ikenxuan/amagi/commit/357197403612b6cc87c37df5dfe9839705905c76))
* 更新release-please配置和工作流以支持自动发布 ([ab8b82b](https://github.com/ikenxuan/amagi/commit/ab8b82bd6972e9ae3659c936796780e60ab920c2))

## [4.4.19](https://github.com/ikenxuan/amagi/compare/v4.4.18...v4.4.19) (2025-06-10)


### Bug Fixes

* **logger:** 重构日志模块并增强HTTP日志功能 ([1ac8814](https://github.com/ikenxuan/amagi/commit/1ac8814c15467532f44d9cb34f29466f88fb2e1e))

## [4.4.18](https://github.com/ikenxuan/amagi/compare/v4.4.17...v4.4.18) (2025-06-04)


### Bug Fixes

* **logger:** 更新chalk依赖版本并调整导入方式 ([c75adbc](https://github.com/ikenxuan/amagi/commit/c75adbc4e511eea37f184b37ce209d3f48698758))
* 多套了一层函数 ([76b1cf8](https://github.com/ikenxuan/amagi/commit/76b1cf88a1580988c7f66d4aee2adad39ed33551))

## [4.4.17](https://github.com/ikenxuan/amagi/compare/v4.4.16...v4.4.17) (2025-05-27)


### Bug Fixes

* **bilibili:** 导出哔哩哔哩错误码映射并更新axios依赖 ([493764c](https://github.com/ikenxuan/amagi/commit/493764c3a3aab6a004672acab07a347b7eabd152))
* **douyin:** 处理用户未开播时的错误情况 ([2df4711](https://github.com/ikenxuan/amagi/commit/2df4711dbadef4cec74d0c956af621d590b877dd))
* 标准化错误返回 ([e49efd6](https://github.com/ikenxuan/amagi/commit/e49efd672c77f09a762663e34e38e048950b10c0))

## [4.4.16](https://github.com/ikenxuan/amagi/compare/v4.4.15...v4.4.16) (2025-05-24)


### Bug Fixes

* 优化默认导出类型 ([0afc7aa](https://github.com/ikenxuan/amagi/commit/0afc7aa8d55b6057caf7f0b93002a4b40ff4e2ae))
* **抖音:** 作品隐藏时打印日志 ([217c8ad](https://github.com/ikenxuan/amagi/commit/217c8adced35f08c6d4a09c519c3841df74017c5))

## [4.4.15](https://github.com/ikenxuan/amagi/compare/v4.4.14...v4.4.15) (2025-05-12)


### Bug Fixes

* **平台数据获取:** 修复全局数据获取函数中的错误处理逻辑 ([7a4fae6](https://github.com/ikenxuan/amagi/commit/7a4fae620e7e58c50f1d818987af9066882bb9a8))
* 更改处理数据错误时的返回值 ([c6ccb24](https://github.com/ikenxuan/amagi/commit/c6ccb24f143e1596053fe709d74d2ee4e3b70fcb))

## [4.4.14](https://github.com/ikenxuan/amagi/compare/v4.4.13...v4.4.14) (2025-05-11)


### Bug Fixes

* **平台数据获取:** 统一处理获取数据失败时的返回格式 ([c7f8598](https://github.com/ikenxuan/amagi/commit/c7f8598c7d3622e7580e2738eeb8559a6b00ab7f))

## [4.4.13](https://github.com/ikenxuan/amagi/compare/v4.4.12...v4.4.13) (2025-05-11)


### Bug Fixes

* 添加log4js导出并更新axios依赖版本 ([99a961a](https://github.com/ikenxuan/amagi/commit/99a961a9b04e4bffe2b040bbb89369a7066f7cb6))
* 类型优化 ([0b9c834](https://github.com/ikenxuan/amagi/commit/0b9c834ddbe0b17ab2c90a8958fd17523ace0666))

## [4.4.12](https://github.com/ikenxuan/amagi/compare/v4.4.11...v4.4.12) (2025-05-09)


### Bug Fixes

* TypeError: default export is not a constructor ([33e07fc](https://github.com/ikenxuan/amagi/commit/33e07fcba4e06a06974ebb375816e8519d7199b5))

## [4.4.11](https://github.com/ikenxuan/amagi/compare/v4.4.10...v4.4.11) (2025-05-08)


### Bug Fixes

* 修改导出方式以增强代码一致性 ([2aef259](https://github.com/ikenxuan/amagi/commit/2aef259c737254f42e83b724c4b3e14847b380eb))
* 删除无用代码 ([1fde21f](https://github.com/ikenxuan/amagi/commit/1fde21fca731707094ce2f2968c89125b9cd8b4d))
* 重构 amagi 客户端构造函数并添加平台工具集 ([fd0951b](https://github.com/ikenxuan/amagi/commit/fd0951bdbc61d700e79cd42cb6055d6cb601e286))

## [4.4.10](https://github.com/ikenxuan/amagi/compare/v4.4.9...v4.4.10) (2025-05-07)


### Bug Fixes

* readme ([57d59af](https://github.com/ikenxuan/amagi/commit/57d59af7d6c46bedc6b9662250ab36847ed46b6c))
* 文档更新 ([3e89693](https://github.com/ikenxuan/amagi/commit/3e89693cf1ceecb3e57aa797573959975f79b1b2))
* 重构 amagi 客户端初始化和类型定义 ([f5732da](https://github.com/ikenxuan/amagi/commit/f5732da6abea3d83cefc3c6d0efa354c914868f4))

## [4.4.9](https://github.com/ikenxuan/amagi/compare/v4.4.8...v4.4.9) (2025-04-18)


### Bug Fixes

* **douyin:** 处理搜索数据为空时的情况 ([951eb0b](https://github.com/ikenxuan/amagi/commit/951eb0b6cb68ba93683e9049c075216a188967ef))
* **platform:** 重构平台API模块以提升可维护性 ([9eea9fb](https://github.com/ikenxuan/amagi/commit/9eea9fb2a50a8b648823967ac33b4d0e8bd0a230))
* **server:** 重构客户端类并更新相关文档 ([d92ca03](https://github.com/ikenxuan/amagi/commit/d92ca0320d1c9db2fe2218ec7742839aa245894a))
* 更新抖音评论作品接口响应定义 ([13533d5](https://github.com/ikenxuan/amagi/commit/13533d5941b8ea1d81f7cd1b3e841f71c11ce59b))
* 更新注释和文档，优化代码可读性，添加集成导出模块 ([7982e15](https://github.com/ikenxuan/amagi/commit/7982e15efe5a7dfe8687419ddd7bdb1f216e2335))

## [4.4.8](https://github.com/ikenxuan/amagi/compare/v4.4.7...v4.4.8) (2025-02-24)


### Bug Fixes

* 选择性记录 ([c72ea39](https://github.com/ikenxuan/amagi/commit/c72ea39c195687724b280be374788b57c144449e))

## [4.4.7](https://github.com/ikenxuan/amagi/compare/v4.4.6...v4.4.7) (2025-02-22)


### Bug Fixes

* 细节优化 ([#103](https://github.com/ikenxuan/amagi/issues/103)) ([5681ae4](https://github.com/ikenxuan/amagi/commit/5681ae4424d70c74ef38e2cd99bb575368b4971a))

## [4.4.6](https://github.com/ikenxuan/amagi/compare/v4.4.5...v4.4.6) (2025-02-22)


### Bug Fixes

* type error ([d5e4c43](https://github.com/ikenxuan/amagi/commit/d5e4c434208caf8bb8b73a46b0458d660a794568))

## [4.4.5](https://github.com/ikenxuan/amagi/compare/v4.4.4...v4.4.5) (2025-02-22)


### Bug Fixes

* **platform:** type error ([006812a](https://github.com/ikenxuan/amagi/commit/006812a3c6204d2aefbc002c0c097e901fbb9e94))

## [4.4.4](https://github.com/ikenxuan/amagi/compare/v4.4.3...v4.4.4) (2025-02-22)


### Bug Fixes

* 使用express实现接口服务 ([86c690d](https://github.com/ikenxuan/amagi/commit/86c690ddeeb9640b683f81cf4763a485f0738c5f))
* 注册路由返回fastify实例 ([aaafccc](https://github.com/ikenxuan/amagi/commit/aaafccc9264d5a50696aba68e1bf2c613caef6bf))

## [4.4.3](https://github.com/ikenxuan/amagi/compare/v4.4.2...v4.4.3) (2025-02-15)


### Bug Fixes

* 导出部分依赖，如通过/axios引用 ([e815b52](https://github.com/ikenxuan/amagi/commit/e815b528b646e943c5e21bcc34b1539c86c7f4a5))

## [4.4.2](https://github.com/ikenxuan/amagi/compare/v4.4.1...v4.4.2) (2025-02-12)


### Performance Improvements

* 内部逻辑优化 ([f0b6fed](https://github.com/ikenxuan/amagi/commit/f0b6fed22c84a6ed29b270dfb108fd8706ad05dd))
* 导出返回数据类型 ([daf3ff7](https://github.com/ikenxuan/amagi/commit/daf3ff771ebec9e778f9cfd4974b137d4d1f86b9))

## [4.4.1](https://github.com/ikenxuan/amagi/compare/v4.4.0...v4.4.1) (2025-02-11)


### Bug Fixes

* 优化类型声明 ([1d3df91](https://github.com/ikenxuan/amagi/commit/1d3df9104b9592ed927d84fe5b11bbc4e7a03ff8))
* 哎呀改漏了 ([d63e466](https://github.com/ikenxuan/amagi/commit/d63e466115615c12b5958eac9247fddd81d7da24))

## [4.4.0](https://github.com/ikenxuan/amagi/compare/v4.3.3...v4.4.0) (2025-02-10)


### Features

* **model:** `getDouyinData`, `getBilibiliData`, `getKuaishouData` 三个方法新增函数重载 ([37912a2](https://github.com/ikenxuan/amagi/commit/37912a29dd13e900752b680e639cd92666b65c39))

## [4.3.3](https://github.com/ikenxuan/amagi/compare/v4.3.2...v4.3.3) (2025-02-09)


### Bug Fixes

* **types:** 传入 `typeMode` 并指定可获取接口响应的类型，默认 `loose` （宽松的） ([5019c4c](https://github.com/ikenxuan/amagi/commit/5019c4c2fbafd7fb9cda6064ffcaecdf1a562d1f))

## [4.3.2](https://github.com/ikenxuan/amagi/compare/v4.3.1...v4.3.2) (2025-02-02)


### Bug Fixes

* **package:** 调整 package.json 中的导出顺序 ([583140c](https://github.com/ikenxuan/amagi/commit/583140cb084cc1309011e483aa95d9a0884b82be))

## [4.3.1](https://github.com/ikenxuan/amagi/compare/v4.3.0...v4.3.1) (2025-02-02)


### Bug Fixes

* ci ([fee08e6](https://github.com/ikenxuan/amagi/commit/fee08e6ac70374e6e0245f138133fdbdac70014f))

## [4.3.0](https://github.com/ikenxuan/amagi/compare/v4.2.5...v4.3.0) (2025-02-02)


### Features

* 获取数据添加返回类型 ([#90](https://github.com/ikenxuan/amagi/issues/90)) ([8988fd5](https://github.com/ikenxuan/amagi/commit/8988fd539db87365f2b4a36fcdbb99e2a0d11c37))


### Bug Fixes

* ci ([e1eca62](https://github.com/ikenxuan/amagi/commit/e1eca62498338d4c49d9b119e6b65407588a50bc))
* **kuaishou:** 增加参数有效性校验 ([6effcc0](https://github.com/ikenxuan/amagi/commit/6effcc06db5954bc1c8671d8709e944d38e2e6f4))

## [4.2.5](https://github.com/ikenxuan/amagi/compare/v4.2.4...v4.2.5) (2025-01-20)


### Bug Fixes

* 不是哥们，你怎么接口和ua绑定啊？ ([2e51651](https://github.com/ikenxuan/amagi/commit/2e5165158eb12f391dce33d8e19468904c36a345))

## [4.2.4](https://github.com/ikenxuan/amagi/compare/v4.2.3...v4.2.4) (2025-01-19)


### Bug Fixes

* **douyin:** 抽象出通用的分页请求函数 ([d1d09f9](https://github.com/ikenxuan/amagi/commit/d1d09f9aae7eb526cf2d4bb351609f3a21871014))

## [4.2.3](https://github.com/ikenxuan/amagi/compare/v4.2.2...v4.2.3) (2025-01-13)


### Performance Improvements

* 优化注释 ([06c569f](https://github.com/ikenxuan/amagi/commit/06c569f6f48a7c8d0498a85bc781d8931213cfd8))

## [4.2.2](https://github.com/ikenxuan/amagi/compare/v4.2.1...v4.2.2) (2025-01-13)


### Bug Fixes

* 优化注释 ([8f94a04](https://github.com/ikenxuan/amagi/commit/8f94a0451974382a15ba9866897c4b8deb79d18a))

## [4.2.1](https://github.com/ikenxuan/amagi/compare/v4.2.0...v4.2.1) (2025-01-12)


### Bug Fixes

* import error ([b609032](https://github.com/ikenxuan/amagi/commit/b6090321a502e1a0649751ca9135ea621e845b8e))

## [4.2.0](https://github.com/ikenxuan/amagi/compare/v4.1.1...v4.2.0) (2025-01-12)


### Features

* 请求api的时候支持获取请求头的cookies，无则使用默认配置的cookie ([71b27a7](https://github.com/ikenxuan/amagi/commit/71b27a7e090034fe81c5869d3ad135a684ff612b))


### Performance Improvements

* 优化路由注册 ([71b27a7](https://github.com/ikenxuan/amagi/commit/71b27a7e090034fe81c5869d3ad135a684ff612b))

## [4.1.1](https://github.com/ikenxuan/amagi/compare/v4.1.0...v4.1.1) (2025-01-10)


### Performance Improvements

* **model:** 为数据获取函数添加别名 ([aefe570](https://github.com/ikenxuan/amagi/commit/aefe570f3abef1a42272c5798bbc548acb783106))
* 删除一些过时文件 ([67e3980](https://github.com/ikenxuan/amagi/commit/67e3980bcf69a353add35dbf68c4855d0923a57b))

## [4.1.0](https://github.com/ikenxuan/amagi/compare/v4.0.3...v4.1.0) (2025-01-08)


### Features

* 改进搜索功能以支持分页和自定义搜索数量 ([fc44c8f](https://github.com/ikenxuan/amagi/commit/fc44c8fdd1d900743b1670565ed70e8dd3fd9e02))


### Performance Improvements

* 改个文件夹名字 ([7c40da0](https://github.com/ikenxuan/amagi/commit/7c40da054206b3929ad0efd6996e6c6756a6ad56))

## [4.0.3](https://github.com/ikenxuan/amagi/compare/v4.0.2...v4.0.3) (2024-12-22)


### Bug Fixes

* 不小心把B站评论接口地址改了 ([b53f74a](https://github.com/ikenxuan/amagi/commit/b53f74a060623687b3d624b8749d76b6dfe17f88))

## [4.0.2](https://github.com/ikenxuan/amagi/compare/v4.0.1...v4.0.2) (2024-12-21)


### Bug Fixes

* ck赋值错误 ([f426c76](https://github.com/ikenxuan/amagi/commit/f426c763b0dcae60f7bef4ffdeee6519d4a68ffb))
* 细优 ([5f058b1](https://github.com/ikenxuan/amagi/commit/5f058b1eec4e4a9421163743a796d9d16cfef86b))


### Performance Improvements

* 格式化 ([51ebb77](https://github.com/ikenxuan/amagi/commit/51ebb77db7015212eed89b9d46805442315336e6))

## [4.0.1](https://github.com/ikenxuan/amagi/compare/v4.0.0...v4.0.1) (2024-12-20)


### Bug Fixes

* build ([2467c08](https://github.com/ikenxuan/amagi/commit/2467c08fe8286fba452bf84bec1a88caded13180))

## [4.0.0](https://github.com/ikenxuan/amagi/compare/v3.4.4...v4.0.0) (2024-12-20)


### ⚠ BREAKING CHANGES

* **server:** 旧的`GetDouyinData`、`GetBilibiliData`和`GetXiaohongshuData`方法已被废弃， 请使用小写的`getDouyinData`、`getBilibiliData`和`getXiaohongshuData`方法。
* **server:** 旧的`GetDouyinData`、`GetBilibiliData`和`GetXiaohongshuData`方法已被废弃， 请使用小写的`getDouyinData`、`getBilibiliData`和`getXiaohongshuData`方法。
* **readme:** 由于重构了API端点和数据类型枚举，现有的客户端代码可能需要更新以匹配新的结构和枚举值。

### Features

* B站新增获取UP主总播放量接口 ([a1ed8e1](https://github.com/ikenxuan/amagi/commit/a1ed8e19d3b95af13238aa3a3e05b53e5f7d758c))
* B站评论数量可无限制获取 ([113a8b4](https://github.com/ikenxuan/amagi/commit/113a8b43f9fac16a8b3a7021eba31ee2896e53f1))
* **data:** 更新数据获取逻辑和方法 ([6ce8b11](https://github.com/ikenxuan/amagi/commit/6ce8b111f90eaf7afbd803209d24ad4a58d40ab9))
* **server:** 添加 Swagger 文档和接口注释 ([f3480be](https://github.com/ikenxuan/amagi/commit/f3480be387aeeaeaccb1f589c076252c367d4f9f))
* tsx ([b4074db](https://github.com/ikenxuan/amagi/commit/b4074db39ce4c8a5f387175e9b6a8fd1d7117c92))
* 使用log4js库记录日志 ([cecf4d6](https://github.com/ikenxuan/amagi/commit/cecf4d61848c83d03b326c8d160b402b80840149))
* 初步添加哔哩哔哩接口(未完善) ([c88ae21](https://github.com/ikenxuan/amagi/commit/c88ae21472bee6b5c877ee2de57472fc511b13e6))
* 取稿件下载信息新增传入url ([7a2eeab](https://github.com/ikenxuan/amagi/commit/7a2eeab5142097fd1adac1e5e41c20ecdffc4e8a))
* 增加抖音获取登录二维码接口 ([76642c5](https://github.com/ikenxuan/amagi/commit/76642c59048eb17ad048bd2c1da135cd0675f47c))
* 增加测试工作流 ([f1f10f7](https://github.com/ikenxuan/amagi/commit/f1f10f7c7289a6ed9f8491fab21788ac3abdb64d))
* 增加部分逻辑 ([88c5937](https://github.com/ikenxuan/amagi/commit/88c59370481f26233e2ed090746d6334bb312b6c))
* 抖音评论数量可无限制获取 ([8bfceac](https://github.com/ikenxuan/amagi/commit/8bfceac0e1ba2c87cb0d607b2ee227af7482dfeb))
* 支持外部调用 ([1f285f4](https://github.com/ikenxuan/amagi/commit/1f285f47ceb07699870525f335f060412a2da404))
* 新增AV与BV互转功能并优化部分接口命名 ([0173af2](https://github.com/ikenxuan/amagi/commit/0173af2e0fcc0405033c1a125832472275212aca))
* 新增手数据接口相关功能，包括API定义、数据获取逻辑及客户端接口集成。新增文件包含快手API的实现、数据获取类及结果处理逻辑，同时更新了相关类型定义以支持快手的数据结构。 ([7831ce1](https://github.com/ikenxuan/amagi/commit/7831ce1148d9f286e8e9f84620f701ffc699e5c2))
* 新增文档 ([3689456](https://github.com/ikenxuan/amagi/commit/368945688afa32342b9a990be4eca46140d3b96b))
* 新增直播间信息接口 ([4c5d55b](https://github.com/ikenxuan/amagi/commit/4c5d55bfb49bca54b6016842114021532262a662))
* 添加了对快手（Kuaishou）相关请求的支持，包括新的请求类型和API接口，更新了依赖和导入。 ([cc8ed8a](https://github.com/ikenxuan/amagi/commit/cc8ed8a81f4cb2c9fc4ba4bba65aa678939fb5ec))


### Bug Fixes

* /和/docs重定向到api文档 ([18999cf](https://github.com/ikenxuan/amagi/commit/18999cf11218bd8f0ed540adc578789b2a705c62))
* action ([8c6713b](https://github.com/ikenxuan/amagi/commit/8c6713b1d2af781b67af85e5275e51eec6252fda))
* action ([b0af0d9](https://github.com/ikenxuan/amagi/commit/b0af0d9ef500282105f027f71105b17ae37db009))
* auto format ([9d4190f](https://github.com/ikenxuan/amagi/commit/9d4190f4952c9f513de04e2803191d931c83b463))
* BilibiliAPI的评论区明细接口的默认参数设置 ([277e997](https://github.com/ikenxuan/amagi/commit/277e997a54ebd4fd5b01e6b892776adfd0b3f785))
* B站获取数据失败 ([1fbd650](https://github.com/ikenxuan/amagi/commit/1fbd6505e7ac9e09372f352d720a0ad257ce8e80))
* B站评论数据去重 ([8bb1240](https://github.com/ikenxuan/amagi/commit/8bb1240fcb2886e866c66b7004acac2747242a6f))
* cfgtype ([5ddffa4](https://github.com/ikenxuan/amagi/commit/5ddffa48657c782fec2ee7fe85f8da756f3faab8))
* cookies换行 ([b06aa6e](https://github.com/ikenxuan/amagi/commit/b06aa6eb8b4b0c9ecaca9fb66ef45902374214b2))
* dev模式下自动重载 ([402a3cf](https://github.com/ikenxuan/amagi/commit/402a3cfad1d7a899b0c9861129806b94f542a464))
* github action ([17f60e4](https://github.com/ikenxuan/amagi/commit/17f60e49a0101319bdcdc67f0c85d7ef12853578))
* import ([ea782c1](https://github.com/ikenxuan/amagi/commit/ea782c1a3a14e5a1efffab2040ffec974282b794))
* **index.ts:** 更新获取抖音和B站数据的函数参数类型 ([6065554](https://github.com/ikenxuan/amagi/commit/60655546de1412f1b929b49e04d6513b58250b17))
* live图图集 ([1e39461](https://github.com/ikenxuan/amagi/commit/1e39461e4915c57454f08b33987da87d606eee8e))
* **pkg:** 更新依赖 ([f400857](https://github.com/ikenxuan/amagi/commit/f400857618570b885146a24722e0bd0aedb783e8))
* **server:** 更新客户端方法并标记为废弃 ([4102483](https://github.com/ikenxuan/amagi/commit/4102483c519a33929aa783f15f9db6168dec7b4b))
* **server:** 更新客户端方法并标记为废弃 ([a65e9eb](https://github.com/ikenxuan/amagi/commit/a65e9eb2e0bb5076fbc75537d9e088213d1fd595))
* 三元表达式判断错误 ([24ebc19](https://github.com/ikenxuan/amagi/commit/24ebc1913d672fdb1c61923636de702ee9ea74d4))
* 优化NetworksConfigType定义 ([cf70959](https://github.com/ikenxuan/amagi/commit/cf709593fbc8946d3a985478fc3b744fc1f869fe))
* 优化了 Fastify 服务器的初始化和启动流程 ([6ba11f0](https://github.com/ikenxuan/amagi/commit/6ba11f01032afb5282ab9692d814eeb550e4ea72))
* 优化文档 ([9b10faa](https://github.com/ikenxuan/amagi/commit/9b10faaf4013c899e42fd9db08f333e5b016d6d2))
* 优化日志显示 ([5687424](https://github.com/ikenxuan/amagi/commit/568742469400995b8c689380a137c4fa1499a801))
* 优化目录结构，移除common.ts ([51db245](https://github.com/ikenxuan/amagi/commit/51db245ce03060e8d08690182a33212875cf2604))
* 优化类型声明 ([21d80b6](https://github.com/ikenxuan/amagi/commit/21d80b659252e325e58443a83165f4f47793885c))
* 使用axios替换node-fetch ([0c93f6f](https://github.com/ikenxuan/amagi/commit/0c93f6f31731514727d3c1739d2c4bd13ab514db))
* 使用ts-node调试ts ([2305efd](https://github.com/ikenxuan/amagi/commit/2305efd655dd64bc60093bcf74b70d9b373c6b9b))
* 使用ts重写a_bogus算法 ([08a141c](https://github.com/ikenxuan/amagi/commit/08a141ce0a00b9e686f71e4d38a2bd07ee7051b8))
* 使用在线api文档 ([3fc534b](https://github.com/ikenxuan/amagi/commit/3fc534b17190beaaddc6009b5dabc3da03770084))
* 修复B站评论数量请求数量为0的bug ([935a432](https://github.com/ikenxuan/amagi/commit/935a432b3b15c52f382d630f600ae000a74ea06d))
* 修复B站部分接口错误 ([d51c185](https://github.com/ikenxuan/amagi/commit/d51c185b5bebd7367766bea9cd7d2e55f24f8b79))
* 修复npm包缺少的openapi.json ([ab45033](https://github.com/ikenxuan/amagi/commit/ab45033c8574c8ed2b6ff95eae53f474d27a1228))
* 修复pm2后台运行 ([77df451](https://github.com/ikenxuan/amagi/commit/77df451dd9f29aa0276e75b6ed417955cac87cab))
* 修复启动命令错误 ([2e01472](https://github.com/ikenxuan/amagi/commit/2e01472a667cc888b54c6b9072457d3f5eb70355))
* 修复抖音返回评论为null导致的错误 ([9781dfc](https://github.com/ikenxuan/amagi/commit/9781dfcd557bf942957ef7356987a20df6e4a466))
* 修复抖音部分无法获取对应数据 ([c470b74](https://github.com/ikenxuan/amagi/commit/c470b74b7c6281c04f50d52fa04f5d0efcb0e24d))
* 修复搜索接口 ([0173af2](https://github.com/ikenxuan/amagi/commit/0173af2e0fcc0405033c1a125832472275212aca))
* 修复无法自定义获取评论数量 ([c460a32](https://github.com/ikenxuan/amagi/commit/c460a32a1d907945d9ceda713428eaca7f9e9e74))
* 修复番剧数据获取 ([5b9cb57](https://github.com/ikenxuan/amagi/commit/5b9cb57ac5347032847c161c25b679ada60bae79))
* 修复直播间信息参数错误 ([46706a6](https://github.com/ikenxuan/amagi/commit/46706a645b1b3b7999d048831e596342e808a18c))
* 修复算法 ([a1a973f](https://github.com/ikenxuan/amagi/commit/a1a973f8558623d557dbd1992faca71435276433))
* 修复编译命令 ([7317056](https://github.com/ikenxuan/amagi/commit/73170564025de7eb2e5c5add5962dd4f6ee4920f))
* 修复编译错误 ([8d07358](https://github.com/ikenxuan/amagi/commit/8d07358ec1631b20ae812b271c8f701194ed4670))
* 修复获取抖音使用aweme_id获取数据失败 ([4f2a6f7](https://github.com/ikenxuan/amagi/commit/4f2a6f7df3cc30d1c0311bb4a6d9385b82676f00))
* 修复部分bug ([9e3369c](https://github.com/ikenxuan/amagi/commit/9e3369c7b42390cb9fda28f7526a8e2c6d264090))
* 修复配置文件格式不正确 ([69581fe](https://github.com/ikenxuan/amagi/commit/69581fed8b6d64635f49f82ac45f6ba43aaf2fd4))
* 修改工作流 ([7d88532](https://github.com/ikenxuan/amagi/commit/7d885326b752eb9379645e5299aae94b0babef77))
* 修改工作流 ([3136d84](https://github.com/ikenxuan/amagi/commit/3136d848f3c8f2d2d40a88fcb3773529a9a12c5c))
* 修改文档 ([a14c629](https://github.com/ikenxuan/amagi/commit/a14c629af90458e8093dfd91f48c9252e6b71db4))
* 修改日志呈现形式 ([f490739](https://github.com/ikenxuan/amagi/commit/f4907391c79792eacf71f712656d3b142a6dda84))
* 修改超时时间为15s ([91c47be](https://github.com/ikenxuan/amagi/commit/91c47befac4472d8a94dfb494aa06b1668cf7ad1))
* 修改部分功能 ([ce68e4f](https://github.com/ikenxuan/amagi/commit/ce68e4fe5d826e2fadd8a45f406ff326b590e65f))
* 修改部分逻辑 ([ea77ade](https://github.com/ikenxuan/amagi/commit/ea77adeb690c772f20df7db03b46d16ad414cc0a))
* 修正了Bili和Douyin数据模块中的"emoji数据"名称为"Emoji数据" ([30e9de5](https://github.com/ikenxuan/amagi/commit/30e9de5df7fa7b5ebe4f9091cf3f19ce8eb7a8ed))
* 写死4567端口 ([b69eafc](https://github.com/ikenxuan/amagi/commit/b69eafc0e6374bf4d92275bb80a4cd2141271d66))
* 删除无关文件 ([8aded9d](https://github.com/ikenxuan/amagi/commit/8aded9dafe7420a1fe38b642a4830511808c498c))
* 升级axios和typescript包 ([f6fc45d](https://github.com/ikenxuan/amagi/commit/f6fc45d8571a0ed1c6468effbf655e49c8632804))
* 启动前执行安装依赖 ([84c8885](https://github.com/ikenxuan/amagi/commit/84c88857cd73de74926bc1c82a34afd1e46c8d08))
* 在BilibiliResult中，为单个视频下载信息数据的获取增加了一个条件判断。现在，如果options中的url未定义，将直接调用GetData，否则将通过处理options中的url来获取数据。 ([1bce96c](https://github.com/ikenxuan/amagi/commit/1bce96c0a88098213d330e042ae5c32a73bb5c3c))
* 增加可选参数 ([24337ee](https://github.com/ikenxuan/amagi/commit/24337ee83d58200a68c9374a6782322a35a301e7))
* 增加日志 ([63b8861](https://github.com/ikenxuan/amagi/commit/63b8861300e4b74c62c23e11c381eada08f68ddf))
* 处理B站接口单次接口返回评论数量不足20条的情况 ([6a1172c](https://github.com/ikenxuan/amagi/commit/6a1172cec7a242802631921cede7d96334f0bdab))
* 外部调用 ([19170cc](https://github.com/ikenxuan/amagi/commit/19170cc5b3c699fa8b1e41d5219190b64780d70c))
* 完善登录接口 ([ec61540](https://github.com/ikenxuan/amagi/commit/ec61540deb6b41dd16446d2d4e0c2cc353008144))
* 导出的Amagi改为函数 ([e099c28](https://github.com/ikenxuan/amagi/commit/e099c28eb2e6f8fbb8934c76e87241671f257272))
* 弃用fastifyStatic ([5061c4a](https://github.com/ikenxuan/amagi/commit/5061c4af7cfae9a799f6d2e45f6912ff2d061011))
* 引入 chalk 库以支持命令行彩色日志输出 ([6ba11f0](https://github.com/ikenxuan/amagi/commit/6ba11f01032afb5282ab9692d814eeb550e4ea72))
* 忘了。。。 ([d7c7a91](https://github.com/ikenxuan/amagi/commit/d7c7a9135e7b92dac38d3133f4b0b0f9123fd183))
* 怎么有些作品老是解析不到评论，可能是游标值问题，先试试传0 ([7873f33](https://github.com/ikenxuan/amagi/commit/7873f331818c367bf2a4f7b891d890cc7354ed85))
* 接受200-299，400-499，以及500及以上的状态码 ([2f3a69a](https://github.com/ikenxuan/amagi/commit/2f3a69a614c9e4c0a5859b8a876ea6e5afe37175))
* 支持自定义传入页码 ([b4937a6](https://github.com/ikenxuan/amagi/commit/b4937a669c9cf38c988a6f8170f00966e24ae3e8))
* 改包名 ([c946aa0](https://github.com/ikenxuan/amagi/commit/c946aa0997b293e2f9e72d8051ee779db32e0578))
* 更新 ([4a0e1ba](https://github.com/ikenxuan/amagi/commit/4a0e1ba20a0a90d8e9a2acd6bce81f5b0396b6d4))
* 更新了 package.json，增加了 chalk 依赖并回退了 fastify 版本 ([6ba11f0](https://github.com/ikenxuan/amagi/commit/6ba11f01032afb5282ab9692d814eeb550e4ea72))
* 更新依赖版本 ([a309bfe](https://github.com/ikenxuan/amagi/commit/a309bfef24afdd8f2501c859105d9697c76f78c8))
* 更新工作流 ([9ef04ed](https://github.com/ikenxuan/amagi/commit/9ef04ed4f989bd16bc08548db7ef4527f380a428))
* 更新工作流 ([8b3b5ae](https://github.com/ikenxuan/amagi/commit/8b3b5ae715e8a126608ae158b0a8709616c2e692))
* 更新工作流 ([f3e5d14](https://github.com/ikenxuan/amagi/commit/f3e5d1410cc42f948019df196508c9be0fb469de))
* 更新工作流 ([4973ec0](https://github.com/ikenxuan/amagi/commit/4973ec0726ecb88f9c756b57f0c129774be1e0c2))
* 更新工作流 ([79d4689](https://github.com/ikenxuan/amagi/commit/79d468921077a9234fb6c5e6a1b9ab4467a9a230))
* 更新文档 ([a7d93ad](https://github.com/ikenxuan/amagi/commit/a7d93ad057e2afae2e091c22a01d92546b852616))
* 替换日志库 ([c435d84](https://github.com/ikenxuan/amagi/commit/c435d84bc9ea0c3e5772cf36cad0dcc74a83402d))
* 未登录不抛出错误 ([e0bbb7d](https://github.com/ikenxuan/amagi/commit/e0bbb7d8e16380ca5e1a5b72481fe0a4ea3679ce))
* 格式化代码 ([0fc1a73](https://github.com/ikenxuan/amagi/commit/0fc1a73c4f94f75f46f3969db04a008ee1596f2d))
* 格式化日志 ([5707049](https://github.com/ikenxuan/amagi/commit/5707049fc3dc98a9abccbc22c15ea6b4ddb949b5))
* 添加请求次数限制和评论增长稳定性检查，防止无限循环 ([e04e647](https://github.com/ikenxuan/amagi/commit/e04e6474eea2ccd6e1ca239a76ffe2c81c9d8260))
* 监听全部地址 ([b615e6d](https://github.com/ikenxuan/amagi/commit/b615e6d781ab617a4876008c26700a36f832da22))
* 监听地址 ([8fbe9c2](https://github.com/ikenxuan/amagi/commit/8fbe9c229e18d4696b2d5cedc23adb5e73048254))
* 直接获取数据不进行封装data ([56de3ad](https://github.com/ikenxuan/amagi/commit/56de3ad93636534c0297441c00d9cf114cf58439))
* 相对路径 ([593db4a](https://github.com/ikenxuan/amagi/commit/593db4a16225c4db86e61fae2df1169af2bf19da))
* 移除md5依赖 ([a309bfe](https://github.com/ikenxuan/amagi/commit/a309bfef24afdd8f2501c859105d9697c76f78c8))
* 移除networks默认导出 ([05009ef](https://github.com/ikenxuan/amagi/commit/05009ef39f0bc233b622b934842a6ef058eaabf8))
* 移除创建实例时的异步 ([a309bfe](https://github.com/ikenxuan/amagi/commit/a309bfef24afdd8f2501c859105d9697c76f78c8))
* 移除小红书相关内容 ([6bc12a3](https://github.com/ikenxuan/amagi/commit/6bc12a3647c8793317ec5cb1a16f88a183e16972))
* 移除无关日志 ([f173c1c](https://github.com/ikenxuan/amagi/commit/f173c1c535a3659e88ac06d8e11b79338774e738))
* 移除无用依赖 ([2e93a70](https://github.com/ikenxuan/amagi/commit/2e93a70dacbc1fa1cafb87534bf156b2c84ca3a7))
* 移除版本控制 ([370fba0](https://github.com/ikenxuan/amagi/commit/370fba04f091bf7319c689305c113011fa2b51fe))
* 细优 ([60990e2](https://github.com/ikenxuan/amagi/commit/60990e238f317ba1c2a27be28248e29e76ecca8b))
* 细节优化 ([f60ab5f](https://github.com/ikenxuan/amagi/commit/f60ab5fc77154dd0a669de4aa0e9e0f88a3e3ca6))
* 细节优化 ([043c0f9](https://github.com/ikenxuan/amagi/commit/043c0f9f30dd6dcde9ab5d721eca75a5cb8ee4e5))
* 细节优化 ([90b6e60](https://github.com/ikenxuan/amagi/commit/90b6e60439f6837d3ca6008890154971369a4439))
* 细节优化 ([217a16c](https://github.com/ikenxuan/amagi/commit/217a16c31c6fad5b57b744ccc19b74ea5040097b))
* 细节优化 ([0c09286](https://github.com/ikenxuan/amagi/commit/0c09286c6765fac64dcb99c41b649004e53c9c5a))
* 细节优化 ([298227d](https://github.com/ikenxuan/amagi/commit/298227dd58cf3b5e8f16437797196e36c1c1024c))
* 细节优化 ([bfbbaa5](https://github.com/ikenxuan/amagi/commit/bfbbaa5524fe50c22276bbd0abdf5d268d0ceac4))
* 细节优化 ([9bb3b00](https://github.com/ikenxuan/amagi/commit/9bb3b0093e300003e41bff4cb718e8044df6c415))
* 细节优化 ([4478920](https://github.com/ikenxuan/amagi/commit/4478920c1b81cbf7b1eac887ea14c39d472d50a5))
* 细节优化timeout ([16a7f48](https://github.com/ikenxuan/amagi/commit/16a7f48ce11db5e04281ee14c1e44d74369df097))
* 继续补全B站api ([5c55c9e](https://github.com/ikenxuan/amagi/commit/5c55c9e24c1f930187a0f6cb2404f921d7cefef3))
* 继续补全B站api接口 ([a23ed93](https://github.com/ikenxuan/amagi/commit/a23ed93315b363809df020ad55b159dab1751360))
* 编译过程中会擦除配置文件的问题 ([7227822](https://github.com/ikenxuan/amagi/commit/722782267192b8ced3cf4f8f6aa9b6351ab95e00))
* 获取直播数据不抛出错误 ([8165b88](https://github.com/ikenxuan/amagi/commit/8165b88c156d490e50f34ae8b24f48b214cbf363))
* 补全相关api ([f1fdcbd](https://github.com/ikenxuan/amagi/commit/f1fdcbd4edc97dcc053f592a07627dee786670bc))
* 请求头未定义 ([74ac224](https://github.com/ikenxuan/amagi/commit/74ac224b423160ee99b404998fb817117bd4f814))
* 调整项目结构 ([c88ae21](https://github.com/ikenxuan/amagi/commit/c88ae21472bee6b5c877ee2de57472fc511b13e6))
* 适配传入ck为空的情况 ([5ea38a2](https://github.com/ikenxuan/amagi/commit/5ea38a248b7ad2ce97f690992619689568173144))
* 重构了amagi类下方 getDouyinData、getBilibiliData 和 getXiaohongshuData 方法，调用它们不用再传入ck ([6ba11f0](https://github.com/ikenxuan/amagi/commit/6ba11f01032afb5282ab9692d814eeb550e4ea72))
* 降低typescript版本 ([2f5b1d8](https://github.com/ikenxuan/amagi/commit/2f5b1d8adc435733f795277e118ce1441aebc39a))
* 额 ([2c13968](https://github.com/ikenxuan/amagi/commit/2c13968081e1c3a83c2da24d25db42ad1f44e478))


### Performance Improvements

* cnm npmjs ([a7a10fe](https://github.com/ikenxuan/amagi/commit/a7a10fe805ed0f3e5a071cc3fa01e2089d2bcbbd))
* cnm npmjs ([db27d5d](https://github.com/ikenxuan/amagi/commit/db27d5dff157ba5c56dd49b689a86eecc9c3f429))
* readme.md ([9dfddaf](https://github.com/ikenxuan/amagi/commit/9dfddafb703aa9c6a0fed743d5c78ca620eb15d5))
* 为Douyin和Bilibili数据选项添加映射类型 ([a4da7a2](https://github.com/ikenxuan/amagi/commit/a4da7a265b04c67169d48d013dba0bd5a19fbcc5))
* 优化类型 ([590f00f](https://github.com/ikenxuan/amagi/commit/590f00f211577728c0bdfb1d916bfcab2c6c2a0d))
* 优化类型，使用小驼峰命名函数 ([41a4c29](https://github.com/ikenxuan/amagi/commit/41a4c290d582e60e52f4b032a112f38a04f71a96))
* 优化类型注释 ([f726e2e](https://github.com/ikenxuan/amagi/commit/f726e2e1ac7f9c41d0ff0b00c447afe18f691edb))
* 快速获取数据方法中，参数二、三改为可选 ([a7fed2b](https://github.com/ikenxuan/amagi/commit/a7fed2b6c6f4465f8feabba72d57088e1b99c1fb))
* 更新编译检查脚本 ([6ba11f0](https://github.com/ikenxuan/amagi/commit/6ba11f01032afb5282ab9692d814eeb550e4ea72))
* 类型注释 ([0728d95](https://github.com/ikenxuan/amagi/commit/0728d958308e0e612de821d5fe1071d8da7238e8))
* 细节优化 ([b6f8b20](https://github.com/ikenxuan/amagi/commit/b6f8b20d9d9dd074b1a0f52e0e5ec0f8e6eadfec))
* 细节优化抖音获取评论的逻辑 ([935a432](https://github.com/ikenxuan/amagi/commit/935a432b3b15c52f382d630f600ae000a74ea06d))


### Code Refactoring

* **readme:** 更新amagi包的README以反映API变化 ([5f3e344](https://github.com/ikenxuan/amagi/commit/5f3e34481bf3008d0353d697ab3ecb4fa0491e0e))
* **server:** 更新客户端方法并标记为废弃 ([6e113be](https://github.com/ikenxuan/amagi/commit/6e113beef5580293a1f18b883b073776a66698c5))

## [3.4.4](https://github.com/ikenxuan/amagi/compare/v3.4.3...v3.4.4) (2024-12-20)


### Bug Fixes

* 怎么有些作品老是解析不到评论，可能是游标值问题，先试试传0 ([7873f33](https://github.com/ikenxuan/amagi/commit/7873f331818c367bf2a4f7b891d890cc7354ed85))

## [3.4.3](https://github.com/ikenxuan/amagi/compare/v3.4.2...v3.4.3) (2024-11-24)


### Performance Improvements

* cnm npmjs ([a7a10fe](https://github.com/ikenxuan/amagi/commit/a7a10fe805ed0f3e5a071cc3fa01e2089d2bcbbd))

## [3.4.2](https://github.com/ikenxuan/amagi/compare/v3.4.1...v3.4.2) (2024-11-23)


### Performance Improvements

* cnm npmjs ([db27d5d](https://github.com/ikenxuan/amagi/commit/db27d5dff157ba5c56dd49b689a86eecc9c3f429))

## [3.4.1](https://github.com/ikenxuan/amagi/compare/v3.4.0...v3.4.1) (2024-11-23)


### Bug Fixes

* 获取直播数据不抛出错误 ([8165b88](https://github.com/ikenxuan/amagi/commit/8165b88c156d490e50f34ae8b24f48b214cbf363))

## [3.4.0](https://github.com/ikenxuan/amagi/compare/v3.3.0...v3.4.0) (2024-11-16)


### Features

* B站新增获取UP主总播放量接口 ([a1ed8e1](https://github.com/ikenxuan/amagi/commit/a1ed8e19d3b95af13238aa3a3e05b53e5f7d758c))

## [3.3.0](https://github.com/ikenxuan/amagi/compare/v3.2.5...v3.3.0) (2024-11-14)


### Features

* 新增手数据接口相关功能，包括API定义、数据获取逻辑及客户端接口集成。新增文件包含快手API的实现、数据获取类及结果处理逻辑，同时更新了相关类型定义以支持快手的数据结构。 ([7831ce1](https://github.com/ikenxuan/amagi/commit/7831ce1148d9f286e8e9f84620f701ffc699e5c2))


### Bug Fixes

* 修正了Bili和Douyin数据模块中的"emoji数据"名称为"Emoji数据" ([30e9de5](https://github.com/ikenxuan/amagi/commit/30e9de5df7fa7b5ebe4f9091cf3f19ce8eb7a8ed))

## [3.2.5](https://github.com/ikenxuan/amagi/compare/v3.2.4...v3.2.5) (2024-11-09)


### Bug Fixes

* 修复直播间信息参数错误 ([46706a6](https://github.com/ikenxuan/amagi/commit/46706a645b1b3b7999d048831e596342e808a18c))

## [3.2.4](https://github.com/ikenxuan/amagi/compare/v3.2.3...v3.2.4) (2024-11-08)


### Bug Fixes

* 导出的Amagi改为函数 ([e099c28](https://github.com/ikenxuan/amagi/commit/e099c28eb2e6f8fbb8934c76e87241671f257272))


### Performance Improvements

* 优化类型 ([590f00f](https://github.com/ikenxuan/amagi/commit/590f00f211577728c0bdfb1d916bfcab2c6c2a0d))
* 优化类型，使用小驼峰命名函数 ([41a4c29](https://github.com/ikenxuan/amagi/commit/41a4c290d582e60e52f4b032a112f38a04f71a96))
* 优化类型注释 ([f726e2e](https://github.com/ikenxuan/amagi/commit/f726e2e1ac7f9c41d0ff0b00c447afe18f691edb))
* 类型注释 ([0728d95](https://github.com/ikenxuan/amagi/commit/0728d958308e0e612de821d5fe1071d8da7238e8))
* 细节优化 ([b6f8b20](https://github.com/ikenxuan/amagi/commit/b6f8b20d9d9dd074b1a0f52e0e5ec0f8e6eadfec))

## [3.2.3](https://github.com/ikenxuan/amagi/compare/v3.2.2...v3.2.3) (2024-10-18)


### Bug Fixes

* 忘了。。。 ([d7c7a91](https://github.com/ikenxuan/amagi/commit/d7c7a9135e7b92dac38d3133f4b0b0f9123fd183))

## [3.2.2](https://github.com/ikenxuan/amagi/compare/v3.2.1...v3.2.2) (2024-10-18)


### Bug Fixes

* 修复番剧数据获取 ([5b9cb57](https://github.com/ikenxuan/amagi/commit/5b9cb57ac5347032847c161c25b679ada60bae79))

## [3.2.1](https://github.com/ikenxuan/amagi/compare/v3.2.0...v3.2.1) (2024-10-11)


### Bug Fixes

* 完善登录接口 ([ec61540](https://github.com/ikenxuan/amagi/commit/ec61540deb6b41dd16446d2d4e0c2cc353008144))

## [3.2.0](https://github.com/ikenxuan/amagi/compare/v3.1.2...v3.2.0) (2024-10-04)


### Features

* 新增AV与BV互转功能并优化部分接口命名 ([0173af2](https://github.com/ikenxuan/amagi/commit/0173af2e0fcc0405033c1a125832472275212aca))


### Bug Fixes

* B站评论数据去重 ([8bb1240](https://github.com/ikenxuan/amagi/commit/8bb1240fcb2886e866c66b7004acac2747242a6f))
* 优化了 Fastify 服务器的初始化和启动流程 ([6ba11f0](https://github.com/ikenxuan/amagi/commit/6ba11f01032afb5282ab9692d814eeb550e4ea72))
* 优化日志显示 ([5687424](https://github.com/ikenxuan/amagi/commit/568742469400995b8c689380a137c4fa1499a801))
* 修复B站评论数量请求数量为0的bug ([935a432](https://github.com/ikenxuan/amagi/commit/935a432b3b15c52f382d630f600ae000a74ea06d))
* 修复抖音返回评论为null导致的错误 ([9781dfc](https://github.com/ikenxuan/amagi/commit/9781dfcd557bf942957ef7356987a20df6e4a466))
* 修复搜索接口 ([0173af2](https://github.com/ikenxuan/amagi/commit/0173af2e0fcc0405033c1a125832472275212aca))
* 引入 chalk 库以支持命令行彩色日志输出 ([6ba11f0](https://github.com/ikenxuan/amagi/commit/6ba11f01032afb5282ab9692d814eeb550e4ea72))
* 接受200-299，400-499，以及500及以上的状态码 ([2f3a69a](https://github.com/ikenxuan/amagi/commit/2f3a69a614c9e4c0a5859b8a876ea6e5afe37175))
* 更新了 package.json，增加了 chalk 依赖并回退了 fastify 版本 ([6ba11f0](https://github.com/ikenxuan/amagi/commit/6ba11f01032afb5282ab9692d814eeb550e4ea72))
* 添加请求次数限制和评论增长稳定性检查，防止无限循环 ([e04e647](https://github.com/ikenxuan/amagi/commit/e04e6474eea2ccd6e1ca239a76ffe2c81c9d8260))
* 移除小红书相关内容 ([6bc12a3](https://github.com/ikenxuan/amagi/commit/6bc12a3647c8793317ec5cb1a16f88a183e16972))
* 重构了amagi类下方 getDouyinData、getBilibiliData 和 getXiaohongshuData 方法，调用它们不用再传入ck ([6ba11f0](https://github.com/ikenxuan/amagi/commit/6ba11f01032afb5282ab9692d814eeb550e4ea72))


### Performance Improvements

* 更新编译检查脚本 ([6ba11f0](https://github.com/ikenxuan/amagi/commit/6ba11f01032afb5282ab9692d814eeb550e4ea72))
* 细节优化抖音获取评论的逻辑 ([935a432](https://github.com/ikenxuan/amagi/commit/935a432b3b15c52f382d630f600ae000a74ea06d))

## [3.1.2](https://github.com/ikenxuan/amagi/compare/v3.1.1...v3.1.2) (2024-09-29)


### Bug Fixes

* 修改超时时间为15s ([91c47be](https://github.com/ikenxuan/amagi/commit/91c47befac4472d8a94dfb494aa06b1668cf7ad1))
* 支持自定义传入页码 ([b4937a6](https://github.com/ikenxuan/amagi/commit/b4937a669c9cf38c988a6f8170f00966e24ae3e8))

## [3.1.1](https://github.com/ikenxuan/amagi/compare/v3.1.0...v3.1.1) (2024-09-28)


### Bug Fixes

* 修复获取抖音使用aweme_id获取数据失败 ([4f2a6f7](https://github.com/ikenxuan/amagi/commit/4f2a6f7df3cc30d1c0311bb4a6d9385b82676f00))
* 在BilibiliResult中，为单个视频下载信息数据的获取增加了一个条件判断。现在，如果options中的url未定义，将直接调用GetData，否则将通过处理options中的url来获取数据。 ([1bce96c](https://github.com/ikenxuan/amagi/commit/1bce96c0a88098213d330e042ae5c32a73bb5c3c))
* 处理B站接口单次接口返回评论数量不足20条的情况 ([6a1172c](https://github.com/ikenxuan/amagi/commit/6a1172cec7a242802631921cede7d96334f0bdab))
* 额 ([2c13968](https://github.com/ikenxuan/amagi/commit/2c13968081e1c3a83c2da24d25db42ad1f44e478))

## [3.1.0](https://github.com/ikenxuan/amagi/compare/v3.0.0...v3.1.0) (2024-09-27)


### Features

* B站评论数量可无限制获取 ([113a8b4](https://github.com/ikenxuan/amagi/commit/113a8b43f9fac16a8b3a7021eba31ee2896e53f1))
* 抖音评论数量可无限制获取 ([8bfceac](https://github.com/ikenxuan/amagi/commit/8bfceac0e1ba2c87cb0d607b2ee227af7482dfeb))


### Bug Fixes

* 细节优化 ([f60ab5f](https://github.com/ikenxuan/amagi/commit/f60ab5fc77154dd0a669de4aa0e9e0f88a3e3ca6))

## [3.0.0](https://github.com/ikenxuan/amagi/compare/v2.3.1...v3.0.0) (2024-09-24)


### ⚠ BREAKING CHANGES

* **server:** 旧的`GetDouyinData`、`GetBilibiliData`和`GetXiaohongshuData`方法已被废弃， 请使用小写的`getDouyinData`、`getBilibiliData`和`getXiaohongshuData`方法。
* **server:** 旧的`GetDouyinData`、`GetBilibiliData`和`GetXiaohongshuData`方法已被废弃， 请使用小写的`getDouyinData`、`getBilibiliData`和`getXiaohongshuData`方法。

### Features

* 取稿件下载信息新增传入url ([7a2eeab](https://github.com/ikenxuan/amagi/commit/7a2eeab5142097fd1adac1e5e41c20ecdffc4e8a))
* 增加测试工作流 ([f1f10f7](https://github.com/ikenxuan/amagi/commit/f1f10f7c7289a6ed9f8491fab21788ac3abdb64d))
* 增加部分逻辑 ([88c5937](https://github.com/ikenxuan/amagi/commit/88c59370481f26233e2ed090746d6334bb312b6c))


### Bug Fixes

* **pkg:** 更新依赖 ([f400857](https://github.com/ikenxuan/amagi/commit/f400857618570b885146a24722e0bd0aedb783e8))
* **server:** 更新客户端方法并标记为废弃 ([4102483](https://github.com/ikenxuan/amagi/commit/4102483c519a33929aa783f15f9db6168dec7b4b))
* **server:** 更新客户端方法并标记为废弃 ([a65e9eb](https://github.com/ikenxuan/amagi/commit/a65e9eb2e0bb5076fbc75537d9e088213d1fd595))
* 修改部分逻辑 ([ea77ade](https://github.com/ikenxuan/amagi/commit/ea77adeb690c772f20df7db03b46d16ad414cc0a))
* 更新依赖版本 ([a309bfe](https://github.com/ikenxuan/amagi/commit/a309bfef24afdd8f2501c859105d9697c76f78c8))
* 移除md5依赖 ([a309bfe](https://github.com/ikenxuan/amagi/commit/a309bfef24afdd8f2501c859105d9697c76f78c8))
* 移除networks默认导出 ([05009ef](https://github.com/ikenxuan/amagi/commit/05009ef39f0bc233b622b934842a6ef058eaabf8))
* 移除创建实例时的异步 ([a309bfe](https://github.com/ikenxuan/amagi/commit/a309bfef24afdd8f2501c859105d9697c76f78c8))
* 细节优化 ([043c0f9](https://github.com/ikenxuan/amagi/commit/043c0f9f30dd6dcde9ab5d721eca75a5cb8ee4e5))
* 细节优化 ([90b6e60](https://github.com/ikenxuan/amagi/commit/90b6e60439f6837d3ca6008890154971369a4439))


### Performance Improvements

* 快速获取数据方法中，参数二、三改为可选 ([a7fed2b](https://github.com/ikenxuan/amagi/commit/a7fed2b6c6f4465f8feabba72d57088e1b99c1fb))


### Code Refactoring

* **server:** 更新客户端方法并标记为废弃 ([6e113be](https://github.com/ikenxuan/amagi/commit/6e113beef5580293a1f18b883b073776a66698c5))

## [2.3.1](https://github.com/ikenxuan/amagi/compare/v2.3.0...v2.3.1) (2024-09-14)


### Bug Fixes

* **index.ts:** 更新获取抖音和B站数据的函数参数类型 ([6065554](https://github.com/ikenxuan/amagi/commit/60655546de1412f1b929b49e04d6513b58250b17))
* 升级axios和typescript包 ([f6fc45d](https://github.com/ikenxuan/amagi/commit/f6fc45d8571a0ed1c6468effbf655e49c8632804))
* 降低typescript版本 ([2f5b1d8](https://github.com/ikenxuan/amagi/commit/2f5b1d8adc435733f795277e118ce1441aebc39a))


### Performance Improvements

* readme.md ([9dfddaf](https://github.com/ikenxuan/amagi/commit/9dfddafb703aa9c6a0fed743d5c78ca620eb15d5))
* 为Douyin和Bilibili数据选项添加映射类型 ([a4da7a2](https://github.com/ikenxuan/amagi/commit/a4da7a265b04c67169d48d013dba0bd5a19fbcc5))

## [2.3.0](https://github.com/ikenxuan/amagi/compare/v2.2.0...v2.3.0) (2024-08-30)


### Features

* 增加抖音获取登录二维码接口 ([76642c5](https://github.com/ikenxuan/amagi/commit/76642c59048eb17ad048bd2c1da135cd0675f47c))

## [2.2.0](https://github.com/ikenxuan/amagi/compare/v2.1.6...v2.2.0) (2024-08-26)


### Features

* 新增直播间信息接口 ([4c5d55b](https://github.com/ikenxuan/amagi/commit/4c5d55bfb49bca54b6016842114021532262a662))

## [2.1.6](https://github.com/ikenxuan/amagi/compare/v2.1.5...v2.1.6) (2024-08-19)


### Bug Fixes

* 未登录不抛出错误 ([e0bbb7d](https://github.com/ikenxuan/amagi/commit/e0bbb7d8e16380ca5e1a5b72481fe0a4ea3679ce))

## [2.1.5](https://github.com/ikenxuan/amagi/compare/v2.1.4...v2.1.5) (2024-08-19)


### Bug Fixes

* 细节优化 ([217a16c](https://github.com/ikenxuan/amagi/commit/217a16c31c6fad5b57b744ccc19b74ea5040097b))
* 适配传入ck为空的情况 ([5ea38a2](https://github.com/ikenxuan/amagi/commit/5ea38a248b7ad2ce97f690992619689568173144))

## [2.1.4](https://github.com/ikenxuan/amagi/compare/v2.1.3...v2.1.4) (2024-08-17)


### Bug Fixes

* live图图集 ([1e39461](https://github.com/ikenxuan/amagi/commit/1e39461e4915c57454f08b33987da87d606eee8e))
* 修复部分bug ([9e3369c](https://github.com/ikenxuan/amagi/commit/9e3369c7b42390cb9fda28f7526a8e2c6d264090))

## [2.1.3](https://github.com/ikenxuan/amagi/compare/v2.1.2...v2.1.3) (2024-08-17)


### Bug Fixes

* 修复无法自定义获取评论数量 ([c460a32](https://github.com/ikenxuan/amagi/commit/c460a32a1d907945d9ceda713428eaca7f9e9e74))
* 细节优化 ([0c09286](https://github.com/ikenxuan/amagi/commit/0c09286c6765fac64dcb99c41b649004e53c9c5a))
* 补全相关api ([f1fdcbd](https://github.com/ikenxuan/amagi/commit/f1fdcbd4edc97dcc053f592a07627dee786670bc))

## [2.1.2](https://github.com/ikenxuan/amagi/compare/v2.1.1...v2.1.2) (2024-08-17)


### Bug Fixes

* 增加可选参数 ([24337ee](https://github.com/ikenxuan/amagi/commit/24337ee83d58200a68c9374a6782322a35a301e7))
* 直接获取数据不进行封装data ([56de3ad](https://github.com/ikenxuan/amagi/commit/56de3ad93636534c0297441c00d9cf114cf58439))
* 细节优化 ([298227d](https://github.com/ikenxuan/amagi/commit/298227dd58cf3b5e8f16437797196e36c1c1024c))

## [2.1.1](https://github.com/ikenxuan/amagi/compare/v2.1.0...v2.1.1) (2024-08-16)


### Bug Fixes

* 移除无用依赖 ([2e93a70](https://github.com/ikenxuan/amagi/commit/2e93a70dacbc1fa1cafb87534bf156b2c84ca3a7))

## [2.1.0](https://github.com/ikenxuan/amagi/compare/v2.0.1...v2.1.0) (2024-08-16)


### Features

* **data:** 更新数据获取逻辑和方法 ([6ce8b11](https://github.com/ikenxuan/amagi/commit/6ce8b111f90eaf7afbd803209d24ad4a58d40ab9))


### Bug Fixes

* 修复抖音部分无法获取对应数据 ([c470b74](https://github.com/ikenxuan/amagi/commit/c470b74b7c6281c04f50d52fa04f5d0efcb0e24d))
* 格式化代码 ([0fc1a73](https://github.com/ikenxuan/amagi/commit/0fc1a73c4f94f75f46f3969db04a008ee1596f2d))

## [2.0.1](https://github.com/ikenxuan/amagi/compare/v2.0.0...v2.0.1) (2024-08-09)


### Bug Fixes

* 优化文档 ([9b10faa](https://github.com/ikenxuan/amagi/commit/9b10faaf4013c899e42fd9db08f333e5b016d6d2))
* 细节优化timeout ([16a7f48](https://github.com/ikenxuan/amagi/commit/16a7f48ce11db5e04281ee14c1e44d74369df097))

## [2.0.0](https://github.com/ikenxuan/amagi/compare/v1.5.9...v2.0.0) (2024-08-09)


### ⚠ BREAKING CHANGES

* **readme:** 由于重构了API端点和数据类型枚举，现有的客户端代码可能需要更新以匹配新的结构和枚举值。

### Code Refactoring

* **readme:** 更新amagi包的README以反映API变化 ([5f3e344](https://github.com/ikenxuan/amagi/commit/5f3e34481bf3008d0353d697ab3ecb4fa0491e0e))

## [1.5.9](https://github.com/ikenxuan/amagi/compare/v1.5.8...v1.5.9) (2024-08-08)


### Bug Fixes

* /和/docs重定向到api文档 ([18999cf](https://github.com/ikenxuan/amagi/commit/18999cf11218bd8f0ed540adc578789b2a705c62))
* 格式化日志 ([5707049](https://github.com/ikenxuan/amagi/commit/5707049fc3dc98a9abccbc22c15ea6b4ddb949b5))

## [1.5.8](https://github.com/ikenxuan/amagi/compare/v1.5.7...v1.5.8) (2024-08-08)


### Bug Fixes

* cookies换行 ([b06aa6e](https://github.com/ikenxuan/amagi/commit/b06aa6eb8b4b0c9ecaca9fb66ef45902374214b2))
* dev模式下自动重载 ([402a3cf](https://github.com/ikenxuan/amagi/commit/402a3cfad1d7a899b0c9861129806b94f542a464))
* import ([ea782c1](https://github.com/ikenxuan/amagi/commit/ea782c1a3a14e5a1efffab2040ffec974282b794))
* 使用axios替换node-fetch ([0c93f6f](https://github.com/ikenxuan/amagi/commit/0c93f6f31731514727d3c1739d2c4bd13ab514db))
* 细优 ([60990e2](https://github.com/ikenxuan/amagi/commit/60990e238f317ba1c2a27be28248e29e76ecca8b))

## [1.5.7](https://github.com/ikenxuan/amagi/compare/v1.5.6...v1.5.7) (2024-08-08)


### Bug Fixes

* BilibiliAPI的评论区明细接口的默认参数设置 ([277e997](https://github.com/ikenxuan/amagi/commit/277e997a54ebd4fd5b01e6b892776adfd0b3f785))

## [1.5.6](https://github.com/ikenxuan/amagi/compare/v1.5.5...v1.5.6) (2024-08-08)


### Bug Fixes

* auto format ([9d4190f](https://github.com/ikenxuan/amagi/commit/9d4190f4952c9f513de04e2803191d931c83b463))
* 使用在线api文档 ([3fc534b](https://github.com/ikenxuan/amagi/commit/3fc534b17190beaaddc6009b5dabc3da03770084))

## [1.5.5](https://github.com/ikenxuan/amagi/compare/v1.5.4...v1.5.5) (2024-08-07)


### Bug Fixes

* 修复算法 ([a1a973f](https://github.com/ikenxuan/amagi/commit/a1a973f8558623d557dbd1992faca71435276433))

## [1.5.4](https://github.com/ikenxuan/amagi/compare/v1.5.3...v1.5.4) (2024-08-07)


### Bug Fixes

* 使用ts重写a_bogus算法 ([08a141c](https://github.com/ikenxuan/amagi/commit/08a141ce0a00b9e686f71e4d38a2bd07ee7051b8))

## [1.5.3](https://github.com/ikenxuan/amagi/compare/v1.5.2...v1.5.3) (2024-08-06)


### Bug Fixes

* 相对路径 ([593db4a](https://github.com/ikenxuan/amagi/commit/593db4a16225c4db86e61fae2df1169af2bf19da))

## [1.5.2](https://github.com/ikenxuan/amagi/compare/v1.5.1...v1.5.2) (2024-08-06)


### Bug Fixes

* 修复npm包缺少的openapi.json ([ab45033](https://github.com/ikenxuan/amagi/commit/ab45033c8574c8ed2b6ff95eae53f474d27a1228))

## [1.5.1](https://github.com/ikenxuan/amagi/compare/v1.5.0...v1.5.1) (2024-08-06)


### Bug Fixes

* 更新工作流 ([9ef04ed](https://github.com/ikenxuan/amagi/commit/9ef04ed4f989bd16bc08548db7ef4527f380a428))

## [1.5.0](https://github.com/ikenxuan/amagi/compare/v1.4.9...v1.5.0) (2024-08-06)


### Features

* **server:** 添加 Swagger 文档和接口注释 ([f3480be](https://github.com/ikenxuan/amagi/commit/f3480be387aeeaeaccb1f589c076252c367d4f9f))

## [1.4.9](https://github.com/ikenxuan/amagi/compare/v1.4.8...v1.4.9) (2024-08-06)


### Bug Fixes

* 监听地址 ([8fbe9c2](https://github.com/ikenxuan/amagi/commit/8fbe9c229e18d4696b2d5cedc23adb5e73048254))

## [1.4.8](https://github.com/ikenxuan/amagi/compare/v1.4.7...v1.4.8) (2024-08-06)


### Bug Fixes

* 细节优化 ([bfbbaa5](https://github.com/ikenxuan/amagi/commit/bfbbaa5524fe50c22276bbd0abdf5d268d0ceac4))

## [1.4.7](https://github.com/ikenxuan/amagi/compare/v1.4.6...v1.4.7) (2024-08-06)


### Bug Fixes

* 监听全部地址 ([b615e6d](https://github.com/ikenxuan/amagi/commit/b615e6d781ab617a4876008c26700a36f832da22))

## [1.4.6](https://github.com/ikenxuan/amagi/compare/v1.4.5...v1.4.6) (2024-08-06)


### Bug Fixes

* 替换日志库 ([c435d84](https://github.com/ikenxuan/amagi/commit/c435d84bc9ea0c3e5772cf36cad0dcc74a83402d))

## [1.4.5](https://github.com/ikenxuan/amagi/compare/v1.4.4...v1.4.5) (2024-08-06)


### Bug Fixes

* 外部调用 ([19170cc](https://github.com/ikenxuan/amagi/commit/19170cc5b3c699fa8b1e41d5219190b64780d70c))

## [1.4.4](https://github.com/ikenxuan/amagi/compare/v1.4.3...v1.4.4) (2024-08-06)


### Bug Fixes

* 修改部分功能 ([ce68e4f](https://github.com/ikenxuan/amagi/commit/ce68e4fe5d826e2fadd8a45f406ff326b590e65f))

## [1.4.3](https://github.com/ikenxuan/amagi/compare/v1.4.2...v1.4.3) (2024-07-22)


### Bug Fixes

* 更新文档 ([a7d93ad](https://github.com/ikenxuan/amagi/commit/a7d93ad057e2afae2e091c22a01d92546b852616))
* 细节优化 ([9bb3b00](https://github.com/ikenxuan/amagi/commit/9bb3b0093e300003e41bff4cb718e8044df6c415))

## [1.4.2](https://github.com/ikenxuan/amagi/compare/v1.4.1...v1.4.2) (2024-07-22)


### Bug Fixes

* 改包名 ([c946aa0](https://github.com/ikenxuan/amagi/commit/c946aa0997b293e2f9e72d8051ee779db32e0578))
* 更新文档 ([a7d93ad](https://github.com/ikenxuan/amagi/commit/a7d93ad057e2afae2e091c22a01d92546b852616))

## [1.4.1](https://github.com/ikenxuan/amagi/compare/v1.4.0...v1.4.1) (2024-07-22)


### Bug Fixes

* 修复编译命令 ([7317056](https://github.com/ikenxuan/amagi/commit/73170564025de7eb2e5c5add5962dd4f6ee4920f))

## [1.4.0](https://github.com/ikenxuan/amagi/compare/v1.3.10...v1.4.0) (2024-07-22)


### Features

* 支持外部调用 ([1f285f4](https://github.com/ikenxuan/amagi/commit/1f285f47ceb07699870525f335f060412a2da404))


### Bug Fixes

* 细节优化 ([4478920](https://github.com/ikenxuan/amagi/commit/4478920c1b81cbf7b1eac887ea14c39d472d50a5))

## [1.3.10](https://github.com/ikenxuan/amagi/compare/v1.3.9...v1.3.10) (2024-07-20)


### Bug Fixes

* 修改文档 ([a14c629](https://github.com/ikenxuan/amagi/commit/a14c629af90458e8093dfd91f48c9252e6b71db4))

## [1.3.9](https://github.com/ikenxuan/amagi/compare/v1.3.8...v1.3.9) (2024-07-20)


### Bug Fixes

* github action ([17f60e4](https://github.com/ikenxuan/amagi/commit/17f60e49a0101319bdcdc67f0c85d7ef12853578))

## [1.3.8](https://github.com/ikenxuan/amagi/compare/v1.3.7...v1.3.8) (2024-07-20)


### Bug Fixes

* action ([8c6713b](https://github.com/ikenxuan/amagi/commit/8c6713b1d2af781b67af85e5275e51eec6252fda))

## [1.3.7](https://github.com/ikenxuan/amagi/compare/v1.3.6...v1.3.7) (2024-07-20)


### Bug Fixes

* action ([b0af0d9](https://github.com/ikenxuan/amagi/commit/b0af0d9ef500282105f027f71105b17ae37db009))

## [1.3.6](https://github.com/ikenxuan/amagi/compare/v1.3.5...v1.3.6) (2024-07-20)


### Bug Fixes

* 更新 ([4a0e1ba](https://github.com/ikenxuan/amagi/commit/4a0e1ba20a0a90d8e9a2acd6bce81f5b0396b6d4))

## [1.3.5](https://github.com/ikenxuan/amagi/compare/v1.3.4...v1.3.5) (2024-07-20)


### Bug Fixes

* 修复编译错误 ([8d07358](https://github.com/ikenxuan/amagi/commit/8d07358ec1631b20ae812b271c8f701194ed4670))

## [1.3.4](https://github.com/ikenxuan/amagi/compare/v1.3.3...v1.3.4) (2024-07-20)


### Bug Fixes

* 更新工作流 ([8b3b5ae](https://github.com/ikenxuan/amagi/commit/8b3b5ae715e8a126608ae158b0a8709616c2e692))

## [1.3.3](https://github.com/ikenxuan/amagi/compare/v1.3.2...v1.3.3) (2024-07-20)


### Bug Fixes

* 修复B站部分接口错误 ([d51c185](https://github.com/ikenxuan/amagi/commit/d51c185b5bebd7367766bea9cd7d2e55f24f8b79))
* 修复pm2后台运行 ([77df451](https://github.com/ikenxuan/amagi/commit/77df451dd9f29aa0276e75b6ed417955cac87cab))
* 修复启动命令错误 ([2e01472](https://github.com/ikenxuan/amagi/commit/2e01472a667cc888b54c6b9072457d3f5eb70355))
* 修复配置文件格式不正确 ([69581fe](https://github.com/ikenxuan/amagi/commit/69581fed8b6d64635f49f82ac45f6ba43aaf2fd4))
* 增加日志 ([63b8861](https://github.com/ikenxuan/amagi/commit/63b8861300e4b74c62c23e11c381eada08f68ddf))
* 更新工作流 ([f3e5d14](https://github.com/ikenxuan/amagi/commit/f3e5d1410cc42f948019df196508c9be0fb469de))
* 继续补全B站api ([5c55c9e](https://github.com/ikenxuan/amagi/commit/5c55c9e24c1f930187a0f6cb2404f921d7cefef3))
* 继续补全B站api接口 ([a23ed93](https://github.com/ikenxuan/amagi/commit/a23ed93315b363809df020ad55b159dab1751360))

## [1.3.2](https://github.com/ikenxuan/amagi/compare/v1.3.1...v1.3.2) (2024-07-19)


### Bug Fixes

* 更新工作流 ([4973ec0](https://github.com/ikenxuan/amagi/commit/4973ec0726ecb88f9c756b57f0c129774be1e0c2))

## [1.3.1](https://github.com/ikenxuan/amagi/compare/v1.3.0...v1.3.1) (2024-07-19)


### Bug Fixes

* 弃用fastifyStatic ([5061c4a](https://github.com/ikenxuan/amagi/commit/5061c4af7cfae9a799f6d2e45f6912ff2d061011))
* 更新工作流 ([79d4689](https://github.com/ikenxuan/amagi/commit/79d468921077a9234fb6c5e6a1b9ab4467a9a230))

## [1.3.0](https://github.com/ikenxuan/amagi/compare/v1.2.0...v1.3.0) (2024-07-19)


### Features

* 初步添加哔哩哔哩接口(未完善) ([c88ae21](https://github.com/ikenxuan/amagi/commit/c88ae21472bee6b5c877ee2de57472fc511b13e6))


### Bug Fixes

* cfgtype ([5ddffa4](https://github.com/ikenxuan/amagi/commit/5ddffa48657c782fec2ee7fe85f8da756f3faab8))
* 三元表达式判断错误 ([24ebc19](https://github.com/ikenxuan/amagi/commit/24ebc1913d672fdb1c61923636de702ee9ea74d4))
* 使用ts-node调试ts ([2305efd](https://github.com/ikenxuan/amagi/commit/2305efd655dd64bc60093bcf74b70d9b373c6b9b))
* 修改日志呈现形式 ([f490739](https://github.com/ikenxuan/amagi/commit/f4907391c79792eacf71f712656d3b142a6dda84))
* 移除无关日志 ([f173c1c](https://github.com/ikenxuan/amagi/commit/f173c1c535a3659e88ac06d8e11b79338774e738))
* 请求头未定义 ([74ac224](https://github.com/ikenxuan/amagi/commit/74ac224b423160ee99b404998fb817117bd4f814))
* 调整项目结构 ([c88ae21](https://github.com/ikenxuan/amagi/commit/c88ae21472bee6b5c877ee2de57472fc511b13e6))

## [1.2.0](https://github.com/ikenxuan/amagi/compare/v1.1.3...v1.2.0) (2024-07-18)


### Features

* tsx ([b4074db](https://github.com/ikenxuan/amagi/commit/b4074db39ce4c8a5f387175e9b6a8fd1d7117c92))
* 使用log4js库记录日志 ([cecf4d6](https://github.com/ikenxuan/amagi/commit/cecf4d61848c83d03b326c8d160b402b80840149))


### Bug Fixes

* 优化NetworksConfigType定义 ([cf70959](https://github.com/ikenxuan/amagi/commit/cf709593fbc8946d3a985478fc3b744fc1f869fe))
* 优化目录结构，移除common.ts ([51db245](https://github.com/ikenxuan/amagi/commit/51db245ce03060e8d08690182a33212875cf2604))
* 优化类型声明 ([21d80b6](https://github.com/ikenxuan/amagi/commit/21d80b659252e325e58443a83165f4f47793885c))
* 写死4567端口 ([b69eafc](https://github.com/ikenxuan/amagi/commit/b69eafc0e6374bf4d92275bb80a4cd2141271d66))
* 编译过程中会擦除配置文件的问题 ([7227822](https://github.com/ikenxuan/amagi/commit/722782267192b8ced3cf4f8f6aa9b6351ab95e00))

## [1.1.3](https://github.com/ikenxuan/amagi/compare/v1.1.2...v1.1.3) (2024-07-18)


### Bug Fixes

* 移除版本控制 ([370fba0](https://github.com/ikenxuan/amagi/commit/370fba04f091bf7319c689305c113011fa2b51fe))

## [1.1.2](https://github.com/ikenxuan/amagi/compare/v1.1.1...v1.1.2) (2024-07-18)


### Bug Fixes

* 修改工作流 ([7d88532](https://github.com/ikenxuan/amagi/commit/7d885326b752eb9379645e5299aae94b0babef77))

## [1.1.1](https://github.com/ikenxuan/amagi/compare/v1.1.0...v1.1.1) (2024-07-18)


### Bug Fixes

* 修改工作流 ([3136d84](https://github.com/ikenxuan/amagi/commit/3136d848f3c8f2d2d40a88fcb3773529a9a12c5c))

## [1.1.0](https://github.com/ikenxuan/amagi/compare/v1.0.0...v1.1.0) (2024-07-18)


### Features

* 新增文档 ([3689456](https://github.com/ikenxuan/amagi/commit/368945688afa32342b9a990be4eca46140d3b96b))


### Bug Fixes

* 删除无关文件 ([8aded9d](https://github.com/ikenxuan/amagi/commit/8aded9dafe7420a1fe38b642a4830511808c498c))

## 1.0.0 (2024-07-18)


### Bug Fixes

* 启动前执行安装依赖 ([84c8885](https://github.com/ikenxuan/amagi/commit/84c88857cd73de74926bc1c82a34afd1e46c8d08))

## [1.3.0](https://github.com/ikenxuan/zuks/compare/v1.2.0...v1.3.0) (2024-07-18)


### Features

* 新增08 ([2c9d8fc](https://github.com/ikenxuan/zuks/commit/2c9d8fc3c272cb96dd6501ec02d953640aa892b7))

## [1.2.0](https://github.com/ikenxuan/zuks/compare/v1.1.0...v1.2.0) (2024-07-18)


### Features

* xinzengfile ([5f147d6](https://github.com/ikenxuan/zuks/commit/5f147d61c07c5a7e8eb9398a2881f1e50357a384))
* zzz ([dc40218](https://github.com/ikenxuan/zuks/commit/dc4021868f462820ca175dc22449b2a06578dd9a))


### Bug Fixes

* rm ([1ceb8b6](https://github.com/ikenxuan/zuks/commit/1ceb8b6c8689018b89bf5215792a6a2ec1a11fbc))

## [1.1.0](https://github.com/ikenxuan/zuks/compare/v1.0.0...v1.1.0) (2024-07-18)


### Features

* package-lock.json ([79b35be](https://github.com/ikenxuan/zuks/commit/79b35be22ddabfa6f0f64bc24540fa7e60f75d63))
* txt ([d2e38c0](https://github.com/ikenxuan/zuks/commit/d2e38c092d837fa0fb475ed468efa62990bd787d))


### Bug Fixes

* z ([61ae50d](https://github.com/ikenxuan/zuks/commit/61ae50d3f76add83c6ee4da81f9b52707f48ffb5))
* z ([8285e39](https://github.com/ikenxuan/zuks/commit/8285e39d99e35e4e9e244f048f527ebaa5ddb7f1))

## 1.0.0 (2024-07-18)


### Features

* first commit ([71abf2f](https://github.com/ikenxuan/zuks/commit/71abf2fa9fcbcbbfe9946bf986b80ad49fc9da81))

## [1.3.0](https://github.com/ikenxuan/zuks/compare/v1.2.1...v1.3.0) (2024-07-18)


### Features

* 新增cpab.js ([19ca195](https://github.com/ikenxuan/zuks/commit/19ca1953453c80b524c0dc91affd686e9d00f02f))

## [1.2.1](https://github.com/ikenxuan/zuks/compare/v1.2.0...v1.2.1) (2024-07-18)


### Bug Fixes

* 删除文件 ([3b88fdb](https://github.com/ikenxuan/zuks/commit/3b88fdb63560cdb9431d2827c69a6c265f761b56))

## [1.2.0](https://github.com/ikenxuan/zuks/compare/v1.1.0...v1.2.0) (2024-07-18)


### Features

* add file ([8070290](https://github.com/ikenxuan/zuks/commit/807029035f2524cc314629b377fcfc8dc5b62175))
* add file ([a9b75c3](https://github.com/ikenxuan/zuks/commit/a9b75c3340bf0c38e17355a9a3e5aa362915d217))
* file ([a56a8ce](https://github.com/ikenxuan/zuks/commit/a56a8ce4b0bd90e280f2bd4991573b5d31f460c0))
* 新增 ([1ac8812](https://github.com/ikenxuan/zuks/commit/1ac8812d722a052ce62e281514132ef9ddb4aa3c))
* 新增文件 ([a8b9d1e](https://github.com/ikenxuan/zuks/commit/a8b9d1e5fea37ba81341ff652feda76f94bf98bc))


### Bug Fixes

* delete ([6bf2c7c](https://github.com/ikenxuan/zuks/commit/6bf2c7c26f5387f8e2543993f12e74498ab42cb3))
* delete file ([3a09423](https://github.com/ikenxuan/zuks/commit/3a09423d45984b7b929ce06245182c1e39a5f877))
* delete file ([5dd61d9](https://github.com/ikenxuan/zuks/commit/5dd61d90a1cdf48769f8275d39b7348f1c31081e))
* 删除 ([adf5ba5](https://github.com/ikenxuan/zuks/commit/adf5ba5a01250438157c8d6ee4cfa35fb7c9011c))
* 删除 ([cb9d37b](https://github.com/ikenxuan/zuks/commit/cb9d37bb79494f0a4f4ebe1cbf8b9e815c739af9))

## [1.1.0](https://github.com/ikenxuan/zuks/compare/v1.0.0...v1.1.0) (2024-07-17)


### Features

* 新增 ([2a0655c](https://github.com/ikenxuan/zuks/commit/2a0655cf987814ee4d56c6d5d3d52c2cc9f2b4f8))
* 新增 ([383c671](https://github.com/ikenxuan/zuks/commit/383c6718e8ccd4d080648e7836a74f361aa1ff0d))


### Bug Fixes

* 删除 ([761f45a](https://github.com/ikenxuan/zuks/commit/761f45a9147afe37e63868726e4ee2b7735c748b))
* 删除 ([5530dc4](https://github.com/ikenxuan/zuks/commit/5530dc45116fba7c138cff58dee96bfbf83a9b00))
* 删除 ([47eab65](https://github.com/ikenxuan/zuks/commit/47eab65a9773db2ad7607b5529c7f62f66883ef3))
* 新增 ([45dd268](https://github.com/ikenxuan/zuks/commit/45dd268c0496f67a4c0caf509457d41e58597490))

## [1.2.0](https://github.com/ikenxuan/ZUKS/compare/v1.1.1...v1.2.0) (2024-07-17)


### Features

* 加个换行 ([8558bfb](https://github.com/ikenxuan/ZUKS/commit/8558bfb08c81f6fc45a8d90fdd6bd60869b166c2))


### Bug Fixes

* 删除注释 ([355f25a](https://github.com/ikenxuan/ZUKS/commit/355f25acaa364a962afbc3615be8c55e4ec0a1b8))

## [1.1.1](https://github.com/ikenxuan/ZUKS/compare/v1.1.0...v1.1.1) (2024-07-17)


### Bug Fixes

* 修改注释 ([f4126b1](https://github.com/ikenxuan/ZUKS/commit/f4126b14c095cbe2696bf7aee0ad50e1b7d6ac2e))

## [1.1.0](https://github.com/ikenxuan/ZUKS/compare/v1.0.0...v1.1.0) (2024-07-17)


### Features

* **parse:** add verification fingerprint manager to Douyin API ([59ba522](https://github.com/ikenxuan/ZUKS/commit/59ba522bfe50cef3691bfbf5cb891f82f5af0b51))

## 1.0.0 (2024-07-17)


### Features

* 主页 ([585e933](https://github.com/ikenxuan/ZUKS/commit/585e933caa614be4f6978df7d19f460848106e9a))


### Bug Fixes

* github action ([b678f39](https://github.com/ikenxuan/ZUKS/commit/b678f39b22b2a4ca4d477539f284fd2f28fbaf47))
* 我勒个豆，评论怎么没了 ([c63c8ef](https://github.com/ikenxuan/ZUKS/commit/c63c8ef896b05a2258c210129181f4aee1b86409))
