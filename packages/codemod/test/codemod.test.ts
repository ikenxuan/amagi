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

  it('变换副本无 v6 残留，人工项全部带 TODO(amagi-v7:) 前缀', () => {
    withTempCopy((dir) => {
      const report = runCodemod(dir)
      expect(report.files).toBe(5)
      expect(report.changedFiles).toBe(5)
      expect(report.totalChanges).toBeGreaterThan(0)
      expect(report.totalTodos).toBeGreaterThan(0)
      for (const f of report.details) {
        expect(f.changed).toBe(true)
        expect(f.todoCount).toBeGreaterThan(0)
      }

      const douyin = read(dir, 'douyin-video.ts')
      const bilibili = read(dir, 'bilibili-routes.ts')
      const xiaohongshu = read(dir, 'xiaohongshu-content.ts')
      const kuaishou = read(dir, 'kuaishou-routes.ts')
      const routeMap = read(dir, 'spec/routes-map.ts')

      // 全局残留检查：typeMode / errorDescription 读法 / registerXxxRoutes( 调用。
      // 只查**代码行**——注入的 TODO 文案本身会引用 `typeMode: 'loose'` 这类字面量
      // （人工项要说明删了什么才有意义），注释行不算残留。
      const codeOnly = (text: string): string =>
        text
          .split('\n')
          .filter((line) => !line.trim().startsWith('//'))
          .join('\n')

      for (const file of [douyin, bilibili, xiaohongshu, kuaishou, routeMap]) {
        const code = codeOnly(file)
        expect(code).not.toContain('typeMode')
        expect(code).not.toContain('errorDescription')
        expect(code).not.toMatch(/register(?:Douyin|Bilibili|Kuaishou|Xiaohongshu)Routes\(/)
      }

      // 所有被改文件第一行都带 TODO(amagi-v7:) 前缀（PRD 判据）
      for (const file of [douyin, bilibili, xiaohongshu, kuaishou, routeMap]) {
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

      // 源 examples 目录本身未被污染（测试只碰临时副本）
      expect(readFileSync(join(examplesDir, 'douyin-video.ts'), 'utf8')).toContain('typeMode:')
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
