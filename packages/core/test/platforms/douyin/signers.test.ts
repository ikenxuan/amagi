import type { EndpointCtx } from 'amagi/contracts/endpoint'
import type { RequestSpec } from 'amagi/contracts/request'
import { createDouyinSigners } from 'amagi/platforms/douyin/sign/signers'
/**
 * platforms/douyin/sign/signers 的契约。
 *
 * 判据（修 #36/#37/#38）：**前置条件不满足时返回 `kind: 'internal'` 信封
 * 而非抛出裸异常**。v6 的 `AB('')` 抛 `TypeError: Invalid URL`、`XB` 对短路径
 * 抛 `Invalid MD5 character`（KNOWN-DEFECT 有测试锁死）；v7 的签名器在入口
 * 校验，通过 `execute` 的单一 catch 归因为 `internal`。
 *
 * 这里不直接调 execute，而是用「签名器抛错 → 用 runtime 的 classifyThrown
 * 归因」验证：签名器抛出的错误映射为 `kind: 'internal'` 信封。
 */
import { classifyThrown } from 'amagi/runtime/execute'
import { describe, expect, it } from 'vitest'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

const ctx: EndpointCtx = {
  clientId: 'client-1',
  platform: 'douyin',
  cookie: 'ck=1',
  userAgent: UA,
  requestConfig: {},
  send: async () => {
    throw new Error('should not send')
  }
}

/** 调 execute 管线（注入签名器表），断言信封 */
const runThroughExecute = async (
  signer: 'a-bogus' | 'x-bogus',
  spec: RequestSpec
): Promise<{ success: boolean; kind?: string; code?: string }> => {
  // 用 execute 验证：签名字段命中签名器表
  const { execute } = await import('amagi/runtime/execute')
  const { defineEndpoint, type } = await import('amagi/contracts/endpoint')
  const zod = (await import('zod')).default

  const probe = defineEndpoint({
    name: 'douyin.typeProbe',
    route: '/__type_probe',
    params: zod.object({}),
    build: () => spec,
    sign: signer,
    response: type<{ ok: true }>()
  })

  const result = await execute(
    probe,
    {},
    {
      ctx,
      signers: createDouyinSigners()
    }
  )
  if (result.success) return { success: true }
  return { success: false, kind: result.error.kind, code: result.error.code }
}

/**
 * 验证签名器抛出的错误可被归因为 internal 信封。
 *
 * **必须是 async**：注册名表现在是 `stepsToSigner(...)` 压出来的薄壳，而 `stepsToSigner`
 * 返回的是 `async (spec, ctx) => ...`（它要 `await` 每个 step）。同步 `try/catch` 只能抓到
 * 同步抛出 —— 签名器一旦是 async，step 里的 `throw` 就变成 **rejected Promise**，同步 catch
 * 整个走空，`classify` 会返回 `{}`，后面每条 `expect(err.kind).toBe('internal')` 都成
 * 「undefined 不等于 internal」的假红（或者更糟：未捕获的 rejection 污染别的用例）。
 */
const classify = async (fn: () => Promise<unknown>): Promise<{ kind?: string; code?: string; message?: string }> => {
  try {
    await fn()
    return {}
  } catch (cause) {
    const error = classifyThrown(cause, 'sign')
    return { kind: error.kind, code: error.code, message: error.message }
  }
}

describe('#36/#37 改写：AB 需绝对 URL，前置条件不满足是 internal 而非裸 TypeError', () => {
  it('空字符串 URL：签名器抛明确错误，归因为 internal', async () => {
    const err = await classify(async () => createDouyinSigners()['a-bogus']({ method: 'GET', url: '' }, ctx))
    expect(err.kind).toBe('internal')
    expect(err.code).toBe('INTERNAL_ERROR')
    expect(err.message).toContain('前置条件不满足')
    // 「绝对地址」这半句两个 step 都会说：msToken 在 phase 序里先于 aBogus，所以拦下
    // 空 URL 的其实是 msToken 那道校验，不再是 a_bogus 那道。断言只压两边共有的措辞
    expect(err.message).toContain('绝对地址')
  })

  it('相对路径 / 非法 URL：同样归因为 internal', async () => {
    for (const url of ['not-a-url', '/relative/path', 'douyin.com/a']) {
      const err = await classify(async () => createDouyinSigners()['a-bogus']({ method: 'GET', url }, ctx))
      expect(err.kind, url).toBe('internal')
      expect(err.code, url).toBe('INTERNAL_ERROR')
    }
  })

  it('绝对 URL：签名器正常产出 a_bogus 查询参数', async () => {
    // `await` 一个 SignFn 就是 RequestSpec，不必再 `as RequestSpec`
    const signed = await createDouyinSigners()['a-bogus'](
      { method: 'GET', url: 'https://www.douyin.com/aweme/v1/web/aweme/detail/?aid=1' },
      ctx
    )
    const params = new URL(signed.url).searchParams
    expect(params.get('a_bogus')).toBeTruthy()
  })

  it('走 execute 管线：前置条件不满足返回失败信封（kind: internal）', async () => {
    const result = await runThroughExecute('a-bogus', { method: 'GET', url: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.kind).toBe('internal')
      expect(result.code).toBe('INTERNAL_ERROR')
    }
  })
})

describe('#38 改写：XB 需真实接口形态的长路径，前置条件不满足是 internal', () => {
  /**
   * 注册名对应的清单是 `douyinXBogus(184)` = `[msToken(184), xBogus(), secsdk()]`，
   * 而 phase 序把 msToken 排在 xBogus **前面** —— 所以这批坏 URL 现在分两条路被拒：
   *
   * - 绝对但路径太短的四条：msToken 放过（它只要求绝对地址），由 xBogus 拒，
   *   message 是「x_bogus 前置条件不满足：URL 需真实接口形态的长路径」；
   * - 空串：msToken 就先拒了，message 是「msToken 前置条件不满足：URL 必须是绝对地址」，
   *   xBogus 那句话根本没机会执行。
   *
   * 所以这里只断言两条路共有的不变量：kind/code 归因 + message 含「前置条件不满足」。
   * 再具体一点（比如断言「长路径」字样）就会在空串那条上假红。
   */
  it('短路径 / 根路径 / 无查询串：签名器抛明确错误，归因为 internal', async () => {
    const bad = [
      'https://www.douyin.com/x?q=1',
      'https://www.douyin.com/x',
      'https://www.douyin.com/',
      'https://www.douyin.com/x?a=1&b=2',
      ''
    ]
    for (const url of bad) {
      const err = await classify(async () => createDouyinSigners()['x-bogus']({ method: 'GET', url }, ctx))
      expect(err.kind, url).toBe('internal')
      expect(err.code, url).toBe('INTERNAL_ERROR')
      expect(err.message, url).toContain('前置条件不满足')
    }
  })

  it('空串由 msToken 那一步拒掉，短路径才轮到 x_bogus', async () => {
    // 锁死上面那段注释描述的分工：改了 phase 序或删了 msToken 的校验，这条会先红
    const byToken = await classify(async () => createDouyinSigners()['x-bogus']({ method: 'GET', url: '' }, ctx))
    expect(byToken.message).toContain('msToken 前置条件不满足')

    const bySign = await classify(async () => createDouyinSigners()['x-bogus']({ method: 'GET', url: 'https://www.douyin.com/x?q=1' }, ctx))
    expect(bySign.message).toContain('x_bogus 前置条件不满足')
  })

  it('真实接口 URL：签名器正常产出 X-Bogus 查询参数', async () => {
    const signed = await createDouyinSigners()['x-bogus'](
      { method: 'GET', url: 'https://www.douyin.com/aweme/v1/web/comment/list/?device_platform=webapp&aid=6383&aweme_id=7123' },
      ctx
    )
    const params = new URL(signed.url).searchParams
    expect(params.get('X-Bogus')).toBeTruthy()
  })

  it('走 execute 管线：短路径返回失败信封（kind: internal）', async () => {
    const result = await runThroughExecute('x-bogus', {
      method: 'GET',
      url: 'https://www.douyin.com/x?q=1'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.kind).toBe('internal')
      expect(result.code).toBe('INTERNAL_ERROR')
    }
  })
})

describe('secsdk 复合进两个签名器（#188）', () => {
  const signers = createDouyinSigners()
  /** 策略表内：作品详情 */
  const protectedUrl = 'https://www-hj.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=1&device_platform=webapp'
  /** 策略表外：评论列表 */
  const plainUrl = 'https://www.douyin.com/aweme/v1/web/comment/list/?aweme_id=1&device_platform=webapp'

  it('策略表内的 path 同时拿到 a_bogus 与 x-secsdk-web-signature', async () => {
    const signed = await signers['a-bogus']({ method: 'GET', url: protectedUrl }, ctx)
    const query = new URL(signed.url).searchParams

    expect(query.get('a_bogus')).toBeTruthy()
    expect(query.get('x-secsdk-web-signature')).toMatch(/^[0-9a-f]{32}$/)
    expect(query.get('timestamp')).toMatch(/^\d{10}$/)
  })

  it('secsdk 必须在 a_bogus 之后 —— a_bogus 参与被签名的 query', async () => {
    const signed = await signers['a-bogus']({ method: 'GET', url: protectedUrl }, ctx)
    const query = signed.url.slice(signed.url.indexOf('?') + 1)
    const sigAt = query.indexOf('x-secsdk-web-signature=')
    const bogusAt = query.indexOf('a_bogus=')

    expect(bogusAt).toBeGreaterThanOrEqual(0)
    expect(sigAt).toBeGreaterThan(bogusAt) // 签名字段在最后，说明它是收尾那一步
  })

  it('策略表外的 path 只加 a_bogus，不加 secsdk', async () => {
    const signed = await signers['a-bogus']({ method: 'GET', url: plainUrl }, ctx)
    const query = new URL(signed.url).searchParams

    expect(query.get('a_bogus')).toBeTruthy()
    expect(query.get('x-secsdk-web-signature')).toBeNull()
    expect(query.get('timestamp')).toBeNull()
  })

  it('x-bogus 那条也一样复合', async () => {
    const signed = await signers['x-bogus']({ method: 'GET', url: protectedUrl }, ctx)
    const query = new URL(signed.url).searchParams

    expect(query.get('X-Bogus')).toBeTruthy()
    expect(query.get('x-secsdk-web-signature')).toMatch(/^[0-9a-f]{32}$/)
  })

  it('uifid 取自 ctx.cookie', async () => {
    const withUifid = await signers['a-bogus']({ method: 'GET', url: protectedUrl }, { ...ctx, cookie: 'UIFID=abc; ttwid=x' })
    expect(new URL(withUifid.url).searchParams.get('uifid')).toBe('abc')

    // cookie 里没有 UIFID 时不追加这个参数（也不抛）
    const without = await signers['a-bogus']({ method: 'GET', url: protectedUrl }, ctx)
    expect(new URL(without.url).searchParams.get('uifid')).toBeNull()
  })
})

/**
 * 注册名那条路现在也注入 msToken（修的就是这个用户可见的 bug）。
 *
 * 之前 `signers.ts` 是一份手写的重复实现、只算 a_bogus/X-Bogus，于是
 * `client.douyin.apiUrls.*` + `client.douyin.request` 拼出来的 URL **一个 msToken 都没有**
 * —— 端点那条路（`sign: douyinBogus(184)`）却有。现在薄壳压的是同一份 step 清单，
 * 两条路必然一致。
 */
describe('注册名注入 msToken（回归网）', () => {
  const signers = createDouyinSigners()
  const absoluteUrl = 'https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=1&device_platform=webapp'

  // 两个名字都取 184 那档：这张表只在 `client.<平台>.request` 那条路上被查到，而那条路
  // 打的是「本库还没收录的接口」—— 猜不出该用 184（作品详情类）还是 116（评论 / 音乐类），
  // 统一取前者。收录进端点的接口各自在声明里写准确的那一档，不经过这张表。
  const MS_TOKEN_LEN = 184

  it('a-bogus 产出的 URL 带 184 位 msToken', async () => {
    const signed = await signers['a-bogus']({ method: 'GET', url: absoluteUrl }, ctx)
    const msToken = new URL(signed.url).searchParams.get('msToken')

    expect(msToken).toBeTruthy()
    expect(msToken).toHaveLength(MS_TOKEN_LEN)
  })

  it('x-bogus 产出的 URL 带 184 位 msToken', async () => {
    const signed = await signers['x-bogus']({ method: 'GET', url: absoluteUrl }, ctx)
    const msToken = new URL(signed.url).searchParams.get('msToken')

    expect(msToken).toBeTruthy()
    expect(msToken).toHaveLength(MS_TOKEN_LEN)
  })

  it('覆盖调用方自带的 msToken —— 不是「有则不动」', async () => {
    // 选「覆盖」是刻意的：「有则不动」会让 retryFresh 的重试一直复用调用方那个过期
    // token，而 Argus 按单次请求的 token 组判定，重放必然同样被拦、重试就白跑了
    const stale = 'S'.repeat(32)
    const signed = await signers['a-bogus']({ method: 'GET', url: `${absoluteUrl}&msToken=${stale}` }, ctx)
    const msToken = new URL(signed.url).searchParams.get('msToken')

    expect(msToken).not.toBe(stale)
    expect(msToken).toHaveLength(MS_TOKEN_LEN)
  })
})

describe('签名器表结构', () => {
  it('包含 a-bogus 与 x-bogus 两个签名器', () => {
    const signers = createDouyinSigners()
    // secsdk 刻意不注册成第三个名字：它对策略表外是无操作，无条件套用是安全的，
    // 而 `sign` 是单槽位 —— 另起名字只会逼出 'a-bogus+secsdk' 这种复合命名
    expect(Object.keys(signers).sort()).toEqual(['a-bogus', 'x-bogus'])
  })
})
