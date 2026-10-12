/**
 * 验证页里与平台约定相关的部分：成功信号识别、消息来源校验、官方 SDK 加载。
 */
import type { VerifyPageSdk, VerifyPlatform } from '../src/verify/data'

type Msg = Record<string, any>

/**
 * 各平台验证通过时 postMessage 给父页面的形状（实测）。
 * 没有实测信号的平台（小红书）不判，页面提示用户自己确认。
 */
export const SUCCESS: Partial<Record<VerifyPlatform, (d: Msg) => boolean>> = {
  douyin: (d) => {
    const t = d.type ?? d.message?.type ?? d.data?.type
    return t === 'success' || t === 'verifySuccess' || (t === 'verify' && !!(d.success || d.data?.result))
  },
  kuaishou: (d) => d.msgType === 'RESULT' && d.msg?.result === 1
}

/** 字符串消息先按 JSON 解，解不出或不是对象就返回 null */
export const asObject = (data: unknown): Msg | null => {
  let d = data
  if (typeof d === 'string') {
    try {
      d = JSON.parse(d)
    } catch {
      return null
    }
  }
  return d && typeof d === 'object' ? (d as Msg) : null
}

/** 只认本页内嵌的 frame（含多层嵌套）发来的消息，别的窗口伪造不了「已通过」 */
export const isOwnFrame = (source: MessageEventSource | null): boolean => {
  let w = source as Window | null
  for (let i = 0; w && i < 8; i++) {
    if (w === window) return i > 0
    if (w.parent === w) return false
    w = w.parent
  }
  return false
}

interface TTGCaptcha {
  init: (opts: { commonOptions: Record<string, unknown>; captchaOptions: Record<string, unknown> }) => { type?: string } | undefined
  render: (opts: { verify_data: Record<string, unknown> }) => void
}

declare global {
  interface Window {
    TTGCaptcha?: TTGCaptcha
  }
}

const ready = (): TTGCaptcha | undefined => (typeof window.TTGCaptcha?.init === 'function' ? window.TTGCaptcha : undefined)

/** 加载官方 TTGCaptcha SDK；脚本 onload 后再轮询最多 10 秒等它挂上全局 */
export const loadTTGCaptcha = (sdk: VerifyPageSdk): Promise<TTGCaptcha> =>
  new Promise((resolve, reject) => {
    const hit = ready()
    if (hit) return resolve(hit)
    document.querySelector('script[data-amagi-sdk]')?.remove()
    const el = document.createElement('script')
    el.src = sdk.jsSdkUrl
    el.async = true
    el.dataset.amagiSdk = ''
    el.onerror = () => reject(new Error(`官方 SDK 加载失败：${sdk.jsSdkUrl}`))
    el.onload = () => {
      let left = 100
      const poll = () => {
        const t = ready()
        if (t) resolve(t)
        else if (left-- <= 0) reject(new Error('官方 SDK 已加载但未暴露 TTGCaptcha'))
        else setTimeout(poll, 100)
      }
      poll()
    }
    document.head.appendChild(el)
  })
