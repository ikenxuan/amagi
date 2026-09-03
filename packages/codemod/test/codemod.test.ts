// codemod 变换测试：每条规则用示例源文本做精确文本断言，
// 端到端用 examples/v6-sample 副本（临时目录）验证 runCodemod。
// TODO 文案按 06-migration「codemod」节 / PRD 阶段 7 判据逐字锁定（不引用 src 常量，
// 防止实现与判据悄悄漂移）。

import { existsSync, mkdtempSync, cpSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { runCodemod, transformSource } from '../src/index'

const joinLines = (...lines: string[]): string => lines.join('\n')

// ---- TODO(amagi-v7:) 文案判据（逐字） ----

const TODO_LOOSE = `// TODO(amagi-v7): typeMode: 'loose' 已删 —— 原为宽松 any，v7 返回具体类型，检查 r.data 读法`
const TODO_DOUYIN_API_ROUTES = `// TODO(amagi-v7): DouyinApiRoutes 已删除（06-migration 删除清单）——需要路由信息改用 client.endpoints()`
const TODO_BILIBILI_API_ROUTES = `// TODO(amagi-v7): BilibiliApiRoutes 已删除（06-migration 删除清单）——需要路由信息改用 client.endpoints()`
const TODO_KUAISHOU_API_ROUTES = `// TODO(amagi-v7): KuaishouApiRoutes 已删除（06-migration 删除清单）——需要路由信息改用 client.endpoints()`
const TODO_XIAOHONGSHU_API_ROUTES = `// TODO(amagi-v7): XiaohongshuApiRoutes 已删除（06-migration 删除清单）——需要路由信息改用 client.endpoints()`
const TODO_R_CODE = `// TODO(amagi-v7): r.code 顶层已删 —— 失败分支改用 r.error.platform?.code ?? r.error.code，成功分支删除该读法`
const TODO_VALIDATION = `// TODO(amagi-v7): 校验失败不再抛出 —— v7 返回 failure 信封（error.kind === 'validation' 带 issues），检查 try/catch 语义`
const TODO_EVENT_ENDPOINT = `// TODO(amagi-v7): d.methodType 已改写成 d.meta.endpoint —— 值也变了（'videoWork' → 'douyin.videoWork'，端点全名带平台前缀），核对按值比较与打点的地方`
const TODO_EVENT_TIMESTAMP = `// TODO(amagi-v7): 实例总线负载不再带 timestamp（log:* 也没有）—— 删掉该读法，或改用监听器里自己的时钟`
const TODO_EVENT_SOURCE = `// TODO(amagi-v7): 分不清这个监听器挂在实例总线还是顶层 amagiEvents —— 实例总线负载已进 meta（d.platform → d.meta.platform），全局单例一字未变，确认来源后再改`
const TODO_EVENT_MANUAL = `// TODO(amagi-v7): 实例总线监听器不是内联函数（或负载参数被解构）—— 负载读法已进 meta（d.platform → d.meta.platform、d.errorMessage → d.error.message），去处理函数里手改`

describe('规则 1：删 typeMode: strict（独立行与同行）', () => {
  it('独立成行删整行、同行只删键段', () => {
    const src = joinLines(
      `const inline = { typeMode: 'strict', x: 1 }`,
      `const mid = { y: 2, typeMode: 'strict' }`,
      `const standalone = {`,
      `  a: 1,`,
      `  typeMode: 'strict',`,
      `  b: 2,`,
      `}`
    )
    const expected = joinLines(`const inline = { x: 1 }`, `const mid = { y: 2 }`, `const standalone = {`, `  a: 1,`, `  b: 2,`, `}`)
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([{ rule: 'typeMode-strict', count: 3 }])
  })

  it('规则 1 不命中 loose 键（loose 由规则 2 处理）', () => {
    const src = `const a = { x: 1, typeMode: 'loose' }`
    const r = transformSource(src)
    // transformSource 跑完整管线：规则 1 不动 loose，规则 2 删键并注入 TODO
    expect(r.changes.some((c) => c.rule === 'typeMode-strict')).toBe(false)
    expect(r.changes).toEqual([{ rule: 'typeMode-loose', count: 1, todos: [TODO_LOOSE] }])
    expect(r.code).toBe(joinLines(TODO_LOOSE, '', `const a = { x: 1 }`))
  })
})

describe('规则 2：删 typeMode: loose + 文件头 TODO', () => {
  it('键删除且每个文件只注入一条 TODO', () => {
    const src = joinLines(
      `const r = await fetchVideoWork({ aweme_id: '1', typeMode: 'loose' })`,
      `const r2 = {`,
      `  bvid: '2',`,
      `  typeMode: 'loose',`,
      `}`
    )
    const expected = joinLines(TODO_LOOSE, '', `const r = await fetchVideoWork({ aweme_id: '1' })`, `const r2 = {`, `  bvid: '2',`, `}`)
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([{ rule: 'typeMode-loose', count: 2, todos: [TODO_LOOSE] }])
  })
})

describe('规则 3/4：errorDescription 读法替换', () => {
  it('amagiError 链与普通链都替换成 .message，且互不重复命中', () => {
    const src = joinLines(
      `const msg1 = result.error.amagiError.errorDescription`,
      `const msg2 = res.error.errorDescription`,
      `const msg3 = r.error.amagiError.errorDescription`
    )
    const expected = joinLines(`const msg1 = result.error.message`, `const msg2 = res.error.message`, `const msg3 = r.error.message`)
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([
      { rule: 'error-amagiError', count: 2 },
      { rule: 'error-errorDescription', count: 1 }
    ])

    // 再跑一遍：无残留、无二次命中
    const again = transformSource(expected)
    expect(again.code).toBe(expected)
    expect(again.changes).toEqual([])
  })
})

describe('规则 5：registerXxxRoutes( → createXxxRoutes(', () => {
  it('四个平台 + 非目标名字不受影响（括号调用限定）', () => {
    const src = joinLines(
      `export function mount(app: unknown) {`,
      `  amagi.registerDouyinRoutes(app)`,
      `  registerBilibiliRoutes({ client })`,
      `  const a = registerKuaishouRoutes(opts)`,
      `  registerXiaohongshuRoutes(client)`,
      `  registerNoSuchThingRoutes(x)`,
      `  const alias = registerDouyinRoutes`,
      `}`
    )
    const expected = joinLines(
      `export function mount(app: unknown) {`,
      `  amagi.createDouyinRoutes(app)`,
      `  createBilibiliRoutes({ client })`,
      `  const a = createKuaishouRoutes(opts)`,
      `  createXiaohongshuRoutes(client)`,
      `  registerNoSuchThingRoutes(x)`,
      `  const alias = registerDouyinRoutes`,
      `}`
    )
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([{ rule: 'register-routes', count: 4 }])
  })
})

describe('规则 6：import 里删除 XxxApiRoutes + 文件头 TODO', () => {
  it('同行/独立行/整条 import 删除，每个名字各一条 TODO', () => {
    const src = joinLines(
      `import { a, DouyinApiRoutes, b } from '@ikenxuan/amagi'`,
      `import { DouyinApiRoutes } from '@ikenxuan/amagi'`,
      `import {`,
      `  fetchBili,`,
      `  BilibiliApiRoutes,`,
      `} from '@ikenxuan/amagi'`,
      `import amagi, { DouyinApiRoutes, KuaishouApiRoutes } from '@ikenxuan/amagi'`,
      `import { fetchKuaishou, DouyinApiRoutes, XiaohongshuApiRoutes } from '@ikenxuan/amagi'`,
      `import { DouyinApiRoutes, BilibiliApiRoutes } from '@ikenxuan/amagi'`,
      `import { other } from 'some-lib'`,
      `import { registerDouyinRoutes } from '@ikenxuan/amagi'`,
      `const x = DouyinApiRoutes`
    )
    const expected = joinLines(
      TODO_DOUYIN_API_ROUTES,
      TODO_BILIBILI_API_ROUTES,
      TODO_KUAISHOU_API_ROUTES,
      TODO_XIAOHONGSHU_API_ROUTES,
      '',
      `import { a, b } from '@ikenxuan/amagi'`,
      `import {`,
      `  fetchBili,`,
      `} from '@ikenxuan/amagi'`,
      `import amagi from '@ikenxuan/amagi'`,
      `import { fetchKuaishou } from '@ikenxuan/amagi'`,
      `import { other } from 'some-lib'`,
      `import { registerDouyinRoutes } from '@ikenxuan/amagi'`,
      `const x = DouyinApiRoutes`
    )
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    const apiChange = r.changes.find((c) => c.rule === 'api-routes-import')
    expect(apiChange).toEqual({
      rule: 'api-routes-import',
      count: 9,
      todos: [TODO_DOUYIN_API_ROUTES, TODO_BILIBILI_API_ROUTES, TODO_KUAISHOU_API_ROUTES, TODO_XIAOHONGSHU_API_ROUTES]
    })
  })
})

describe('规则 7：r.code 读法 → 文件头 TODO（不删码）', () => {
  it('多种变量名命中一次、代码本身不动', () => {
    const src = joinLines(
      `function handle(r: any, res: any) {`,
      `  if (!r.success) {`,
      `    console.error(r.code, res.code)`,
      `    return null`,
      `  }`,
      `  return r.data.code ?? null`,
      `}`
    )
    const expected = joinLines(TODO_R_CODE, '', ...src.split('\n'))
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([{ rule: 'r-code-read', count: 3, todos: [TODO_R_CODE] }])
  })
})

describe('规则 8：try/catch 校验错误处理 → 文件头 TODO', () => {
  it('catch 块内命中 ZodError / validateXxxParams / e.issues 任一即标注一次', () => {
    const src = joinLines(
      `import amagi from '@ikenxuan/amagi'`,
      `const client = amagi({ cookies: { douyin: 'c' } })`,
      ``,
      `export async function fetchOne(awemeId: string): Promise<unknown> {`,
      `  try {`,
      `    return await client.douyin.fetcher.fetchVideoWork({ aweme_id: awemeId, typeMode: 'strict' })`,
      `  } catch (e) {`,
      `    validateDouyinParams('FetchVideoWork', { aweme_id: awemeId })`,
      `    if (e instanceof ZodError) throw e`,
      `  }`,
      `}`,
      ``,
      `export async function fetchTwo(awemeId: string): Promise<unknown> {`,
      `  try {`,
      `    const r = await client.douyin.fetcher.fetchVideoWork({ aweme_id: awemeId })`,
      `    return r.data`,
      `  } catch (err) {`,
      `    if (err.issues?.length) console.error(err.issues)`,
      `  }`,
      `}`
    )
    const expected = joinLines(TODO_VALIDATION, '', ...src.replace(`, typeMode: 'strict'`, '').split('\n'))
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([
      { rule: 'typeMode-strict', count: 1 },
      { rule: 'validation-catch', count: 1, todos: [TODO_VALIDATION] }
    ])
  })
})

describe('规则 9：实例总线监听器的负载读法进 meta', () => {
  const IMPORT_DEFAULT = `import amagi from '@ikenxuan/amagi'`
  const NEW_CLIENT = `const client = amagi({ cookies: { douyin: 'ck' } })`

  it('四条读法改写成 meta 链，methodType 另带一条值变化 TODO', () => {
    const src = joinLines(
      IMPORT_DEFAULT,
      NEW_CLIENT,
      `client.events.on('api:success', (d) => {`,
      `  console.log(d.platform, d.methodType, d.duration)`,
      `})`,
      `client.on('api:error', (d) => console.error(d.platform, d.methodType, d.errorMessage))`
    )
    const expected = joinLines(
      TODO_EVENT_ENDPOINT,
      '',
      IMPORT_DEFAULT,
      NEW_CLIENT,
      `client.events.on('api:success', (d) => {`,
      `  console.log(d.meta.platform, d.meta.endpoint, d.meta.durationMs)`,
      `})`,
      `client.on('api:error', (d) => console.error(d.meta.platform, d.meta.endpoint, d.error.message))`
    )
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([{ rule: 'events-payload-meta', count: 6, todos: [TODO_EVENT_ENDPOINT] }])
  })

  it('模板字面量 ${} 里的读法照样改（findCallEnd 整段跳过模板，替换不跳）', () => {
    const src = joinLines(IMPORT_DEFAULT, NEW_CLIENT, 'client.on(\'api:success\', (d) => console.log(`[${d.platform}] 耗时(${d.duration}ms)`))')
    const r = transformSource(src)
    expect(r.code).toContain('`[${d.meta.platform}] 耗时(${d.meta.durationMs}ms)`')
    expect(r.changes).toEqual([{ rule: 'events-payload-meta', count: 2 }])
  })

  it('timestamp 只标注不删码（无对应键，删掉还是换时钟由人定）', () => {
    const src = joinLines(IMPORT_DEFAULT, NEW_CLIENT, `client.events.on('log:warn', (d) => console.warn(d.timestamp, d.message))`)
    const r = transformSource(src)
    expect(r.code).toBe(joinLines(TODO_EVENT_TIMESTAMP, '', ...src.split('\n')))
    expect(r.changes).toEqual([{ rule: 'events-payload-meta', count: 1, todos: [TODO_EVENT_TIMESTAMP] }])
  })

  it('反例：顶层 amagiEvents 与静态 amagi.on / amagi.events 的负载一字不变', () => {
    // v6 全局单例（model/events.ts）形状一字未改；index.ts 把静态 on/events
    // 直接绑在 amagiEvents 上，所以这三种写法一个字都不该动
    const src = joinLines(
      `import amagi, { amagiEvents } from '@ikenxuan/amagi'`,
      `amagiEvents.on('api:success', (d) => console.log(d.platform, d.methodType, d.duration))`,
      `amagiEvents.once('log:info', (d) => console.log(d.timestamp, d.message))`,
      `amagi.on('api:error', (d) => console.error(d.methodType, d.errorMessage))`,
      `amagi.events.on('api:error', (d) => console.error(d.platform, d.errorMessage))`
    )
    const r = transformSource(src)
    expect(r.code).toBe(src)
    expect(r.changes).toEqual([])
    expect(r.injected).toEqual([])
  })

  it('同一文件混用两种来源：实例总线改、全局单例不动', () => {
    const head = `import amagi, { amagiEvents } from '@ikenxuan/amagi'`
    const src = joinLines(
      head,
      NEW_CLIENT,
      `client.events.on('api:success', (d) => console.log(d.platform))`,
      `amagiEvents.on('api:success', (d) => console.log(d.platform))`
    )
    const expected = joinLines(
      head,
      NEW_CLIENT,
      `client.events.on('api:success', (d) => console.log(d.meta.platform))`,
      `amagiEvents.on('api:success', (d) => console.log(d.platform))`
    )
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([{ rule: 'events-payload-meta', count: 1 }])
  })

  it('三种实例写法都认：内联工厂调用、createClient、client.events 别名', () => {
    const src = joinLines(
      `import amagi, { createClient } from '@ikenxuan/amagi'`,
      `amagi({ cookies: { douyin: 'ck' } }).on('api:success', (d) => console.log(d.platform))`,
      `const c2 = createClient({ cookies: { douyin: 'ck' } })`,
      `c2.events.once('api:error', (d) => console.error(d.errorMessage))`,
      `const bus = c2.events`,
      `bus.on('api:success', (d) => console.log(d.duration))`
    )
    const expected = joinLines(
      `import amagi, { createClient } from '@ikenxuan/amagi'`,
      `amagi({ cookies: { douyin: 'ck' } }).on('api:success', (d) => console.log(d.meta.platform))`,
      `const c2 = createClient({ cookies: { douyin: 'ck' } })`,
      `c2.events.once('api:error', (d) => console.error(d.error.message))`,
      `const bus = c2.events`,
      `bus.on('api:success', (d) => console.log(d.meta.durationMs))`
    )
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([{ rule: 'events-payload-meta', count: 3 }])
  })

  it('链式注册 .on(...).on(...) 两段都改', () => {
    const src = joinLines(
      IMPORT_DEFAULT,
      NEW_CLIENT,
      `client.events`,
      `  .on('api:success', (d) => console.log(d.platform))`,
      `  .on('api:error', (e) => console.error(e.errorMessage))`
    )
    const expected = joinLines(
      IMPORT_DEFAULT,
      NEW_CLIENT,
      `client.events`,
      `  .on('api:success', (d) => console.log(d.meta.platform))`,
      `  .on('api:error', (e) => console.error(e.error.message))`
    )
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([{ rule: 'events-payload-meta', count: 2 }])
  })

  it('来源判不出来（client 是外面传进来的）→ 不动码，标 TODO', () => {
    const src = joinLines(
      `export function wire(client: any): void {`,
      `  client.events.on('api:success', (d: any) => console.log(d.platform, d.methodType))`,
      `}`
    )
    const r = transformSource(src)
    expect(r.code).toBe(joinLines(TODO_EVENT_SOURCE, '', ...src.split('\n')))
    expect(r.changes).toEqual([{ rule: 'events-payload-meta', count: 1, todos: [TODO_EVENT_SOURCE] }])
  })

  it('监听器不是内联函数 / 形参被解构 → 不动码，标 TODO', () => {
    const src = joinLines(
      IMPORT_DEFAULT,
      NEW_CLIENT,
      `const onOk = (d: any): void => console.log(d.platform)`,
      `client.events.on('api:success', onOk)`,
      `client.events.on('api:error', ({ platform, errorMessage }) => console.error(platform, errorMessage))`
    )
    const r = transformSource(src)
    expect(r.code).toBe(joinLines(TODO_EVENT_MANUAL, '', ...src.split('\n')))
    expect(r.changes).toEqual([{ rule: 'events-payload-meta', count: 2, todos: [TODO_EVENT_MANUAL] }])
  })

  it('不读负载的监听器零命中零 TODO（`() => ...` 没什么可改）', () => {
    const src = joinLines(IMPORT_DEFAULT, NEW_CLIENT, `client.events.on('log:mark', () => refresh())`)
    const r = transformSource(src)
    expect(r.code).toBe(src)
    expect(r.changes).toEqual([])
  })

  it('别的库的 emitter 不命中（第一个实参必须是 amagi 的事件名）', () => {
    const src = joinLines(
      IMPORT_DEFAULT,
      NEW_CLIENT,
      `emitter.on('data', (d) => console.log(d.platform, d.duration))`,
      `client.events.on('custom:thing', (d) => console.log(d.platform))`
    )
    const r = transformSource(src)
    expect(r.code).toBe(src)
    expect(r.changes).toEqual([])
  })

  it('形参就叫 meta 时不会越改越深（幂等的关键守卫）', () => {
    const src = joinLines(IMPORT_DEFAULT, NEW_CLIENT, `client.on('api:success', (meta) => console.log(meta.platform))`)
    const first = transformSource(src)
    expect(first.code).toContain(`(meta) => console.log(meta.meta.platform)`)
    expect(transformSource(first.code).code).toBe(first.code)
  })

  it('幂等：连跑两次输出一字不差、TODO 不叠加', () => {
    const src = joinLines(
      IMPORT_DEFAULT,
      NEW_CLIENT,
      `client.events.on('api:error', (d) => console.error(d.platform, d.methodType, d.errorMessage))`,
      `client.events.on('log:warn', (d) => console.warn(d.timestamp))`,
      `client.events.on('api:success', handler)`
    )
    const first = transformSource(src)
    expect(first.injected).toEqual([TODO_EVENT_ENDPOINT, TODO_EVENT_TIMESTAMP, TODO_EVENT_MANUAL])
    const second = transformSource(first.code)
    expect(second.code).toBe(first.code)
    expect(second.injected).toEqual([])
    expect(second.code.split('\n').filter((l) => l.startsWith('// TODO(amagi-v7):'))).toEqual([
      TODO_EVENT_ENDPOINT,
      TODO_EVENT_TIMESTAMP,
      TODO_EVENT_MANUAL
    ])
  })
})

describe('同文件多种 TODO 各注入一次（组合）', () => {
  it('loose + r.code 两个 TODO 按规则序出现', () => {
    const src = joinLines(`const r = await fetcher.fetchWork({ a: 1, typeMode: 'loose' })`, `console.log(r.code)`)
    const expected = joinLines(TODO_LOOSE, TODO_R_CODE, '', `const r = await fetcher.fetchWork({ a: 1 })`, `console.log(r.code)`)
    const r = transformSource(src)
    expect(r.code).toBe(expected)
    expect(r.changes).toEqual([
      { rule: 'typeMode-loose', count: 1, todos: [TODO_LOOSE] },
      { rule: 'r-code-read', count: 1, todos: [TODO_R_CODE] }
    ])
  })
})

describe('幂等：连跑两次不改坏 TODO、不叠加', () => {
  it('第二次运行输出与第一次一字不差', () => {
    const src = joinLines(`const r = await fetchX({ a: 1, typeMode: 'loose' })`, `console.error(r.code)`)
    const first = transformSource(src)
    expect(first.code).toBe(joinLines(TODO_LOOSE, TODO_R_CODE, '', `const r = await fetchX({ a: 1 })`, `console.error(r.code)`))

    const second = transformSource(first.code)
    expect(second.code).toBe(first.code)
    // TODO 行不叠加：两条，各一次
    expect(second.code.split('\n').filter((l) => l.startsWith('// TODO(amagi-v7):'))).toEqual([TODO_LOOSE, TODO_R_CODE])
  })

  it('规则不扫已注入的 TODO 行（否则文案里的 v6 字面量会被删掉）', () => {
    // TODO_LOOSE 文案含 `typeMode: 'loose'`、TODO_R_CODE 文案含 `r.code` 与
    // `r.error.code` —— 不屏蔽的话规则 2 会把注释改坏、规则 7 计数会虚高到 3
    const src = joinLines(TODO_LOOSE, TODO_R_CODE, '', `console.error(r.code)`)
    const r = transformSource(src)
    expect(r.code).toBe(src)
    expect(r.changes).toEqual([{ rule: 'r-code-read', count: 1, todos: [TODO_R_CODE] }])
    // 命中了规则、但一条都没新注入（文件里已经有）
    expect(r.injected).toEqual([])
  })

  it('injected 只记真正写进文件的那几条', () => {
    const src = joinLines(`const r = await fetchX({ a: 1, typeMode: 'loose' })`, `console.error(r.code)`)
    expect(transformSource(src).injected).toEqual([TODO_LOOSE, TODO_R_CODE])
    expect(transformSource(transformSource(src).code).injected).toEqual([])
  })
})

describe('examples/v6-sample 端到端', () => {
  const examplesDir = fileURLToPath(new URL('../examples/v6-sample', import.meta.url))

  function withTempCopy(fn: (dir: string) => void): void {
    const dir = mkdtempSync(join(tmpdir(), 'amagi-codemod-e2e-'))
    cpSync(examplesDir, dir, { recursive: true })
    try {
      fn(dir)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  const read = (dir: string, file: string): string => readFileSync(join(dir, file), 'utf8')

  // 示例项目的全部源文件。events-global.ts 是**反例**：顶层 amagiEvents 的负载
  // 一字未变，所以它是唯一一个跑完之后不该被改的文件。
  const SAMPLE_FILES = [
    'douyin-video.ts',
    'bilibili-routes.ts',
    'kuaishou-routes.ts',
    'xiaohongshu-content.ts',
    'events-instance.ts',
    'events-global.ts',
    'spec/routes-map.ts'
  ]
  const UNCHANGED_FILE = 'events-global.ts'

  it('变换副本无 v6 残留，人工项全部带 TODO(amagi-v7:) 前缀', () => {
    withTempCopy((dir) => {
      const report = runCodemod(dir)
      expect(report.files).toBe(7)
      expect(report.changedFiles).toBe(6)
      expect(report.totalChanges).toBeGreaterThan(0)
      expect(report.totalTodos).toBeGreaterThan(0)
      for (const f of report.details) {
        if (f.file === UNCHANGED_FILE) {
          // 反例：一条规则都不该命中，一条 TODO 都不该注入
          expect(f.changed).toBe(false)
          expect(f.changes).toEqual([])
          expect(f.todoCount).toBe(0)
          continue
        }
        expect(f.changed).toBe(true)
        expect(f.todoCount).toBeGreaterThan(0)
      }

      const douyin = read(dir, 'douyin-video.ts')
      const bilibili = read(dir, 'bilibili-routes.ts')
      const xiaohongshu = read(dir, 'xiaohongshu-content.ts')
      const kuaishou = read(dir, 'kuaishou-routes.ts')
      const eventsInstance = read(dir, 'events-instance.ts')
      const routeMap = read(dir, 'spec/routes-map.ts')

      // 全局残留检查：typeMode / errorDescription 读法 / registerXxxRoutes( 调用。
      // 只查**代码行**——注入的 TODO 文案本身会引用 `typeMode: 'loose'` 这类字面量
      // （人工项要说明删了什么才有意义），注释行不算残留。
      const codeOnly = (text: string): string =>
        text
          .split('\n')
          .filter((line) => !line.trim().startsWith('//'))
          .join('\n')

      for (const file of [douyin, bilibili, xiaohongshu, kuaishou, eventsInstance, routeMap]) {
        const code = codeOnly(file)
        expect(code).not.toContain('typeMode')
        expect(code).not.toContain('errorDescription')
        expect(code).not.toMatch(/register(?:Douyin|Bilibili|Kuaishou|Xiaohongshu)Routes\(/)
      }

      // 所有被改文件第一行都带 TODO(amagi-v7:) 前缀（PRD 判据）
      for (const file of [douyin, bilibili, xiaohongshu, kuaishou, eventsInstance, routeMap]) {
        expect(file.split('\n')[0]).toMatch(/^\/\/ TODO\(amagi-v7\):/)
      }

      // douyin：loose + r-code TODO、amagiError 链已替换
      expect(douyin.split('\n').slice(0, 2).join('\n')).toBe(`${TODO_LOOSE}\n${TODO_R_CODE}`)
      expect(douyin).toContain('r.error.message')
      expect(douyin).toContain(`fetchVideoWork({`)
      expect(douyin).not.toContain('amagiError')

      // bilibili：registerBilibiliRoutes 调用已改名，普通 errorDescription 链已替换
      expect(bilibili.split('\n')[0]).toBe(TODO_R_CODE)
      expect(bilibili).toContain('amagi.createBilibiliRoutes(client)')
      expect(bilibili).toContain('r.error.message')

      // xiaohongshu：校验异常处理标注，代码本身保留
      expect(xiaohongshu.split('\n')[0]).toBe(TODO_VALIDATION)
      expect(xiaohongshu).toContain('if (e.issues)')

      // kuaishou：两条 ApiRoutes TODO，default 导入保留
      expect(kuaishou.split('\n').slice(0, 2).join('\n')).toBe(`${TODO_DOUYIN_API_ROUTES}\n${TODO_KUAISHOU_API_ROUTES}`)
      expect(kuaishou).toContain(`import amagi from '@ikenxuan/amagi'`)
      expect(kuaishou).toContain('amagi.createKuaishouRoutes(client)')
      expect(kuaishou).toContain('endpointMaps.some')

      // spec/routes-map：整条 import 删除 + 两条 TODO
      expect(routeMap.split('\n').slice(0, 2).join('\n')).toBe(`${TODO_BILIBILI_API_ROUTES}\n${TODO_DOUYIN_API_ROUTES}`)
      expect(routeMap).toContain('client.endpoints()')
      expect(routeMap).not.toContain('import {')
      expect(routeMap).toContain('Object.keys(DouyinApiRoutes)')

      // events-instance：实例总线的四条读法进 meta，methodType 值变化与 timestamp 各一条 TODO
      expect(eventsInstance.split('\n').slice(0, 2).join('\n')).toBe(`${TODO_EVENT_ENDPOINT}\n${TODO_EVENT_TIMESTAMP}`)
      expect(eventsInstance).toContain('${data.meta.platform}')
      expect(eventsInstance).toContain('${data.meta.endpoint}')
      expect(eventsInstance).toContain('${data.meta.durationMs}')
      expect(eventsInstance).toContain('${data.error.message}')
      expect(codeOnly(eventsInstance)).not.toMatch(/data\.(?:platform|methodType|duration|errorMessage)\b/)
      // timestamp 无对应键：只标注，代码原样留着让 tsc 指路
      expect(eventsInstance).toContain('console.warn(data.timestamp, data.message)')

      // events-global：反例 —— 顶层 amagiEvents / 静态 amagi.on 的负载一字未变
      expect(read(dir, UNCHANGED_FILE)).toBe(readFileSync(join(examplesDir, UNCHANGED_FILE), 'utf8'))

      // 源 examples 目录本身未被污染（测试只碰临时副本）
      expect(readFileSync(join(examplesDir, 'douyin-video.ts'), 'utf8')).toContain('typeMode:')
    })
  })

  it('连跑两次：第二次零改写，示例项目内容不再变动', () => {
    withTempCopy((dir) => {
      expect(runCodemod(dir).changedFiles).toBe(6)
      const afterFirst = SAMPLE_FILES.map((f) => read(dir, f))

      const second = runCodemod(dir)
      expect(second.changedFiles).toBe(0)
      expect(second.totalTodos).toBe(0)
      expect(SAMPLE_FILES.map((f) => read(dir, f))).toEqual(afterFirst)
    })
  })

  it('单文件模式：runCodemod 接受 .ts 文件路径', () => {
    withTempCopy((dir) => {
      const report = runCodemod(join(dir, 'douyin-video.ts'))
      expect(report.files).toBe(1)
      expect(report.changedFiles).toBe(1)
      expect(existsSync(join(dir, 'douyin-video.ts'))).toBe(true)
    })
  })

  it('路径不存在时抛错', () => {
    expect(() => runCodemod(join(tmpdir(), 'amagi-codemod-no-such-dir-xyz'))).toThrow(/路径不存在/)
  })
})

describe('未命中文件的空跑', () => {
  it('无 v6 残留的文本零变更', () => {
    const src = joinLines(`export const ok = (): number => 42`, `const r = await fetchX({ a: 1 })`, `console.log(r.data)`)
    const r = transformSource(src)
    expect(r.code).toBe(src)
    expect(r.changes).toEqual([])
  })
})
