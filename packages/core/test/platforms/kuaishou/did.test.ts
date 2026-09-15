import { buildKuaishouDidCookie, createKuaishouDidState, isValidKuaishouDid, randomKuaishouDid } from 'amagi/platforms/kuaishou/did'
/**
 * platforms/kuaishou/did 的契约。
 *
 * did 是快手 H5 链路「零配置可用」的唯一凭证：本地生成、只进 Cookie 头、
 * 不进 query 也不进签名。这里锁死四件事 ——
 * - 生成形状是 `web_` + 32 位小写 hex，且每次生成都不同；
 * - 校验比对照项目更严（大写 / 长度不对 / 缺前缀一律判假）；
 * - 状态**每实例一份、进程内稳定**（同实例复用，跨实例互不相同）；
 * - Cookie 拼装在 userCookie 为空或纯空白时不能留下尾随的 `; `。
 */
import { describe, expect, it } from 'vitest'

const DID_SHAPE = /^web_[0-9a-f]{32}$/

describe('randomKuaishouDid - 生成形状', () => {
  it('形如 web_ + 32 位小写 hex', () => {
    expect(randomKuaishouDid()).toMatch(DID_SHAPE)
  })

  it('两次生成不同（每个实例一个新设备号）', () => {
    expect(randomKuaishouDid()).not.toBe(randomKuaishouDid())
  })
})

describe('isValidKuaishouDid - 只看形状', () => {
  it('合法值判真', () => {
    expect(isValidKuaishouDid('web_36aba77ad01b71bdfc98c0e250ec166b')).toBe(true)
    expect(isValidKuaishouDid(randomKuaishouDid())).toBe(true)
  })

  it('大写 hex 判假（对照项目的 /i 在这里被收紧）', () => {
    expect(isValidKuaishouDid('web_ABC')).toBe(false)
    expect(isValidKuaishouDid('web_36ABA77AD01B71BDFC98C0E250EC166B')).toBe(false)
  })

  it('长度不对判假（32 位以外都不认）', () => {
    expect(isValidKuaishouDid('web_36aba77ad01b71bd')).toBe(false)
    expect(isValidKuaishouDid('web_36aba77ad01b71bdfc98c0e250ec166bff')).toBe(false)
    expect(isValidKuaishouDid('web_')).toBe(false)
  })

  it('缺 web_ 前缀判假', () => {
    expect(isValidKuaishouDid('36aba77ad01b71bdfc98c0e250ec166b')).toBe(false)
    expect(isValidKuaishouDid('did=web_36aba77ad01b71bdfc98c0e250ec166b')).toBe(false)
    expect(isValidKuaishouDid('')).toBe(false)
  })
})

describe('createKuaishouDidState - 每实例一份、进程内稳定', () => {
  it('同一实例多次取到同一个 did', () => {
    const state = createKuaishouDidState()
    const first = state.getDid()

    expect(first).toMatch(DID_SHAPE)
    expect(state.getDid()).toBe(first)
    expect(state.getDid()).toBe(first)
  })

  it('两个实例的 did 不同（状态不是模块级单例）', () => {
    const a = createKuaishouDidState()
    const b = createKuaishouDidState()

    expect(a.getDid()).not.toBe(b.getDid())
    // 交叉再取一次，确认各自仍返回自己的值
    expect(a.getDid()).not.toBe(b.getDid())
  })
})

describe('buildKuaishouDidCookie - Cookie 头拼装', () => {
  it('不带 userCookie 时只有 did 与 didv', () => {
    expect(buildKuaishouDidCookie(randomKuaishouDid())).toMatch(/^did=web_[0-9a-f]{32}; didv=\d+$/)
  })

  it('带 userCookie 时以 `; ` 追加在后面', () => {
    const cookie = buildKuaishouDidCookie('web_36aba77ad01b71bdfc98c0e250ec166b', 'kwfv1=TOKEN123; other=1')

    expect(cookie).toMatch(/^did=web_36aba77ad01b71bdfc98c0e250ec166b; didv=\d+; kwfv1=TOKEN123; other=1$/)
  })

  it('userCookie 是空串或纯空白时不留尾随的 `; `', () => {
    for (const userCookie of ['', '   ', '\t\n', undefined]) {
      const cookie = buildKuaishouDidCookie('web_36aba77ad01b71bdfc98c0e250ec166b', userCookie)

      expect(cookie, JSON.stringify(userCookie)).toMatch(/^did=web_36aba77ad01b71bdfc98c0e250ec166b; didv=\d+$/)
      expect(cookie.endsWith('; '), JSON.stringify(userCookie)).toBe(false)
    }
  })

  it('userCookie 首尾空白被 trim 掉', () => {
    const cookie = buildKuaishouDidCookie('web_36aba77ad01b71bdfc98c0e250ec166b', '  kwfv1=TOKEN123  ')

    expect(cookie.endsWith('kwfv1=TOKEN123')).toBe(true)
  })
})
