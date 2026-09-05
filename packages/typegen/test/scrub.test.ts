/**
 * 脱敏器（PRD 七）。用例分三类，对应三种「省了样本反而有害」的失败：
 *
 * 1. **形状变了** —— 时间戳位数、URL 还是不是 URL、超界整数换完是不是还超界。
 *    这类是最隐蔽的：脱敏跑完不报错，类型却生成错了。
 * 2. **一致性丢了** —— 同一个人在样本里的两处 ID 换成两个不同假值，
 *    合并器就看不出「这两个字段指同一实体」。
 * 3. **清单本身泄漏** —— 清单要跟 corpus 一起提交，里面不能有原值。
 *
 * 最后一类用「换完的产物里搜不到原值」这种反向断言来钉，比逐字段比对可靠。
 */

import { describe, expect, it } from 'vitest'

import { createScrubSession, type JsonValue, scrubSample } from '../src/index'

/** 换完的值 */
const scrub = (value: JsonValue, options?: Parameters<typeof scrubSample>[1]): JsonValue => scrubSample(value, options).value

/** 取某个键换完的值（小样本里键名唯一） */
const at = (value: JsonValue, key: string, options?: Parameters<typeof scrubSample>[1]): JsonValue =>
  (scrub(value, options) as Record<string, JsonValue>)[key]!

describe('硬规则 1：不改变类型形状', () => {
  it('13 位毫秒时间戳换完还是 13 位，10 位秒还是 10 位', () => {
    const result = scrub({ pub_ts: 1700000000, create_time: 1700000000123 }) as Record<string, number>
    expect(String(result.pub_ts)).toHaveLength(10)
    expect(String(result.create_time)).toHaveLength(13)
  })

  it('超过 MAX_SAFE_INTEGER 的 ID 换完**仍然超界** —— 否则 unsafe-integer 那条报告项被脱敏顺手删掉', () => {
    // oxlint-disable-next-line no-loss-of-precision
    const unsafe = 9007199254740993 satisfies number
    const replaced = at({ photo_id: unsafe }, 'photo_id') as number
    expect(Number.isSafeInteger(replaced)).toBe(false)
    expect(String(replaced)).toHaveLength(String(unsafe).length)
  })

  it('安全区内的 16 位整数换完也**仍然安全**（16 位横跨 MAX_SAFE_INTEGER，两边都得钉）', () => {
    const safe = 1000000000000001
    expect(String(safe)).toHaveLength(16)
    const replaced = at({ id: safe }, 'id') as number
    expect(Number.isSafeInteger(replaced)).toBe(true)
    expect(String(replaced)).toHaveLength(16)
  })

  it('数字 ID 保位数、保符号，且多位数不出现前导零', () => {
    const result = scrub({ aid: -412, mid: 1234567890 }) as Record<string, number>
    expect(result.aid).toBeLessThan(0)
    expect(String(Math.abs(result.aid!))).toHaveLength(3)
    expect(String(result.mid)).toMatch(/^[1-9]\d{9}$/)
  })

  it('数字串仍然是纯数字串，位数不变（`aid: "1234567890"` 这种平台给字符串的 ID）', () => {
    expect(at({ comment_id_str: '900000000000000001' }, 'comment_id_str')).toMatch(/^\d{18}$/)
  })

  it('URL 换完还是 URL：scheme、主机标签数、路径段数、扩展名都在，主机落在 .invalid', () => {
    const url = at({ cover: 'https://p1-hs.byteimg.com/img/tos-cn/abc123~tplv-1080.jpeg?x-signature=SECRET' }, 'cover') as string
    expect(url.startsWith('https://')).toBe(true)
    const parsed = new URL(url)
    expect(parsed.hostname.split('.')).toHaveLength(3)
    expect(parsed.hostname.endsWith('.invalid')).toBe(true)
    expect(parsed.pathname.split('/')).toHaveLength(4)
    expect(parsed.pathname.endsWith('.jpeg')).toBe(true)
    // 查询的**键**留着（排查时要看接口形状），值换掉（签名就在值里）
    expect(parsed.searchParams.has('x-signature')).toBe(true)
    expect(parsed.searchParams.get('x-signature')).not.toBe('SECRET')
  })

  it('协议相对 URL（`//space.bilibili.com/123/`）不被当成非 URL 处理', () => {
    const url = at({ jump_url: '//space.bilibili.com/11111/' }, 'jump_url') as string
    expect(url.startsWith('//')).toBe(true)
    expect(url.endsWith('/')).toBe(true)
    expect(url.split('/').filter((part) => part !== '')).toHaveLength(2)
  })

  it('掩码手机号保住掩码结构（`*` 的位置就是这个字段的形状）', () => {
    expect(at({ phone: '138****1234' }, 'phone')).toMatch(/^\d{3}\*{4}\d{4}$/)
  })

  it('昵称按码点换，emoji 与标点原样留着 —— 用码点数而不是 length，否则 emoji 会被切碎', () => {
    const nickname = at({ nickname: '张三🎉·A1' }, 'nickname') as string
    expect([...nickname]).toHaveLength(6)
    expect(nickname).toContain('🎉')
    expect(nickname).toContain('·')
    expect(nickname).toMatch(/^..🎉·[A-Z]\d$/u)
  })

  it('空串保持空串（换成什么都是无中生有，而它本来就不含信息）', () => {
    expect(at({ face: '' }, 'face')).toBe('')
  })

  it('布尔与 null 不动', () => {
    expect(scrub({ visible: true, topic: null })).toEqual({ visible: true, topic: null })
  })
})

describe('硬规则 2：同一原值 → 同一假值', () => {
  it('同一份样本里两处相同 UID 换成同一个假 UID', () => {
    const result = scrub({ author: { mid: 11111 }, stat: { up_mid: 11111 } }) as { author: { mid: number }; stat: { up_mid: number } }
    expect(result.author.mid).toBe(result.stat.up_mid)
  })

  it('rich_text_nodes 那种 `text` / `orig_text` 重复正文也对得上', () => {
    const result = scrub({ nodes: [{ orig_text: '看这个', text: '看这个' }] }) as { nodes: { orig_text: string; text: string }[] }
    expect(result.nodes[0]!.orig_text).toBe(result.nodes[0]!.text)
  })

  it('字符串 `"123"` 与数字 `123` 不共用假值 —— 共用了类型就串了', () => {
    const result = scrub({ id: 123, item_id: '123' }) as { id: number; item_id: string }
    expect(typeof result.id).toBe('number')
    expect(typeof result.item_id).toBe('string')
  })

  it('传同一个 session 时，跨样本也是同一个假身份（一批样本里作者得还是同一个人）', () => {
    const session = createScrubSession()
    const first = scrub({ mid: 11111 }, { session }) as { mid: number }
    const second = scrub({ mid: 11111 }, { session }) as { mid: number }
    expect(first.mid).toBe(second.mid)
  })

  it('不传 session 时同一原值也换成同一假值 —— 假值派生自原值哈希，不是随机数（`--check` 要求逐字节可复现）', () => {
    expect(scrub({ mid: 11111 })).toEqual(scrub({ mid: 11111 }))
  })
})

describe('硬规则 3：清单里没有原值', () => {
  const sample: JsonValue = {
    nickname: '张三',
    mid: 114514,
    face: 'https://cdn.example.com/avatar/zhangsan.jpg?token=abcdef',
    phone: '13800001234'
  }

  it('清单只有路径与统计，序列化后搜不到任何原值', () => {
    const { manifest } = scrubSample(sample)
    const serialized = JSON.stringify(manifest)
    for (const secret of ['张三', '114514', 'zhangsan', 'abcdef', '13800001234']) expect(serialized).not.toContain(secret)
  })

  it('产物里也搜不到原值（真正要防的是这个）', () => {
    const serialized = JSON.stringify(scrub(sample))
    for (const secret of ['张三', '114514', 'zhangsan', 'abcdef', '13800001234']) expect(serialized).not.toContain(secret)
  })

  it('清单按路径排序，能看出「换了几处 / 几个不同原值」', () => {
    const { manifest } = scrubSample({ a: { mid: 1 }, b: { mid: 1 }, c: { mid: 2 } })
    expect(manifest.replacements.map((item) => item.path)).toEqual(['a.mid', 'b.mid', 'c.mid'])
    expect(manifest.replacements[0]).toMatchObject({ kind: 'id', occurrences: 1, distinct: 1 })
  })

  it('同一路径在数组里出现多次时合成一条，`distinct` 数出有几个不同原值', () => {
    const { manifest } = scrubSample({ list: [{ mid: 1 }, { mid: 1 }, { mid: 2 }] })
    expect(manifest.replacements).toHaveLength(1)
    expect(manifest.replacements[0]).toMatchObject({ path: 'list[].mid', occurrences: 3, distinct: 2 })
  })
})

describe('残留检查：抓的是整类漏洞，不是某一条规则', () => {
  it('某处换掉的 ID 以子串形式嵌在别处 → 报 leak（快手 `share_info` 就是这么漏的）', () => {
    const sample: JsonValue = {
      photo_id: '3xirtzwrg472nxe',
      share_info: 'userId=99&photoId=3xirtzwrg472nxe&kpn=KUAISHOU'
    }
    // 先证明它确实是个漏：把 share_info 排除在规则外
    const { manifest } = scrubSample(sample, { keep: [{ key: 'share_info' }] })
    expect(manifest.leaks).toHaveLength(1)
    expect(manifest.leaks[0]!.path).toBe('share_info')
    // 只报路径与类别，不报值
    expect(JSON.stringify(manifest.leaks)).not.toContain('3xirtzwrg472nxe')
  })

  it('默认规则已经把 share_info 收进去了，所以同一份样本默认不漏', () => {
    const sample: JsonValue = { photo_id: '3xirtzwrg472nxe', share_info: 'photoId=3xirtzwrg472nxe' }
    expect(scrubSample(sample).manifest.leaks).toEqual([])
  })

  it('短值不查 —— `86` 这种在大响应里到处都是，全查会把报告变成噪音', () => {
    const sample: JsonValue = { id: 86, note_kept: 'x86x' }
    expect(scrubSample(sample, { keep: [{ key: 'note_kept' }] }).manifest.leaks).toEqual([])
  })

  it('干净的样本没有 leak', () => {
    expect(scrubSample({ nickname: '张三', mid: 114514 }).manifest.leaks).toEqual([])
  })

  it('带前缀的 `real_log_id` 也要换 —— 第一版规则锚定，于是 `log_id` 换了它没换，残留检查抓到了', () => {
    const sample: JsonValue = { log_id: '20260904abcdef', real_log_id: '20260904abcdef' }
    const scrubbed = scrub(sample) as { log_id: string; real_log_id: string }
    expect(scrubbed.real_log_id).not.toBe('20260904abcdef')
    expect(scrubSample(sample).manifest.leaks).toEqual([])
  })

  it('全是符号的昵称也得换动 —— 符号不在任何字符池里，第一版把这类整串放过了', () => {
    const symbols = '✿°•∘ɷ∘•°✿'
    const replaced = at({ nickname: symbols }, 'nickname') as string
    expect(replaced).not.toBe(symbols)
    // 码点数不变：形状还是那个形状
    expect([...replaced]).toHaveLength([...symbols].length)
  })

  it('短到 3 个码点以内的符号串不折腾（`···` 不识别人）', () => {
    expect(at({ nickname: '···' }, 'nickname')).toBe('···')
  })
})

describe('URL 字段：camelCase 与映射表（第一版漏掉的两类）', () => {
  it('camelCase 的 URL 键都命中（`headUrl` / `coverUrls` / `backupUrl`）', () => {
    const sample: JsonValue = {
      headUrl: 'https://p66.a.kwimgs.com/uhead/a.jpg',
      coverUrls: [{ url: 'https://p1.a.yximgs.com/c.jpg', cdn: 'p1.a.yximgs.com' }],
      backupUrl: ['https://v4.oskwai.com/x.mp4']
    }
    const text = JSON.stringify(scrub(sample))
    for (const host of ['kwimgs', 'yximgs', 'oskwai']) expect(text).not.toContain(host)
  })

  it('裸主机名字段（快手每个 URL 旁边都挂一个 `cdn`）也换', () => {
    expect(at({ cdn: 'p66.a.kwimgs.com' }, 'cdn')).not.toContain('kwimgs')
  })

  it('URL 映射表的叶子按**路径**命中 —— 键是数据（`iconUrls: { "[哦]": … }`），按键名永远匹配不上', () => {
    const sample: JsonValue = { iconUrls: { '[哦]': 'https://p2.a.yximgs.com/emoji/oh.png' } }
    const scrubbed = scrub(sample) as { iconUrls: Record<string, string> }
    expect(scrubbed.iconUrls['[哦]']).not.toContain('yximgs')
    // 键名本身是数据，不动
    expect(Object.keys(scrubbed.iconUrls)).toEqual(['[哦]'])
  })

  it('**键名一条规则都没命中，但值长得像 URL** → 照样按 URL 换（按键名追永远追不完）', () => {
    // 这七个名字是实录 B站 userCard 时一次撞上的：path / s_img / l_img / pc_web / …_uri_hans_static
    const sample: JsonValue = {
      path: 'http://i0.hdslb.com/bfs/vip/label.png',
      s_img: 'https://i1.hdslb.com/bfs/activity-plat/static/x.png',
      pc_web: 'https://account.bilibili.com/big?from_spmid=vipicon',
      img_label_uri_hans_static: 'https://i0.hdslb.com/bfs/vip/abc.png'
    }
    const text = JSON.stringify(scrub(sample))
    expect(text).not.toContain('hdslb')
    expect(text).not.toContain('bilibili.com')
    // 换完还是 URL（形状不变）
    expect((scrub(sample) as Record<string, string>).path.startsWith('http://')).toBe(true)
  })

  it('值形状压过键名规则：`mobile` 装的是 URL 时按 URL 换，不按手机号', () => {
    // 手机号规则会保留所有非数字字符，于是整条 URL 原样留下 —— 实录撞到过
    const replaced = at({ mobile: 'https://big.bilibili.com/mobile/index?navhide=9' }, 'mobile') as string
    expect(replaced).not.toContain('bilibili.com')
    expect(replaced.startsWith('https://')).toBe(true)
  })

  it('`redact` 是唯一压过值形状的：cookie 字段装什么都得清空', () => {
    expect(at({ cookie: 'https://example.com/x' }, 'cookie')).toBe('')
  })

  it('协议相对 URL 也算像 URL', () => {
    expect(at({ weird_key: '//i0.hdslb.com/bfs/a.png' }, 'weird_key')).not.toContain('hdslb')
  })
})

describe('字符串里套的 JSON：钻进去，别当一个字符串放过', () => {
  it('嵌套文档里的字段照规则换，外层仍然是字符串（形状不变）', () => {
    const inner = JSON.stringify({ nickname: '张三', mid: 114514, coverUrl: 'https://cdn.example.com/a.jpg' })
    const scrubbed = at({ msg: inner }, 'msg') as string
    expect(typeof scrubbed).toBe('string')
    const parsed = JSON.parse(scrubbed) as { nickname: string; mid: number; coverUrl: string }
    expect(parsed.nickname).not.toBe('张三')
    expect(parsed.mid).not.toBe(114514)
    expect(parsed.coverUrl).not.toContain('cdn.example.com')
  })

  it('清单里的路径带 `{}`，标出「钻进了一层字符串里的 JSON」', () => {
    const inner = JSON.stringify({ nickname: '张三', padding: 'x'.repeat(40) })
    const { manifest } = scrubSample({ msg: inner })
    expect(manifest.replacements.map((item) => item.path)).toContain('msg{}.nickname')
  })

  it('跨层的一致性映射照样成立：外层的 mid 与嵌套文档里的 mid 换完仍然相等', () => {
    const inner = JSON.stringify({ mid: 114514, padding: 'x'.repeat(40) })
    const scrubbed = scrub({ mid: 114514, msg: inner }) as { mid: number; msg: string }
    expect((JSON.parse(scrubbed.msg) as { mid: number }).mid).toBe(scrubbed.mid)
  })

  it('不是 JSON 的长字符串按普通字符串处理，不炸', () => {
    const text = 'x'.repeat(200)
    expect(typeof at({ msg: text }, 'msg')).toBe('string')
  })

  it('`JSON.parse` 能过但不是文档的（裸数字、裸字符串）不当嵌套处理', () => {
    // `JSON.parse('12345678901234567890')` 会成功，但它不是嵌套文档
    const digits = '1234567890123456789012345678901234567890'
    expect(at({ note_kept: digits }, 'note_kept', { keep: [{ key: 'note_kept' }] })).toBe(digits)
  })

  it('`redact` 命中时直接清空，不去解析内容（cookie 字段装什么都不留）', () => {
    expect(at({ cookie: JSON.stringify({ nickname: '张三', padding: 'x'.repeat(40) }) }, 'cookie')).toBe('')
  })

  it('确定性：同一份嵌套文档两次换出同一个字符串（`--check` 要求）', () => {
    const inner = JSON.stringify({ nickname: '张三', padding: 'x'.repeat(40) })
    expect(at({ msg: inner }, 'msg')).toBe(at({ msg: inner }, 'msg'))
  })
})

describe('规则没命中的部分：报出来，不猜', () => {
  it('键名没命中但值像 URL 的位置**已经被换掉**了，所以不该再进 suspects', () => {
    const { manifest } = scrubSample({ weird_field_9: 'https://cdn.example.com/a?sig=x' })
    expect(manifest.suspects).toEqual([])
    expect(manifest.replacements.map((item) => item.path)).toEqual(['weird_field_9'])
  })

  it('长 token 串也报', () => {
    const { manifest } = scrubSample({ blob: 'a'.repeat(40) })
    expect(manifest.suspects[0]?.reason).toContain('连续 token 串')
  })

  it('白名单压掉 suspects —— 人已经决定留着，就别让告警长期挂着变噪音', () => {
    const { manifest } = scrubSample({ blob: 'a'.repeat(40) }, { keep: [{ key: 'blob' }] })
    expect(manifest.suspects).toEqual([])
  })

  it('已经被规则换掉的位置不会再进 suspects', () => {
    const { manifest } = scrubSample({ cover: 'https://cdn.example.com/a?sig=x' })
    expect(manifest.suspects).toEqual([])
    expect(manifest.replacements.map((item) => item.path)).toEqual(['cover'])
  })

  it('**像人写的话也报** —— 六条凭证判据一条都碰不到中文文案，那正是 caption 静默漏掉的原因', () => {
    const { manifest } = scrubSample({ 某个没规律的键: '这是一句用户写的话' })
    expect(manifest.suspects[0]?.reason).toContain('像人写的文本')
  })

  it('短值不报 —— `男`、`高清`、`avc` 这类枚举取值全在那个区间，而它们是判别字段', () => {
    const { manifest } = scrubSample({ weird_a: '男', weird_b: '高清', weird_c: 'avc' })
    expect(manifest.suspects).toEqual([])
  })

  it('纯 ASCII 的短标识符不报 —— 那不是「人写的话」，而报出来只会变噪音', () => {
    const { manifest } = scrubSample({ weird_field: 'VIDEO_TYPE_NORMAL' })
    expect(manifest.suspects).toEqual([])
  })
})

describe('白名单：判别字段绝不能被换', () => {
  it('默认白名单保住 type / kind / code / status（换掉它们分组和 is* 守卫全线报废）', () => {
    const sample: JsonValue = { type: 'DYNAMIC_TYPE_AV', kind: 'a', code: 0, status: 1, result: 1 }
    expect(scrub(sample)).toEqual(sample)
  })

  it('**信封顶层的 `message` 留着，评论正文里的 `message` 要换** —— 这两个光按键名分不开', () => {
    // 顶层是平台错误文案（证据），嵌套的是用户内容（实录时漏出去的就是它里面嵌的昵称）
    const sample: JsonValue = { code: 0, message: '稿件不存在', data: { replies: [{ content: { message: '回复张三：说得对' } }] } }
    const scrubbed = scrub(sample) as { message: string; data: { replies: { content: { message: string } }[] } }
    expect(scrubbed.message).toBe('稿件不存在')
    expect(scrubbed.data.replies[0]!.content.message).not.toContain('张三')
  })

  it('`mid_str` 这类带 `_str` 后缀的 ID 也要换（第一版只给另一组开了这个后缀）', () => {
    const sample: JsonValue = { mid: 114514, mid_str: '114514' }
    const scrubbed = scrub(sample) as { mid: number; mid_str: string }
    expect(scrubbed.mid_str).not.toBe('114514')
    // 换完之后两处仍然指同一个人（一致性映射跨类型也得对得上）
    expect(scrubbed.mid_str).toBe(String(scrubbed.mid))
  })

  it('白名单命中容器时整棵子树都不动', () => {
    const sample: JsonValue = { raw: { mid: 11111, nickname: '张三' } }
    expect(scrub(sample, { keep: [{ key: 'raw' }] })).toEqual(sample)
  })

  it('**默认白名单只保标量** —— `result` 是整块负载时不能跟着被跳过', () => {
    // 这是整套脱敏最大的一个洞：`result` / `status` 在真实响应里经常是整块负载
    // （B站搜索的 `data.result` 就是那一列结果），而默认白名单原先也「连子树都不进」，
    // 于是那一整块的昵称、UID、带签名的 CDN URL 一个都没换 ——
    // 而且 `replacements` / `suspects` / `leaks` 三个全空，人连「这里可能有问题」都看不到
    const sample: JsonValue = {
      code: 0,
      data: { result: [{ author: { mid: 1234567890123, name: '张三丰道长' }, pic: 'https://i0.hdslb.com/bfs/a.jpg?sig=deadbeef' }] }
    }
    const { manifest } = scrubSample(sample)
    expect(manifest.replacements.map((item) => item.path)).toEqual([
      'data.result[].author.mid',
      'data.result[].author.name',
      'data.result[].pic'
    ])
  })

  it('**数组里的标量也不受默认白名单保护** —— 「只保标量」修完还剩的那一半', () => {
    // `data.result` 是字符串数组时，元素路径是 `data.result[]`，而 `keyOfPath` 剥掉 `[]`
    // 得回 `result` —— 于是每个标量元素被逐个重新白名单掉，值原样落盘且连 suspect 都不进
    const url = 'https://cdn.example.com/a.jpg?sign=ABCDEFGHIJKLMNOPQRSTUVWXYZ012345'
    const sample: JsonValue = { data: { result: [url], list: [url] } }
    const { value, manifest } = scrubSample(sample)
    const scrubbed = value as { data: { result: string[]; list: string[] } }
    expect(scrubbed.data.result[0]).not.toBe(url)
    // 两处是同一个原值，一致性映射要让它们换成同一个假值
    expect(scrubbed.data.result[0]).toBe(scrubbed.data.list[0])
    expect(manifest.replacements.map((item) => item.path).sort()).toEqual(['data.list[]', 'data.result[]'])
  })

  it('但元素对象上的判别字段仍然受保护 —— 那是属性位置，不是元素本身', () => {
    const sample: JsonValue = { data: { items: [{ type: 'DYNAMIC_TYPE_AV', nickname: '张三' }] } }
    const scrubbed = scrub(sample) as { data: { items: { type: string; nickname: string }[] } }
    expect(scrubbed.data.items[0]!.type).toBe('DYNAMIC_TYPE_AV')
    expect(scrubbed.data.items[0]!.nickname).not.toBe('张三')
  })

  it('同一条白名单在标量上照旧生效 —— 判别字段一个字都不能动', () => {
    // 上面那条放开的只有容器。判别字段永远是标量，所以它保的东西一点没少
    const sample: JsonValue = { type: 'DYNAMIC_TYPE_AV', status: 1, code: 0, kind: 'video', result: 'ok' }
    expect(scrub(sample)).toEqual(sample)
  })

  it('容器让路之后，底下的判别字段仍然按自己那条白名单留着', () => {
    const sample: JsonValue = { status: { type: 'AV', nickname: '李四' } }
    const scrubbed = scrub(sample) as { status: { type: string; nickname: string } }
    expect(scrubbed.status.type).toBe('AV')
    expect(scrubbed.status.nickname).not.toBe('李四')
  })

  it('调用方显式传的 keep 仍然能整块保住 —— 「这一整块别动」是人做的决定', () => {
    const sample: JsonValue = { result: { mid: 11111, nickname: '张三' } }
    expect(scrub(sample, { keep: [{ key: 'result' }] })).toEqual(sample)
  })

  it('白名单压过规则，路径与键名两种写法都能用', () => {
    expect(at({ nested: { mid: 11111 } }, 'nested', { keep: [{ path: 'nested.mid' }] })).toEqual({ mid: 11111 })
  })

  it('**平台的分类与清晰度文案留着** —— 它们看着像用户内容，但换掉等于毁掉字面量收窄', () => {
    // 随 `name` 类规则收进 caption / sign / part 那一批时，这些会第一次被误伤
    const sample: JsonValue = { tname: '生活', qualityLabel: '高清', photoType: 'VIDEO', videoCodec: 'avc', display_name: '[微笑]' }
    expect(scrub(sample)).toEqual(sample)
  })

  it('B站清晰度那三个 `*_desc*` 不能被误伤 —— 所以 `desc` 规则是锚定的，不许放宽成 /desc/', () => {
    const sample: JsonValue = { new_description: '1080P 高清', display_desc: '1080P', accept_description: '高清 1080P' }
    expect(scrub(sample)).toEqual(sample)
  })
})

describe('用户内容：审计整棵样本树补上的那一批键名', () => {
  /** 每条都有实物 —— 说明写在 `DEFAULT_SCRUB_RULES` 里那条 `name` 规则的注释上 */
  const cases: readonly [string, JsonValue][] = [
    ['caption', '汤姆和杰瑞牛排与百万星空充气酒店'],
    ['sign', '我是艾尔登法环的忠实玩家'],
    ['artist', '松烟入墨'],
    ['raw_text', '这期视频讲的是响应类型自动化'],
    ['medal_name', '小电视'],
    ['part', '第一集 开场'],
    ['dynamic', '今天更新了一期新视频'],
    ['group_title', '他大爷的'],
    ['handle', '@someone'],
    ['contract_desc', '已签约三年']
  ]

  for (const [key, original] of cases) {
    it(`\`${key}\` 会被换掉（原先它静默通过，真实内容原样进了样本）`, () => {
      const scrubbed = scrub({ [key]: original }) as Record<string, string>
      expect(scrubbed[key]).not.toBe(original)
      // 同形：码点数不变，否则生成出来的类型是对的而样本是错的
      expect([...scrubbed[key]!].length).toBe([...(original as string)].length)
    })
  }
})

describe('规则配置', () => {
  it('调用方规则优先于默认规则（同一位置两条都命中时取前者）', () => {
    // 默认把 `title` 当昵称换掉；这里改成整个 redact
    expect(at({ title: '标题' }, 'title', { rules: [{ key: 'title', kind: 'redact' }] })).toBe('')
  })

  it('replaceDefaultRules 能整体换掉默认规则', () => {
    const sample: JsonValue = { nickname: '张三', mid: 11111 }
    expect(scrub(sample, { rules: [{ key: 'mid', kind: 'id' }], replaceDefaultRules: true })).toMatchObject({ nickname: '张三' })
  })

  it('空 matcher 不匹配任何东西 —— 否则一条手滑写空的规则会把整棵树换掉', () => {
    const sample: JsonValue = { anything: 'keep me', deep: { more: 'also' } }
    expect(scrub(sample, { rules: [{ kind: 'redact' }], replaceDefaultRules: true })).toEqual(sample)
  })

  it('规则命中容器时告警并继续下钻，不把对象换成空对象（那会改形状）', () => {
    const { value, manifest } = scrubSample({ author: { mid: 11111 } }, { rules: [{ key: 'author', kind: 'redact' }] })
    expect((value as { author: { mid: number } }).author.mid).not.toBe(11111)
    expect(manifest.warnings[0]).toContain('容器整体替换会改形状')
  })

  it('规则命中小数时保留原值并告警（位数怎么算都在编），且告警里不含原值', () => {
    const { value, manifest } = scrubSample({ ratio: 0.93 }, { rules: [{ key: 'ratio', kind: 'id' }] })
    expect(value).toEqual({ ratio: 0.93 })
    expect(manifest.warnings[0]).toContain('没法同形替换')
    expect(manifest.warnings[0]).not.toContain('0.93')
  })

  it('带 g 标记的正则不会因为 lastIndex 有状态而漏匹配第二次', () => {
    const result = scrub({ a: { mid: 1 }, b: { mid: 2 } }, { rules: [{ key: /mid/g, kind: 'id' }], replaceDefaultRules: true })
    expect(result).not.toMatchObject({ b: { mid: 2 } })
  })
})

describe('纯函数性质', () => {
  it('不改输入样本', () => {
    const sample = { mid: 11111, nested: { nickname: '张三' } } satisfies JsonValue
    const before = JSON.stringify(sample)
    scrubSample(sample)
    expect(JSON.stringify(sample)).toBe(before)
  })

  it('键的顺序不变（产物要提交进 git 跑 --check）', () => {
    const scrubbed = scrub({ z: 1, a: 2, m: 3 })
    expect(Object.keys(scrubbed as Record<string, JsonValue>)).toEqual(['z', 'a', 'm'])
  })

  it('数组长度不变', () => {
    expect((scrub({ list: [{ mid: 1 }, { mid: 2 }] }) as { list: unknown[] }).list).toHaveLength(2)
  })

  it('根是数组也能处理', () => {
    expect(scrub([{ mid: 11111 }])).toHaveLength(1)
  })
})
