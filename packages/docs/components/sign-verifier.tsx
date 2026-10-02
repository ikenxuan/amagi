'use client'

import {
  av2bv,
  bv2av,
  computeWbiSignature,
  decodeKuaishouHe,
  decodeUrl,
  decodeVerifyFp,
  decodeXBogus,
  DOUYIN_MS_TOKEN_LENGTH,
  DOUYIN_MS_TOKEN_SIZES,
  extractWbiKey,
  inspectXhsHeader,
  MS_TOKEN_ALPHABET,
  recoverSignedQuery,
  signSecsdkWebQuery,
  structureError,
  xBogusStructureError
} from '@ikenxuan/amagi/signing'
import { Check, ChevronDown, CircleAlert, CircleCheck, CircleX, ClipboardPaste, Copy, Eraser, FlaskConical } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * 签名验证器 —— 文档站里跑的就是 `@ikenxuan/amagi/signing` 那份代码。
 *
 * 不另写一份解码逻辑是有意的：这个页面存在的意义就是证明**实现**还是对的，
 * 如果页面自带一份，它证明的只是页面自己。整条依赖链不引用任何 Node 内置模块
 * （小红书的算法本体除外 —— 它在 `@ikenxuan/xhshow-ts` 里，进不了浏览器，所以
 * 那个板块只有形状检查），同一份代码在浏览器里直接跑。
 *
 * ## 交互设计
 *
 * 这是给「贴一段抓包、立刻知道对不对」用的，所以：
 *
 * - **结论即时给出**：没有「验证」按钮 —— 输入变了判定就变，对确定性算法来说
 *   按钮只是多余的一次点击。
 * - **输入区要大**：签名 URL 四百多字符，主输入框给足行数、等宽字号不小，右上角
 *   常驻「粘贴 / 清空」，键盘党与手机都不用跟小框较劲。
 * - **可复制的值**：盐值、时钟、`w_rid` 这类要拿走比对的值，点一下进剪贴板。
 * - **输入与判定分区**：上面只管贴，下面只管判，中间不混排。
 */

/* ------------------------------------------------------------------ */
/* 演示数据                                                             */
/* ------------------------------------------------------------------ */

/** 抖音 a_bogus：一份真实浏览器捕获（bdms 1.0.1.19-fix.01，2026-09-09），与 oracle 测试同一份 fixture */
const A_BOGUS_DEMO = {
  query:
    'device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=7372484719365098803&pc_client_type=1&version_code=190500&version_name=19.5.0&cookie_enabled=true&screen_width=1920&screen_height=1080&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=130.0.0.0&browser_online=true&engine_name=Blink&engine_version=130.0.0.0&os_name=Windows&os_version=10&cpu_core_num=8&device_memory=8&platform=PC',
  aBogus:
    'QyUVhFWEmq5nFd/tmcJuHtnlDFgMNTSySTi2WjKPyOu8LheY58Pe/PGbaxLLshEybbBzho372xMAYEdcpUUhp9HpLmkkuBGSCGVc960Lhqw4G0kQLHb0euvzowMxUcGqaAV4ilU6gUrogfxAkHdm/dl9yKoK5bWBPZOWk/ucE9sg1MyAgpnePpbdOhPxUJOf',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
}

/** 一次捕获里的公共 UA。其余平台的演示值都钉在这次捕获（1789010742）上，方便对照 */
const CAPTURE_UA = A_BOGUS_DEMO.userAgent

/** X-Bogus / secsdk 的演示 URL —— 与 a_bogus 捕获同一条接口、同一条 query */
const DEMO_PATH_QUERY = `/aweme/v1/web/aweme/detail/?${A_BOGUS_DEMO.query}`

/** X-Bogus：本实现对钉死的时钟重签（仓库里没有浏览器产出的 X-Bogus 捕获） */
const X_BOGUS_DEMO = 'DFSzswVY0YiANnNpCv-qIl9WX7jf'

/** secsdk：管线产物 = query + uifid + timestamp + 签名（钉死时钟与 uifid） */
const SECSDK_DEMO_URL =
  'https://www.douyin.com/aweme/v1/web/aweme/detail/?' +
  A_BOGUS_DEMO.query +
  '&uifid=CPnD8tLSGgwpG5xBFRKhAg%3D%3D&timestamp=1789010742&x-secsdk-web-signature=0755164b330e01ea5c73997847b54153'

/** verify_fp：本实现产出（时钟钉在捕获时刻，随机源钉死） */
const VERIFY_FP_DEMO = 'verify_mtuyszmn_sXO0wzX4_aH4c_4Yc9_8vI4_fzEXTYO1u0LL'

/** B站 wbi：keys 取自一次真实的 /nav（与 wbi 测试同一组），wts 钉死 */
const WBI_DEMO = {
  url: 'https://api.bilibili.com/x/v2/reply/wbi/main?oid=1&type=1&wts=1767322445&w_rid=17538c4a0816856205e41478a30d060b',
  imgKey: '7cd084941338484aae1ad9425b84077c',
  subKey: '4932caff0ff746eab6f01bf08b70ac45'
}

/** 快手：本实现对钉死输入的完整产出（HUDR_ + $HE_）。HUDR 段拆不开，$HE_ 段整段可读 */
const KUAISHOU_DEMO =
  'HUDR_sFnX-DtsAUFXsbDPLXTMP-sktis6c8czjyY.$HE_e4fb620604c0f1e29384b55050505050d0aeafafafae12370315bd758c1907f2bcee0fae34f99175d4f99147af'

/** 小红书：XYW_（2026-03 之后数据接口必用）与一套配套头。值是本实现产出 */
const XHS_DEMO = {
  xs: 'XYW_eyJzaWduU3ZuIjoiNTYiLCJzaWduVHlwZSI6IngyIiwiYXBwSWQiOiJ4aHMtcGMtd2ViIiwic2lnblZlcnNpb24iOiIxIiwicGF5bG9hZCI6IjIwYThmNmRkMjI3NjJiODQ2YjgyZDljZGY1YzVkYTkxM2NmYjg2ZWRkNzE5ODU5ZThjODdiMTRkNDZkMDJjMWQzZDE1MmI0ZDgyOWZmOWQzODdlMGMxY2I5OTRkYWU3YmUyZGU3NjFmZjUxYWNjMGRhZDQwNjIxNDhmZTYzYWIwZmFhZDYzZjJiMTgyYTRiZjk3ZjgxNzM1MGQxMDY4OGZkODQxOWUzZGIzMGUyNmY0YmVlZTEzYWFlMDllYjAxZWZhOTk2MTgxNjA0ODk3YzJiNDlkYzIwYTM0NmIzOWM4MmMxMmRkMTU3NDQ4OWUzZjVkMjFlMWIxMWU3NWU2YzQ4ZWM2NDA2YTdjMmE5ZmRlMzNiNzc0Yzc3YjkyZmEzNjhjODM4MjFmNzUyZjkzZjc1MTBiMDk1NDg0YWViYTZlZjNlMDA3OGY1N2ZlMGRmZWU0NjI2ODg4ZjQ0OWVjYWY2NmQ4MzQ4MDUxYTBiNzdkMDE1NWJlNWJjMWU0NmYxOCJ9',
  xsCommon:
    '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',
  xt: '1789010742000',
  xray: 'd07f2b7a5449b1b10fcac52d380bfe24',
  b3: '5e6e67720055be07'
}

/* ------------------------------------------------------------------ */
/* 共享 UI 原语                                                          */
/* ------------------------------------------------------------------ */

/** 毫秒时钟 → ISO；解析不了就原样返回数字 */
const instant = (ms: number): string => {
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? String(ms) : date.toISOString().replace('.000Z', 'Z')
}

/** 点击复制的行内值 —— 盐值、时钟、w_rid 这类要拿走比对的值 */
const CopyValue = ({ value, children }: { value: string; children?: React.ReactNode }) => {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      title="点击复制"
      onClick={() => {
        navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
          .catch(() => {})
      }}
      className="group inline-flex max-w-full items-baseline gap-1 text-left align-baseline"
    >
      <code className="break-all font-mono">{children ?? value}</code>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 self-center text-green-600 dark:text-green-400" aria-label="已复制" />
      ) : (
        <Copy
          className="h-3.5 w-3.5 shrink-0 self-center text-fd-muted-foreground opacity-50 transition-opacity group-hover:opacity-100"
          aria-label="复制"
        />
      )}
    </button>
  )
}

/** 分区标签：「签名输入」/「判定」 */
const ZoneLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold tracking-wide text-fd-muted-foreground">{children}</p>
)

/** 主输入框：给足行数的等宽 textarea，右上角常驻粘贴 / 清空 */
const MainInput = ({
  label,
  value,
  onChange,
  rows = 5,
  placeholder
}: {
  label: string
  value: string
  onChange: (next: string) => void
  rows?: number
  placeholder?: string
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-sm font-medium">{label}</span>
    <div className="relative">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-fd-border bg-fd-background px-3.5 py-3 pr-24 font-mono text-sm leading-relaxed shadow-sm outline-none transition-colors placeholder:text-fd-muted-foreground/60 focus:border-fd-primary focus:ring-2 focus:ring-fd-primary/20"
      />
      <div className="absolute right-2.5 top-2.5 flex gap-1">
        <button
          type="button"
          title="粘贴（替换全部内容）"
          aria-label="粘贴"
          onClick={() => {
            navigator.clipboard
              ?.readText()
              .then((text) => {
                if (text) onChange(text)
              })
              .catch(() => {})
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-fd-border bg-fd-background text-fd-muted-foreground shadow-sm transition-colors hover:bg-fd-muted hover:text-fd-foreground"
        >
          <ClipboardPaste className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="清空"
          aria-label="清空"
          onClick={() => onChange('')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-fd-border bg-fd-background text-fd-muted-foreground shadow-sm transition-colors hover:bg-fd-muted hover:text-fd-foreground"
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>
    </div>
  </label>
)

/** 单行输入框 */
const TextField = ({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-sm font-medium">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
      placeholder={placeholder}
      className="w-full rounded-xl border border-fd-border bg-fd-background px-3.5 py-2.5 font-mono text-sm shadow-sm outline-none transition-colors placeholder:text-fd-muted-foreground/60 focus:border-fd-primary focus:ring-2 focus:ring-fd-primary/20"
    />
  </label>
)

/** 「载入示例」—— 大按钮 + 右侧说明 */
const DemoButton = ({ onClick, hint }: { onClick: () => void; hint?: string }) => (
  <div className="flex flex-wrap items-center gap-3">
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-fd-border bg-fd-background px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-fd-muted"
    >
      <FlaskConical className="h-4 w-4 text-fd-muted-foreground" />
      载入示例
    </button>
    {hint ? <span className="text-xs leading-relaxed text-fd-muted-foreground">{hint}</span> : null}
  </div>
)

/** 结论横幅：绿 = 通过，红 = 不通过，灰 = 还没有可判定的输入 */
const Banner = ({ tone, children }: { tone: 'ok' | 'error' | 'neutral'; children: React.ReactNode }) => {
  const styles = {
    ok: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
    error: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
    neutral: 'border-fd-border bg-fd-muted/40 text-fd-muted-foreground'
  } as const
  const icons = {
    ok: <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" />,
    error: <CircleX className="mt-0.5 h-5 w-5 shrink-0" />,
    neutral: <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
  } as const

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${styles[tone]}`}>
      {icons[tone]}
      <p className="text-sm font-medium leading-relaxed">{children}</p>
    </div>
  )
}

/** 一行证据：图标 + 项目名 + 人话 */
const Verdict = ({ label, ok, children }: { label: string; ok: boolean; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 px-4 py-3.5">
    {ok ? (
      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" aria-label="通过" />
    ) : (
      <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-label="不通过" />
    )}
    <span className="w-24 shrink-0 text-sm font-medium sm:w-28">{label}</span>
    <span className="min-w-0 flex-1 text-sm leading-relaxed text-fd-muted-foreground">{children}</span>
  </div>
)

/** 没有判定、只有信息的行（「根本没被计算」的值） */
const Info = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 px-4 py-3.5">
    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-fd-muted-foreground" aria-hidden />
    <span className="w-24 shrink-0 text-sm font-medium sm:w-28">{label}</span>
    <span className="min-w-0 flex-1 text-sm leading-relaxed text-fd-muted-foreground">{children}</span>
  </div>
)

/** 证据行的容器：整块一个边框，行间用分隔线 */
const Rows = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-hidden rounded-xl border border-fd-border [&>*:not(:first-child)]:border-t [&>*:not(:first-child)]:border-fd-border">
    {children}
  </div>
)

/** 折叠的字段表（拆解出的全部明文） */
const FieldsTable = ({ fields }: { fields: { name: string; value: string; detail?: string | null }[] }) => (
  <details className="group overflow-hidden rounded-xl border border-fd-border">
    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-fd-muted/50 [&::-webkit-details-marker]:hidden">
      还原出的 {fields.length} 个字段
      <ChevronDown className="h-4 w-4 text-fd-muted-foreground transition-transform group-open:rotate-180" />
    </summary>
    <div className="overflow-x-auto border-t border-fd-border px-4 pb-4 pt-1">
      <table className="w-full text-left text-xs">
        <tbody>
          {fields.map((item) => (
            <tr key={item.name} className="border-t border-fd-border/60 align-top first:border-t-0">
              <td className="whitespace-nowrap py-2 pr-4 font-mono">{item.name}</td>
              <td className="break-all py-2 pr-4 font-mono">{item.value}</td>
              <td className="py-2 text-fd-muted-foreground">{item.detail ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </details>
)

/** 输入为空时的中性占位（不是错误，别拿红色吓人） */
const Empty = ({ children }: { children: React.ReactNode }) => <Banner tone="neutral">{children}</Banner>

/* ------------------------------------------------------------------ */
/* 抖音 a_bogus                                                         */
/* ------------------------------------------------------------------ */

const A_BOGUS_PROBLEM_LABELS: Record<string, string> = {
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

const A_BOGUS_DEMO_URL = `https://www.douyin.com${DEMO_PATH_QUERY}&a_bogus=${encodeURIComponent(A_BOGUS_DEMO.aBogus)}`

const ABogusVerifier = () => {
  const [input, setInput] = useState(A_BOGUS_DEMO_URL)
  const [userAgent, setUserAgent] = useState(CAPTURE_UA)

  const outcome = useMemo(() => {
    const trimmed = input.trim()
    if (!trimmed) return null

    let signature = trimmed
    let url: string | null = null
    if (/^https?:\/\//i.test(trimmed)) {
      url = trimmed
      const found = new URL(trimmed).searchParams.get('a_bogus')
      if (found === null) return { fatal: '这条 URL 里没有 a_bogus 参数。' } as const
      signature = decodeURIComponent(found)
    }

    const problem = structureError(signature)
    if (problem !== null) return { fatal: `这串值不是格式良好的 a_bogus：${A_BOGUS_PROBLEM_LABELS[problem] ?? problem}` } as const

    // URL 上带的才做 query 重建；只贴一个签名值时无从重建，也就无法校验 query 链
    const recovery = url ? recoverSignedQuery(signature, url) : null
    const decoded = url ? decodeUrl(url, { userAgent: userAgent.trim() || undefined })[0] : undefined
    return { signature, decoded, recovery: recovery ?? undefined, salt: recovery?.salt } as const
  }, [input, userAgent])

  const chain = (name: string) => outcome?.decoded?.checks.find((item) => item.name === name)?.status
  const queryOk = chain('query') === 'match'
  const uaOk = chain('user_agent') === 'match'
  const hasSignedQuery = Boolean(outcome?.recovery)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <ZoneLabel>签名输入</ZoneLabel>
        <MainInput label="已签名的 URL（或一个单独的 a_bogus 值）" value={input} onChange={setInput} />
        <TextField label="User-Agent（校验 UA 链需要）" value={userAgent} onChange={setUserAgent} />
        <DemoButton
          onClick={() => {
            setInput(A_BOGUS_DEMO_URL)
            setUserAgent(CAPTURE_UA)
          }}
          hint="预填的是一份真实浏览器捕获（bdms 1.0.1.19-fix.01，2026-09-09）"
        />
      </div>

      <div className="flex flex-col gap-3">
        <ZoneLabel>判定</ZoneLabel>
        {!outcome ? (
          <Empty>贴入一条已签名的 URL，或一个单独的 a_bogus 值 —— 判定即时给出。</Empty>
        ) : 'fatal' in outcome ? (
          <Banner tone="error">{outcome.fatal}</Banner>
        ) : (
          <>
            <Banner tone="ok">这是一份有效的 a_bogus —— 校验和通过，说明它是由真正的那套算法装配出来的。</Banner>
            <Rows>
              <Verdict label="盐值" ok={hasSignedQuery}>
                {hasSignedQuery ? (
                  <>
                    签名用的是 <CopyValue value={outcome.salt ?? ''} />
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
            </Rows>
            {outcome.decoded ? <FieldsTable fields={outcome.decoded.fields} /> : null}
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 抖音 X-Bogus                                                         */
/* ------------------------------------------------------------------ */

const X_BOGUS_PROBLEM_LABELS: Record<string, string> = {
  alphabet: '含有不属于该字母表的字符',
  'length not 28': '长度不是 28（X-Bogus 恒为 28 个字符）',
  'envelope lead': '信封头两个明文字节不是 [2, 255]',
  'lead slots': '载荷前四格不是 64, 0, 1, 12',
  'empty digest': 'empty 摘要链的两个字节对不上常量',
  'canvas constant': 'canvas 常量那四格对不上',
  checksum: '校验位不符 —— 不是这套算法装配出来的'
}

const X_BOGUS_DEMO_URL = `https://www.douyin.com${DEMO_PATH_QUERY}&X-Bogus=${X_BOGUS_DEMO}`

const XBogusVerifier = () => {
  const [input, setInput] = useState(X_BOGUS_DEMO_URL)
  const [userAgent, setUserAgent] = useState(CAPTURE_UA)

  const outcome = useMemo(() => {
    const trimmed = input.trim()
    if (!trimmed) return null

    let signature = trimmed
    let signedPath: string | undefined
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed)
      const found = parsed.searchParams.get('X-Bogus') ?? parsed.searchParams.get('x-bogus')
      if (found === null) return { fatal: '这条 URL 里没有 X-Bogus 参数。' } as const
      signature = found
      // 签名覆盖的是 pathname + search（不含 X-Bogus 自身）
      parsed.searchParams.delete('X-Bogus')
      parsed.searchParams.delete('x-bogus')
      signedPath = parsed.pathname + parsed.search
    }

    const problem = xBogusStructureError(signature)
    if (problem !== null) return { fatal: `这串值不是格式良好的 X-Bogus：${X_BOGUS_PROBLEM_LABELS[problem] ?? problem}` } as const

    const decoded = decodeXBogus(signature, { query: signedPath, userAgent: userAgent.trim() || undefined })
    const queryCheck = decoded.checks.find((check) => check.name === 'query')
    const uaCheck = decoded.checks.find((check) => check.name === 'user_agent')
    return { decoded, queryCheck, uaCheck } as const
  }, [input, userAgent])

  const timestampField = outcome?.decoded?.fields.find((field) => field.name === 'timestamp')
  const timestampMs = timestampField ? Number(timestampField.value.split(' ')[0]) : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <ZoneLabel>签名输入</ZoneLabel>
        <MainInput label="已签名的 URL（或一个单独的 X-Bogus 值）" value={input} onChange={setInput} />
        <TextField label="User-Agent（校验 UA 链需要）" value={userAgent} onChange={setUserAgent} />
        <DemoButton
          onClick={() => {
            setInput(X_BOGUS_DEMO_URL)
            setUserAgent(CAPTURE_UA)
          }}
          hint="演示值由本实现对钉死的时钟重签 —— 仓库里还没有浏览器产出的 X-Bogus 捕获"
        />
      </div>

      <div className="flex flex-col gap-3">
        <ZoneLabel>判定</ZoneLabel>
        {!outcome ? (
          <Empty>贴入一条已签名的 URL，或一个 X-Bogus 值 —— 判定即时给出。</Empty>
        ) : 'fatal' in outcome ? (
          <Banner tone="error">{outcome.fatal}</Banner>
        ) : (
          <>
            <Banner tone="ok">这是一份有效的 X-Bogus —— 常量指纹（载荷前四格、empty 摘要、canvas 常量）与校验位全部通过。</Banner>
            <Rows>
              <Verdict label="时钟" ok={timestampMs > 0}>
                签名封住的是 <CopyValue value={String(Math.floor(timestampMs / 1000))} />（{instant(timestampMs)}）
              </Verdict>
              <Verdict label="query 链" ok={outcome.queryCheck?.status === 'match'}>
                {outcome.queryCheck?.status === 'match'
                  ? '签名封住的就是这条 URL 的 path + query（16 位证据）'
                  : outcome.queryCheck?.status === 'differs'
                    ? '对不上 —— 签名是对着另一条 URL 算的，或 X-Bogus 参数摘除方式不同'
                    : '需要一个完整 URL 才能校验（摘要链只剩 16 位，无法倒推输入）'}
              </Verdict>
              <Verdict label="UA 链" ok={outcome.uaCheck?.status === 'match'}>
                {outcome.uaCheck?.status === 'match'
                  ? '与上面的 User-Agent 一致'
                  : outcome.uaCheck?.status === 'differs'
                    ? '对不上 —— 签名时的那个 User-Agent 才作数'
                    : '填上 User-Agent 才能校验'}
              </Verdict>
            </Rows>
            <FieldsTable fields={outcome.decoded.fields} />
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 抖音 x-secsdk-web-signature                                          */
/* ------------------------------------------------------------------ */

const SecsdkVerifier = () => {
  const [input, setInput] = useState(SECSDK_DEMO_URL)
  const [uifid, setUifid] = useState('')

  const outcome = useMemo(() => {
    const trimmed = input.trim()
    if (!trimmed) return null

    let parsed: URL
    try {
      parsed = new URL(trimmed)
    } catch {
      return { fatal: '这不是一条能解析的 URL。' } as const
    }

    const signature = parsed.searchParams.get('x-secsdk-web-signature')
    if (signature === null) return { fatal: '这条 URL 里没有 x-secsdk-web-signature 参数。' } as const
    const tsParam = parsed.searchParams.get('timestamp')
    if (tsParam === null) return { fatal: '这条 URL 里没有 timestamp 参数 —— secsdk 管线总会带上它，没有就不是完整产物。' } as const

    // 同一时钟、同一 uifid 规则重算：签名是纯 MD5，确定性算法重算即比对
    const expected = signSecsdkWebQuery(trimmed, { ts: Number(tsParam), uifid: uifid.trim() || undefined })
    return { matched: expected.signature === signature, ts: expected.ts, expected, signature } as const
  }, [input, uifid])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <ZoneLabel>签名输入</ZoneLabel>
        <MainInput label="已签名的 URL（带 timestamp 与 x-secsdk-web-signature）" value={input} onChange={setInput} rows={6} />
        <TextField
          label="UIFID cookie 值（仅在 query 里没有 uifid 时需要）"
          value={uifid}
          onChange={setUifid}
          placeholder="留空 = query 里的 uifid 参与签名"
        />
        <DemoButton
          onClick={() => {
            setInput(SECSDK_DEMO_URL)
            setUifid('')
          }}
          hint="演示值由本实现钉死时钟产出"
        />
      </div>

      <div className="flex flex-col gap-3">
        <ZoneLabel>判定</ZoneLabel>
        {!outcome ? (
          <Empty>贴入一条带签名的 URL —— 重算即时给出。</Empty>
        ) : 'fatal' in outcome ? (
          <Banner tone="error">{outcome.fatal}</Banner>
        ) : (
          <>
            <Banner tone={outcome.matched ? 'ok' : 'error'}>
              {outcome.matched
                ? '签名对上了 —— 同一时钟、同一 uifid 规则重算出的 MD5 与之一字不差。'
                : '对不上。检查下面的明文：签名算的是规范化后的 query（+ 追加的 timestamp），且 uifid 参与明文。'}
            </Banner>
            <Rows>
              <Verdict label="时钟" ok>
                timestamp 参数是 <CopyValue value={String(outcome.ts)} />
                （签名覆盖它）
              </Verdict>
              <Info label="明文">
                <code className="break-all font-mono">{`{uifid}_{ts}_A96D…4E_{规范化 query + &timestamp}`}</code> —— 明文形如{' '}
                <code className="font-mono">uifid_ts_盐_signedQuery</code>，盐是写死在 secsdk VM 常量池里的
              </Info>
              <Verdict label="签名" ok={outcome.matched}>
                URL 上的是 <CopyValue value={outcome.signature} />
                ；重算是 <CopyValue value={outcome.expected.signature} />
              </Verdict>
            </Rows>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 抖音 tokens：verify_fp / s_v_web_id / msToken / ttwid                */
/* ------------------------------------------------------------------ */

const TOKEN_PROBLEM_LABELS: Record<string, string> = {
  prefix: '不是 verify_ 开头（或 36 进制时钟段不合法）',
  'tail length': '尾巴不是 36 位',
  separators: 'UUID 骨架的分隔符错位（应在 8/13/18/23）',
  version: '版本位（下标 14）不是 4',
  variant: '变体位（下标 19）不在 89AB —— UUID v4 的 10xx 规定',
  alphabet: '含有不在字母表里的字符'
}

const TokensVerifier = () => {
  const [input, setInput] = useState(VERIFY_FP_DEMO)

  const outcome = useMemo(() => {
    const value = input.trim()
    if (!value) return null

    if (/^verify_/.test(value)) {
      return { kind: 'verify_fp' as const, decoded: decodeVerifyFp(value) }
    }
    if (value.length >= 100 && /^[A-Za-z0-9+-]+=*$/.test(value)) {
      // 形状检查：假的 msToken 唯一要像真的地方就是形状
      const bare = value.replace(/=+$/, '')
      const lengthOk = DOUYIN_MS_TOKEN_SIZES.includes(bare.length)
      const alphabetOk = [...bare].every((char) => MS_TOKEN_ALPHABET.includes(char))
      return { kind: 'msToken' as const, lengthOk, alphabetOk, length: bare.length }
    }
    if (/^[0-9a-f]{32}$/i.test(value)) return { kind: 'secsdk' as const }
    return { kind: 'opaque' as const }
  }, [input])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <ZoneLabel>签名输入</ZoneLabel>
        <MainInput label="token 值（verify_fp / s_v_web_id / msToken / ttwid）" value={input} onChange={setInput} rows={3} />
        <DemoButton onClick={() => setInput(VERIFY_FP_DEMO)} hint="演示值由本实现产出（时钟钉在捕获时刻）；msToken / ttwid 见下面的说明" />
      </div>

      <div className="flex flex-col gap-3">
        <ZoneLabel>判定</ZoneLabel>
        {!outcome ? (
          <Empty>贴入一个值 —— 类型识别与骨架校验即时给出。</Empty>
        ) : outcome.kind === 'verify_fp' ? (
          <>
            <Banner tone={outcome.decoded.problems.length === 0 ? 'ok' : 'error'}>
              {outcome.decoded.problems.length === 0
                ? '骨架完整 —— 这是一个（或伪装成）verify_fp / s_v_web_id 的值。'
                : `骨架有问题：${outcome.decoded.problems.map((problem) => TOKEN_PROBLEM_LABELS[problem] ?? problem).join('；')}`}
            </Banner>
            <Rows>
              <Verdict label="时钟" ok={outcome.decoded.timestampMs > 0}>
                生成于 <CopyValue value={String(outcome.decoded.timestampMs)} />（{instant(outcome.decoded.timestampMs)}） —— 36
                进制段原样还原，没有任何推断
              </Verdict>
              <Info label="真假">辨不了。本地生成的假值形状目标就是与真值一致（36 位尾巴里 31 个纯随机字符），这不是真伪判别</Info>
            </Rows>
          </>
        ) : outcome.kind === 'msToken' ? (
          <>
            <Banner tone={outcome.lengthOk && outcome.alphabetOk ? 'ok' : 'error'}>
              {outcome.lengthOk && outcome.alphabetOk
                ? `形状与 msToken 一致（${outcome.length} 个字符表内字符 + 补位）—— 但这不是真伪判别`
                : '形状不像 msToken：长度应在 120/128，字符表是 A-Za-z0-9 与 +-'}
            </Banner>
            <Rows>
              <Info label="真假">
                辨不了。本地就能生成一个形状完全一致的假 msToken（长度 {DOUYIN_MS_TOKEN_LENGTH}+2），平台对一部分端点认它、另一部分不认
              </Info>
            </Rows>
          </>
        ) : outcome.kind === 'secsdk' ? (
          <Banner tone="error">这像一个 32 位十六进制签名 —— 是 x-secsdk-web-signature 的形状，去上一个标签页验它。</Banner>
        ) : (
          <>
            <Banner tone="ok">这个值底下没有明文可找 —— 它由平台签发或随机抽出。</Banner>
            <Rows>
              <Info label="说明">
                ttwid 是字节跳动签发的不透明令牌（注册接口在 <code className="font-mono">ttwid.bytedance.com</code>
                ），签名算法只负责携带它，不参与计算。对这类值，说出「没有明文」就是答案
              </Info>
            </Rows>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* B站 wbi                                                              */
/* ------------------------------------------------------------------ */

const WbiVerifier = () => {
  const [input, setInput] = useState(WBI_DEMO.url)
  const [imgKey, setImgKey] = useState(WBI_DEMO.imgKey)
  const [subKey, setSubKey] = useState(WBI_DEMO.subKey)

  const outcome = useMemo(() => {
    const trimmed = input.trim()
    if (!trimmed) return null

    let parsed: URL
    try {
      parsed = new URL(trimmed)
    } catch {
      return { fatal: '这不是一条能解析的 URL。' } as const
    }

    const wts = parsed.searchParams.get('wts')
    const w_rid = parsed.searchParams.get('w_rid')
    if (w_rid === null) return { fatal: '这条 URL 里没有 w_rid 参数。' } as const
    if (wts === null) return { fatal: '这条 URL 里没有 wts 参数 —— w_rid 的明文里包含它，没有就无从复算。' } as const

    // img_url / sub_url 整条贴进来也行（取末尾文件名）；裸 key 直接用
    const keyOf = (value: string): string => (value.includes('/') ? extractWbiKey(value.trim()) : value.trim())
    const img = keyOf(imgKey)
    const sub = keyOf(subKey)
    if (!img || !sub) return { fatal: 'img_key / sub_key 不能为空。' } as const

    const params: Record<string, string> = {}
    for (const [key, value] of parsed.searchParams.entries()) {
      if (key !== 'wts' && key !== 'w_rid') params[key] = value
    }
    const expected = computeWbiSignature(params, img, sub, Number(wts))
    return { matched: expected.w_rid === w_rid, expected, w_rid, wts } as const
  }, [input, imgKey, subKey])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <ZoneLabel>签名输入</ZoneLabel>
        <MainInput label="已签名的 URL（带 wts 与 w_rid）" value={input} onChange={setInput} rows={3} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="img_key（/nav 的 wbi_img.img_url，整条 URL 或裸 key）" value={imgKey} onChange={setImgKey} />
          <TextField label="sub_key（同上，sub_url）" value={subKey} onChange={setSubKey} />
        </div>
        <DemoButton
          onClick={() => {
            setInput(WBI_DEMO.url)
            setImgKey(WBI_DEMO.imgKey)
            setSubKey(WBI_DEMO.subKey)
          }}
          hint="演示值由本实现产出；keys 是一次真实的 /nav 回包"
        />
      </div>

      <div className="flex flex-col gap-3">
        <ZoneLabel>判定</ZoneLabel>
        {!outcome ? (
          <Empty>贴入已签名的 URL 与两个 keys —— 重算即时给出。</Empty>
        ) : 'fatal' in outcome ? (
          <Banner tone="error">{outcome.fatal}</Banner>
        ) : (
          <>
            <Banner tone={outcome.matched ? 'ok' : 'error'}>
              {outcome.matched
                ? 'w_rid 对上了 —— 同一组 keys、同一个 wts 重算出的 MD5 与之一字不差。'
                : "对不上。检查 keys 是否取自同一次 /nav、参与签名的参数是否与发送时一致（值里的 !'()* 会被滤掉再签）。"}
            </Banner>
            <Rows>
              <Verdict label="时钟" ok>
                wts 是 <CopyValue value={String(outcome.wts)} />
                ，它本身参与排序后的 query，一并进 MD5
              </Verdict>
              <Verdict label="混合密钥" ok>
                打乱后的 mixin key 是 <CopyValue value={outcome.expected.mixinKey} />
                （取 img_key+sub_key 重排前 32 位）
              </Verdict>
              <Verdict label="签名" ok={outcome.matched}>
                URL 上的是 <CopyValue value={outcome.w_rid} />
                ；重算是 <CopyValue value={outcome.expected.w_rid} />
              </Verdict>
            </Rows>
            <details className="group overflow-hidden rounded-xl border border-fd-border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-fd-muted/50 [&::-webkit-details-marker]:hidden">
                参与哈希的规范化 query
                <ChevronDown className="h-4 w-4 text-fd-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="break-all border-t border-fd-border px-4 py-3 font-mono text-xs leading-relaxed text-fd-muted-foreground">
                {outcome.expected.canonicalQuery}
              </p>
            </details>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* B站 av ↔ bv                                                          */
/* ------------------------------------------------------------------ */

const BvAvVerifier = () => {
  const [input, setInput] = useState('BV1xx411c7mD')

  const outcome = useMemo(() => {
    const value = input.trim()
    if (!value) return null

    if (/^BV1[0-9A-Za-z]{9}$/.test(value)) {
      const aid = bv2av(value)
      const roundTrip = av2bv(aid)
      return { kind: 'bv' as const, aid, roundTrip, ok: roundTrip === value }
    }
    const aid = Number(/^av/i.test(value) ? value.slice(2) : value)
    if (!Number.isInteger(aid) || aid <= 0) return { fatal: '既不是 BV 号（BV1 开头共 12 位），也不是 av 号。' } as const
    const bvid = av2bv(aid)
    const roundTrip = bv2av(bvid)
    return { kind: 'av' as const, bvid, roundTrip, ok: roundTrip === aid }
  }, [input])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <ZoneLabel>签名输入</ZoneLabel>
        <TextField label="BV 号或 av 号" value={input} onChange={setInput} />
        <DemoButton onClick={() => setInput('BV1xx411c7mD')} hint="BV1xx411c7mD ↔ av2，bilibili 的第一支视频" />
      </div>

      <div className="flex flex-col gap-3">
        <ZoneLabel>判定</ZoneLabel>
        {!outcome ? (
          <Empty>输入一个 BV 号或 av 号 —— 双向转换即时给出。</Empty>
        ) : 'fatal' in outcome ? (
          <Banner tone="error">{outcome.fatal}</Banner>
        ) : (
          <>
            <Banner tone={outcome.ok ? 'ok' : 'error'}>
              {outcome.kind === 'bv' ? (
                <>
                  <CopyValue value={`av${outcome.aid}`} /> ↔ <CopyValue value={outcome.roundTrip} />
                  {outcome.ok ? '（往返一致）' : '（往返不一致？！）'}
                </>
              ) : (
                <>
                  <CopyValue value={outcome.bvid} /> ↔ <CopyValue value={`av${outcome.roundTrip}`} />
                  {outcome.ok ? '（往返一致）' : '（往返不一致？！）'}
                </>
              )}
            </Banner>
            <Rows>
              <Info label="说明">纯 BigInt 位移与查表，双向互逆 —— 往返对不上只有一个可能：号码抄错了</Info>
            </Rows>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 快手 $HE_                                                            */
/* ------------------------------------------------------------------ */

const KUAISHOU_PROBLEM_LABELS: Record<string, string> = {
  'not hex': '含有非十六进制字符',
  'length not 90': '长度不是 90（布局 44 字节 + 末尾 1 字节异或键）',
  'envelope checksum': '信封 LRC 不符 —— 末字节应是前 44 字节的校验',
  'tail lrc': '尾段 LRC 不符',
  'header magic': 'header 魔数不符（恒为 4B54）',
  version: '版本块不符（恒为 cda9）',
  'startup marker': '启动标记不符（恒为 ab）',
  'fixed body': '固定体不符（恒为 0100000001）',
  tail: '尾段不符（恒为 9b563eda7b563e）'
}

const KuaishouVerifier = () => {
  const [input, setInput] = useState(KUAISHOU_DEMO)

  const outcome = useMemo(() => {
    const value = input.trim()
    if (!value) return null

    const heIndex = value.indexOf('$HE_')
    const heHex = heIndex !== -1 ? value.slice(heIndex + '$HE_'.length) : value
    const hudrPart = heIndex > 0 ? value.slice(0, heIndex) : null
    const hudrOk = hudrPart === null ? null : hudrPart.startsWith('HUDR_') && /^[A-Za-z0-9_.-]+$/.test(hudrPart.slice('HUDR_'.length))

    return { decoded: decodeKuaishouHe(heHex), hudrPart, hudrOk } as const
  }, [input])

  const problems = outcome?.decoded.problems ?? []

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <ZoneLabel>签名输入</ZoneLabel>
        <MainInput label="__NS_hxfalcon 签名（HUDR_…$HE_…）或单独的 $HE_ hex" value={input} onChange={setInput} rows={3} />
        <DemoButton onClick={() => setInput(KUAISHOU_DEMO)} hint="演示值由本实现对钉死输入产出 —— 仓库里还没有浏览器产出的快手签名捕获" />
      </div>

      <div className="flex flex-col gap-3">
        <ZoneLabel>判定</ZoneLabel>
        {!outcome ? (
          <Empty>贴入一份 __NS_hxfalcon 签名（HUDR_…$HE_…），或单独一段 $HE_ 后面的 hex。</Empty>
        ) : (
          <>
            <Banner tone={problems.length === 0 ? 'ok' : 'error'}>
              {problems.length === 0
                ? '这是一份结构良好的 $HE_ 段 —— 两层 LRC 与全部布局常量都对上。'
                : `结构有问题：${problems.map((problem) => KUAISHOU_PROBLEM_LABELS[problem] ?? problem).join('；')}。下面的字段值不可信。`}
            </Banner>
            <Rows>
              <Verdict label="时钟" ok={problems.length === 0}>
                签名封住的是 <CopyValue value={String(outcome.decoded.timestampMs)} />（{instant(outcome.decoded.timestampMs)}）
              </Verdict>
              <Verdict label="计数器" ok={problems.length === 0}>
                count = <CopyValue value={String(outcome.decoded.count)} />
                （异或掩码已解掉，随签名次数递增）
              </Verdict>
              <Info label="HUDR 段">
                {outcome.hudrPart === null
                  ? '输入里没有 HUDR 段 —— 它整段是 ChaCha 密文，底下没有明文可找，单独一段验不了什么'
                  : outcome.hudrOk
                    ? 'HUDR_ 前缀与字符集都对 —— 但它整段是 ChaCha 密文，内容拆不开'
                    : 'HUDR 段前缀或字符集不对'}
              </Info>
              <Info label="hash field">
                签名里的 4 字节是 <CopyValue value={outcome.decoded.hashFieldHex || '——'} />
                ；重算它需要 signInput 与 HUDR body （deriveKuaishouHeHashFieldHex），输入凑不齐就别猜
              </Info>
            </Rows>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 小红书头部形状                                                        */
/* ------------------------------------------------------------------ */

const XhsVerifier = () => {
  const [headers, setHeaders] = useState(XHS_DEMO)

  const rows = useMemo(() => {
    const filled = [
      { name: 'x-s', value: headers.xs.trim() },
      { name: 'x-s-common', value: headers.xsCommon.trim() },
      { name: 'x-t', value: headers.xt.trim() },
      { name: 'x-xray-traceid', value: headers.xray.trim() },
      { name: 'x-b3-traceid', value: headers.b3.trim() }
    ].filter((row) => row.value !== '')
    return filled.map((row) => ({ ...row, inspection: inspectXhsHeader(row.name, row.value) }))
  }, [headers])

  const empty = rows.length === 0

  // XYW_ 的信封是标准 base64 包着的一层 JSON —— 这层在浏览器里就能拆
  const xywEnvelope = useMemo(() => {
    const value = headers.xs.trim()
    if (!value.startsWith('XYW_')) return null
    try {
      return JSON.parse(atob(value.slice('XYW_'.length))) as Record<string, string>
    } catch {
      return null
    }
  }, [headers.xs])

  const set = (key: keyof typeof XHS_DEMO) => (next: string) => setHeaders((prev) => ({ ...prev, [key]: next }))
  const allOk = rows.every((row) => row.inspection.problems.length === 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <ZoneLabel>签名输入</ZoneLabel>
        <MainInput label="x-s" value={headers.xs} onChange={set('xs')} rows={4} />
        <MainInput label="x-s-common（不透明，只查非空）" value={headers.xsCommon} onChange={set('xsCommon')} rows={2} />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="x-t" value={headers.xt} onChange={set('xt')} />
          <TextField label="x-xray-traceid" value={headers.xray} onChange={set('xray')} />
          <TextField label="x-b3-traceid" value={headers.b3} onChange={set('b3')} />
        </div>
        <DemoButton onClick={() => setHeaders(XHS_DEMO)} hint="演示值由本实现产出（Node 侧的 xhshow-ts 算法）" />
      </div>

      <div className="flex flex-col gap-3">
        <ZoneLabel>判定</ZoneLabel>
        {empty ? (
          <Empty>至少填一个头部 —— 形状检查即时给出。</Empty>
        ) : (
          <>
            <Banner tone={allOk ? 'ok' : 'error'}>{allOk ? '全部头部的形状都对。' : '有头部的形状不对 —— 见下面逐行的判定。'}</Banner>
            <Rows>
              {rows.map((row) => {
                const ok = row.inspection.problems.length === 0
                return (
                  <Verdict key={row.name} label={row.name} ok={ok}>
                    {row.inspection.format ? (
                      <>
                        {row.inspection.format === 'XYW' ? (
                          <>
                            XYW_ 格式（2026-03 之后数据接口必用；XYS_ 会被 406 拒收）
                            {xywEnvelope ? (
                              <>
                                ；信封里报的是 signSvn <code className="font-mono">{xywEnvelope.signSvn}</code>、signType{' '}
                                <code className="font-mono">{xywEnvelope.signType}</code>、appId{' '}
                                <code className="font-mono">{xywEnvelope.appId}</code>
                              </>
                            ) : null}
                          </>
                        ) : (
                          'XYS_ 传统格式 —— 数据获取类接口（user_posted 等）会拒收'
                        )}
                        {ok ? '' : `；${row.inspection.problems.join('；')}`}
                      </>
                    ) : (
                      row.inspection.problems.join('；')
                    )}
                  </Verdict>
                )
              })}
            </Rows>
            <div className="flex items-start gap-3 px-1">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-fd-muted-foreground" aria-hidden />
              <p className="text-sm leading-relaxed text-fd-muted-foreground">
                这里只有形状检查。x-s 的算法本体在 <code className="font-mono">@ikenxuan/xhshow-ts</code>（依赖 Node 的 crypto 与
                zlib），进不了浏览器 —— 所以这一页证明不了「算法对」，只能证明「形状对」。全量校验在 Node 侧跑它的测试
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 平台装配                                                             */
/* ------------------------------------------------------------------ */

interface Tab {
  id: string
  label: string
  hint: string
  Component: () => React.ReactElement
}

const PLATFORM_TABS: Record<'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu', Tab[]> = {
  douyin: [
    { id: 'a_bogus', label: 'a_bogus', hint: '主签名：结构指纹 + 盐值判定 + query / UA 摘要链', Component: ABogusVerifier },
    { id: 'x_bogus', label: 'X-Bogus', hint: '老签名：常量指纹 + 可还原时钟 + 16 位摘要链', Component: XBogusVerifier },
    { id: 'secsdk', label: 'secsdk', hint: 'x-secsdk-web-signature：确定性 MD5，重算即比对', Component: SecsdkVerifier },
    {
      id: 'tokens',
      label: 'tokens',
      hint: 'verify_fp / s_v_web_id / msToken / ttwid：骨架与时钟，以及「辨不了真假」',
      Component: TokensVerifier
    }
  ],
  bilibili: [
    { id: 'wbi', label: 'wbi（w_rid）', hint: '同一组 keys、同一个 wts，重算即比对', Component: WbiVerifier },
    { id: 'bvav', label: 'av ↔ bv', hint: '纯 BigInt 互转，双向往返', Component: BvAvVerifier }
  ],
  kuaishou: [{ id: 'he', label: '$HE_ 段', hint: '布局常量 + 双层 LRC + 可还原时钟与计数器', Component: KuaishouVerifier }],
  xiaohongshu: [
    { id: 'shape', label: '头部形状', hint: '前缀 / 长度 / 字符集 —— 算法本体在 Node 侧，进不了浏览器', Component: XhsVerifier }
  ]
}

export function SignVerifier({ platform }: { platform: 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu' }) {
  const tabs = PLATFORM_TABS[platform]
  const [active, setActive] = useState(tabs[0].id)
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0]

  return (
    <div className="not-prose my-6 flex flex-col gap-5 rounded-2xl border border-fd-border bg-fd-card p-4 shadow-sm sm:p-6">
      {/* 算法切换：移动端两列、桌面一行，命中区域足够大 */}
      {tabs.length > 1 ? (
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-fd-muted p-1 sm:auto-cols-fr sm:grid-flow-col sm:justify-start">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === current.id}
              onClick={() => setActive(tab.id)}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                tab.id === current.id
                  ? 'bg-fd-background text-fd-foreground shadow-sm'
                  : 'text-fd-muted-foreground hover:text-fd-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-sm leading-relaxed text-fd-muted-foreground">{current.hint}</p>

      {/* 全部常驻挂载：切换标签页不丢已贴的输入 */}
      {tabs.map((tab) => (
        <div key={tab.id} className={tab.id === current.id ? 'flex flex-col gap-5' : 'hidden'}>
          <tab.Component />
        </div>
      ))}
    </div>
  )
}
