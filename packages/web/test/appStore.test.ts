/**
 * 「样本存了，参数进 git 了吗」那句话的判定层（`src/lib/storeNotice.ts`）。
 *
 * 这一轮的第三个同类问题：**server 做了功、前端把结果扔了。** `/api/store` 回五个字段，
 * `App.tsx` 原先只读 `written`，于是 `requestsAppended` / `requestsPath` / `requestsReplaced` /
 * `requestsIssues` 四个整个丢掉 —— 「样本存了、但请求集合一条都没加」在界面上一个字都没说，
 * 而那正是 PRD 二 ①（参数进 git）没落地的那一格。前两次是 `GeneratedPanel` 从未挂载、
 * `payloadHighlight` 被丢弃，三次的形状一模一样：**造好但没接线不报错。**
 *
 * ## 为什么测的是纯函数而不是 `App`
 *
 * `App` 整个渲不出来 —— 它一挂载就发两拨请求，而 vitest 跑在 node 环境（根
 * `vitest.config.ts:23` 没配 jsdom），effect 压根不跑。所以判定抽到 `src/lib/storeNotice.ts`
 * 再测那一层，与 `theme.test.ts` 把主题判定从 `useTheme` 里抽出来、`guard.test.ts` 把三道闸
 * 从 HTTP 回调里抽出来是同一条做法。**接线本身另测**（最后那个 describe，读 `App.tsx` 源码）：
 * 判定再对，没人调它也还是零。
 *
 * ## 六件要钉住的事
 *
 * 1. **三档语气真的分开了。** 没给 `id` 是**「留下」那颗按钮的常态**（不填表单就只写样本），
 *    做成一条红色错误等于让最常见的正常路径看起来像故障；而凭证命中 / 集合文件读不了那两档
 *    是「有东西要你处理」。三句话一样就等于没分档。
 * 2. **凭证那一档的文案里只有路径与键名，一个像值的东西都没有。** 那句原话由
 *    `packages/typegen/src/requests.ts` 的校验器给，这里拿**真的** `appendRequest` 跑出来喂进去 ——
 *    于是「不泄漏」这件事是跨两个包量出来的，不是照着我以为的格式手抄一份。
 * 3. **`requestsReplaced` 得说出「不是新增」。** 那是幂等的正常行为，而人会以为自己加了一条。
 * 4. **两个仓库相对路径都要能粘进 `git status`。**
 * 5. **契约上 `StoreResult` 的每个字段都有人读。** 这条是给下一个字段准备的绊线 ——
 *    上面那三次事故的共同点就是「新回的字段没人读，而没人读不报错」。
 * 6. **`id` 真的被送出去了**（最后那个 describe，换掉 `fetch` 量请求正文）。这一条是第四次同类
 *    事故的绊线，而它差点就发生了：server 侧那条「顺手往请求集合追一条」的路整个写好了，
 *    而 `storeSample()` 只送 `pendingId` —— 于是 `corpus/` 底下**一个 `.requests.json` 都没有**，
 *    上面那五条测得再绿也是在测一条没人走的路。**判定对不对与有没有送出去是两件事。**
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { RequestEntry } from '@ikenxuan/amagi-typegen'
import { describe, expect, it, vi } from 'vitest'

import { appendRequest } from '../server/storage'
import type { StoreResult } from '../shared/contract'
import { type StoreNotice, storeNotice } from '../src/lib/storeNotice'

/**
 * `src/lib/api.ts` 在**模块初始化时**读 `location.search`（口令从页面自己的 URL 取），
 * 而 vitest 跑在 node 环境里 —— 没有 `location`，静态 import 会在第一行就炸。
 * 所以下面那个 api 模块是动态 import 的，**在这一行之后**（先例：`requestTable.test.ts:41`）。
 */
vi.stubGlobal('location', new URL('http://localhost:5173/'))

/** `storeSample` 本人。`.ts` 没有 JSX，所以说明符可以写字面量 —— 于是类型是真的，不用手抄 */
const { storeSample } = await import('../src/lib/api')

/** 样本落点。真实形状：`corpus/<平台>/<端点>/<12 位参数哈希>.json` */
const SAMPLE_PATH = 'corpus/bilibili/videoInfo/57c213a5f38c.json'

/** 集合落点。`requestsPath` 回的就是这个（`server/storage.ts` 的 `requestsPath`） */
const COLLECTION_PATH = 'corpus/bilibili/videoInfo.requests.json'

/**
 * server 那句「没给 id」的原话（`server/index.ts:412`）。
 *
 * **手写一份是刻意的**：`appendStoreEntry` 没导出，而 `import` 整个 `server/index.ts` 会当场
 * 解析 argv 并 `listen` 一个真端口（同 `storage.test.ts` 文件头那条）。而这里不怕它走散 ——
 * 「没给 id」那一档的判据是**我们送了什么**（`requestedId`），不是 server 这句话长什么样；
 * 这个字符串在下面只用来量一件事：它有没有被原样念出来。
 */
const NO_ID_ISSUE = '没给 id，请求集合没动 —— id 与 label 得人来给（id 会变成产物的目录名与类型名），server 编不出来'

/** 一条合法记录，除了每处自己捣的乱 */
const entry = (extra: Partial<RequestEntry> = {}): RequestEntry => ({
  id: 'bv-single-p',
  label: '单 P 稿件',
  params: { bvid: 'BV1xx411c7mD' },
  recordedAt: '2026-09-05T06:11:00Z',
  verdict: 'ok',
  sampleHash: '57c213a5f38c',
  ...extra
})

/**
 * 真跑一遍 `appendRequest`，取它拒收时说的那几句话。
 *
 * 临时 corpus 用完就删 —— 真 corpus 里的集合文件是**进 git 的**（`.gitignore` 那条 `!` 例外），
 * 往那儿摆一份就是往仓库里摆一份（同 `storage.test.ts` 的 `scratchCorpus`）。
 * 这两档都在写盘之前就返回了，所以那个临时目录里其实一个字节都没落。
 *
 * @param seed 摆在盘上的那份集合文件的内容。不给 = 这个端点还没有集合文件（正常状态）
 */
const issuesOf = (which: RequestEntry, seed?: string): string[] => {
  const dir = mkdtempSync(join(tmpdir(), 'amagi-store-notice-'))
  try {
    if (seed !== undefined) {
      mkdirSync(join(dir, 'bilibili'), { recursive: true })
      writeFileSync(join(dir, 'bilibili', 'videoInfo.requests.json'), seed, 'utf8')
    }
    return appendRequest('bilibili', 'videoInfo', which, dir).issues
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** 一个**看起来像真凭证**的值。下面要量的就是它一个字符都不该出现在文案里 */
const SECRET = 'SESSDATA=8f1e2d3c%2C1780000000%2Cab12cCjD'

/** 凭证命中那一档的真 issues */
const CREDENTIAL_ISSUES = issuesOf(entry({ params: { bvid: 'BV1xx411c7mD', cookie: SECRET } }))

/** 盘上那份读不了那一档的真 issues。尾逗号 —— `readSeeds` 与 `readDocSidecar` 各栽过一次的那种 */
const BROKEN_ISSUES = issuesOf(entry(), '{ "version": 1, "endpoint": "bilibili/videoInfo", "requests": [], }')

/**
 * 一份 `StoreResult`。默认那一份**就是「留下」那颗按钮的常态**：样本写了、集合没动、
 * 理由是没给 id —— 不填卡片上那张小表单就走这一档，而那是最常用的动作。
 */
const result = (extra: Partial<StoreResult> = {}): StoreResult => ({
  written: SAMPLE_PATH,
  requestsAppended: false,
  requestsIssues: [NO_ID_ISSUE],
  ...extra
})

/** 一次通知里人眼能看到的**全部**字：标题、每一行 description、卡片上那句 */
const spoken = (notice: StoreNotice): string => [notice.title, ...notice.lines, notice.settled].join('\n')

/** 只按「留下」那条路：没送 id */
const today = (extra: Partial<StoreResult> = {}): StoreNotice => storeNotice(result(extra), undefined)

/** 填了表单那条路：送了 id，于是 false 的理由必定是另外两种 */
const withId = (extra: Partial<StoreResult>): StoreNotice => storeNotice(result(extra), 'bv-single-p')

describe('都写好了那一档', () => {
  const appended = withId({ requestsAppended: true, requestsPath: COLLECTION_PATH, requestsIssues: [] })

  it('语气是 `success`，两个仓库相对路径都说出来 —— 人要能把它们粘进 git status', () => {
    expect(appended.variant).toBe('success')
    expect(spoken(appended)).toContain(SAMPLE_PATH)
    expect(spoken(appended)).toContain(COLLECTION_PATH)
  })

  it('卡片上留下的那句也带着两个路径 —— toast 会走，这句不会', () => {
    expect(appended.settled).toContain(SAMPLE_PATH)
    expect(appended.settled).toContain(COLLECTION_PATH)
  })

  it('**`requestsReplaced` 要说清「不是新增」** —— 幂等的正常行为，但人会以为自己加了一条', () => {
    const replaced = withId({
      requestsAppended: true,
      requestsPath: COLLECTION_PATH,
      requestsReplaced: true,
      requestsIssues: []
    })
    expect(replaced.variant).toBe('success')
    expect(spoken(replaced)).toContain('替换')
    expect(spoken(replaced)).toContain('不是新增')
    // 与「新增了一条」那一句必须能分辨，否则这个字段等于没读
    expect(replaced.title).not.toBe(appended.title)
    expect(replaced.settled).not.toBe(appended.settled)
  })
})

describe('还没做这一步：没给 id —— 今天每一次入库都走这一档', () => {
  const notice = today()

  it('**语气不是错误**：`default`，不是 warning 也不是 danger', () => {
    expect(notice.variant).toBe('default')
  })

  it('server 那句原话原样念出来，而且明说「这不是失败」', () => {
    expect(notice.lines).toContain(NO_ID_ISSUE)
    expect(spoken(notice)).toContain('不是失败')
  })

  it('说得出下一步去哪儿 —— 阶段 5 那颗按钮、以及现在就能走的那条路', () => {
    expect(spoken(notice)).toContain('阶段 5')
    expect(spoken(notice)).toContain('/api/requests')
  })

  it('卡片上那句同时说清两件事：样本写到哪了、参数没进集合', () => {
    expect(notice.settled).toContain(SAMPLE_PATH)
    expect(notice.settled).toContain('没进请求集合')
  })

  it('空白 `id` 也算「没给」—— 判据与 `server/index.ts:544` 那个 `.trim()` 对齐', () => {
    const blank = storeNotice(result(), '   ')
    expect(blank.variant).toBe('default')
    expect(blank.title).toBe(notice.title)
  })
})

describe('有东西要你处理：凭证命中 / 集合文件读不了', () => {
  const credential = withId({ requestsIssues: CREDENTIAL_ISSUES })
  const broken = withId({ requestsIssues: BROKEN_ISSUES })

  it('那两句原话真的是校验器给的（喂进来的样本先自证）', () => {
    // 这两条不测 `storeNotice`，测的是下面那几条的判据还在：校验器改了拒收的理由或措辞，
    // 这里先红 —— 而不是让下面那几条静默变成「什么都没量」
    expect(CREDENTIAL_ISSUES).toHaveLength(1)
    expect(CREDENTIAL_ISSUES[0]).toContain('像凭证')
    expect(BROKEN_ISSUES).toHaveLength(1)
    expect(BROKEN_ISSUES[0]).toContain('不是合法 JSON')
  })

  it('**凭证那一档只说路径与键名 —— 一个像值的东西都没有**', () => {
    const text = spoken(credential)
    expect(text).toContain('cookie')
    expect(text).not.toContain(SECRET)
    // 值的任何一截都不许露：截断的短值也能爆破（同 `RecordOutcome.scrub` 那条纪律）
    expect(text).not.toContain('SESSDATA')
    expect(text).not.toContain('8f1e2d3c')
  })

  it('凭证那一档说得出人要做的事，语气是 warning 而不是 danger', () => {
    // 不是 danger：样本已经安全落盘、集合一个字节都没动（凭证没进 git，那正是校验器想要的结果）
    expect(credential.variant).toBe('warning')
    expect(spoken(credential)).toContain('.env')
    expect(spoken(credential)).toContain('再入库一次')
  })

  it('集合读不了那一档让人去修那个文件，而且文件路径在话里', () => {
    expect(broken.variant).toBe('warning')
    expect(spoken(broken)).toContain(COLLECTION_PATH)
    expect(spoken(broken)).toContain('修')
    // 样本已经在盘上了，别让人以为要重录一发真请求
    expect(spoken(broken)).toContain('不用重录')
  })

  it('**三档 false 彼此可分辨** —— 做成同一条红条等于没分档', () => {
    const three = [today(), credential, broken]
    expect(new Set(three.map((notice) => notice.title)).size).toBe(3)
    expect(new Set(three.map((notice) => notice.settled)).size).toBe(3)
    // 「还没做这一步」与「有东西要你处理」的语气必须不同，而且没有一档是红的
    expect(three.map((notice) => notice.variant)).toEqual(['default', 'warning', 'warning'])
  })
})

describe('契约那一格破了也得说话', () => {
  it('`requestsAppended: false` 而 `requestsIssues` 是空的：说出来，而不是显示一片空白', () => {
    const text = spoken(withId({ requestsIssues: [] }))
    expect(text).toContain('server 没说为什么')
    expect(text).toContain('requestsIssues')
  })

  it('`requestsAppended: true` 而 `requestsPath` 没回：也不许渲出 `undefined`', () => {
    const text = spoken(withId({ requestsAppended: true, requestsIssues: [] }))
    expect(text).not.toContain('undefined')
  })
})

describe('真的接进了 `App.tsx`', () => {
  // 判定再对，没人调它也还是零 —— 前两次事故（`GeneratedPanel` 从未挂载、`payloadHighlight`
  // 被丢弃）就是这么过去的，所以这几条读源码（先例：`comparePanel.test.ts` 最后那个 describe）
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const notice = readFileSync(new URL('../src/lib/storeNotice.ts', import.meta.url), 'utf8')
  const contract = readFileSync(new URL('../shared/contract.ts', import.meta.url), 'utf8')

  it('`store` 那条路上调了 `storeNotice`，而且把「这次送了什么 id」原样传了过去', () => {
    // 传 `record?.id` 而不是写死 `undefined`：写死的话「凭证命中」会被说成「还没起 id」，
    // 而那正是 `storeNotice.ts` 在修的那类无声降级
    expect(app).toMatch(/storeSample\(item\.outcome\.pendingId!, record\)[\s\S]{0,1200}storeNotice\(result, record\?\.id\)/)
  })

  it('**版面上那张表单填的东西真的一路送到了 `storeSample`**', () => {
    // 「上游做了功、下游扔了」这一轮已经三次，所以这条钉的是那根线本身：
    // 「响应」栏的 `onStore(record)` → `store.runAsync(shown!, record)` → `storeSample(pendingId, record)`。
    // **`shown` 而不是 `item`**：三栏一次只显示一份结果（哪一份由「最近」那条清单选），
    // 而原先队列里每份结果各有一张卡片、各自带着自己的 `item`
    expect(app).toContain('onStore={(record) => quiet(store.runAsync(shown!, record))}')
    expect(app).toMatch(/async \(item: QueueItem, record\?: KeptRequest\)/)
  })

  it('**server 留着待定条目的那两格里，版面不许把按钮收走** —— 判据与那一行 `if` 对齐', () => {
    // 凭证命中 / 集合文件坏了这两格：`server/index.ts:549` 刻意不清 `pending`，
    // 而那两句话都以「再入库一次」收尾 —— 收走按钮的话那句话在版面上无路可走
    expect(app).toContain("const consumed = result.requestsAppended || (record?.id.trim() ?? '') === ''")
    expect(app).toContain('retryable: !consumed')
    // 这一位要真的送进「响应」栏（`ResponsePaneProps.retryable`），否则那两格里按钮照样消失
    expect(app).toContain('retryable={shown?.retryable}')
  })

  it('**toast 与版面留存两处都接了** —— 一次性的收据进 toast，持续的状态留在卡片上', () => {
    expect(app).toContain('settled: notice.settled')
    expect(app).toMatch(/toast\(notice\.title, \{ description: toastLines\(notice\.lines\), variant: notice\.variant \}\)/)
    // 原先那句硬写的、只读 `written` 的话没了
    expect(app).not.toContain('settled: `已写入 ${result.written}`')
  })

  it('**契约上 `StoreResult` 的每个字段都有人读** —— 这条是给第六个字段准备的绊线', () => {
    const block = /export interface StoreResult \{([\s\S]*?)\n\}/.exec(contract)
    if (block === null) throw new Error('shared/contract.ts 里找不到 StoreResult —— 这条用例的判据没了')
    const fields = [...block[1].matchAll(/^ {2}(\w+)\??:/gm)].map((match) => match[1])
    // 不是为了记住这五个名字，是为了让加第六个的人被绊一下（那个字段该不该说出来，得有人想一遍）
    expect(fields).toEqual(['written', 'requestsAppended', 'requestsPath', 'requestsReplaced', 'requestsIssues'])
    for (const field of fields) expect(notice).toContain(`result.${field}`)
  })
})

/**
 * `POST /api/store` 的正文里到底有什么。
 *
 * **这是「参数进 git」整条链上唯一能被静默掐断的地方**：server 侧收到 `id` 就往集合追一条，
 * 而在这一轮之前 `storeSample()` 只送 `pendingId` —— 上游全做好了、下游一个字都没送，
 * `corpus/` 底下一个 `.requests.json` 都不存在，而**编译期与所有其它测试都是绿的**。
 * 所以这两条量的是请求正文本身（换掉 `fetch`，先例 `requestTable.test.ts:337`）。
 */
describe('`storeSample` 真的把 id 送出去了', () => {
  /** 换掉 `fetch`，记下每一发的路径与解析后的正文 */
  const capture = (): { path: string; body: Record<string, unknown> }[] => {
    const calls: { path: string; body: Record<string, unknown> }[] = []
    vi.stubGlobal('fetch', (path: string, init?: { body?: string }) => {
      calls.push({ path, body: JSON.parse(init?.body ?? '{}') as Record<string, unknown> })
      const body = JSON.stringify({ written: SAMPLE_PATH, requestsAppended: false, requestsIssues: [NO_ID_ISSUE] })
      return Promise.resolve(new Response(body, { status: 200, headers: { 'content-type': 'application/json' } }))
    })
    return calls
  }

  it('**填了表单那条路：`id` 与 `label` 都在正文里**', async () => {
    const calls = capture()
    await storeSample('pending-1', { id: 'BvSinglePage', label: '单页视频，最常见的那种' })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.path).toBe('/api/store')
    // 三个键都在。`id` 是 server 那条追加路的开关（`server/index.ts:544`），
    // `label` 少一个就会被校验器整条拒收（空标签比没标签更糟）
    expect(calls[0]!.body).toEqual({ pendingId: 'pending-1', id: 'BvSinglePage', label: '单页视频，最常见的那种' })
  })

  it('**只按「留下」那条路：正文里连 `id` 这个键都没有** —— 那条正常路径一个字节都没变', async () => {
    const calls = capture()
    await storeSample('pending-1')
    // 不是「id 是空串」而是**压根没这个键**：server 侧 `typeof body.id === 'string'` 那句
    // 于是取 `''`，走「只写样本」那条路（`appendStoreEntry` 在读盘之前就返回）
    expect(calls[0]!.body).toEqual({ pendingId: 'pending-1' })
    expect(calls[0]!.body).not.toHaveProperty('id')
    expect(calls[0]!.body).not.toHaveProperty('label')
  })
})
