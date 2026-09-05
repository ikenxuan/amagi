/**
 * `removeGenerated` 的那几道闸 —— `/api/generate` 敢删东西的全部依据。
 *
 * **拒绝那一侧对着真产物根断言，放过那一侧只在系统临时目录里。** 前者安全是因为闸都在碰文件系统
 * 之前；后者非要有真文件不可（要看的正是「哪一层目录被收走了」），而真删一个产物文件就是真删一个
 * 已提交的产物文件 —— `packages/response-types/src/generated/` 底下那 28 个文件正参与
 * `pnpm types:check` 的逐字节比对。`removeGenerated` 的 `root` 参数就是为这件事存在的。
 *
 * 两条最值得钉住的：
 *
 * - **barrel 在判据上就碰不到**：根 barrel 一段、平台 barrel 两段，而闸要求至少三段。
 * - **判据是解析后的路径**，不是原始字符串。原先按字符串判，`bilibili//index.ts`、`//x.ts`、
 *   `bilibili/Comments/..\..\..\index.ts` 三种写法能整个穿过去（前两条删的是 barrel、
 *   往上收的是平台目录与产物根；第三条在 Windows 上落到手写的 `src/index.ts`）。
 *
 * 第二份钉的是 `readDocSidecar` —— 「点一次生成把人写的注释全删掉」那个缺陷的修法。
 *
 * 第三份钉请求集合的读写（`WEB-API-CONSOLE-PRD.md` 三）。它与前两份反着来：**这个文件进 git**
 * （`.gitignore:55` 的 `!` 例外）、值是真的、还会被机器一条条追加。于是这一份的用例几乎全在钉
 * 「什么时候**不写**」：凭证命中不写、盘上那份没读懂不写、同 `id` 换掉那条而不是追加第二条。
 * 写错的代价在这里不可逆 —— 提交出去就收不回来。
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { DEFAULT_REQUESTS_COMMENT, type RequestEntry, REQUESTS_FORMAT } from '@ikenxuan/amagi-typegen'
import { afterEach, describe, expect, it } from 'vitest'

import { appendRequest, readDocSidecar, readRequests, removeGenerated, writeRequests } from '../server/storage'

const roots: string[] = []

/** 一个假的产物根，测完整棵删掉。里面的目录结构由每条用例自己摆 */
const scratchRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'amagi-generated-'))
  roots.push(dir)
  return dir
}

/**
 * 一个假的 corpus 根，`readDocSidecar` 的 `dir` 参数吃它。
 *
 * 「sidecar 写坏了」这类用例总得有个真文件，而真 corpus 里那 4 份 `.doc.json` 是**提交进 git 的**
 * （`.gitignore:52` 的例外），参与 `pnpm types:check` 的逐字节比对 —— 测试不该往那里面摆东西。
 */
const scratchCorpus = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'amagi-corpus-'))
  roots.push(dir)
  return dir
}

/** 摆一份 sidecar。`raw` 原样写盘 —— 「不是合法 JSON」也要测得到 */
const putSidecar = (corpus: string, platform: string, endpoint: string, raw: string): void => {
  mkdirSync(join(corpus, platform), { recursive: true })
  writeFileSync(join(corpus, platform, `${endpoint}.doc.json`), raw, 'utf8')
}

/** 摆一份请求集合，`raw` 原样写盘（同 {@link putSidecar}：坏 JSON 也要测得到） */
const putRequests = (corpus: string, platform: string, endpoint: string, raw: string): void => {
  mkdirSync(join(corpus, platform), { recursive: true })
  writeFileSync(join(corpus, platform, `${endpoint}.requests.json`), raw, 'utf8')
}

/** 盘上那份集合的**原始字节**。逐字节那几条断言要的正是它，不是解析回来的对象 */
const rawRequests = (corpus: string, platform: string, endpoint: string): string =>
  readFileSync(join(corpus, platform, `${endpoint}.requests.json`), 'utf8')

/** 一条合法记录，按 PRD 3.2 那个例子来（校验器那边的用例也是这一条） */
const request = (overrides: Partial<RequestEntry> = {}): RequestEntry => ({
  id: 'bv-single-p',
  label: '单 P 稿件',
  params: { bvid: 'BV1xx411c7mD' },
  recordedAt: '2026-09-05T06:11:00Z',
  verdict: 'ok',
  ...overrides
})

/** 摆一个文件（父目录一起建）。`relative` 用 `/` 分隔，与产物路径同一条约定 */
const put = (root: string, relative: string): void => {
  const full = join(root, ...relative.split('/'))
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, '// 假产物\n', 'utf8')
}

/** 盘上还在不在。`relative` 同样是 `/` 分隔 */
const there = (root: string, relative: string): boolean => existsSync(join(root, ...relative.split('/')))

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true })
})

describe('产物清理只碰端点自己的目录', () => {
  it('**根 barrel 与平台 barrel 删不掉** —— 少于三段一律拒', () => {
    expect(() => removeGenerated('index.ts')).toThrow('拒绝删除')
    expect(() => removeGenerated('bilibili/index.ts')).toThrow('拒绝删除')
  })

  it('非 `.ts` 一律拒 —— 产物树里只该有 TypeScript', () => {
    expect(() => removeGenerated('bilibili/Comments/notes.md')).toThrow('拒绝删除')
    expect(() => removeGenerated('bilibili/Comments/../../../secrets.json')).toThrow('拒绝删除')
  })

  it('路径里带 `..` 一律拒，哪怕结尾是 `.ts`', () => {
    expect(() => removeGenerated('bilibili/Comments/../../../../evil.ts')).toThrow('拒绝删除')
    expect(() => removeGenerated('../../evil.ts')).toThrow('拒绝删除')
  })

  it('报错文案说清了范围 —— 这条会被人在日志里读到', () => {
    expect(() => removeGenerated('index.ts')).toThrow('<平台>/<Endpoint>/')
  })
})

describe('闸判的是解析后的路径，不是原始字符串', () => {
  // 这几条的叶子名一律是**不存在的**探针（`__probe__.ts`），刻意的：闸放它过去时下一句就是
  // 真的 `rmSync`，拿 `bilibili/index.ts` 当靶子的话，跑一次测试就把平台 barrel 删了 ——
  // 而那 28 个产物文件正参与 `pnpm types:check` 的逐字节比对。
  it('**空段一律拒** —— `bilibili//x.ts` 按 `/` 切也是三段，中间那段是空串，`join` 之后它就没了', () => {
    expect(() => removeGenerated('bilibili//__probe__.ts')).toThrow('拒绝删除')
  })

  it('**产物根自己也拒** —— `//x.ts` 同样切出三段，而它归一化之后只剩一段', () => {
    expect(() => removeGenerated('//__probe__.ts')).toThrow('拒绝删除')
  })

  it('**反斜杠一律拒** —— 按 `/` 切的时候它不算分隔符，于是 `..` 那道检查在 Windows 上形同虚设', () => {
    expect(() => removeGenerated('bilibili/Comments/..\\..\\..\\__probe__.ts')).toThrow('拒绝删除')
  })

  it('**拒之前一个字节都不动** —— 三条穿透用它们真正的靶子名再验一遍（临时根，删得起）', () => {
    const root = scratchRoot()
    put(root, 'bilibili/Comments/Comments_V0.ts')
    put(root, 'bilibili/index.ts')
    put(root, 'index.ts')
    // 这三个字符串在原先的判据下全部放行：前两个删的是平台 barrel 与根下的 `index.ts`，
    // 第三个靠反斜杠把 `..` 藏过检查。现在它们抛，而且抛在碰文件系统之前
    expect(() => removeGenerated('bilibili//index.ts', root)).toThrow('拒绝删除')
    expect(() => removeGenerated('//index.ts', root)).toThrow('拒绝删除')
    expect(() => removeGenerated('bilibili/Comments/..\\..\\index.ts', root)).toThrow('拒绝删除')
    expect(there(root, 'bilibili/index.ts')).toBe(true)
    expect(there(root, 'index.ts')).toBe(true)
    expect(there(root, 'bilibili/Comments/Comments_V0.ts')).toBe(true)
  })
})

describe('放过的那一侧：往上收到哪一层为止（临时目录，不碰真产物）', () => {
  it('**最浅收到 `<平台>/<Endpoint>`** —— 平台 barrel 与根 barrel 一个都不许动', () => {
    const root = scratchRoot()
    put(root, 'bilibili/Comments/Comments_V0.ts')
    put(root, 'bilibili/index.ts')
    put(root, 'index.ts')
    removeGenerated('bilibili/Comments/Comments_V0.ts', root)
    expect(there(root, 'bilibili/Comments')).toBe(false)
    expect(there(root, 'bilibili/index.ts')).toBe(true)
    expect(there(root, 'index.ts')).toBe(true)
    // 平台目录本身也留着 —— 它底下还有别的端点
    expect(there(root, 'bilibili')).toBe(true)
  })

  it('端点目录里还有别的文件时一层都不收 —— `rmdirSync` 对非空目录失败，这正是想要的行为', () => {
    const root = scratchRoot()
    put(root, 'bilibili/Comments/Comments_V0.ts')
    put(root, 'bilibili/Comments/index.ts')
    removeGenerated('bilibili/Comments/Comments_V0.ts', root)
    expect(there(root, 'bilibili/Comments/Comments_V0.ts')).toBe(false)
    expect(there(root, 'bilibili/Comments/index.ts')).toBe(true)
    expect(there(root, 'bilibili/Comments')).toBe(true)
  })

  it('取值那一层空了也收，收到端点目录停 —— 布局翻转（`<取值>/…`）之后的残留走这条', () => {
    const root = scratchRoot()
    put(root, 'bilibili/Comments/note-1/Comments_V0.ts')
    removeGenerated('bilibili/Comments/note-1/Comments_V0.ts', root)
    expect(there(root, 'bilibili/Comments/note-1')).toBe(false)
    expect(there(root, 'bilibili/Comments')).toBe(false)
    expect(there(root, 'bilibili')).toBe(true)
  })

  it('文件本来就不在也不抛 —— `force: true`，清理这个动作是幂等的', () => {
    const root = scratchRoot()
    put(root, 'bilibili/Comments/index.ts')
    expect(() => removeGenerated('bilibili/Comments/gone.ts', root)).not.toThrow()
    expect(there(root, 'bilibili/Comments/index.ts')).toBe(true)
  })
})

describe('注释 sidecar：界面上点一次生成不该把人写的说明删掉', () => {
  it('**真 corpus 里那份读得出来** —— `.doc.json` 进了 git，所以这条在 CI 上也有效', () => {
    const { sidecar, issues } = readDocSidecar('bilibili', 'videoInfo')
    expect(issues).toEqual([])
    // 这条是这批注释里最贵的一句：`cid` 与 `aid` 长得一样，拿错会请求到别的东西。
    // 它曾经因为 `/api/generate` 不读 sidecar 而在产物里整批消失
    expect(sidecar?.paths['data.cid']).toContain('分P 的 ID，不是稿件的')
  })

  it('没有 `.doc.json` 是正常状态 —— 回 `undefined` 且不报问题（多数端点还没人写说明）', () => {
    expect(readDocSidecar('bilibili', 'videoInfo', scratchCorpus())).toEqual({ sidecar: undefined, issues: [] })
  })

  it('**JSON 写坏了要指名文件** —— 一个尾逗号让全部注释静默失效，而现象只是「跟 types:check 不一致」', () => {
    const corpus = scratchCorpus()
    putSidecar(corpus, 'bilibili', 'videoInfo', '{ "paths": { "data.cid": "分P 的 ID" }, }')
    const { sidecar, issues } = readDocSidecar('bilibili', 'videoInfo', corpus)
    expect(sidecar).toBeUndefined()
    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain('corpus/bilibili/videoInfo.doc.json')
    expect(issues[0]).toContain('注释一条都没注入')
  })

  it('写错一条不让整份失效 —— 好的注释照样注入，问题逐条上报且带上文件名', () => {
    const corpus = scratchCorpus()
    putSidecar(corpus, 'douyin', 'videoWork', JSON.stringify({ oops: 1, paths: { 'data.aid': '稿件 ID', 'data.bad': '' } }))
    const { sidecar, issues } = readDocSidecar('douyin', 'videoWork', corpus)
    expect(sidecar?.paths['data.aid']).toBe('稿件 ID')
    // 未知键一条、空注释一条。前缀统一带文件名 —— 这些会原样进 `GenerateResult.warnings` 给人看
    expect(issues).toHaveLength(2)
    expect(issues.every((issue) => issue.startsWith('corpus/douyin/videoWork.doc.json：'))).toBe(true)
  })
})

describe('请求集合：读盘的三种状态分开', () => {
  it('**没有这个文件 = 正常状态**：回一个带默认 `$comment` 的空集合，一条 issue 都没有', () => {
    const { collection, issues } = readRequests('bilibili', 'videoInfo', scratchCorpus())
    expect(issues).toEqual([])
    // `$comment` 从一开始就在里面：第一次追加写出去的文件自带「值是真值、只放公开内容、
    // 凭证永不进」那三句 —— 改这个 JSON 的人手上通常只有那个 JSON
    expect(collection).toEqual({
      $comment: DEFAULT_REQUESTS_COMMENT,
      version: REQUESTS_FORMAT,
      endpoint: 'bilibili/videoInfo',
      requests: []
    })
  })

  it('**JSON 写坏了要指名文件**，绝不静默当成「这个端点没有请求」', () => {
    const corpus = scratchCorpus()
    putRequests(corpus, 'bilibili', 'videoInfo', '{ "version": 1, "requests": [], }')
    const { collection, issues } = readRequests('bilibili', 'videoInfo', corpus)
    expect(collection.requests).toEqual([])
    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain('corpus/bilibili/videoInfo.requests.json')
    expect(issues[0]).toContain('一条都没读进来')
  })

  it('坏一条不让整份失效 —— 好的那条照收，坏的那条被指名且带文件名前缀', () => {
    const corpus = scratchCorpus()
    putRequests(
      corpus,
      'bilibili',
      'videoInfo',
      JSON.stringify({ version: REQUESTS_FORMAT, endpoint: 'bilibili/videoInfo', requests: [request(), { id: 'no-label' }] })
    )
    const { collection, issues } = readRequests('bilibili', 'videoInfo', corpus)
    expect(collection.requests.map((item) => item.id)).toEqual(['bv-single-p'])
    expect(issues).toHaveLength(1)
    expect(issues[0]!.startsWith('corpus/bilibili/videoInfo.requests.json：')).toBe(true)
  })
})

describe('请求集合：追加的幂等性判据是 `id`', () => {
  it('第一条追加进去，返回的是仓库相对路径（人要能拿它去 `git status` 里找）', () => {
    const corpus = scratchCorpus()
    const { path, collection, issues, replaced } = appendRequest('bilibili', 'videoInfo', request(), corpus)
    expect(issues).toEqual([])
    expect(replaced).toBe(false)
    expect(path).toBe('corpus/bilibili/videoInfo.requests.json')
    expect(collection.requests.map((item) => item.id)).toEqual(['bv-single-p'])
    expect(readRequests('bilibili', 'videoInfo', corpus).collection.requests).toHaveLength(1)
  })

  it('**同 `id` 两次 → 一条、`replaced: true`**，而且是就地换掉（`id` 是产物的目录名与类型名）', () => {
    const corpus = scratchCorpus()
    appendRequest('bilibili', 'videoInfo', request(), corpus)
    appendRequest('bilibili', 'videoInfo', request({ id: 'bv-multi-p', label: '多 P 稿件' }), corpus)
    const again = appendRequest('bilibili', 'videoInfo', request({ label: '单 P 稿件（改了说明）' }), corpus)
    expect(again.replaced).toBe(true)
    expect(again.issues).toEqual([])
    // 追加成第二条的话，下一次读这个文件会因为撞名把**两条一起丢**（校验器对撞名是整条拒收的）
    const { collection, issues } = readRequests('bilibili', 'videoInfo', corpus)
    expect(issues).toEqual([])
    expect(collection.requests.map((item) => item.id)).toEqual(['bv-single-p', 'bv-multi-p'])
    expect(collection.requests[0]!.label).toBe('单 P 稿件（改了说明）')
  })

  it('round-trip 逐字节稳定：写出来 → 读回来 → 再写一遍，两次的字节完全相同', () => {
    const corpus = scratchCorpus()
    appendRequest('bilibili', 'videoInfo', request(), corpus)
    appendRequest('bilibili', 'videoInfo', request({ id: 'deleted', verdict: 'reject:empty', note: '拿回 code -404' }), corpus)
    const first = rawRequests(corpus, 'bilibili', 'videoInfo')
    writeRequests('bilibili', 'videoInfo', readRequests('bilibili', 'videoInfo', corpus).collection, corpus)
    expect(rawRequests(corpus, 'bilibili', 'videoInfo')).toBe(first)
    // 行尾 LF、结尾一个换行：这个文件被机器一条条追加，行尾不归一的话 Windows 上
    // 「加一条记录」的 diff 会变成整文件重写，review 时看不出改了什么
    expect(first.endsWith('\n')).toBe(true)
    expect(first.includes('\r')).toBe(false)
  })
})

describe('请求集合：凭证一个字都不许进（这个文件进 git，提交出去就收不回来）', () => {
  it('**顶层凭证键 → 整条不收，而且盘上压根没建文件**', () => {
    const corpus = scratchCorpus()
    const { issues, replaced } = appendRequest('bilibili', 'videoInfo', request({ params: { bvid: 'BV1', cookie: 'SESSDATA=x' } }), corpus)
    expect(replaced).toBe(false)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain('cookie')
    expect(issues[0]).toContain('像凭证')
    // 值一个字都不许出现在报错里 —— 这句话会被贴进 issue、聊天、日志
    expect(issues[0]).not.toContain('SESSDATA=x')
    expect(existsSync(join(corpus, 'bilibili', 'videoInfo.requests.json'))).toBe(false)
  })

  it('**嵌套着的也拒**，报的是路径 —— 只查顶层的话 `{ headers: { cookie } }` 这种形状就漏了', () => {
    const corpus = scratchCorpus()
    const params = { bvid: 'BV1', headers: { cookie: 'SESSDATA=x' } }
    const { issues } = appendRequest('bilibili', 'videoInfo', request({ params }), corpus)
    expect(issues[0]).toContain('headers.cookie')
    expect(issues[0]).not.toContain('SESSDATA=x')
  })

  it('**被拒时盘上那份一个字节都没变** —— 已经有一条好记录的情况下更要紧', () => {
    const corpus = scratchCorpus()
    appendRequest('bilibili', 'videoInfo', request(), corpus)
    const before = rawRequests(corpus, 'bilibili', 'videoInfo')
    const rejected = appendRequest('bilibili', 'videoInfo', request({ id: 'with-token', params: { access_token: 'x' } }), corpus)
    expect(rejected.issues).toHaveLength(1)
    expect(rawRequests(corpus, 'bilibili', 'videoInfo')).toBe(before)
    // 回的是**盘上那一份**（没动过），而不是「假装追加成功了」的那一份
    expect(rejected.collection.requests.map((item) => item.id)).toEqual(['bv-single-p'])
  })

  it('校验器拒收的别的理由也走同一条路（空 label / 坏 `recordedAt`）—— 要么整条写进去，要么一个字节不动', () => {
    const corpus = scratchCorpus()
    expect(appendRequest('bilibili', 'videoInfo', request({ label: '  ' }), corpus).issues).toHaveLength(1)
    expect(appendRequest('bilibili', 'videoInfo', request({ recordedAt: '2026-09-05 06:11' }), corpus).issues).toHaveLength(1)
    expect(existsSync(join(corpus, 'bilibili', 'videoInfo.requests.json'))).toBe(false)
  })
})

describe('请求集合：没读懂的文件不许覆盖', () => {
  it('**盘上是坏 JSON → 拒绝追加，人手写的那几行原样还在**（写回去等于替人把它们删了）', () => {
    const corpus = scratchCorpus()
    const broken = '{ "version": 1, "endpoint": "bilibili/videoInfo", "requests": [ { "id": "手写的" } ], }'
    putRequests(corpus, 'bilibili', 'videoInfo', broken)
    const { issues, replaced } = appendRequest('bilibili', 'videoInfo', request(), corpus)
    expect(replaced).toBe(false)
    expect(issues[0]).toContain('不是合法 JSON')
    expect(rawRequests(corpus, 'bilibili', 'videoInfo')).toBe(broken)
  })

  it('坏条目也拦 —— 校验器会把那条丢掉，写回去就是把它从 git 里悄悄删掉', () => {
    const corpus = scratchCorpus()
    const raw = JSON.stringify({ version: REQUESTS_FORMAT, endpoint: 'bilibili/videoInfo', requests: [{ id: 'no-label' }] })
    putRequests(corpus, 'bilibili', 'videoInfo', raw)
    expect(appendRequest('bilibili', 'videoInfo', request(), corpus).issues).toHaveLength(1)
    expect(rawRequests(corpus, 'bilibili', 'videoInfo')).toBe(raw)
  })
})
