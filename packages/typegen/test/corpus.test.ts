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

  it('**业务码写成字符串也要判** —— 规则表自己写着平台会给 `"12061"` 这种', () => {
    // 原先是 `typeof code !== 'number'` 就直接放行且 `confident: false`，
    // 于是一份 `{"code":"-412"}` 的风控页会被当成正常响应入库 ——
    // 而这个函数存在的全部理由就是挡住那种东西
    const rejected = classifyResponse({ platform: 'bilibili', raw: { code: '-412' }, http: { status: 200 } })
    expect(rejected.kind).toBe('reject')
    expect(rejected.confident).toBe(true)
    // 表里那句人写的文案保留，后面补一句「原值是字符串」—— 排查时两件都要看得见
    expect(rejected.reason).toContain('风控')
    expect(rejected.reason).toContain('原值是字符串 "-412"')

    const stored = classifyResponse({ platform: 'bilibili', raw: { code: '0', data: { a: 1 } }, http: { status: 200 } })
    expect(stored.kind).toBe('store')
    expect(stored.confident).toBe(true)
  })

  it('不是十进制整数写法的字符串仍然「判不了」，不猜', () => {
    // `1e3` / `0x10` / 带空格 / 前导零都不是平台写业务码的形式，
    // 收进来只会多一处「这个字符串到底是几」的歧义
    for (const code of ['success', '', ' 0 ', '0x0', '1e3', '007', '9007199254740993']) {
      const verdict = classifyResponse({ platform: 'bilibili', raw: { code }, http: { status: 200 } })
      expect(verdict.kind).toBe('store')
      expect(verdict.confident).toBe(false)
    }
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
    const result = createCorpusSample(
      input({ raw: { result: 2 }, verdict: { kind: 'store', reason: '人工确认这就是要的样本', confident: true } })
    )
    expect('sample' in result).toBe(true)
  })

  it('判定器瞎的时候会说自己瞎 —— `confident: false` 是给录制器拿 judge 补位用的信号', () => {
    // 没登记过的平台：没有码可查
    expect(classifyResponse({ platform: 'xiaohongshu', raw: { anything: 1 }, http: { status: 200 } }).confident).toBe(false)
    // 登记过的平台但响应里没有那个码字段
    expect(classifyResponse({ platform: 'bilibili', raw: { anything: 1 }, http: { status: 200 } }).confident).toBe(false)
    // 查表命中、以及 HTTP / 风控特征这些硬判据都是有依据的
    expect(classifyResponse({ platform: 'bilibili', raw: { code: -404 }, http: { status: 200 } }).confident).toBe(true)
    expect(classifyResponse({ platform: 'bilibili', raw: { code: 0, data: { a: 1 } }, http: { status: 200 } }).confident).toBe(true)
    expect(classifyResponse({ platform: 'bilibili', raw: { code: 0 }, http: { status: 503 } }).confident).toBe(true)
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

  it('**平台自家的凭证名也要认** —— 光靠通用词是漏的，而漏的正是这个仓库在用的那几个', () => {
    // 2026-09-05 实测：这六个原先一个都不命中通用词表。`SESSDATA` 与 `sid_guard`
    // 恰好是这个仓库自己在用的（`sid_guard` 还是 PRD 七点名过的）；
    // `bili_jct` / `buvid3` 只因为「32 位连续串」进了 suspects，值照样留在 metadata 里
    const { sample } = stored({
      params: {
        photoId: 'x1',
        SESSDATA: 'a'.repeat(40),
        bili_jct: 'b'.repeat(32),
        DedeUserID: '114514',
        buvid3: 'c'.repeat(36),
        sid_guard: 'd'.repeat(50),
        s_v_web_id: 'verify_e'
      }
    })
    expect(Object.keys(sample.metadata.params)).toEqual(['photoId'])
    expect(sample.metadata.strippedParams).toEqual(['DedeUserID', 'SESSDATA', 'bili_jct', 'buvid3', 's_v_web_id', 'sid_guard'])
    const serialized = JSON.stringify(sample)
    for (const secret of ['a'.repeat(40), 'b'.repeat(32), 'c'.repeat(36), 'd'.repeat(50), 'verify_e']) {
      expect(serialized).not.toContain(secret)
    }
  })

  it('**不能顺手把 `uid` 也删掉** —— 那是正当业务参数，删了这份样本就说不清问的是谁', () => {
    const { sample } = stored({ params: { uid: 11111, photoId: 'x1' } })
    expect(Object.keys(sample.metadata.params).sort()).toEqual(['photoId', 'uid'])
  })

  it('**嵌套着的凭证也要删** —— 只扫顶层的话 `{ headers: { cookie } }` 一个键都不命中，整个原值落盘', () => {
    // 参数改成原样存（PRD 3.3）之后 `CREDENTIAL_PARAM` 是落盘前唯一的一道闸，
    // 漏掉的嵌套凭证不会再被脱敏器换成假值。`/api/record` 收的 params 是
    // `Record<string, JsonValue>`，而 JsonValue 允许嵌套对象与数组 —— 这条路是真的可达
    const secret = 'SESSDATA=deadbeef; bili_jct=c0ffee'
    const { sample, json } = stored({ params: { bvid: 'BV1', headers: { cookie: secret, 'user-agent': 'amagi/7' } } })
    // 记的是**路径**不是裸键名：裸 `cookie` 会让人去顶层找，找不到（写法同 requests.ts 的 findCredentialKeys）
    expect(sample.metadata.strippedParams).toEqual(['headers.cookie'])
    // 只删那个叶子，容器与它的兄弟键留着 —— 删整个 headers 的话 user-agent 无声消失，而清单里一个字都没有
    expect(sample.metadata.params).toEqual({ bvid: 'BV1', headers: { 'user-agent': 'amagi/7' } })
    expect(json).not.toContain('deadbeef')
    expect(json).not.toContain('c0ffee')
  })

  it('数组里的凭证也删，路径用 `[]` 标出来 —— 同一张表下不该有两种路径写法', () => {
    const { sample, json } = stored({
      params: {
        items: [
          { id: 1, access_token: 'tok-deadbeef' },
          { id: 2, access_token: 'tok-c0ffee' }
        ]
      }
    })
    // 同一条路径在数组里重复命中，去重成一条（同 requests.ts 那句报错）
    expect(sample.metadata.strippedParams).toEqual(['items[].access_token'])
    expect(sample.metadata.params).toEqual({ items: [{ id: 1 }, { id: 2 }] })
    expect(json).not.toContain('deadbeef')
    expect(json).not.toContain('c0ffee')
  })

  it('**凭证的值一个字节都不许出现在记录里** —— 清单与路径都会被贴进 issue 和聊天（判据同 requests.test.ts 那条）', () => {
    const secret = 'SESSDATA=deadbeef'
    const { sample, json, path } = stored({ params: { a: { b: { c: { cookie: secret } } }, list: [[{ sid_guard: secret }]] } })
    expect(sample.metadata.strippedParams).toEqual(['a.b.c.cookie', 'list[][].sid_guard'])
    // 容器留着（哪怕空了）：形状还在，人能看出「这儿原本有个键，被删了」
    expect(sample.metadata.params).toEqual({ a: { b: { c: {} } }, list: [[{}]] })
    const everything = [json, path, sample.metadata.strippedParams.join('\n'), JSON.stringify(sample.metadata.scrub)].join('\n')
    expect(everything).not.toContain('deadbeef')
    expect(everything).not.toContain(secret)
  })

  it('哈希算得了嵌套的 `kept` —— 下钻之后剩下的参数可能是嵌套结构', () => {
    const { sample } = stored({ params: { bvid: 'BV1', headers: { cookie: 'x', 'user-agent': 'amagi/7' } } })
    expect(sample.metadata.paramsHash).toBe(hashParams({ bvid: 'BV1', headers: { 'user-agent': 'amagi/7' } }))
    expect(sample.metadata.paramsHash).toMatch(/^[0-9a-f]{12}$/)
  })

  it('**扁平参数的行为一个字节都没变** —— 下钻不该动到已录的样本（本地 14 份参数全是扁平的）', () => {
    // 判据取本地样本里真实出现过的参数形状：文件名就是 hashParams(params)，
    // 这一改要是碰到了扁平参数的哈希，已录的样本会集体失配（2026-09-05 逐份核对过）
    expect(hashParams({})).toBe('44136fa355b3')
    expect(hashParams({ host_mid: 1 })).toBe('9b11f1fbea19')
    expect(hashParams({ query: '猫' })).toBe('ccfa0598bddc')
    expect(hashParams({ oid: '2', type: 1 })).toBe('af6c415067d4')
    expect(hashParams({ oid: '2', type: 1, number: 20 })).toBe('b2d19034c82e')
    expect(hashParams({ oid: '2', type: 1, root: '495059' })).toBe('cf888abd7b45')
    expect(hashParams({ oid: '2', type: 1, root: '495059', number: 20 })).toBe('92ce465b3012')
    expect(hashParams({ avid: 2, cid: 42524 })).toBe('ddeaa0287265')
    // 扁平参数走的还是老路：键序不动、被删的仍然是裸键名（顶层路径 === 键名）
    const { sample } = stored({ params: { photoId: 'x1', uid: 11111, cookie: 'a', msToken: 'b' } })
    expect(Object.keys(sample.metadata.params)).toEqual(['photoId', 'uid'])
    expect(sample.metadata.strippedParams).toEqual(['cookie', 'msToken'])
  })

  it('**键名不像凭证的长串现在原样落盘** —— `CREDENTIAL_PARAM` 是参数落盘前唯一的一道闸了', () => {
    // 参数不再脱敏（PRD 3.3）的代价：脱敏器那套「规则没命中但看着像凭证」的 suspects
    // 不再扫参数。这条把代价钉住 —— 哪天有人想给参数补回一层脱敏，会先在这里看到理由
    const { sample } = stored({ params: { a_bogus: 'a'.repeat(40) } })
    expect(sample.metadata.params.a_bogus).toBe('a'.repeat(40))
    expect(sample.metadata.scrub.suspects.some((item) => item.path.startsWith('params'))).toBe(false)
  })

  it('**留下的参数原样存**（PRD 3.3）—— 存假值等于什么都没存：照它发请求必然 404', () => {
    const { sample } = stored({
      params: { uid: 11111 },
      raw: { result: 1, photo: { userId: 11111 } }
    })
    const params = sample.metadata.params as { uid: number }
    const raw = sample.raw as { photo: { userId: number } }
    expect(params.uid).toBe(11111)
    // payload 照旧脱敏，所以两边现在**对不上** —— 这是明确接受的取舍：
    // 那条对应关系的用途只是「让人确认这份样本问的是谁」，而参数是真值之后这件事更直接
    expect(raw.photo.userId).not.toBe(11111)
  })

  it('哈希用**真值**算 —— 文件名与真参数一一对应（改动之前算的是假值的哈希）', () => {
    const { sample } = stored({ params: { photoId: '3xirtzwrg472nxe' } })
    expect(sample.metadata.paramsHash).toBe(hashParams({ photoId: '3xirtzwrg472nxe' }))
  })

  it('脱敏清单里**不再有 `params.*`** —— 参数没脱敏，清单里出现它就是在说谎', () => {
    const { sample } = stored({ params: { uid: 11111 }, raw: { result: 1, photo: { userId: 11111 } }, normalized: { authorId: 11111 } })
    const paths = sample.metadata.scrub.replacements.map((item) => item.path)
    expect(paths.some((path) => path.startsWith('params'))).toBe(false)
    // 前缀仍然要有：同一个字段得分得出是原始响应里的还是归一化之后的
    expect(paths).toEqual(['normalized.authorId', 'raw.photo.userId'])
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

  it('同一个请求重录一遍还是同一个文件名（真参数是确定的，`canonicalJson` 又不看键序）', () => {
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
