import type { AxiosRequestConfig } from 'axios'

/**
 * 请求 / 响应契约。
 *
 * `RequestConfig` 从 v6 的 `server/index.ts` 搬到这里 —— 那个模块同时
 * `new Chalk()`、建 Express app、导入四个平台的 fetcher，而全仓 34 个文件
 * 只为了拿这一个类型就去 import 它，是 36 个 import 环里占比最大的一条来源。
 *
 * `contracts/` 是零依赖叶子层：本文件只 type-import 外部包 `axios`，
 * 不 import 仓库内任何其他模块。
 */

/** HTTP 方法。与 v6 `types/api-spec.ts` 的 `HttpMethod` 取值一致 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * 调用方可传的请求配置。
 *
 * 形状与 v6 完全一致（`Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>`），
 * 只是换了个住处，因此 `amagi({ request: { timeout: 8000, proxy } })` 这类写法零改动。
 */
export type RequestConfig = Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>

/** 可以用来初始化或合并 {@link AmagiHeaders} 的输入 */
export type HeadersInput = AmagiHeaders | Record<string, string | number | undefined | null> | undefined | null

/**
 * 大小写不敏感的 header 容器。
 *
 * v6 把 header 当普通对象传，于是同一个 header 在不同平台被写成不同大小写：
 * B站 `qtparam` 一处取 `headers.Cookie`、一处取 `headers.cookie`，后者恒
 * `undefined`；小红书默认配置用全小写风格，而调用方覆盖时写 `Cookie` 就覆盖不上
 * （#23 / #32 / A8 一系列缺陷的共同根因）。本类把「大小写」这个变量彻底消掉。
 *
 * 语义：
 * - 查找、判断、删除全部大小写不敏感。
 * - 写入是「后写覆盖」：值覆盖，**显示用的大小写也跟着最后一次写入**，
 *   所以 `set('User-Agent', a)` 之后 `set('user-agent', b)` 只会留下一个
 *   `user-agent: b`，不可能出现两条同名 header。
 * - `undefined` / `null` 的值视为「不写这个 header」，方便直接摊入可选字段。
 */
export class AmagiHeaders {
  /** key 是小写化的 header 名，value 保留最后一次写入的原始大小写与值 */
  private readonly entries = new Map<string, { name: string; value: string }>()

  /**
   * @param init - 初始 header，可以是另一个 `AmagiHeaders` 或普通对象
   */
  constructor(init?: HeadersInput) {
    this.merge(init)
  }

  /**
   * 读取 header 值，大小写不敏感
   * @param name - header 名，任意大小写
   * @returns 值，不存在时返回 `undefined`
   */
  get(name: string): string | undefined {
    return this.entries.get(name.toLowerCase())?.value
  }

  /**
   * 判断 header 是否存在，大小写不敏感
   * @param name - header 名，任意大小写
   * @returns 存在则返回 `true`
   */
  has(name: string): boolean {
    return this.entries.has(name.toLowerCase())
  }

  /**
   * 写入 header。同名（忽略大小写）时覆盖值与显示大小写
   * @param name - header 名
   * @param value - 值。`undefined` / `null` 表示不写入
   * @returns 自身，便于链式调用
   */
  set(name: string, value: string | number | undefined | null): this {
    if (value === undefined || value === null) return this
    this.entries.set(name.toLowerCase(), { name, value: String(value) })
    return this
  }

  /**
   * 删除 header，大小写不敏感
   * @param name - header 名
   * @returns 原本存在则返回 `true`
   */
  delete(name: string): boolean {
    return this.entries.delete(name.toLowerCase())
  }

  /**
   * 合并另一组 header，后来者覆盖
   * @param input - 待合并的 header
   * @returns 自身，便于链式调用
   */
  merge(input?: HeadersInput): this {
    if (!input) return this
    const pairs = input instanceof AmagiHeaders ? input.toEntries() : Object.entries(input)
    for (const [name, value] of pairs) this.set(name, value)
    return this
  }

  /** header 条数 */
  get size(): number {
    return this.entries.size
  }

  /**
   * 全部 header 名，保留最后一次写入的大小写
   * @returns header 名数组
   */
  keys(): string[] {
    return [...this.entries.values()].map((e) => e.name)
  }

  /**
   * 全部 `[名, 值]` 对，名保留最后一次写入的大小写
   * @returns 键值对数组
   */
  toEntries(): [string, string][] {
    return [...this.entries.values()].map((e) => [e.name, e.value])
  }

  /**
   * 转成普通对象，用于交给 axios
   * @returns 普通 header 对象，键保留最后一次写入的大小写
   */
  toJSON(): Record<string, string> {
    return Object.fromEntries(this.toEntries())
  }

  /**
   * 深拷贝一份，避免下游改写上游的 header（A14 的防线之一）
   * @returns 新的 `AmagiHeaders` 实例
   */
  clone(): AmagiHeaders {
    return new AmagiHeaders(this)
  }
}

/**
 * 一次底层 HTTP 请求的完整描述。
 *
 * 由端点的 `build` 产出，经 `sign` 加工，最后交给 transport 发送。
 * 端点声明里返回数组即表示多请求聚合 / 分段并发。
 */
export interface RequestSpec {
  /** HTTP 方法 */
  method: HttpMethod
  /** 完整 URL（含 query） */
  url: string
  /** 请求头。缺省时由平台 `config.ts` 的基线补齐 */
  headers?: HeadersInput
  /**
   * 要从合并结果里**删掉**的头名（大小写不敏感），在所有 merge 之后执行。
   *
   * `headers` 只能覆盖同名头，给不出「这个端点不该发某个基线头」。快手 H5 端点
   * 需要它：平台基线是照桌面 Chrome 攒的（`origin` / `sec-ch-ua*` / `sec-fetch-*`），
   * 而 H5 端点用移动 UA，两者拼在一起是个自相矛盾的请求。
   * 清单见 `platforms/kuaishou/config.ts` 的 `KUAISHOU_H5_DROP_HEADERS`。
   *
   * 删除发生在最后一步，所以**同时出现在 `headers` 与这里的头会被删掉** ——
   * 端点自己要发的头别写进这个清单。
   */
  dropHeaders?: readonly string[]
  /** 请求体，`method === 'POST'` 时使用 */
  body?: unknown
  /** 期望的响应形态。protobuf 端点用 `'arraybuffer'`，反爬页用 `'text'` */
  responseType?: 'json' | 'text' | 'arraybuffer'
  /** 签名器需要的接口路径（小红书 `x-s`、快手 hxfalcon 都要它，与 `url` 不同） */
  signPath?: string
  /** 多请求聚合 / 分段并发时标识这一条是哪个部分，会进 trace */
  tag?: string
  /** 端点自定义的附加信息，透传给 `sign` / `decode` */
  extra?: Record<string, unknown>
}

/**
 * transport 发出一次请求后拿到的原始响应。
 *
 * 放在 contracts 而不是 transport，是因为端点声明的 `decode(raw, res)` 需要它，
 * 而依赖方向是 `contracts ← transport ← platforms`，contracts 不能反向依赖。
 */
export interface RawResponse {
  /** 平台返回的 HTTP 状态码。**原样带出，不再用 `validateStatus: () => true` 抹平** */
  status: number
  /** 状态文案 */
  statusText?: string
  /** 响应头，大小写不敏感 */
  headers: AmagiHeaders
  /**
   * 原始 `Set-Cookie` 头数组（一个响应里可能有多条）。
   *
   * `headers` 里的 `set-cookie` 是 join 成一条的字符串（多值会被 `'; '` 合并），
   * 而 guest cookie 换身份、B站会话登录都需要**逐条**处理 Set-Cookie ——
   * join 后无法还原成数组。所以这里单独保留原始数组。
   */
  setCookie?: string[]
  /** 未经端点 `decode` 的响应体：已解析的 JSON / 字符串 / `ArrayBuffer` */
  body: unknown
  /** 这一次请求本身的耗时 */
  durationMs: number
  /** 实际请求的最终 URL（含签名参数、跟随重定向后的地址） */
  url: string
}
