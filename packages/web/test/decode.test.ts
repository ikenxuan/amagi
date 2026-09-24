/**
 * **wire body 不是 JSON 的那三个端点。**
 *
 * 这份文件钉的是一个报上来的现象：给 `douyin/search` 生成类型时，界面上「响应」那块面板里
 * 是一段**字符串**而不是 JSON —— 而 core 那边明明有 multi-JSON 解码。
 *
 * 成因是一条两段链，两段单独看都对：
 *
 * 1. `server/record.ts` 靠**包一层 `ctx.send`** 拿原始响应，而 `ctx.send` 交出来的是
 *    **wire body** —— 管线要到下一步（`runtime/execute.ts` 的 `stage = 'decode'`）才调
 *    `def.decode`。于是控制台拿到的永远是解码**之前**那一份。
 * 2. 抖音 `search` 的 wire body 是「多个 JSON 粘连成一个字符串」的反爬格式（实测 721 KB 的
 *    `15838\r\n{"status_code":0,…}`），小红书 `userProfile` 是 HTML 页面，B站 `videoDanmaku`
 *    是 protobuf 二进制。这三份东西当类型证据的信息量都是**零**。
 *
 * 四个后果，判据分别落在下面四组上：**样本的 `raw` 层渲出来是 `string`**（而另外两个端点
 * 没有 `normalize`，那一层是它们唯一的类型证据）、**入库判定在字符串上找不到业务码**
 * （于是风控页混得进来）、**`trimSample` 截不动字符串**（样本白占 807 KB）、
 * **界面上「原始」那一档显示的就是它**。
 *
 * CLI 那条录制路径（`packages/core/scripts/record-corpus.mts`）对同一件事的处理是**如实拒掉**
 * 这三个端点，理由写在那个文件里：「这类端点的类型该描述的是 `decode` 之后的结构，而 corpus 的
 * `raw` 按定义是解码前的，两者装不进同一个格式」。这一轮换掉的正是那个定义。
 */

import { readFileSync } from 'node:fs'

import { createScrubSession, type JsonValue } from '@ikenxuan/amagi-typegen'
import { describe, expect, it } from 'vitest'

import type { AnyEndpointDef } from '../../core/src/contracts/endpoint'
import type { RawResponse } from '../../core/src/contracts/request'
import { REGISTRIES } from '../server/endpoints'
import { buildOutcome } from '../server/outcome'
import { withDecodeCapture } from '../server/record'

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

/**
 * 去掉注释再断言 —— 这几个文件的注释里写满了 `decode`，它们正在解释这件事。
 *
 * **行注释先删。** 反过来的话，一行行注释里只要出现 `/` 紧跟 `*` 的序列（写 glob、写
 * `exports` 通配时很自然），块注释那条就会把它当成块注释的开头，一路吃到下一个块注释
 * 结尾 —— 中间的真代码跟着消失。见 `amagi-comment-stripping-regex-trap`。
 */
const codeOf = (source: string): string => source.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

/** `decode` 的第二个参数。三个端点一个都不读它，给个最小的够了 */
const RES = { status: 200, headers: {}, body: undefined, durationMs: 1, url: 'https://example.test' } as unknown as RawResponse

/**
 * 抖音搜索的真实 wire 形状：**分块长度前缀 + 多个 JSON 粘连**。
 *
 * 这不是编的 —— 实测 `query: 猫` 拿回来的就是 `15838\r\n{"status_code":0,…}` 这个样子
 * （721 KB）。`parseDouyinMultiJson` 按花括号深度切块，所以那些十进制长度前缀会被跳过。
 */
const WIRE = ['15', '{"status_code":0,"cursor":10,"has_more":1,"data":[{"type":1,"aweme_info":{"aweme_id":"1"}}]}', '0', ''].join('\r\n')

describe('`withDecodeCapture` —— 让控制台读到管线算出来的那个值', () => {
  it('端点没有 `decode` 时**原样返回同一个 def 对象**，`read()` 回 undefined', () => {
    // 58 个端点走这条路。不浅拷贝是有意的：`execute` 会读 def 上十几个键，
    // 白拷一份只是多一处将来会脱节的地方
    const def = { name: 'x.y' } as unknown as AnyEndpointDef
    const wrapped = withDecodeCapture(def)
    expect(wrapped.def).toBe(def)
    expect(wrapped.read()).toBeUndefined()
  })

  it('包过之后 `decode` 照原样返回给管线 —— 拦截器不改判定', () => {
    const def = { name: 'x.y', decode: (raw: unknown) => ({ unwrapped: raw }) } as unknown as AnyEndpointDef
    const wrapped = withDecodeCapture(def)
    expect(wrapped.def.decode!('v', RES)).toEqual({ unwrapped: 'v' })
    expect(wrapped.read()).toEqual({ unwrapped: 'v' })
  })

  it('`decode` 抛错时 `read()` 仍是 undefined，而且**异常原样上抛**', () => {
    // 小红书撞上风控页走的就是这条（「用户页面缺少 __INITIAL_STATE__」）。不吞异常是要紧的：
    // `execute` 那唯一一处 catch 要靠它归因成 `parse` / `DECODE_FAILED`
    const def = {
      name: 'x.y',
      decode: () => {
        throw new Error('风控页')
      }
    } as unknown as AnyEndpointDef
    const wrapped = withDecodeCapture(def)
    expect(() => wrapped.def.decode!('v', RES)).toThrow('风控页')
    expect(wrapped.read()).toBeUndefined()
  })

  it('留下的是**最后一次** decode 的值 —— 分页端点每一页都会覆盖它', () => {
    // 与 `raw` 那一层同一条约定（`record.ts` 文件头）：最后一发才是被放过的那一发
    const def = { name: 'x.y', decode: (raw: unknown) => ({ page: raw }) } as unknown as AnyEndpointDef
    const wrapped = withDecodeCapture(def)
    wrapped.def.decode!(1, RES)
    wrapped.def.decode!(2, RES)
    expect(wrapped.read()).toEqual({ page: 2 })
  })

  it('**接的是 core 那份 multi-JSON 解码**，不是这边另抄一个解析器', () => {
    // 这条是这一轮的主诉：`douyin/search` 的 wire body 过一遍包装之后必须变成对象。
    // 用的是注册表里那个真 `decode`（它内部走 `parseDouyinMultiJson` + `filterSearchResponses`）
    const wrapped = withDecodeCapture(REGISTRIES.douyin.search as AnyEndpointDef)
    const returned = wrapped.def.decode!(WIRE, RES)
    const decoded = wrapped.read()
    expect(typeof WIRE).toBe('string')
    expect(decoded).toEqual(returned)
    expect(decoded).toMatchObject({ status_code: 0, has_more: 1, data: [{ type: 1, aweme_info: { aweme_id: '1' } }] })
  })
})

describe('全仓只有三个端点有 `decode`，而它们的 wire body 都不是 JSON', () => {
  it('名单就是这三个 —— 加第四个时这条会红，那时请先想清楚它的 wire 形状', () => {
    const withDecode = Object.entries(REGISTRIES)
      .flatMap(([platform, registry]) => Object.entries(registry).map(([name, def]) => ({ platform, name, def })))
      .filter((entry) => (entry.def as AnyEndpointDef).decode !== undefined)
      .map((entry) => `${entry.platform}/${entry.name}`)
      .sort()
    expect(withDecode).toEqual(['bilibili/videoDanmaku', 'douyin/search', 'xiaohongshu/userProfile'])
  })

  it('其中两个**没有整形步骤**（normalize / paginate.merge）—— 于是 `raw` 层是它们唯一的类型证据', () => {
    // 这就是「存 wire body」代价最大的地方：`plan.ts` / `shape.ts` 的 `payloadOf` 在缺
    // `normalized` 时读的正是 `raw`，于是这两个端点的类型会直接渲成 `string`。
    // `douyin/search` 是分页端点，整形在 `paginate.merge` 上，同样产出 `normalized`
    const shapedOf = (platform: 'bilibili' | 'douyin' | 'xiaohongshu', name: string) => {
      const def = REGISTRIES[platform][name] as AnyEndpointDef
      return def.normalize !== undefined || def.paginate?.merge !== undefined
    }
    expect(shapedOf('bilibili', 'videoDanmaku')).toBe(false)
    expect(shapedOf('xiaohongshu', 'userProfile')).toBe(false)
    expect(shapedOf('douyin', 'search')).toBe(true)
  })
})

describe('录制那侧把解码后的值当 `raw` 层用', () => {
  const record = codeOf(read('server/record.ts'))
  const route = codeOf(read('server/index.ts'))

  it('`captureRaw` 把 `decoded` 与 `raw` 分成两个键', () => {
    // 合成一个就分不开「wire body 本来就是 JSON」与「decode 把它解出来了」，
    // 而 `bytes` 要数的恰恰是前者
    expect(record).toContain('decoded?: JsonValue')
    expect(record).toContain('const wrapped = withDecodeCapture(input.def)')
    expect(record).toContain('const decoded = wrapped.read()')
  })

  it('管线跑的是**包过的** def —— 不包就一个字都读不到', () => {
    expect(record).toContain('await execute(wrapped.def, input.params')
  })

  it('路由把 `captured.decoded ?? captured.raw` 传给 `buildOutcome`', () => {
    expect(route).toContain('raw: captured.decoded ?? captured.raw')
  })

  it('`bytes` 仍然数 wire body —— 它回答的是「平台回了多大一坨」', () => {
    // 两者在这三个端点上差着一倍（实测 721 KB 的字符串 vs 解码后的对象）。
    // 跟着 `rawPayload` 走的话这个数就不再是传输事实了
    expect(route).toContain('receiptBytesOf(captured.raw, outcome.payload)')
  })
})

describe('修掉的那四个后果', () => {
  const outcomeFor = (raw: JsonValue) =>
    buildOutcome({
      platform: 'douyin',
      endpoint: 'search',
      params: { query: '猫' },
      raw,
      http: { status: 200 },
      amagiVersion: '7.0.0',
      stored: [],
      now: new Date('2026-09-10T00:00:00Z'),
      newId: () => 'test-id',
      scrub: { session: createScrubSession() }
    })

  /** 同一发响应的两种存法：wire body（字符串）与解码后（对象） */
  const wire = outcomeFor(WIRE)
  const decoded = outcomeFor(withDecodeCapture(REGISTRIES.douyin.search as AnyEndpointDef).def.decode!(WIRE, RES) as JsonValue)

  it('① 入库判定不再是瞎的 —— 字符串上找不到业务码', () => {
    // 这是四条里最贵的一条：`confident: false` 的意思是「判定器在这份响应上没有依据」，
    // 而风控页混进 corpus 走的正是这条路。实测这两句话的差别就是
    // 「没有可查的业务码，按正常响应入库」→「status_code=0」
    expect(wire.outcome.verdict?.confident).toBe(false)
    expect(decoded.outcome.verdict?.confident).toBe(true)
    expect(decoded.outcome.verdict?.reason).toContain('status_code=0')
  })

  it('② 样本的 `raw` 层是对象，不是一段读不了的字符串', () => {
    expect(typeof wire.pending!.sample.raw).toBe('string')
    expect(typeof decoded.pending!.sample.raw).toBe('object')
  })

  it('③ `trimSample` 截得动了 —— 它按形状截**数组**，对字符串无话可说', () => {
    expect(wire.outcome.payloadTrimmed).toEqual([])
    // 这份 fixture 的 data 只有 1 条、截不到，所以这里钉的是「路径能被看见」这件事本身：
    // 解码后那一层里有数组，而 wire 那一层里一个都没有
    expect(JSON.stringify(decoded.pending!.sample.raw)).toContain('aweme_id')
  })

  it('④ 界面「原始」那一档拿到的是 JSON（`rawPayload`）', () => {
    expect(typeof wire.outcome.rawPayload).toBe('string')
    expect(typeof decoded.outcome.rawPayload).toBe('object')
  })

  it('类型证据真的换过来了 —— 渲出来不再是 `string`', () => {
    // 判据用 diff：wire 那一层摊不出一个字段（根本身是标量），而解码后那一层摊得出
    expect(decoded.outcome.diff!.some((line) => line.path.includes('status_code'))).toBe(true)
    expect(wire.outcome.diff!.some((line) => line.path.includes('status_code'))).toBe(false)
  })
})
