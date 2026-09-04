/**
 * corpus 存储格式与入库判定（PRD 阶段 1）。
 *
 * 测试的重心全在**入库判定**上，因为格式写错了下次录制就发现，而错误页混进 corpus
 * 是**静默**的：生成的类型确实覆盖了那份样本，只是那份样本描述的是风控页，
 * 没有任何一条断言会红。所以这里逐条钉住「哪种响应必须拒、哪种必须收」。
 */

import { describe, expect, it } from 'vitest'

import {
  assessCorpusAge,
  classifyResponse,
  CORPUS_FORMAT,
  corpusPath,
  createCorpusSample,
  type CreateCorpusSampleInput,
  hashParams,
  type JsonValue,
  serializeCorpusSample
} from '../src/index'

const RECORDED_AT = new Date('2026-09-04T10:00:00.000Z')

const input = (overrides: Partial<CreateCorpusSampleInput> = {}): CreateCorpusSampleInput => ({
  platform: 'kuaishou',
  endpoint: 'videoWork',
  params: { photoId: '3xirtzwrg472nxe' },
  raw: { result: 1, photo: { photoId: '3xirtzwrg472nxe', caption: '标题' } },
  http: { status: 200, statusText: 'OK' },
  amagiVersion: '7.0.0',
  recordedAt: RECORDED_AT,
  ...overrides
})

/** 拿到 sample（判定必须不是 reject，否则直接失败 —— 类型上 reject 分支没有 sample） */
const stored = (overrides: Partial<CreateCorpusSampleInput> = {}) => {
  const result = createCorpusSample(input(overrides))
  if (!('sample' in result)) throw new Error(`预期入库，实际被拒：${result.verdict.reason}`)
  return result
}

describe('入库判定：错误页绝不能入库', () => {
  it('快手 result=2（平台拒绝 / IP 冷却）拒收', () => {
    const verdict = classifyResponse({ platform: 'kuaishou', raw: { result: 2 }, http: { status: 200 } })
    expect(verdict.kind).toBe('reject')
    expect(verdict.reason).toContain('冷却')
  })

  it('快手 result=2001（需要验证码）拒收', () => {
    expect(classifyResponse({ platform: 'kuaishou', raw: { result: 2001 }, http: { status: 200 } }).kind).toBe('reject')
  })

  it('B站 code=-412（风控）拒收，code=0 收', () => {
    expect(classifyResponse({ platform: 'bilibili', raw: { code: -412 }, http: { status: 200 } }).kind).toBe('reject')
    expect(classifyResponse({ platform: 'bilibili', raw: { code: 0, data: { a: 1 } }, http: { status: 200 } }).kind).toBe('store')
  })

  it('B站 code=-101（cookie 过期）拒收 —— 它长得跟正常响应一样，只有码不同', () => {
    expect(classifyResponse({ platform: 'bilibili', raw: { code: -101, message: '账号未登录' }, http: { status: 200 } }).kind).toBe(
      'reject'
    )
  })

  it('抖音 status_code=2154（风控）拒收', () => {
    expect(classifyResponse({ platform: 'douyin', raw: { status_code: 2154 }, http: { status: 200 } }).kind).toBe('reject')
  })

  it('没见过的业务码一律拒收 —— 方向选安全那一侧，宁可漏收样本', () => {
    const verdict = classifyResponse({ platform: 'kuaishou', raw: { result: 999 }, http: { status: 200 } })
    expect(verdict.kind).toBe('reject')
    expect(verdict.reason).toContain('CODE_TABLES')
  })

  it('HTTP 非 2xx 拒收', () => {
    expect(classifyResponse({ platform: 'kuaishou', raw: { result: 1 }, http: { status: 503, statusText: 'Bad Gateway' } }).kind).toBe(
      'reject'
    )
  })
})

describe('入库判定：两种「长得像正常响应」的陷阱', () => {
  it('带 captchaConfig 的响应拒收，哪怕业务码是成功的', () => {
    const verdict = classifyResponse({
      platform: 'kuaishou',
      raw: { result: 1, captchaConfig: '{"captchaSession":"x"}' },
      http: { status: 200 }
    })
    expect(verdict.kind).toBe('reject')
    expect(verdict.reason).toContain('风控页')
  })

  it('验证码字段藏在深处也认得出来', () => {
    const raw: JsonValue = { data: { inner: [{ verify_center_decision_conf: '{}' }] } }
    expect(classifyResponse({ platform: 'douyin', raw, http: { status: 200 } }).kind).toBe('reject')
  })

  it('data 下全 null 的空壳拒收 —— 快手 PC GraphQL 未登录就返回这个，result 还是 1', () => {
    const verdict = classifyResponse({
      platform: 'kuaishou',
      raw: { result: 1, data: { visionVideoDetail: null, visionProfile: null } },
      http: { status: 200 }
    })
    expect(verdict.kind).toBe('reject')
    expect(verdict.reason).toContain('`| null`')
  })

  it('只有部分字段是 null 的正常响应不受影响', () => {
    const raw: JsonValue = { code: 0, data: { item: { major: null, desc: { text: 'x' } } } }
    expect(classifyResponse({ platform: 'bilibili', raw, http: { status: 200 } }).kind).toBe('store')
  })

  it('风控特征在业务码之前判 —— 反过来的话空壳会被 result=1 放进去', () => {
    // 这条就是顺序本身的回归测试
    const raw: JsonValue = { result: 1, data: { a: null } }
    expect(classifyResponse({ platform: 'kuaishou', raw, http: { status: 200 } }).kind).toBe('reject')
  })
})

describe('入库判定：错误形状里有要收的那几种', () => {
  it('B站 -404 稿件不存在 → store-as-error（PRD 点名要「已删除」样本）', () => {
    const verdict = classifyResponse({ platform: 'bilibili', raw: { code: -404 }, http: { status: 200 } })
    expect(verdict.kind).toBe('store-as-error')
    expect(verdict.reason).toContain('已删除')
  })

  it('B站 62002 稿件不可见 → store-as-error（「私密」样本）', () => {
    expect(classifyResponse({ platform: 'bilibili', raw: { code: 62002 }, http: { status: 200 } }).kind).toBe('store-as-error')
  })

  it('store-as-error 也入库，判定连理由一起写进 metadata（否则下游分不出这份是错误形状）', () => {
    const result = stored({ platform: 'bilibili', endpoint: 'videoInfo', raw: { code: -404, message: '稿件不存在' } })
    expect(result.sample.metadata.verdict.kind).toBe('store-as-error')
    expect(result.sample.metadata.verdict.reason).toContain('-404')
  })

  it('没登记过的平台没有码可查，按正常响应入库（交给调用方的 verdict）', () => {
    expect(classifyResponse({ platform: 'xiaohongshu', raw: { anything: 1 }, http: { status: 200 } }).kind).toBe('store')
  })

  it('调用方传 verdict 就压过自动判定（Web 工具里人手工打标走这条）', () => {
    const result = createCorpusSample(input({ raw: { result: 2 }, verdict: { kind: 'store', reason: '人工确认这就是要的样本' } }))
    expect('sample' in result).toBe(true)
  })

  it('被拒的响应**拿不到 sample** —— 用类型让「跳过」成为唯一出路', () => {
    const result = createCorpusSample(input({ raw: { result: 2 } }))
    expect('sample' in result).toBe(false)
    expect(result.verdict.kind).toBe('reject')
  })
})

describe('metadata：凭证一个字都不许进', () => {
  it('像凭证的参数整个删掉，只留键名（PRD 七「cookie 绝不能进 corpus 的 metadata」）', () => {
    const secret = 'sessionid=abc123; passport_csrf_token=deadbeef'
    const { sample } = stored({ params: { photoId: 'x1', cookie: secret, msToken: 'zzz' } })
    expect(sample.metadata.strippedParams).toEqual(['cookie', 'msToken'])
    expect(Object.keys(sample.metadata.params)).toEqual(['photoId'])
    expect(JSON.stringify(sample)).not.toContain('abc123')
    expect(JSON.stringify(sample)).not.toContain('deadbeef')
  })

  it('留下的参数也脱敏，且与 payload 共用同一个假身份 —— metadata 与 payload 还得对得上', () => {
    const { sample } = stored({
      params: { uid: 11111 },
      raw: { result: 1, photo: { userId: 11111 } }
    })
    const params = sample.metadata.params as { uid: number }
    const raw = sample.raw as { photo: { userId: number } }
    expect(params.uid).not.toBe(11111)
    expect(params.uid).toBe(raw.photo.userId)
  })

  it('脱敏清单按来源加前缀，`uid` 分得出是参数还是响应里的', () => {
    const { sample } = stored({ params: { uid: 11111 }, raw: { result: 1, photo: { userId: 11111 } } })
    expect(sample.metadata.scrub.replacements.map((item) => item.path)).toEqual(['params.uid', 'raw.photo.userId'])
  })
})

describe('路径与哈希', () => {
  it('路径就是 corpus/<platform>/<endpoint>/<paramsHash>.json', () => {
    const { path, sample } = stored()
    expect(path).toBe(`corpus/kuaishou/videoWork/${sample.metadata.paramsHash}.json`)
    expect(sample.metadata.paramsHash).toMatch(/^[0-9a-f]{12}$/)
  })

  it('参数键序不影响哈希（`{a,b}` 与 `{b,a}` 是同一个请求）', () => {
    expect(hashParams({ a: 1, b: 2 })).toBe(hashParams({ b: 2, a: 1 }))
  })

  it('嵌套对象的键序也不影响', () => {
    expect(hashParams({ x: { a: 1, b: 2 } })).toBe(hashParams({ x: { b: 2, a: 1 } }))
  })

  it('不同参数落不同文件', () => {
    expect(hashParams({ photoId: 'a' })).not.toBe(hashParams({ photoId: 'b' }))
  })

  it('同一个请求重录一遍还是同一个文件名 —— 脱敏是确定性的，所以拿脱敏后的参数算哈希也稳定', () => {
    expect(stored().path).toBe(stored().path)
  })

  it('端点名含非法字符就抛 —— 它要进文件系统，先当它不可信', () => {
    expect(() => corpusPath({ platform: 'kuaishou', endpoint: '../../etc', paramsHash: 'abc' })).toThrow('非法字符')
  })
})

describe('样本内容', () => {
  it('存的是未经 normalize 的原始响应，normalize 过的另存一份', () => {
    const { sample } = stored({ raw: { result: 1, photo: { caption: '标题' } }, normalized: { title: '标题' } })
    expect(sample.raw).toMatchObject({ result: 1 })
    expect(sample.normalized).toBeDefined()
  })

  it('端点没有 normalize 时那个键**整个不存在** —— 与「normalize 返回了 null」是两件事', () => {
    const { sample } = stored()
    expect('normalized' in sample).toBe(false)
  })

  it('normalize 返回 null 时键存在且为 null', () => {
    const { sample } = stored({ normalized: null })
    expect('normalized' in sample).toBe(true)
    expect(sample.normalized).toBeNull()
  })

  it('录制时间到秒，不带毫秒（毫秒没信息量，只会让每次重录都刷一行 diff）', () => {
    expect(stored().sample.metadata.recordedAt).toBe('2026-09-04T10:00:00Z')
  })

  it('带上格式版本与 amagi 版本', () => {
    const { sample } = stored()
    expect(sample.format).toBe(CORPUS_FORMAT)
    expect(sample.metadata.amagiVersion).toBe('7.0.0')
  })

  it('序列化：2 空格缩进、结尾换行、行尾 LF（照 gen-openapi.mts 的契约，不然 Windows 上 --check 天天红）', () => {
    const json = stored().json
    expect(json.endsWith('}\n')).toBe(true)
    expect(json).not.toContain('\r')
    expect(json).toContain('\n  "format": 1')
  })

  it('payload 的键序不动（排了序就跟线上抓包对不上了）', () => {
    const { sample } = stored({ raw: { result: 1, zeta: 1, alpha: 2 } })
    expect(Object.keys(sample.raw as Record<string, JsonValue>)).toEqual(['result', 'zeta', 'alpha'])
  })

  it('同一份输入两次序列化逐字节相同', () => {
    expect(serializeCorpusSample(stored().sample)).toBe(serializeCorpusSample(stored().sample))
  })
})

describe('年龄告警', () => {
  const now = new Date('2026-09-04T10:00:00Z')

  it('新样本不告警', () => {
    expect(assessCorpusAge({ recordedAt: '2026-08-01T00:00:00Z', now })).toMatchObject({ stale: false })
  })

  it('超过阈值告警，并说清后果', () => {
    const age = assessCorpusAge({ recordedAt: '2025-01-01T00:00:00Z', now })
    expect(age.stale).toBe(true)
    expect(age.ageDays).toBeGreaterThan(600)
    expect(age.warning).toContain('平台改了字段这份样本也看不出来')
  })

  it('阈值可调', () => {
    expect(assessCorpusAge({ recordedAt: '2026-08-01T00:00:00Z', now, maxAgeDays: 7 }).stale).toBe(true)
  })

  it('时间解析不了就当过期 —— 不能因为 metadata 坏了就默认「证据还新鲜」', () => {
    expect(assessCorpusAge({ recordedAt: 'not a date', now }).stale).toBe(true)
  })
})
