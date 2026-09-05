/**
 * 与 server 那半边说话。**只走 HTTP。**
 *
 * 类型从 `shared/contract.ts` 来 —— 那个文件**一个 import 都没有**，两边各自引它。
 * 试过让前端直接 `import type` server 的类型（声明处只有一处，看着更好），不行：
 * `import type` 运行时确实被擦掉，但 **tsc 仍要编译整条 import 图**，
 * 于是浏览器侧的 tsconfig（没有 `types: ["node"]`，那正是它存在的理由）会去编译
 * core 的签名算法，报几十条「Cannot find name 'Buffer'」。契约必须独立成一层。
 */

import type {
  BatchResult,
  CompareResult,
  CookiesResult,
  DiscardResult,
  GeneratedResult,
  GenerateResult,
  JsonValue,
  PlatformInfo,
  RecordOutcome,
  RequestEntry,
  RequestsResult,
  SaveCookiesResult,
  StoreResult
} from '../../shared/contract'

export type {
  BatchResult,
  CompareFieldDiff,
  CompareResult,
  CompareSide,
  CookiesResult,
  CookieStatus,
  DiffLine,
  DiscardResult,
  EndpointInfo,
  FieldSchema,
  GeneratedFile,
  GeneratedResult,
  GenerateResult,
  HighlightedCode,
  JsonValue,
  ParamsSchema,
  PlatformInfo,
  RecordOutcome,
  RequestCollection,
  RequestEntry,
  RequestsResult,
  RequestVerdict,
  SaveCookiesResult,
  StoreResult
} from '../../shared/contract'

/** 口令从页面自己的 URL 取（绑局域网时才需要，回环下没有） */
const token = new URLSearchParams(location.search).get('token')

const withToken = (path: string): string => {
  if (token === null) return path
  return `${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
}

/**
 * 把一段响应正文变成人能看懂的一句话。
 *
 * 这个函数存在是因为一次真实的启动失败：Node 侧没起、而 Vite 的代理目标恰好指向了
 * 另一个在监听的服务（core 自己的 express 调试服务），于是拿回来的是那个服务的默认
 * 404 —— **一整页 HTML**。它被原样塞进了错误面板，屏幕上是
 * `<!DOCTYPE html><html>…<pre>Cannot GET /api/endpoints</pre>…`，
 * 而真正的原因（后端没起）一个字都没提。
 *
 * 所以这里认三种正文：纯文本（server 自己回的，直接用）、HTML（**几乎必然意味着
 * 请求没到 server**，把 `<pre>` / `<title>` 里那句抽出来并补上诊断）、
 * 以及空正文（网关自己回的状态码）。
 */
const readableError = (status: number, raw: string): string => {
  const text = raw.trim()
  if (text === '') return `HTTP ${status}（响应体是空的 —— 大概是代理或网关回的，请求没到 server）`
  if (!text.startsWith('<')) return text

  // HTML：抽出 `<pre>` 或 `<title>` 里的那句，其余标签全丢
  const inner = /<pre[^>]*>([\s\S]*?)<\/pre>/i.exec(text)?.[1] ?? /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text)?.[1] ?? ''
  const gist = inner.replace(/<[^>]+>/g, '').trim()
  return [
    `HTTP ${status}：${gist === '' ? '收到一段 HTML' : gist}`,
    '',
    '这是一段 HTML 而不是 server 的响应，也就是说**请求没到控制台的 Node 侧**。三种可能：',
    '① Node 侧没启动 —— 跑 `pnpm console:server`（它和 `pnpm console` 是两个进程，缺一个都不行）；',
    '② `vite.config.ts` 的代理端口与 `server/index.ts` 的 `DEFAULT_PORT` 不一致；',
    '③ 那个端口上坐着别的服务（core 的 `pnpm dev` 默认占 4567）。'
  ].join('\n')
}

const request = async <T>(path: string, body?: unknown): Promise<T> => {
  let response: Response
  try {
    response = await fetch(
      withToken(path),
      body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    )
  } catch (cause) {
    // fetch 本身抛 = 连接都没建起来。原始文案是 `Failed to fetch`，说明不了任何事
    throw new Error(
      `连不上控制台的 Node 侧（${path}）。跑 \`pnpm console:server\` 起它 —— ` +
        `它和 \`pnpm console\` 是两个进程。原始错误：${cause instanceof Error ? cause.message : String(cause)}`
    )
  }
  if (!response.ok) throw new Error(readableError(response.status, await response.text()))
  // 到这里状态码是 2xx，但正文仍可能不是 JSON（同样是「请求没到 server」的症状）
  try {
    return (await response.json()) as T
  } catch {
    throw new Error(`${path} 回了 2xx 但正文不是 JSON —— 请求大概没到控制台的 Node 侧（见上面那三种可能）`)
  }
}

export const fetchEndpoints = (): Promise<PlatformInfo[]> => request('/api/endpoints')

export const recordOne = (input: { platform: string; endpoint: string; params: Record<string, JsonValue> }): Promise<RecordOutcome> =>
  request('/api/record', input)

export const recordBatch = (input: { platform: string; endpoint: string }): Promise<BatchResult> => request('/api/record-batch', input)

/**
 * 存下这份待定样本。**第二个参数决定「参数进不进 git」。**
 *
 * 给了就让 server 顺手往 `corpus/<平台>/<端点>.requests.json` 追一条
 * （`server/index.ts:545` 那个 `appendStoreEntry`），不给就只写样本 —— 后者**刻意保留**，
 * 那是这个工具最常用的动作（`storeNotice` 的 `default` 那一档说的就是它，不是错误）。
 * 在这个参数出现之前这里只送 `pendingId`，于是 server 侧那条追加的路**恒不触发** ——
 * 上游全做好了而下游一个字都没送，`corpus/` 底下一个 `.requests.json` 都不存在。
 *
 * **`id` 与 `label` 捆成一个对象，而不是两个各自可选的形参**：只给 `id` 的那一次请求
 * 必然白跑 —— 空 `label` 会被校验器整条拒收（`requests.ts:234`，理由是「空标签比没标签更糟」），
 * server 只会回一句 issues 而集合一个字节都没动。捆起来让「只给 id」在编译期就不存在。
 * 形状**从契约的 {@link RequestEntry} 派生**，同下面 `upsertRequest` 那条理由：
 * 抄一份平铺的字段表，哪天集合多一个必填字段这里会静默地少传它。
 *
 * `...record` 在没给时展开成**零个键**，所以只留样本那条路上请求正文与从前逐字节相同
 * （server 侧 `body.id` 仍是 `undefined`，`id` 取 `''`）。
 */
export const storeSample = (pendingId: string, record?: Pick<RequestEntry, 'id' | 'label'>): Promise<StoreResult> =>
  request('/api/store', { pendingId, ...record })

export const discardSample = (pendingId: string): Promise<DiscardResult> => request('/api/discard', { pendingId })

export const generateTypes = (input: { platform: string; endpoint: string }): Promise<GenerateResult> => request('/api/generate', input)

/**
 * 读这个端点**已提交**的类型产物，带 server 侧渲好的高亮。
 *
 * **是 GET，参数走 query** —— 这条只读，而 `withToken` 认识 `?`（它自己判要用 `?` 还是 `&`）。
 * 一个产物都没有时回的是 `files: []` 而不是 404：那是 61 个端点里 49 个的现状，不是错误。
 */
export const fetchGenerated = (input: { platform: string; endpoint: string }): Promise<GeneratedResult> =>
  request(`/api/generated?platform=${encodeURIComponent(input.platform)}&endpoint=${encodeURIComponent(input.endpoint)}`)

export const fetchCookies = (): Promise<CookiesResult> => request('/api/cookies')

/**
 * 保存 cookie。**只传要改的平台** —— 没传的键 server 不动，
 * 免得「只改抖音」把别的平台清空。空串表示删掉那一项。
 */
export const saveCookies = (updates: Record<string, string>): Promise<SaveCookiesResult> => request('/api/cookies', updates)

/* ------------------------------------------------------------------ 请求集合 */

/**
 * 请求集合的三个动作。**都打同一条 `POST /api/requests`，靠 `op` 分**。
 *
 * 读也走 POST 而不是新加一条 GET：理由在 `server/index.ts:559-562` ——
 * `/api/endpoints` 与 `GET /api/cookies` 那两条落在 `request.method !== 'POST'` 判断**之前**，
 * 加新 GET 得先把那个既有顺序想清楚。走 POST 的代价只是多两道闸（`Origin` 同源、
 * `Content-Type` 必须 JSON），而这条路只有界面在走。
 *
 * 失败一律是纯文本，上面 `request()` 会原样当成消息用（`readableError` 的第一条分支），
 * 所以这三个函数不包第二层错误处理。**但状态码那两档要在界面上说清**，它们要人做的事不同
 * （`server/index.ts:564-565`）：**400 = 改你的输入**（凭证命中、`id` 不合法、verdict 不认识）；
 * **409 = 先去修盘上那个文件**（坏 JSON / 坏条目，那不是调用方的错）。
 */
export const fetchRequests = (input: { platform: string; endpoint: string }): Promise<RequestsResult> =>
  request('/api/requests', { ...input, op: 'list' })

/**
 * 追加一条，或者按 `id` 就地替换。
 *
 * 入参**从契约的 {@link RequestEntry} 派生**而不是重抄一份平铺的字段表：抄一份的话，集合里
 * 哪天多一个字段，这里会静默地少传它（编译期全绿，写出去的记录缺一半）。
 * `recordedAt` 是唯一被放成可选的那个 —— 不给就由 server 按现在这一刻填
 * （`server/index.ts:601`），自己传是为了「补录一条上周试过的」那种用法。
 */
export const upsertRequest = (
  input: { platform: string; endpoint: string } & Omit<RequestEntry, 'recordedAt'> & Partial<Pick<RequestEntry, 'recordedAt'>>
): Promise<RequestsResult> => request('/api/requests', { ...input, op: 'upsert' })

/**
 * 按 `id` 删一条。**未知 id 也回 200**（幂等，同 `discardSample`），那一档的
 * `effect` 是 `absent` 且 server 没写盘 —— 界面要把这件事说出来，否则「点了没反应」。
 */
export const removeRequest = (input: { platform: string; endpoint: string; id: string }): Promise<RequestsResult> =>
  request('/api/requests', { ...input, op: 'remove' })

/* ------------------------------------------------------------------ 两组参数的对比 */

/**
 * 两份样本各自单独生成的类型，逐字段比一遍。
 *
 * **`left` 与 `right` 是 `sampleHash`**（12 位十六进制，就是 corpus 里那份样本的文件名）。
 * 方向是有意义的：差异清单里的 `only-left` / `only-right` 就是照这两个参数的位置说的
 * （`server/compare.ts:74-81` 那张映射表）。
 *
 * **两边给同一个哈希是 400**（`server/index.ts:748`），而那不是后端故障 ——
 * 一份样本跟自己比处处一致，那句话对任何样本都成立。所以调用方要**先禁掉同选**，
 * 别把这一档当错误显示（`ComparePanel.tsx` 里那两个下拉框互相 `disabledKeys`）。
 * 挑不到样本是 404，正文里会把这个端点现有的哈希列出来 —— 那正是人下一步要用的东西。
 */
export const fetchCompare = (input: { platform: string; endpoint: string; left: string; right: string }): Promise<CompareResult> =>
  request('/api/compare', input)
