import { PLATFORM_RUNTIME } from 'amagi/client/runtime'
import { PLATFORMS } from 'amagi/contracts/platform'
/**
 * 平台运行期依赖表的装配契约。
 *
 * 这张表是「同一平台在任何入口（client fetcher / 静态 fetcher / HTTP 路由）下
 * 判定行为一致」的唯一来源。少写一项不会有编译错误也不会有测试失败 ——
 * `execute` 在 `ctx.judge` 缺失时会退到「HTTP 2xx 即成功」那条兜底，于是该平台
 * 的**全部业务失败都变成成功**。
 *
 * 快手就这么漏过：`PLATFORM_RUNTIME.kuaishou` 长期是 `{}`，`kuaishouJudge`
 * 写好了、单测覆盖了，却从未被调用过一次。表现是
 * `{ result: 2, error_msg: null }` 带着 HTTP 200 判成 `success: true`。
 */
import { describe, expect, it } from 'vitest'

describe('PLATFORM_RUNTIME 的装配', () => {
  it('四个平台一个不少', () => {
    expect(Object.keys(PLATFORM_RUNTIME).sort()).toEqual([...PLATFORMS].sort())
  })

  it('每个平台都装了 judge —— 缺一个等于该平台永不判失败', () => {
    for (const platform of PLATFORMS) {
      expect(PLATFORM_RUNTIME[platform].judge, `${platform} 没装 judge`).toBeTypeOf('function')
    }
  })

  it('装的 judge 真的会判失败（拿一个非 2xx 过一遍）', () => {
    for (const platform of PLATFORMS) {
      const verdict = PLATFORM_RUNTIME[platform].judge!({}, { status: 403 })
      expect(verdict.ok, `${platform} 的 judge 放过了 HTTP 403`).toBe(false)
    }
  })

  it('签名器表：三个平台有，快手没有（hxfalcon 在 api.ts 构造请求时处理）', () => {
    expect(PLATFORM_RUNTIME.douyin.signers).toBeTypeOf('object')
    expect(PLATFORM_RUNTIME.bilibili.signers).toBeTypeOf('object')
    expect(PLATFORM_RUNTIME.xiaohongshu.signers).toBeTypeOf('object')
    expect(PLATFORM_RUNTIME.kuaishou.signers).toBeUndefined()
  })
})
