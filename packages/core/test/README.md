# packages/core 测试套件

这套测试的目标不是「覆盖率」，而是**为 v7 重构提供行为基线**：
把 v6 的可观测行为逐条钉死，让 v7 的每一处偏离都变成一次显式的 diff，
而不是用户升级后才发现的意外。

## 两类用例

| 前缀            | 含义                      | v7 该怎么做                                            |
| --------------- | ------------------------- | ------------------------------------------------------ |
| 普通标题        | v6 的正确行为             | **不得破坏**。失败即回归。                             |
| `KNOWN-DEFECT:` | v6 的错误行为，但已被钉死 | **应当修掉**。修好后该用例必然失败，需显式删除或改写。 |

`test/contract/known-defects.test.ts` 把所有 `KNOWN-DEFECT` 标题汇总成快照，
相当于一份可执行的 v7 修复清单。这个数字只应下降。

## 目录

| 路径                                                        | 覆盖内容                                             |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| `contract/public-surface.test.ts`                           | 入口导出名 / 运行时类型 / 静态属性 / client 实例形状 |
| `contract/fetcher-surface.test.ts`                          | 三套 fetcher 入口的方法面一致性                      |
| `contract/known-defects.test.ts`                            | KNOWN-DEFECT 汇总清单                                |
| `validation/contract.test.ts`                               | 四平台每个 methodType 的接受键、默认值、丢弃行为     |
| `validation/{douyin,bilibili,kuaishou,xiaohongshu}.test.ts` | 逐平台的参数边界                                     |
| `validation/utils.test.ts`                                  | `smartNumber` 系列与 HTML 提取                       |
| `platform/api-urls.test.ts`                                 | 四平台 URL 构造器                                    |
| `platform/sign-*.test.ts`                                   | 签名算法（冻结熵源后快照）                           |
| `platform/default-configs.test.ts`                          | 四份默认请求头基线                                   |
| `model/networks.test.ts`                                    | 重试 / 退避 / 状态码 / UA 清理                       |
| `model/fetcher-*.test.ts`                                   | 端到端调用链（含分页与错误路径）                     |
| `model/request-config.test.ts`                              | 配置合并与 bound fetcher 的 cookie 覆盖              |
| `model/events.test.ts`                                      | 事件总线                                             |
| `errors/errors.test.ts`                                     | 错误类与 `handleError` 映射                          |
| `server/routes.test.ts`                                     | Express 路由注册与 HTTP 语义                         |
| `types/*.test-d.ts`                                         | 类型层契约（需 `pnpm test:types`）                   |

## 不发真实请求

`RequestConfig` 会原样透传给 axios，因此所有测试通过注入自定义 `adapter`
驱动完整调用链，无需 mock 模块、无需网络：

```ts
const h = constantAdapter({ status_code: 0, aweme_detail: {} })
await douyinFetcher.fetchVideoWork({ aweme_id: '1' }, 'ck', { adapter: h.adapter })
expect(h.last().query.a_bogus).toBeTruthy()
```

**唯一的例外**：`platform/bilibili/sign/wbi.ts` 直接调用 `axios()` 而不走
`fetchData`，无法被 adapter 拦截。因此 B站需要 wbi 签名的接口
（`comments` / `userDynamicList` / `userSpaceInfo` / `videoStream` / `bangumiStream`）
不在端到端用例里覆盖。这本身就是 v7 要修的架构泄漏之一。

## 命令

```bash
pnpm test            # 运行全部
pnpm test:watch      # 监听模式
pnpm test:types      # 额外跑类型层用例（tsc）
pnpm test:coverage   # 覆盖率
```

## 快照

快照是契约，不是缓存。**不要**为了让测试通过而随手 `-u`：
每次快照变化都意味着一次对外行为变更，需要在迁移文档里有对应条目。

签名算法的快照依赖 `test/helpers/deterministic.ts` 冻结 `Date.now` 与
`Math.random`。少数无法冻结的来源（`crypto.randomBytes`、`new Date()`）
在用例里已单独标注并改为结构断言。
