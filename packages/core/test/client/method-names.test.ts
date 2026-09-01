import {
  bilibiliFetcher,
  douyinFetcher,
  kuaishouFetcher,
  xiaohongshuFetcher
} from 'amagi/index'
import { fullNameOf, METHOD_NAMES, methodNameOf, methodNamesOf } from 'amagi/client/method-names'
import { PLATFORMS } from 'amagi/contracts/platform'
/**
 * client/method-names 的契约。
 *
 * 这张表是全仓唯一一处手写映射，漏一个就等于某个 v6 方法在 v7 里凭空消失。
 * 所以这里不看 PRD 附表，直接拿四个平台的**活 fetcher 对象**逐个核对 ——
 * 那些方法名由 `test/contract/fetcher-surface.test.ts` 的快照锁死。
 */
import { describe, expect, it } from 'vitest'

/** 抖音 passport 的 4 个方法是会话而不是端点，归阶段 5，不进映射表 */
const SESSION_METHODS: Record<string, string[]> = {
  douyin: ['requestPassportQrcode', 'checkPassportQrcode', 'sendPassportVerifyCode', 'validatePassportVerifyCode'],
  bilibili: [],
  kuaishou: [],
  xiaohongshu: []
}

/** v6 活 fetcher 上的端点方法名（去掉会话方法） */
const v6MethodsOf = (platform: string, fetcher: object): string[] =>
  Object.keys(fetcher)
    .filter((name) => !SESSION_METHODS[platform].includes(name))
    .sort()

const LIVE = {
  douyin: douyinFetcher,
  bilibili: bilibiliFetcher,
  kuaishou: kuaishouFetcher,
  xiaohongshu: xiaohongshuFetcher
} as const

/** 「规则」映射：fetch + 端点短名首字母大写 */
const regularNameOf = (endpoint: string): string => `fetch${endpoint[0].toUpperCase()}${endpoint.slice(1)}`

describe('client/method-names - 59 个端点一一对应、无遗漏', () => {
  it('映射表共 59 条', () => {
    expect(Object.keys(METHOD_NAMES)).toHaveLength(59)
  })

  it.each([
    ['douyin', 19],
    ['bilibili', 27],
    ['kuaishou', 6],
    ['xiaohongshu', 7]
  ] as const)('%s 有 %i 个端点', (platform, count) => {
    expect(Object.keys(methodNamesOf(platform))).toHaveLength(count)
  })

  it.each(PLATFORMS)('%s：映射表里的 v6 方法名集合与活 fetcher 完全一致', (platform) => {
    const mapped = Object.values(methodNamesOf(platform)).sort()
    expect(mapped).toEqual(v6MethodsOf(platform, LIVE[platform]))
  })

  it.each(PLATFORMS)('%s：活 fetcher 上没有任何方法在映射表里找不到出处', (platform) => {
    const mapped = new Set(Object.values(methodNamesOf(platform)))
    const missing = v6MethodsOf(platform, LIVE[platform]).filter((name) => !mapped.has(name))
    expect(missing).toEqual([])
  })

  it.each(PLATFORMS)('%s：映射表里没有活 fetcher 上不存在的方法名（防止拼错）', (platform) => {
    const live = new Set(Object.keys(LIVE[platform]))
    const stale = Object.values(methodNamesOf(platform)).filter((name) => !live.has(name))
    expect(stale).toEqual([])
  })

  it.each(PLATFORMS)('%s：同一平台内 v6 方法名不重复', (platform) => {
    const values = Object.values(methodNamesOf(platform))
    expect(new Set(values).size).toBe(values.length)
  })

  it('端点短名在同一平台内不重复（键天然唯一，这里防跨平台串台）', () => {
    for (const platform of PLATFORMS) {
      const keys = Object.keys(methodNamesOf(platform))
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('抖音 passport 的 4 个会话方法不在映射表里', () => {
    const all = new Set<string>(Object.values(METHOD_NAMES))
    for (const name of SESSION_METHODS.douyin) {
      expect(all.has(name)).toBe(false)
    }
  })
})

describe('client/method-names - 15 个不规则映射', () => {
  /** 端点全名 → 期望的 v6 方法名。逐条写死，不从源码反推 */
  const IRREGULAR: Record<string, string> = {
    'douyin.parseWork': 'parseWork',
    'douyin.comments': 'fetchWorkComments',
    'douyin.search': 'searchContent',
    'douyin.loginQrcode': 'requestLoginQrcode',
    'bilibili.videoStream': 'fetchVideoStreamUrl',
    'bilibili.bangumiStream': 'fetchBangumiStreamUrl',
    'bilibili.liveRoomInit': 'fetchLiveRoomInitInfo',
    'bilibili.loginQrcode': 'requestLoginQrcode',
    'bilibili.qrcodeStatus': 'checkQrcodeStatus',
    'bilibili.avToBv': 'convertAvToBv',
    'bilibili.bvToAv': 'convertBvToAv',
    'bilibili.captchaFromVoucher': 'requestCaptchaFromVoucher',
    'bilibili.validateCaptcha': 'validateCaptchaResult',
    'kuaishou.comments': 'fetchWorkComments',
    'xiaohongshu.searchNotes': 'searchNotes'
  }

  it('清单恰好 15 条', () => {
    expect(Object.keys(IRREGULAR)).toHaveLength(15)
  })

  it.each(Object.entries(IRREGULAR))('%s → %s', (full, expected) => {
    expect((METHOD_NAMES as Record<string, string>)[full]).toBe(expected)
  })

  it('按「fetch + 首字母大写」判定，不规则的恰好就是这 15 个', () => {
    const detected = Object.entries(METHOD_NAMES)
      .filter(([full, method]) => method !== regularNameOf(full.slice(full.indexOf('.') + 1)))
      .map(([full]) => full)
      .sort()
    expect(detected).toEqual(Object.keys(IRREGULAR).sort())
  })

  it('其余 44 条都是规则映射', () => {
    const regular = Object.entries(METHOD_NAMES).filter(([full, method]) => method === regularNameOf(full.slice(full.indexOf('.') + 1)))
    expect(regular).toHaveLength(44)
  })
})

describe('client/method-names - 查表 API', () => {
  it('fullNameOf 拼出 <platform>.<endpoint>', () => {
    expect(fullNameOf('douyin', 'videoWork')).toBe('douyin.videoWork')
  })

  it('methodNameOf 命中与未命中', () => {
    expect(methodNameOf('douyin', 'search')).toBe('searchContent')
    expect(methodNameOf('bilibili', 'avToBv')).toBe('convertAvToBv')
    expect(methodNameOf('douyin', '不存在的端点')).toBeUndefined()
  })

  it('同名端点在不同平台可以映射到不同方法名', () => {
    expect(methodNameOf('bilibili', 'comments')).toBe('fetchComments')
    expect(methodNameOf('douyin', 'comments')).toBe('fetchWorkComments')
    expect(methodNameOf('kuaishou', 'comments')).toBe('fetchWorkComments')
  })

  it('methodNamesOf 只返回该平台的条目', () => {
    const xhs = methodNamesOf('xiaohongshu')
    expect(Object.keys(xhs).sort()).toEqual([
      'emojiList',
      'homeFeed',
      'noteComments',
      'noteDetail',
      'searchNotes',
      'userNoteList',
      'userProfile'
    ])
  })
})
