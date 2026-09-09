# @ikenxuan/amagi-typegen

从**样本**派生响应类型的生成器。仓库内部包，不发布。

完整背景见仓库根的 `RESPONSE-TYPE-AUTOGEN-PRD.md`，这里只讲这个包本身。

## 定位：整件事的一半

响应类型自动化被切成两段，中间用 corpus（真实响应样本）交接：

```
录制器 record                          本包 typegen
有网络 / 非确定 / 偶尔手动跑            纯函数 / 确定 / CI 可跑
seeds + cookie → 发请求 → 脱敏 → 落盘   读样本 → 合并形状 → 渲染 TypeScript
                        ↘  corpus/<platform>/<endpoint>/<hash>.json  ↙
```

**类型是 corpus 的函数，不是网络的函数。** 这条分界线带来的好处：生成离线可跑、
结果确定、能进 CI；平台改字段时 diff 落在样本上（可 review 的证据，而不是一次盲改）；
录制失败（风控 / 限流 / cookie 过期）不会污染类型 —— 样本没更新，类型就没变。

本包**只有右边那半**，而且目前只做到「JSON 值 → 形状树 → TypeScript 源码字符串」：
不读文件、不发请求、不落盘。落盘那层将来照 `packages/core/scripts/gen-openapi.mts`
的契约写（生成逻辑在 `src/`、脚本只负责写、`--check` 与已提交产物比对并置
`process.exitCode = 1`、行尾 CRLF→LF 归一）。

## 用法

```ts
import { generateTypes } from '@ikenxuan/amagi-typegen'

const { source, report } = generateTypes([sampleA, sampleB], {
  rootName: 'DynamicTypeAV',
  // 默认**一律放宽**字面量，只有这里命中的路径才收窄成字面量联合
  literalPaths: ['data.item.type']
})

for (const finding of report.findings) {
  if (finding.needsDecision) console.warn(finding.message) // 生成器决定不了的事
}
```

三个公开函数，都是纯函数：

| 函数            | 签名                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `mergeSamples`  | `(samples: readonly JsonValue[], options?: MergeOptions) => { shape: Shape, report: MergeReport }`     |
| `renderShape`   | `(shape: Shape, options?: RenderOptions) => { source: string, rootName: string, typeNames: string[] }` |
| `generateTypes` | 上面两个连起来，外加把 `shape` / `report` 一并返回                                                     |

路径写法（`literalPaths` 与报告项共用）：根是空串，对象键用 `.` 连，数组元素加 `[]`
—— `data.item.type`、`data.items[].modules.module_author.mid`。字符串按整条路径精确匹配，
要模糊匹配就给 `RegExp`。

## 响应方向：由开发者声明，不从响应内容猜

每份样本的 `metadata.direction` 是 `success` / `error` 两档之一：

- `success` 进 `<Endpoint>_V0`
- `error` 进 `<Endpoint>_Error_V0`

公共导出**不暴露 `_Vn`**。端点 barrel 恒定给出三个名字：

```ts
export type ParseWorkSuccess = ParseWork_V0 | ParseWork_V1
export type ParseWorkError = ParseWork_Error_V0
export type ParseWork = ParseWorkSuccess | ParseWorkError
```

没有那一方向的样本时，对应的方向类型是 `never`。平台 barrel 再加完整平台名与 `Response` 后缀（`DouyinParseWorkResponse` / `DouyinParseWorkResponseSuccess` / `DouyinParseWorkResponseError`）—— 后缀是为了不与手写树的 `XiaohongshuEmojiList` 这类短名撞。

这个字段由 Web 控制台里的开发者看到响应后选择，HTTP 状态、`null`、`''`、空对象或任何平台字段都不参与推断。旧样本没有这个字段时，生成器只用 `verdict.kind === 'store-as-error'` 做一次兼容推断；新录制不再靠响应内容自动判方向。

## 溯源块只引用进 git 的东西

产物文件头里的「证据」块写的是**这个类型由哪些参数组合共同得出**：

```ts
// 证据：2 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/parseWork.requests.json 里
//   aweme_id  单个视频
//   aweme_id  视频被隐藏或删除
```

它**不写样本哈希、也不写录制日期**。样本（`corpus/<平台>/<端点>/<哈希>.json`）不进 git，
把 `5a05a10190fe` 这种文件名写进产物等于给下一个人一个他无处可查的引用；而日期是样本的属性，
写上去只会让同一组参数重录一次就刷一行 diff。进 git 的是请求集合与产物本身，所以每行只写
参数键与请求集合里那句人写的说明（集合里查不到时只剩参数键 —— **不猜一个说明出来**）。
「证据有多旧」由生成时的 `assessCorpusAge` 告警说，那是运行时的事。

## 形状树为什么不直接是类型

`Shape` 是**证据累加器**，每个节点记的是「在 N 份样本里这个位置见过什么」的计数，
不是已经拍板的类型。可选性、联合、放宽/收窄全部留到渲染时从计数推。

这么分是为了规则表里最容易做错的一条：**`null` 与「缺键」必须是两个维度**。
边读样本边拍板类型的话，两者一定会在某处被合并成一个 `T | undefined`，
那就把「平台明确返回 null」和「平台没给这个键」搞成了同一件事。
拆开之后 `seen`（键出现过几次）与 `nulls`（值为 null 几次）天生是两个独立计数：

| 样本                          | 合并结果             | 为什么                       |
| ----------------------------- | -------------------- | ---------------------------- |
| `[{ a: 1 }, { a: 2 }]`        | `a: number`          | 两份都有、都不是 null        |
| `[{ a: 1 }, {}]`              | `a?: number`         | 缺过键                       |
| `[{ a: 1 }, { a: null }]`     | `a: number \| null`  | 键一直在，值为 null → 仍必需 |
| `[{ a: 1 }, { a: null }, {}]` | `a?: number \| null` | 两个维度都命中               |
| `[{ a: null }, { a: null }]`  | `a: null`            | 恒为 null                    |
| `[{ a: null }, {}]`           | `a?: null`           | 恒为 null 且缺过键           |

（这张表逐行就是 `test/merge-rules.test.ts` 里那 6 条断言 —— 写成表格而不是代码块，
因为 oxfmt 会把连续的数组字面量当成下标表达式重排，反而把示例改错。）

## 规则表实现状态

对应 PRD「五、类型合并算法」那张表，逐行都有测试（`test/merge-rules.test.ts`，
一个 `describe` 对一行）：

| 情况                                       | 处理                                            | 状态                                                                 |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------- |
| 键在全部样本里都有                         | 必需                                            | 已实现                                                               |
| 键只在部分样本里有                         | `?:`                                            | 已实现                                                               |
| 键存在但值为 `null`                        | `\| null`，与可选分开记                         | 已实现                                                               |
| 同名键在不同样本里是不同原始类型           | 联合                                            | 已实现                                                               |
| 数组为空                                   | 从其他样本补元素形状；全空则 `unknown[]` + 报告 | 已实现                                                               |
| 数组元素形状不一致                         | 元素类型取联合                                  | 已实现（对象元素合并成一个对象、键各自可选；**判别联合没做**，见下） |
| 恒为同一字面量                             | 默认放宽成基础类型，只有白名单收窄              | 已实现                                                               |
| 数字超过 `Number.MAX_SAFE_INTEGER`         | 报成「需要人决策」，不静默处理                  | 已实现                                                               |
| 硬约束 1：每一层 `[property: string]: any` | 恒定输出                                        | 已实现                                                               |
| 5.2：结构等价的子树复用已生成类型          | 按渲染后的形状判等                              | 已实现                                                               |
| 5.1：判别式发现                            | 找出判别字段、切判别联合                        | **未实现**                                                           |
| 5.3-2：`is*` 类型守卫生成                  | 给下游收窄能力                                  | **未实现**                                                           |

未实现的两条也写在返回值里（`report.notImplemented`），这样将来的 CLI 每次都会把它们
打出来 —— 「判别式发现没做」这件事必须撞到人眼睛上，否则下游会以为生成的联合能收窄。

## 两条硬约束

**1. 每一层都输出 `[property: string]: any`。**
`packages/core/test/types/response-types.test-d.ts` 用它承诺「平台加字段不算 breaking、
读未声明字段不报错」。生成器输出「干净」的封闭类型的那一刻，这条承诺就破了，
下游一堆读未声明字段的代码会全部变成编译错误。所以它不是可配置项。

**2. 判别式在深层，而且 TS 认不出来 —— 必须另外产 `is*` 守卫。**
B站动态的判别字段在 `data.item.type`（第三层）。
`packages/core/test/types/discriminant-narrowing.test-d.ts` 已经实测出结论：
`if (x.data.item.type === ...)` **不收窄**（TS 的判别式收窄只认成员的直接属性），
但类型谓词能收窄。索引签名又会进一步削弱收窄，而它按第 1 条不能删。
所以方案是「保留索引签名 + 生成 `is*` 守卫函数」，守卫是纯增量、不动既有承诺。
守卫生成依赖 5.1 先落地（得先知道判别字段在哪条路径上），所以这一轮两条都没做。

## `_V<n>` 是形状序号，不是 API 版本号

这一句必须记住，否则一定会理解错 —— 现状里 `_V0` / `_V1` 看起来就像版本号。

现状的含义是「同一个接口两次抓包结果不一致，就再开一个文件」。实测证据：
`DYNAMIC_TYPE_FORWARD/Forward/DYNAMIC_TYPE_AV/` 下 `_V0` 与 `_V1` 的全部差异是
`editable` 有无、`decoration_card` 有无、`topic` 是对象还是 `null`、
`RichTextNode` 的 `rid` 换成了 `jump_url` + `style`、`modal` / `params` 有无 ——
**全是同一个接口的数据波动，没有一条是参数决定的分支**。

新语义只有一个意思：**同一判别式取值下的形状序号**。只有当同一判别式取值下仍然存在
无法合并的形状差异时才 `+1`。按新语义，现存那两个 `_V1` 应该在迁移时被合并掉。
这句话同时写在生成文件的文件头里（`GENERATED_BANNER`），因为它得出现在人每天看得见的地方。

`test/forward-fake-variants.test.ts` 就是这条的回归：把那两个假变体反推成两份样本喂进来，
断言合出来是**一个**类型（`editable?` / `decoration_card?` / `topic: Topic | null`）。
合不掉就说明合并规则错了 —— 这个用例比任何新样本都便宜。

## 为什么不用 quicktype / json-to-ts

`docs/v7/01-response-envelope.md` 那份早期路线建议直接上 quicktype。三个硬伤，
恰好是这里最关键的三件事：

1. **不做多样本合并。** 它是「一份 JSON → 一个类型」。多样本合并正是本包的全部价值 ——
   没有它就还是「两次抓包不一致就再开一个 `_V1`」。
2. **不认判别式。** 判别式发现（5.1）与 `is*` 守卫是 B站动态那 20% 类型代码能不能收敛的关键。
3. **不保留 `[property: string]: any`。** 它会产出「干净」的封闭类型，直接破掉上面硬约束 1
   那条兼容承诺。

自己写合并器可控得多，工作量也不大（本包 `src/` 六个文件）——真正贵的是 corpus 那一半。
顺带一个实测好处：仓库现存那批类型（正是贴在线工具产出来的）会把结构相同的子树重复声明成
`PurpleLikeIcon` / `FluffyLikeIcon`、`PurpleContainerSize` / `PurpleSizeSpec`、
`Comment` / `Forward`；本包按渲染后的形状判等，同一个形状只产一份。

## 验证

```bash
npx tsc --noEmit          # 包内类型检查（本包不 extends 根 tsconfig，原因见 tsconfig.json 注释）
npx vitest run            # 包内跑测试
npx oxlint . && npx oxfmt # lint / 格式化
```

CI 走的是仓库根的脚本，本包已经登记在两处白名单里，**都不能漏**：

- 根 `vitest.config.ts` 的 `test.include` —— 那是显式白名单，不加等于这些用例在 CI 里不存在
- 根 `tsconfig.json` 的 `references` —— 不加等于根 `tsc -b` 不带本包
