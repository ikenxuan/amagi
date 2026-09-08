/**
 * **`compute` 端点：没有 HTTP 层的那两个。**
 *
 * 这份文件钉的是一个报上来的 bug 的形状：`bilibili/bvToAv` 按「发送」之后，界面说
 * 「这份不能入库（判定拒了，或脱敏有残留）」并在响应面板里渲出一个 `null`。**两句话都不对。**
 *
 * 成因是一条三段链，每一段单独看都对：
 *
 * 1. `runtime/execute.ts` 在 `def.compute` 上**短路返回** —— `prepare` / `build` / `sign` /
 *    `send` 一个都不跑。
 * 2. `server/record.ts` 靠**包一层 `ctx.send`** 拿原始响应，于是那个包装一次都不会被调用：
 *    `raw` 恒为 `undefined`、`status` 恒为 0。
 * 3. `server/index.ts` 于是走进「一发请求都没打出去」那条早返回 —— 那条路不给 `payload`、
 *    不给 `pendingId`，也压根不调判定器。前端 `payload` 缺席时的回落是
 *    `JSON.stringify(payload ?? null)`，于是屏幕上出现一个 `null`。
 *
 * 所以判据分三层，一层一条：**端点元数据认得出它**（下面第一组）、**录制那侧在撞上
 * 「raw 为空」之前就把它分出去**（第二组，顺序本身就是修复）、以及**界面按它换一句话说**
 * （第三组）。
 *
 * 为什么不去测 `recordOne` 本身：它住在路由文件里、开头就读 cookie 与磁盘样本。
 * 那一段的判据因此是读源码 —— 与 `appLayout.test.ts` 里那些「造好但没接线」的绊线同一条做法。
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildEndpointList, REGISTRIES } from '../server/endpoints'

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

/** 去掉注释再断言 —— 否定断言尤其需要（这几个文件的注释里写满了 `compute`，它们正在解释这件事） */
const codeOf = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** 整份端点清单。这一层是纯的（注册表是模块级常量），所以 node 里直接调得动 */
const platforms = buildEndpointList({
  seeds: { version: 1, platforms: {} },
  hasCookie: () => true,
  storedCount: () => 0
})

const flat = platforms.flatMap((platform) => platform.endpoints.map((endpoint) => ({ platform: platform.platform, ...endpoint })))

describe('端点元数据认得出「本地计算」这件事', () => {
  it('`bvToAv` / `avToBv` 是 `computed: true`，而且**全仓只有这两个**', () => {
    // 排序之后再比：注册表的键顺序是实现细节，钉它只会在别人重排一行时白红一条
    const computed = flat
      .filter((endpoint) => endpoint.computed)
      .map((endpoint) => `${endpoint.platform}/${endpoint.name}`)
      .sort()
    expect(computed).toEqual(['bilibili/avToBv', 'bilibili/bvToAv'])
  })

  it('打网络请求的那些一个都没被误标', () => {
    // 抽三个形状不同的：签名端点、免鉴权端点、带 normalize 的
    for (const name of ['videoInfo', 'comments', 'emojiList']) {
      const endpoint = flat.find((entry) => entry.platform === 'bilibili' && entry.name === name)
      expect(endpoint, `bilibili/${name} 不在清单里 —— 这条用例的判据没了`).toBeDefined()
      expect(endpoint!.computed, `bilibili/${name}`).toBe(false)
    }
  })

  it('**判据与 core 里那个短路逐字相同** —— 不是另抄一份名单', () => {
    // 界面认「本地计算」的唯一依据是 `def.compute !== undefined`，而 `execute` 决定短路
    // 用的也是它。这条对着注册表本身再问一遍：两边的答案必须一模一样
    const fromRegistry = Object.entries(REGISTRIES.bilibili)
      .filter(([, def]) => (def as { compute?: unknown }).compute !== undefined)
      .map(([name]) => name)
      .sort()
    expect(fromRegistry).toEqual(['avToBv', 'bvToAv'])
    expect(codeOf(read('server/endpoints.ts'))).toContain('computed: (def as AnyEndpointDef).compute !== undefined')
  })
})

describe('录制那侧在撞上「raw 为空」之前就把它分出去', () => {
  const record = codeOf(read('server/record.ts'))
  const route = codeOf(read('server/index.ts'))

  it('`captureRaw` 有一条 `def.compute` 的分支，而且它在 `raw === undefined` **前面**', () => {
    const compute = record.indexOf('if (input.def.compute !== undefined)')
    const empty = record.indexOf('if (raw === undefined)')
    expect(compute).toBeGreaterThan(-1)
    expect(empty).toBeGreaterThan(-1)
    // **顺序本身就是修复**：反过来的话它照旧落进「一发请求都没打出去」，而那正是那个 bug
    expect(compute).toBeLessThan(empty)
  })

  it('`computed` 与 `raw` 是两个键 —— 合成一个就分不开「204 空 body」与「压根不打请求」', () => {
    expect(record).toContain('computed?: JsonValue')
    expect(record).toContain('return { http, computed: result.data as JsonValue }')
  })

  it('路由那一支：算出来的值当 `payload` 回，`verdict.kind` 是 `compute`，而且**不给 `pendingId`**', () => {
    const branch = route.slice(route.indexOf('if (captured.computed !== undefined)'), route.indexOf('if (captured.raw === undefined)'))
    expect(branch).toContain('payload: captured.computed')
    expect(branch).toContain("kind: 'compute'")
    // 不是「拒了」，是没有东西需要录：`compute` 的返回值由本仓库的 TS 完全决定，
    // 没有平台漂移 —— 而抓平台漂移是这个工具存在的全部理由
    expect(branch).not.toContain('pendingId')
    // `bytes` 照实算：0 的意思是「一发都没打出去」，而这里真的算出了一个值
    expect(branch).toContain('bytes: Buffer.byteLength(JSON.stringify(captured.computed)')
  })

  it('这一支同样在 `raw === undefined` 前面（路由那一侧）', () => {
    expect(route.indexOf('if (captured.computed !== undefined)')).toBeLessThan(route.indexOf('if (captured.raw === undefined)'))
  })
})

describe('界面按 `computed` 换话说，而不是让人从一段 `null` 里猜', () => {
  const request = codeOf(read('src/components/RequestPane.tsx'))
  const response = codeOf(read('src/components/ResultActions.tsx'))

  it('「请求」栏在**按之前**就说了「本地计算，不打网络请求」', () => {
    expect(request).toContain('{endpoint.computed && (')
    expect(request).toContain('本地计算，不打网络请求')
  })

  it('「批量」与「生成类型」在这一档不出现 —— 两颗都是空动作', () => {
    // 矩阵展开出来的每一组都录不到样本，而「生成类型」要的是样本
    expect(request).toContain('{!endpoint.computed && endpoint.combinations > 1 && (')
    expect(codeOf(read('src/components/ResultPane.tsx'))).toContain('{!computed && (')
  })

  it('cookie 缺失那一行在这一档不渲 —— 这种端点压根不带 cookie 出门', () => {
    expect(request).toContain('{!platform.hasCookie && !endpoint.computed && (')
  })

  it('「这一份怎么处理」那一格说的是「不用录样本」而不是「不能入库」', () => {
    // 说成「不能入库」会让人去重录，而这种端点重录一万次结果都一样
    expect(response).toContain("outcome.verdict.kind === 'compute' ? '这个端点不用录样本。' : '这份不能入库。'")
    // 判定的原话照样渲出来（原先只有一句笼统的括号，人得去 Chip 上 hover 才知道是哪一样）
    expect(response).toContain('{outcome.verdict.kind}：{outcome.verdict.reason}')
  })
})
