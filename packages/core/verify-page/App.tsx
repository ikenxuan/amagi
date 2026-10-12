import { useEffect, useState } from 'react'

import type { VerifyPageData } from '../src/verify/data'
import { asObject, isOwnFrame, loadTTGCaptcha, SUCCESS } from './detect'

type Mode = 'self' | 'hosted'
type Tone = 'load' | 'ready' | 'done' | 'fail'
interface Status {
  text: string
  tone: Tone
}

const errText = (e: unknown): string => (e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e))

export const App = ({ data }: { data: VerifyPageData }) => {
  const { sdk, url, platform } = data
  const detect = SUCCESS[platform]
  const [mode, setMode] = useState<Mode>(sdk ? 'self' : 'hosted')
  // 每次重试 / 切模式 +1：iframe 与 SDK 以它为 key 重新加载
  const [run, setRun] = useState(0)
  // 自建模式下滑块是否已渲染（SDK 的 showCb / refreshCb 回调）
  const [sdkReady, setSdkReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 第一份成功回调为准；null 表示还没过
  const [passed, setPassed] = useState<{ payload: unknown } | null>(null)

  const succeed = (payload: unknown) => setPassed((p) => p ?? { payload })
  const restart = (next: Mode = mode) => {
    setMode(next)
    setError(null)
    setPassed(null)
    setSdkReady(false)
    setRun((n) => n + 1)
  }

  // 已通过就不再显示错误（例如 SDK 先报错、iframe 随后回传成功）
  const shownError = passed ? null : (error ?? (mode === 'hosted' && !url ? 'challenge 里没有可打开的验证页地址' : null))
  // 状态在渲染时推导，不放进 state：通过之后 SDK 的 refreshCb 也改不回「请拖动」
  const status: Status = passed
    ? { text: '验证通过', tone: 'done' }
    : shownError
      ? { text: '失败', tone: 'fail' }
      : mode === 'self'
        ? sdkReady
          ? { text: '请拖动滑块完成验证', tone: 'ready' }
          : { text: '加载官方 SDK…', tone: 'load' }
        : { text: detect ? '请在下方完成验证' : '请在下方完成验证，完成后回到你的程序重发原请求', tone: 'ready' }

  // autoRender 把真滑块画进跨域 iframe，successCb 常收不到，靠 postMessage 兜底
  useEffect(() => {
    if (!detect) return
    const onMessage = (ev: MessageEvent) => {
      if (!isOwnFrame(ev.source)) return
      const d = asObject(ev.data)
      if (d && detect(d)) succeed(d)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [detect])

  // 自建模式（抖音）：官方契约是回调挂在 captchaOptions 上，init 后 render 只传 verify_data
  useEffect(() => {
    if (mode !== 'self' || !sdk) return
    let live = true
    const fail = (msg: string) => live && setError(msg)
    loadTTGCaptcha(sdk).then(
      (ttg) => {
        if (!live) return
        const root = document.getElementById('root')
        if (root) root.replaceChildren()
        const onReady = () => live && setSdkReady(true)
        const captchaOptions = { ...sdk.captchaOptions, successCb: (r: unknown) => live && succeed(r), showCb: onReady, refreshCb: onReady }
        try {
          const ret = ttg.init({ commonOptions: sdk.commonOptions, captchaOptions })
          if (ret?.type === 'loadJSSDK') return fail('TTGCaptcha.init 返回 loadJSSDK：官方 SDK 资源未就绪，请重试或改用「打开官方验证页」')
          ttg.render({ verify_data: sdk.verifyData })
          onReady()
        } catch (e) {
          fail(`TTGCaptcha 抛错：${errText(e)}`)
        }
      },
      (e) => fail(errText(e))
    )
    return () => {
      live = false
    }
  }, [mode, run, sdk])

  return (
    <main>
      <h1>{data.title}</h1>
      <p className="sub">请在下方完成平台官方验证（真人操作 · 只中转不绕过）</p>

      {sdk && (
        <fieldset className="card modes">
          <legend>验证方式</legend>
          {(
            [
              ['self', '页内渲染官方滑块（推荐）'],
              ['hosted', '打开官方验证页']
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="vp-mode" value={value} checked={mode === value} onChange={() => restart(value)} /> {label}
            </label>
          ))}
        </fieldset>
      )}

      <div className="card">
        状态：
        <span className={`status c-${status.tone}`} role="status" aria-live="polite">
          {status.text}
        </span>
      </div>

      {shownError && (
        <div className="card err" role="alert">
          <p>{shownError}</p>
          {error && (
            <button type="button" onClick={() => restart()}>
              重试
            </button>
          )}
        </div>
      )}

      {mode === 'self' && sdk && (
        <section className="card">
          <p className="hint">按提示拖动滑块完成验证；通过后本页会提示。</p>
          <div id="root" key={run} />
        </section>
      )}

      {mode === 'hosted' && url && (
        <section className="card">
          <p className="hint">
            下框是平台官方验证页。若空白或被拒绝内嵌，点「新标签打开」；验证完成后回到你的程序，用同一份 cookie 重发原请求。
          </p>
          <iframe key={run} src={url} title="平台官方验证页" referrerPolicy="no-referrer" />
          <p>
            <a className="btn" href={url} target="_blank" rel="noopener noreferrer">
              新标签打开验证页
            </a>
          </p>
        </section>
      )}

      {passed && (
        <section className="card ok">
          <h2>✅ 验证已通过</h2>
          <p>下一步：用同一份 cookie 重发刚才被拦下的原请求即可。amagi 不会自动重发。</p>
          {passed.payload != null && (
            <details>
              <summary>验证回调参数</summary>
              <pre>{JSON.stringify(passed.payload, null, 2)}</pre>
            </details>
          )}
        </section>
      )}

      <p className="foot">本页只中转官方验证页 / SDK，不含任何识别或自动过验证逻辑。</p>
    </main>
  )
}
