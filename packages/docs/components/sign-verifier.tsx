'use client'

import { decodeUrl, recoverSignedQuery, structureError } from '@ikenxuan/amagi/signing'
import { useMemo, useState } from 'react'

/**
 * 签名验证器 —— 文档站里跑的就是 `@ikenxuan/amagi/signing` 那一份代码。
 *
 * 不另写一份解码逻辑是有意的：这个页面存在的意义就是证明**实现**还是对的，
 * 如果页面自带一份，它证明的只是页面自己。`signing` 入口整条依赖链不引用任何
 * Node 内置模块，所以同一份代码在浏览器里能直接跑。
 *
 * ## 界面只回答一个问题
 *
 * 「这份签名对不对」。所以版式是结论先行：
 *
 * 1. 一句话结论（是不是有效的 a_bogus）
 * 2. 三行证据（盐值 / query 链 / UA 链），每行一个判定
 * 3. 其余一切都折叠起来
 *
 * 中间那三行是重点。之前把它们埋在 16 行字段表后面，读者得先翻过一堆
 * `env_flags` / `call_bucket` 才看得到「对不上」——那是把工具当调试器用，
 * 而它首先是个判断题。
 */

/** 一份真实浏览器捕获，用作预填示例。与 oracle 测试用的是同一份 fixture */
const DEMO = {
  query:
    'device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=7372484719365098803&pc_client_type=1&version_code=190500&version_name=19.5.0&cookie_enabled=true&screen_width=1920&screen_height=1080&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=130.0.0.0&browser_online=true&engine_name=Blink&engine_version=130.0.0.0&os_name=Windows&os_version=10&cpu_core_num=8&device_memory=8&platform=PC',
  aBogus:
    'QyUVhFWEmq5nFd/tmcJuHtnlDFgMNTSySTi2WjKPyOu8LheY58Pe/PGbaxLLshEybbBzho372xMAYEdcpUUhp9HpLmkkuBGSCGVc960Lhqw4G0kQLHb0euvzowMxUcGqaAV4ilU6gUrogfxAkHdm/dl9yKoK5bWBPZOWk/ucE9sg1MyAgpnePpbdOhPxUJOf',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
}

const DEMO_URL = `https://www.douyin.com/aweme/v1/web/aweme/detail/?${DEMO.query}&a_bogus=${encodeURIComponent(DEMO.aBogus)}`

const PROBLEM_LABEL: Record<string, string> = {
  alphabet: '含有不属于该字母表的字符',
  'length not a multiple of four': '长度不是 4 的倍数',
  'payload too short': '载荷太短，放不下五十个标量',
  'header magic': 'header 魔数不符（真实签名前两字节恒为 3, 82）',
  'sdk version': 'SDK 版本块不符',
  'frame too short': '帧太短',
  'declared lengths overrun the frame': '声明的长度超出帧',
  'declared lengths leave a tail': '声明的长度之外还剩下多余字节',
  checksum: '校验和不符 —— 不是这套算法装配出来的'
}

/** 一个判定行：左边是项目名，中间是一句人话，右边是结论 */
const Verdict = ({ label, ok, children }: { label: string; ok: boolean; children: React.ReactNode }) => (
  <div className="flex items-baseline gap-3 border-t border-fd-border py-2 first:border-t-0">
    <span className="w-24 shrink-0 text-sm font-medium">{label}</span>
    <span className="flex-1 text-sm text-fd-muted-foreground">{children}</span>
    <span className={`shrink-0 text-sm font-semibold ${ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {ok ? '✓' : '✗'}
    </span>
  </div>
)

interface Outcome {
  fatal?: string
  signature?: string
  decoded?: ReturnType<typeof decodeUrl>[number]
  recovery?: ReturnType<typeof recoverSignedQuery>
  salt?: string
}

const analyse = (rawInput: string, userAgent: string): Outcome => {
  const input = rawInput.trim()
  if (!input) return { fatal: '先贴一条已签名的 URL，或一个 a_bogus 值。' }

  let signature = input
  let url: string | null = null

  if (/^https?:\/\//i.test(input)) {
    url = input
    const found = new URL(input).searchParams.get('a_bogus')
    if (found === null) return { fatal: '这条 URL 里没有 a_bogus 参数。' }
    signature = decodeURIComponent(found)
  }

  const problem = structureError(signature)
  if (problem !== null) {
    return { fatal: `这串值不是格式良好的 a_bogus：${PROBLEM_LABEL[problem] ?? problem}` }
  }

  // URL 上带的才做重建；只贴一个签名值时无从重建，也就无法校验 query 链
  const recovery = url ? recoverSignedQuery(signature, url) : null
  const decoded = url ? decodeUrl(url, { userAgent: userAgent.trim() || undefined })[0] : undefined

  return { signature, decoded, recovery: recovery ?? undefined, salt: recovery?.salt }
}

export function SignVerifier() {
  const [input, setInput] = useState(DEMO_URL)
  const [userAgent, setUserAgent] = useState(DEMO.userAgent)
  const [submitted, setSubmitted] = useState<{ input: string; userAgent: string }>({ input: DEMO_URL, userAgent: DEMO.userAgent })

  const outcome = useMemo(() => analyse(submitted.input, submitted.userAgent), [submitted])

  const chain = (name: string) => outcome.decoded?.checks.find((item) => item.name === name)?.status
  const queryOk = chain('query') === 'match'
  const uaOk = chain('user_agent') === 'match'
  const hasSignedQuery = Boolean(outcome.recovery)

  const field = (label: string, value: string, onChange: (next: string) => void, mono = false) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className={`rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-sm outline-none focus:border-fd-primary ${mono ? 'font-mono text-xs' : ''}`}
      />
    </label>
  )

  return (
    <div className="not-prose my-6 flex flex-col gap-4 rounded-xl border border-fd-border bg-fd-card p-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">已签名的 URL（或一个单独的 a_bogus 值）</span>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          spellCheck={false}
          rows={3}
          className="w-full resize-y rounded-lg border border-fd-border bg-fd-background px-3 py-2 font-mono text-xs outline-none focus:border-fd-primary"
        />
      </div>

      {field('User-Agent（校验 UA 链需要）', userAgent, setUserAgent, true)}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubmitted({ input, userAgent })}
          className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
        >
          验证
        </button>
        <button
          type="button"
          onClick={() => {
            setInput(DEMO_URL)
            setUserAgent(DEMO.userAgent)
            setSubmitted({ input: DEMO_URL, userAgent: DEMO.userAgent })
          }}
          className="rounded-lg border border-fd-border px-4 py-2 text-sm font-medium transition-colors hover:bg-fd-muted"
        >
          载入真实捕获示例
        </button>
      </div>

      {outcome.fatal ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {outcome.fatal}
        </p>
      ) : (
        <div className="flex flex-col">
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400">
            这是一份有效的 a_bogus —— 校验和通过，说明它是由真正的那套算法装配出来的。
          </p>

          <div className="mt-3 flex flex-col">
            <Verdict label="盐值" ok={hasSignedQuery}>
              {hasSignedQuery ? (
                <>
                  签名用的是 <code className="font-mono">{outcome.salt}</code>
                </>
              ) : (
                '只贴了签名值，没有 URL 就无从判定（签名封住的是 query 的摘要）'
              )}
            </Verdict>

            <Verdict label="query 链" ok={queryOk}>
              {hasSignedQuery
                ? `签名覆盖的就是这条 URL 的 query（保留了 ${outcome.recovery?.kept.join('、') || '——'}）`
                : '需要一个完整 URL 才能重建签名覆盖的那条 query'}
            </Verdict>

            <Verdict label="UA 链" ok={uaOk}>
              {uaOk ? '与上面的 User-Agent 一致' : '对不上 —— 换个 User-Agent 试试，签名时的那个才作数'}
            </Verdict>
          </div>

          <details className="mt-3 rounded-lg border border-fd-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              还原出的 {outcome.decoded?.fields.length ?? 0} 个字段
            </summary>
            <div className="overflow-x-auto px-3 pb-3">
              <table className="w-full text-left text-xs">
                <tbody>
                  {outcome.decoded?.fields.map((item) => (
                    <tr key={item.name} className="border-t border-fd-border align-top">
                      <td className="whitespace-nowrap py-1 pr-3 font-mono">{item.name}</td>
                      <td className="break-all py-1 pr-3 font-mono">{item.value}</td>
                      <td className="py-1 text-fd-muted-foreground">{item.detail ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
