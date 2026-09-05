/**
 * 请求集合的校验器（`WEB-API-CONSOLE-PRD.md` 三）。
 *
 * 测试的重心在**它拒什么**上。这个文件与 corpus 里的样本反着来 —— 它进 git、值是真的，
 * 于是两类错误的代价都不可逆：凭证漏进去，提交出去就收不回来；`id` 撞名，
 * 产物的目录名与类型名会由「谁先被读到」决定。
 *
 * 其余形状校验钉的是同一件事：**不抛异常，但问题必须被指名**。
 * 一条写错的记录被静默当成「这个端点没有请求」，是这里最难查的失败方式 ——
 * 界面上少一行，而少的那行长什么样没人知道。
 */

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_REQUESTS_COMMENT,
  type JsonValue,
  parseRequestCollection,
  REQUEST_VERDICTS,
  REQUESTS_FORMAT,
  requestsPath,
  serializeRequestCollection
} from '../src/index'

/** 一条合法记录，按 PRD 3.2 那个例子来 */
const entry = (overrides: Record<string, JsonValue> = {}): JsonValue => ({
  id: 'bv-single-p',
  label: '单 P 稿件',
  params: { bvid: 'BV1xx411c7mD' },
  recordedAt: '2026-09-05T06:11:00Z',
  verdict: 'ok',
  ...overrides
})

const file = (...requests: JsonValue[]): JsonValue => ({ version: REQUESTS_FORMAT, endpoint: 'bilibili/videoInfo', requests })

/** 只关心「这一条收没收」时用它 */
const parseOne = (overrides: Record<string, JsonValue> = {}) => parseRequestCollection(file(entry(overrides)))

describe('合法的集合', () => {
  it('PRD 3.2 那个例子逐字段解析出来，一条错误都没有', () => {
    const { collection, errors } = parseRequestCollection({
      $comment: DEFAULT_REQUESTS_COMMENT as string[],
      version: 1,
      endpoint: 'bilibili/videoInfo',
      requests: [
        entry({ sampleHash: '57c213a5f38c', shapeKey: 'a1b2c3d4' }),
        entry({
          id: 'deleted',
          label: '已删除的稿件',
          params: { bvid: 'BV1111111111' },
          verdict: 'reject:empty',
          note: '拿回 code: -404，data 是 null。留这条是为了别人不用再试一次'
        })
      ]
    })
    expect(errors).toEqual([])
    expect(collection.endpoint).toBe('bilibili/videoInfo')
    expect(collection.requests.map((item) => item.id)).toEqual(['bv-single-p', 'deleted'])
    expect(collection.requests[0]!.params).toEqual({ bvid: 'BV1xx411c7mD' })
    expect(collection.requests[0]!.sampleHash).toBe('57c213a5f38c')
  })

  it('**参数是真值，原样带出来** —— 这个文件存在的全部理由就是「照它能重放请求」', () => {
    const { collection } = parseOne({ params: { bvid: 'BV1xx411c7mD', aid: 2, ids: [1, 2], nested: { page: 1 } } })
    expect(collection.requests[0]!.params).toEqual({ bvid: 'BV1xx411c7mD', aid: 2, ids: [1, 2], nested: { page: 1 } })
  })

  it('没有参数的端点写 `{}` 是合法的（emojiList 那一族一个参数都不要）', () => {
    expect(parseOne({ params: {} }).errors).toEqual([])
  })

  it('被拒的记录没有 sampleHash 是**正常状态**，不是缺字段', () => {
    const { collection, errors } = parseOne({ verdict: 'reject:risk-control', note: '拿回风控页' })
    expect(errors).toEqual([])
    expect(collection.requests[0]!.sampleHash).toBeUndefined()
    expect('sampleHash' in collection.requests[0]!).toBe(false)
  })

  it('四种 verdict 全收，别的一律拒 —— 它记的是「为什么没拿到样本」这个粒度', () => {
    for (const verdict of REQUEST_VERDICTS) expect(parseOne({ verdict }).collection.requests).toHaveLength(1)
    for (const verdict of ['reject', 'ok ', 'REJECT:LOGIN', 'reject:risk_control', 1, null]) {
      const { collection, errors } = parseOne({ verdict: verdict as JsonValue })
      expect(collection.requests).toHaveLength(0)
      expect(errors[0]).toContain('verdict')
    }
  })
})

describe('凭证一个字都不许进 —— 这个文件进 git，提交出去就收不回来', () => {
  it('通用词命中就整条不收，并且指名是哪个键', () => {
    const { collection, errors } = parseOne({ params: { bvid: 'BV1', cookie: 'SESSDATA=abc123' } })
    expect(collection.requests).toHaveLength(0)
    expect(errors[0]).toContain('cookie')
    expect(errors[0]).toContain('.env')
  })

  it('**平台自家的凭证名也拒** —— 判据是 corpus 那张 `CREDENTIAL_PARAM`，两处不许分叉', () => {
    for (const key of ['SESSDATA', 'bili_jct', 'DedeUserID', 'buvid3', 'sid_guard', 'msToken', 's_v_web_id']) {
      const { collection, errors } = parseOne({ params: { bvid: 'BV1', [key]: 'x' } })
      expect(collection.requests, `${key} 应该被拒`).toHaveLength(0)
      expect(errors[0]).toContain(key)
    }
  })

  it('**嵌套着的也查** —— 只看顶层的话 `{ headers: { cookie } }` 这种形状就漏了', () => {
    const { collection, errors } = parseOne({ params: { bvid: 'BV1', headers: { cookie: 'x' } } })
    expect(collection.requests).toHaveLength(0)
    expect(errors[0]).toContain('headers.cookie')
  })

  it('数组里的也查，路径用 `[]` 标出来', () => {
    const { errors } = parseOne({ params: { list: [{ ok: 1 }, { access_token: 'x' }] } })
    expect(errors[0]).toContain('list[].access_token')
  })

  it('**报的是键名不是值** —— 报错文本本身也会被贴进 issue 和聊天', () => {
    const { errors } = parseOne({ params: { cookie: 'SESSDATA=deadbeef' } })
    expect(errors.join('\n')).not.toContain('deadbeef')
  })

  it('`uid` 这类正当业务参数不受影响（删了它就说不清这条问的是谁）', () => {
    expect(parseOne({ params: { uid: 1, host_mid: 1, oid: '2' } }).errors).toEqual([])
  })
})

describe('id：它会变成产物的目录名与类型名', () => {
  it('**撞名拒绝写入让人改名**，并且指出跟哪一条撞了（PRD 待决 #4 的保守方案）', () => {
    const { collection, errors } = parseRequestCollection(file(entry(), entry({ label: '另一条但忘了改 id' })))
    expect(collection.requests).toHaveLength(1)
    expect(collection.requests[0]!.label).toBe('单 P 稿件')
    expect(errors[0]).toContain('requests[0]')
    expect(errors[0]).toContain('撞名')
  })

  it('撞名报错**不是**「后面那条覆盖前面那条」—— 自动补后缀会让产物名由读取顺序决定', () => {
    const { collection } = parseRequestCollection(file(entry({ params: { bvid: 'A' } }), entry({ params: { bvid: 'B' } })))
    expect(collection.requests.map((item) => item.params)).toEqual([{ bvid: 'A' }])
  })

  it('第一条因为别的原因被拒时，第二条同名照样报撞名 —— 文件里确实躺着两个同名 id', () => {
    const bad = entry({ params: { cookie: 'x' } })
    const { errors } = parseRequestCollection(file(bad, entry()))
    expect(errors.some((line) => line.includes('像凭证'))).toBe(true)
    expect(errors.some((line) => line.includes('撞名'))).toBe(true)
  })

  it('合法的短名收下：字母数字加中间的 - 与 _', () => {
    for (const id of ['deleted', 'bv-single-p', 'bv_multi_p', 'p1', 'A-1_b']) {
      expect(parseOne({ id }).collection.requests, id).toHaveLength(1)
    }
  })

  it('首尾的分隔符要拒 —— `-x` 与 `x` 会拼出同一个类型名，撞名检查看不出来', () => {
    for (const id of ['-x', 'x-', '_x', 'x_']) {
      const { collection, errors } = parseOne({ id })
      expect(collection.requests, id).toHaveLength(0)
      expect(errors[0]).toContain('目录名')
    }
  })

  it('空串、路径穿越、中文、空格一律拒 —— 它要进文件系统', () => {
    for (const id of ['', '.', '..', '../etc', 'a/b', '单 P', 'a b', 'a.json']) {
      expect(parseOne({ id }).collection.requests, JSON.stringify(id)).toHaveLength(0)
    }
  })

  it('缺 id 或者不是字符串时报错用下标定位，不用那个坏名字', () => {
    expect(parseRequestCollection(file(entry({ id: 42 }))).errors[0]).toContain('requests[0].id')
    const { errors } = parseRequestCollection(file({ label: 'x' }))
    expect(errors[0]).toContain('requests[0].id')
  })
})

describe('必需字段坏了 → 整条不收', () => {
  it('label 缺失 / 不是字符串', () => {
    expect(parseOne({ label: 42 }).collection.requests).toHaveLength(0)
    const { collection, errors } = parseRequestCollection(file({ id: 'x', params: {}, recordedAt: '2026-09-05T06:11:00Z', verdict: 'ok' }))
    expect(collection.requests).toHaveLength(0)
    expect(errors[0]).toContain('label')
  })

  it('label 是空白串要报 —— 空标签比没标签更糟，它占着位置像已经写过说明了', () => {
    const { collection, errors } = parseOne({ label: '   ' })
    expect(collection.requests).toHaveLength(0)
    expect(errors[0]).toContain('空的')
  })

  it('params 缺失或者不是对象（省掉这个键不等于「没有参数」）', () => {
    for (const params of [null, [], 'bvid=BV1', 1] as JsonValue[]) {
      expect(parseOne({ params }).collection.requests, JSON.stringify(params)).toHaveLength(0)
    }
    const { collection, errors } = parseRequestCollection(file({ id: 'x', label: 'y', recordedAt: '2026-09-05T06:11:00Z', verdict: 'ok' }))
    expect(collection.requests).toHaveLength(0)
    expect(errors[0]).toContain('params')
  })

  it('recordedAt 必须是到秒的 ISO 8601 UTC —— 同一件事两种写法会让进 git 的文件白刷 diff', () => {
    for (const recordedAt of [
      '2026-09-05T06:11:00.000Z',
      '2026-09-05 06:11:00Z',
      '2026-09-05T06:11:00+08:00',
      '2026-09-05',
      'not a date',
      1_757_054_000
    ]) {
      const { collection, errors } = parseOne({ recordedAt: recordedAt as JsonValue })
      expect(collection.requests, String(recordedAt)).toHaveLength(0)
      expect(errors[0]).toContain('recordedAt')
    }
  })

  it('形状对但日期不存在的也要拒（`Date` 会替人「修正」，那是静默的）', () => {
    expect(parseOne({ recordedAt: '2026-02-30T00:00:00Z' }).collection.requests).toHaveLength(0)
    expect(parseOne({ recordedAt: '2026-13-01T00:00:00Z' }).collection.requests).toHaveLength(0)
  })
})

describe('可选字段坏了 → 只丢那个字段，条目留着', () => {
  // 这一档是有意的：这个文件最有价值的部分是「什么参数 + 什么结论」，
  // 为一个多余的哈希把「我试过这组参数，拿回的是风控页」整条丢掉是本末倒置
  it('sampleHash 不是 12 位十六进制 → 报错但条目还在', () => {
    const { collection, errors } = parseOne({ sampleHash: 'ZZZ' })
    expect(collection.requests).toHaveLength(1)
    expect(collection.requests[0]!.sampleHash).toBeUndefined()
    expect(errors[0]).toContain('sampleHash')
  })

  it('**被拒的记录带着 sampleHash 要报** —— 那通常是复制粘贴漏改，指向的是另一组参数的样本', () => {
    const { collection, errors } = parseOne({ verdict: 'reject:login', sampleHash: '57c213a5f38c' })
    expect(collection.requests).toHaveLength(1)
    expect(collection.requests[0]!.sampleHash).toBeUndefined()
    expect(errors[0]).toContain('没有样本')
  })

  it('shapeKey 只卡「非空字符串」—— 产它的那一头还没落地，提前钉死编码只会变成届时要改的一处', () => {
    expect(parseOne({ shapeKey: 'e5f6a7b8' }).collection.requests[0]!.shapeKey).toBe('e5f6a7b8')
    const { collection, errors } = parseOne({ shapeKey: '  ' })
    expect(collection.requests).toHaveLength(1)
    expect(collection.requests[0]!.shapeKey).toBeUndefined()
    expect(errors[0]).toContain('shapeKey')
  })

  it('note 是空的要报 —— 有话就写，没话就别留这个键', () => {
    const { collection, errors } = parseOne({ note: '' })
    expect(collection.requests).toHaveLength(1)
    expect('note' in collection.requests[0]!).toBe(false)
    expect(errors[0]).toContain('note')
  })

  it('条目上的未知键要指名（拼错的 `lable` 静默丢掉是最难查的那种）', () => {
    const { collection, errors } = parseOne({ lable: 'x' })
    expect(errors[0]).toContain('requests[0].lable')
    // 未知键只是报出来，条目本身照收 —— 那个键的内容本来就不是集合的一部分
    expect(collection.requests).toHaveLength(1)
  })
})

describe('根：空文件、缺字段、认不出的版本', () => {
  it('根不是对象 → 退化成空集合，不抛', () => {
    for (const raw of [[], null, 'x', 1] as JsonValue[]) {
      const { collection, errors } = parseRequestCollection(raw)
      expect(collection.requests).toEqual([])
      expect(errors[0]).toContain('根不是对象')
    }
  })

  it('空对象 → 三条错误各说一件事，而不是笼统一句「文件无效」', () => {
    const { collection, errors } = parseRequestCollection({})
    expect(collection).toEqual({ version: REQUESTS_FORMAT, endpoint: '', requests: [] })
    expect(errors.some((line) => line.includes('version'))).toBe(true)
    expect(errors.some((line) => line.includes('endpoint'))).toBe(true)
    expect(errors.some((line) => line.includes('requests'))).toBe(true)
  })

  it('requests 是空数组是合法的 —— 「这个端点还没录过」不是错误', () => {
    expect(parseRequestCollection({ version: 1, endpoint: 'bilibili/videoInfo', requests: [] }).errors).toEqual([])
  })

  it('认不出的 version 要报 —— 版本号变了意味着某个键的含义变了', () => {
    const { collection, errors } = parseRequestCollection({ version: 2, endpoint: 'bilibili/videoInfo', requests: [] })
    expect(collection.version).toBe(2)
    expect(errors[0]).toContain('格式版本')
  })

  it('endpoint 必须是 `<平台>/<端点>`，两段都要能当路径段用', () => {
    for (const endpoint of ['videoInfo', 'bilibili/videoInfo/extra', '../../etc/passwd', 'bilibili/', '']) {
      expect(parseRequestCollection({ version: 1, endpoint, requests: [] }).errors[0], endpoint).toContain('endpoint')
    }
  })

  it('根上的未知键要指名，`$comment` 除外（JSON 没有注释）', () => {
    expect(parseRequestCollection({ ...(file() as object), note: 'x' }).errors[0]).toContain('note')
    expect(parseRequestCollection({ ...(file() as object), $comment: '一句话' }).errors).toEqual([])
  })

  it('$comment 原样带出来，坏了只丢它 —— 那三句「值是真值、只放公开内容」得跟着文件走', () => {
    const kept = parseRequestCollection({ ...(file() as object), $comment: DEFAULT_REQUESTS_COMMENT as string[] })
    expect(kept.collection.$comment).toEqual(DEFAULT_REQUESTS_COMMENT)
    const bad = parseRequestCollection({ ...(file() as object), $comment: [1, 2] })
    expect(bad.collection.$comment).toBeUndefined()
    expect(bad.errors[0]).toContain('$comment')
  })

  it('requests 里混进非对象只丢那一条，其余照收', () => {
    const { collection, errors } = parseRequestCollection(file('x' as JsonValue, entry()))
    expect(collection.requests.map((item) => item.id)).toEqual(['bv-single-p'])
    expect(errors[0]).toContain('requests[0] 不是对象')
  })
})

describe('不抛异常 —— 一条写坏的记录不该让整个界面炸掉', () => {
  it('各种畸形输入都只进 errors', () => {
    const nasty: JsonValue[] = [
      null,
      [1, 2],
      { version: 'one', endpoint: 42, requests: 'nope' },
      { requests: [null, [], 0, '', { id: null }] },
      { version: 1, endpoint: 'a/b', requests: [{ id: 'x', label: 'y', params: { a: { b: { c: [[[1]]] } } } }] }
    ]
    for (const raw of nasty) {
      expect(() => parseRequestCollection(raw), JSON.stringify(raw)).not.toThrow()
      expect(parseRequestCollection(raw).errors.length, JSON.stringify(raw)).toBeGreaterThan(0)
    }
  })

  it('`__proto__` 这类键名骗不到它（`JSON.parse` 会产出一个真的自有键）', () => {
    const raw = JSON.parse('{"version":1,"endpoint":"a/b","requests":[{"id":"p","label":"l","params":{"__proto__":{"cookie":"x"}}}]}')
    expect(() => parseRequestCollection(raw as JsonValue)).not.toThrow()
    // 钻进去照样查得到凭证：`__proto__` 在这里只是一个普通的键名
    expect(parseRequestCollection(raw as JsonValue).errors.some((line) => line.includes('cookie'))).toBe(true)
  })
})

describe('路径与落盘', () => {
  it('路径就是 corpus/<平台>/<端点>.requests.json，放在端点目录外面（同 .doc.json）', () => {
    expect(requestsPath({ platform: 'bilibili', endpoint: 'videoInfo' })).toBe('corpus/bilibili/videoInfo.requests.json')
  })

  it('**这个函数抛** —— 它的输出要进文件系统，路径穿越不是「可以记进 errors 的瑕疵」', () => {
    expect(() => requestsPath({ platform: 'bilibili', endpoint: '../../etc' })).toThrow('非法字符')
  })

  it('序列化：2 空格缩进、结尾换行、行尾 LF（同 serializeCorpusSample，不然 Windows 上追加一条会重写整文件）', () => {
    const text = serializeRequestCollection(parseOne().collection)
    expect(text.endsWith('}\n')).toBe(true)
    expect(text).not.toContain('\r')
    expect(text).toContain('\n  "version": 1')
  })

  it('parse → serialize → parse 逐字段稳定，且 `$comment` 还在最前面', () => {
    const original = { $comment: DEFAULT_REQUESTS_COMMENT as string[], version: 1, endpoint: 'bilibili/videoInfo', requests: [entry()] }
    const once = serializeRequestCollection(parseRequestCollection(original).collection)
    const twice = serializeRequestCollection(parseRequestCollection(JSON.parse(once) as JsonValue).collection)
    expect(twice).toBe(once)
    expect(once.indexOf('$comment')).toBeLessThan(once.indexOf('version'))
    expect(parseRequestCollection(JSON.parse(once) as JsonValue).errors).toEqual([])
  })
})
