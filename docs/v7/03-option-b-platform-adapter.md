# 方案 B：平台适配器类体系

> 折中方案。搬迁直观、心智负担小，但拿不到「一份声明驱动全部」的核心收益。
> 前置阅读：[01-response-envelope.md](./01-response-envelope.md)

## 核心思路

保留 v6「一个平台一个模块、一个端点一个方法」的心智，但把四套各写一遍的
公共部分抽到基类：请求发送、重试、判定、信封包装、事件、header 合并。

```
contracts/                  同方案 A：零依赖叶子
transport/                  同方案 A：唯一发请求的地方
platforms/
  base/
    PlatformAdapter.ts      抽象基类：request / paginate / judge / envelope
    decorators.ts           @endpoint 元数据装饰器
  DouyinAdapter.ts          19 个方法
  BilibiliAdapter.ts        27 个方法
  KuaishouAdapter.ts        6 个方法
  XiaohongshuAdapter.ts     7 个方法
client/                     门面
server/                     从 adapter 元数据生成路由
```

## 写法

```ts
export class DouyinAdapter extends PlatformAdapter {
  readonly platform = 'douyin' as const
  protected readonly judge = douyinJudge
  protected readonly defaults = douyinDefaultConfig

  @endpoint({ route: '/fetch_video_work' })
  async videoWork (params: z.input<typeof VideoWorkParams>) {
    const p = this.validate(VideoWorkParams, params)
    if (!p.ok) return p.result

    return this.request<DouyinVideoWork>({
      method: 'GET',
      url: this.api.workDetail(p.value),
      sign: 'a_bogus'
    })
  }

  @endpoint({ route: '/fetch_work_comments' })
  async comments (params: z.input<typeof CommentsParams>) {
    const p = this.validate(CommentsParams, params)
    if (!p.ok) return p.result

    return this.paginated<DouyinComments, DouyinComment>({
      params: p.value,
      pageSize: 50,
      url: (cur) => this.api.comments(cur),
      sign: 'a_bogus',
      extract: (r) => r.comments ?? [],
      next: (cur, r) => ({ ...cur, cursor: r.cursor }),
      hasMore: (r) => r.has_more === 1,
      merge: (last, all) => ({ ...last, comments: all, cursor: last.cursor ?? all.length })
    })
  }
}
```

基类提供的能力：

```ts
abstract class PlatformAdapter {
  abstract readonly platform: Platform
  protected abstract readonly judge: Judge
  protected abstract readonly defaults: DefaultConfigFactory

  /** 校验，失败时直接给出可返回的失败信封 */
  protected validate<S extends z.ZodTypeAny>(schema: S, input: unknown):
    | { ok: true; value: z.infer<S> }
    | { ok: false; result: AmagiFailure }

  /** 单次请求：签名 → 发送 → 解码 → judge → 信封 */
  protected request<T>(spec: RequestSpecInput): Promise<AmagiResult<T>>

  /** 并发多请求 */
  protected requestAll<T>(specs: RequestSpecInput[], partial: PartialMode): Promise<AmagiResult<T[]>>

  /** 声明式翻页 */
  protected paginated<T, Item>(def: PaginateInput<T, Item>): Promise<AmagiResult<T>>

  /** 纯本地计算，直接包信封 */
  protected computed<T>(value: T): AmagiResult<T>
}
```

## 与方案 A 的差异

| | 方案 A | 方案 B |
| --- | --- | --- |
| 端点的载体 | 一个 `EndpointDef` 对象 | 一个类方法 |
| 参数类型 | `z.infer` 自动 | `z.infer` 自动（相同） |
| 路由 | `def.route`，registry 遍历生成 | `@endpoint` 装饰器元数据，反射生成 |
| 方法名 | `METHOD_NAMES` 映射表 | **就是方法名**（不需要映射） |
| fetcher 对象 | `FetcherOf<R>` 映射类型派生 | **就是 adapter 实例**（不需要派生） |
| bound fetcher | Proxy | Proxy（相同） |
| 加一个端点要改 | 1 个文件 | 3–4 个文件（adapter + schema + 响应类型 + 可能的 api.ts） |
| 校验的位置 | 管线自动 | **每个方法头两行手写** `this.validate(...)` |
| 8 种非常规形态 | 声明式扩展点 | 直接写代码，最自由 |

**B 的两个真实优势：**

1. **方法名不需要映射表。** 方案 A 因为 v6 的方法名不规则
   （`searchContent` / `parseWork` / `convertAvToBv`），必须维护一张
   端点名 → 方法名的表；B 里方法名就是方法名。
2. **非常规形态最自由。** 快手那 12 个并发请求、抖音弹幕的分段合并，
   在 B 里就是普通的 `await Promise.all` + 一段整形代码，不需要先想清楚
   `partial` 语义该怎么声明。

**B 的两个真实劣势：**

1. **`this.validate` 必须每个方法手写。** 忘了写就是无校验直通 ——
   这类「必须记得做」的约定正是 v6 出问题的模式。可以用装饰器强制
   （`@endpoint({ params: VideoWorkParams })` 由基类在调用前校验），
   但那就在往 A 的方向走了。
2. **路由 / schema / 响应类型仍是三处声明。** 装饰器只解决了路由，
   参数 schema 还在独立文件里（因为 zod schema 写在装饰器参数里会很难读），
   响应类型也是。「加一个接口改 1 个文件」拿不到。

## 什么时候选 B

- 团队明确不喜欢声明式/元编程风格，希望代码「看得见执行流」。
- 短期内不会大量新增端点（那么第 2 条劣势的代价就小）。
- 想尽量降低贡献者门槛 —— B 的写法和 v6 几乎一样，新人不需要先理解注册表。

## 什么时候不选 B

如果理由是「A 太重」，那更该考虑 [方案 C](./04-option-c-incremental.md)：
C 的投入更小，而 B 已经要把 59 个端点全部搬一遍了 ——
**既付了搬迁成本，又没拿到 A 的核心收益**，是三个方案里性价比最低的一档。

B 真正合理的场景只有「明确偏好 OO 风格」这一条。
