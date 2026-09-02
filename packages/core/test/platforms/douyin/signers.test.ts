import { createDouyinSigners } from 'amagi/platforms/douyin/sign/signers'
import type { EndpointCtx } from 'amagi/contracts/endpoint'
import type { RequestSpec } from 'amagi/contracts/request'
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

  const result = await execute(probe, {}, {
    ctx,
    signers: createDouyinSigners()
  })
  if (result.success) return { success: true }
  return { success: false, kind: result.error.kind, code: result.error.code }
}

/** 验证签名器抛出的错误可被归因为 internal 信封 */
const classify = (fn: () => void): { kind?: string; code?: string; message?: string } => {
  try {
    fn()
    return {}
  } catch (cause) {
    const error = classifyThrown(cause, 'sign')
    return { kind: error.kind, code: error.code, message: error.message }
  }
}

describe('#36/#37 改写：AB 需绝对 URL，前置条件不满足是 internal 而非裸 TypeError', () => {
  it('空字符串 URL：签名器抛明确错误，归因为 internal', () => {
    const err = classify(() => {
      createDouyinSigners()['a-bogus']({ method: 'GET', url: '' }, ctx)
    })
    expect(err.kind).toBe('internal')
    expect(err.code).toBe('INTERNAL_ERROR')
    expect(err.message).toContain('前置条件不满足')
    expect(err.message).toContain('绝对地址')
  })

  it('相对路径 / 非法 URL：同样归因为 internal', () => {
    for (const url of ['not-a-url', '/relative/path', 'douyin.com/a']) {
      const err = classify(() => {
        createDouyinSigners()['a-bogus']({ method: 'GET', url }, ctx)
      })
      expect(err.kind, url).toBe('internal')
      expect(err.code, url).toBe('INTERNAL_ERROR')
    }
  })

  it('绝对 URL：签名器正常产出 a_bogus 查询参数', () => {
    const signed = createDouyinSigners()['a-bogus'](
      { method: 'GET', url: 'https://www.douyin.com/aweme/v1/web/aweme/detail/?aid=1' },
      ctx
    ) as RequestSpec
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
  it('短路径 / 根路径 / 无查询串：签名器抛明确错误，归因为 internal', () => {
    const bad = [
      'https://www.douyin.com/x?q=1',
      'https://www.douyin.com/x',
      'https://www.douyin.com/',
      'https://www.douyin.com/x?a=1&b=2',
      ''
    ]
    for (const url of bad) {
      const err = classify(() => {
        createDouyinSigners()['x-bogus']({ method: 'GET', url }, ctx)
      })
      expect(err.kind, url).toBe('internal')
      expect(err.code, url).toBe('INTERNAL_ERROR')
      expect(err.message, url).toContain('前置条件不满足')
    }
  })

  it('真实接口 URL：签名器正常产出 X-Bogus 查询参数', () => {
    const signed = createDouyinSigners()['x-bogus'](
      { method: 'GET', url: 'https://www.douyin.com/aweme/v1/web/comment/list/?device_platform=webapp&aid=6383&aweme_id=7123' },
      ctx
    ) as RequestSpec
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

describe('签名器表结构', () => {
  it('包含 a-bogus 与 x-bogus 两个签名器', () => {
    const signers = createDouyinSigners()
    expect(Object.keys(signers).sort()).toEqual(['a-bogus', 'x-bogus'])
  })
})