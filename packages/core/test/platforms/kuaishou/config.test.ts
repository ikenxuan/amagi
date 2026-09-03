import { AmagiHeaders } from 'amagi/contracts/request'
import { DEFAULT_UA, MOBILE_UA } from 'amagi/contracts/ua'
import { createKuaishouConfig, kuaishouH5Headers } from 'amagi/platforms/kuaishou/config'
/**
 * platforms/kuaishou/config 的契约。
 *
 * 判据：**v6 `test/platform/default-configs.test.ts` 里快手的两条 KNOWN-DEFECT
 * 用例改写为正**：
 * - #26（自带 Edg）→ 默认 UA 不含 Edg
 * - #29（不生成 Sec-Ch-Ua）→ sec-ch-ua 按 UA 的 Chrome 版本动态生成
 */
import { describe, expect, it } from 'vitest'

describe('#26 改写：默认 UA 不再自带 Edg 标识', () => {
  it('默认 UA 不含 Edg/ 标识', () => {
    const { headers } = createKuaishouConfig('ck')
    expect(headers.get('user-agent')).not.toContain('Edg/')
  })

  it('默认 UA 是集中维护的 Chrome/142（contracts/ua.ts）', () => {
    const { headers } = createKuaishouConfig('ck')
    expect(headers.get('user-agent')).toContain('Chrome/142')
  })
})

describe('#29 改写：sec-ch-ua 按 UA 动态生成', () => {
  it('默认 UA 下 sec-ch-ua 声明 Chromium/142 + Google Chrome/142', () => {
    const { headers } = createKuaishouConfig('ck')
    expect(headers.get('sec-ch-ua')).toContain('"Chromium";v="142"')
    expect(headers.get('sec-ch-ua')).toContain('"Google Chrome";v="142"')
  })

  it('外部 UA 的 Chrome 版本被写进 sec-ch-ua（与 UA 一致）', () => {
    const { headers } = createKuaishouConfig('ck', { headers: { 'user-agent': 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36' } })
    expect(headers.get('user-agent')).toContain('Chrome/140')
    expect(headers.get('sec-ch-ua')).toContain('"Chromium";v="140"')
  })

  it('UA 无 Chrome 版本时 sec-ch-ua 回落到 142', () => {
    const { headers } = createKuaishouConfig('ck', { headers: { 'user-agent': 'SomeBot/1.0' } })
    expect(headers.get('sec-ch-ua')).toContain('v="142"')
  })
})

describe('platforms/kuaishou/config - 基线结构', () => {
  it('method 由端点声明，config 不设（graphql POST 与 live_api GET 并存）', () => {
    expect((createKuaishouConfig('ck').requestConfig as Record<string, unknown>).method).toBeUndefined()
  })

  it('默认 timeout 10000', () => {
    expect(createKuaishouConfig('ck').requestConfig.timeout).toBe(10000)
  })

  it('cookie 不进基线：cookie 是执行期身份，基线里带上会遮蔽单次调用的覆盖', () => {
    // 反过来钉住设计意图：`client/runtime.ts` 拿到基线后立刻 delete('cookie')，
    // 所以基线本来就不该有这个头（原先 config 里那行 set 是死代码）
    expect(createKuaishouConfig('  ck  ').headers.has('cookie')).toBe(false)
    expect(createKuaishouConfig(undefined).headers.has('cookie')).toBe(false)
  })

  it('返回 AmagiHeaders 容器（不是普通对象）', () => {
    const { headers } = createKuaishouConfig('ck')
    expect(typeof headers.get).toBe('function')
    expect(headers.size).toBeGreaterThan(0)
  })

  it('快手必填基线头都在', () => {
    const { headers } = createKuaishouConfig('ck')
    for (const name of ['accept', 'content-type', 'referer', 'origin', 'user-agent', 'sec-ch-ua']) {
      expect(headers.get(name), name + ' 缺失').toBeDefined()
    }
  })

  it('外部 requestConfig 的其他字段被透传', () => {
    expect(createKuaishouConfig('ck', { timeout: 1 }).requestConfig.timeout).toBe(1)
  })

  it('外部 headers 覆盖同名默认头', () => {
    const { headers } = createKuaishouConfig('ck', { headers: { Referer: 'https://custom/' } })
    expect(headers.get('referer')).toBe('https://custom/')
  })
})

/**
 * H5（`c.kuaishou.com/rest/wd/*`）的 header 片段。
 *
 * 基线不知道端点是谁（`makeClientCtx` 每个实例只调一次 `createKuaishouConfig`），
 * 所以「移动 UA + 分享页 Referer」由端点在 `build` 里覆盖 —— 这组用例钉的就是
 * 「片段的内容」与「片段真能盖住基线」两件事。清单见迁移文档「附 A」。
 */
describe('platforms/kuaishou/config - kuaishouH5Headers', () => {
  /** 端点传进来的形状：`api.ts` 的 h5PhotoReferer 拼好的完整分享页 URL */
  const SHARE_PAGE = 'https://c.kuaishou.com/fw/photo/3xabc'

  it('只产附 A 里那 4 个头：kww 归签名器、Cookie 归 did 层', () => {
    expect(Object.keys(kuaishouH5Headers(SHARE_PAGE)).sort()).toEqual(['Accept', 'Content-Type', 'Referer', 'User-Agent'])
  })

  it('UA 用移动端（iPhone Safari 17），不是桌面 UA', () => {
    const h = kuaishouH5Headers(SHARE_PAGE)
    expect(h['User-Agent']).toBe(MOBILE_UA)
    expect(h['User-Agent']).toContain('iPhone')
    expect(h['User-Agent']).not.toBe(DEFAULT_UA)
  })

  it('Referer 原样用调用方给的分享页 URL（主机常量归 api.ts，这里不拼第二份）', () => {
    expect(kuaishouH5Headers(SHARE_PAGE).Referer).toBe(SHARE_PAGE)
  })

  it('展开进端点 headers 后盖住基线的桌面 UA 与 /new-reco', () => {
    const merged = new AmagiHeaders(createKuaishouConfig('ck').headers).merge(kuaishouH5Headers(SHARE_PAGE))
    expect(merged.get('user-agent')).toBe(MOBILE_UA)
    expect(merged.get('referer')).toBe(SHARE_PAGE)
    // 端点头只能覆盖、不能删：附 A 说 H5 不发 Origin / Sec-*，这两个仍是基线残留
    expect(merged.get('origin')).toBe('https://www.kuaishou.com')
  })
})
