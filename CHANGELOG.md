# Changelog

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
