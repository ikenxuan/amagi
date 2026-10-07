import { createHash } from 'node:crypto'

import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponseTransformer } from 'axios'

import { parseJsonBigintSafe } from './safeJson'

interface JsonSourceContext {
  source?: string
}

/** 新版运行时会把数字的原始文本交给 reviver，无需替换 Axios 的 transform。 */
const jsonSourceSupported = JSON.parse('1', (_key: string, value: unknown, context?: JsonSourceContext) => context?.source ?? value) === '1'
// Axios defaults 可变；只替换已核实的 ESM/CJS 原生解析器，不把预先配置的自定义链当作原生实现。
// 升级 Axios 时，旧运行时的精度回归测试必须通过。
const nativeAxiosTransformSources = new Set([
  'cb616bec668a14f14a8c4c32f7a535d1eeea66c862f3a90353a23fbd40fd92c2',
  '65016d8e56ad73f51f5681f0ec5de1982a52dc3ef64c6447ef7fff1c2b860af4'
])
const nativeAxiosTransforms = new WeakMap<AxiosResponseTransformer, boolean>()

const bigintSafeReviver = (_key: string, value: unknown, context?: JsonSourceContext): unknown => {
  const source = context?.source
  return typeof value === 'number' && !Number.isSafeInteger(value) && source !== undefined && /^-?(?:0|[1-9]\d*)$/.test(source)
    ? source
    : value
}

/** 在旧版 Node 上只替换已核实的原生解析器，无论导入顺序如何都保留自定义链。 */
const hasNativeAxiosTransform = (): boolean => {
  const current = axios.defaults.transformResponse
  if (!Array.isArray(current) || current.length !== 1 || typeof current[0] !== 'function') return false
  const transform = current[0]
  const cached = nativeAxiosTransforms.get(transform)
  if (cached !== undefined) return cached
  const source = Function.prototype.toString.call(transform).replace(/\s+/g, '')
  const native = nativeAxiosTransformSources.has(createHash('sha256').update(source).digest('hex'))
  nativeAxiosTransforms.set(transform, native)
  return native
}

/** 默认的 JSON transform；显式指定的 text/binary 模式与自定义 transform 仍以其为准。 */
const transformResponseBigintSafe: AxiosResponseTransformer = function (data: unknown): unknown {
  if (
    typeof data !== 'string' ||
    data.length === 0 ||
    (this.responseType !== undefined && this.responseType !== 'json') ||
    (this.responseType === undefined && this.transitional?.forcedJSONParsing === false)
  )
    return data

  try {
    return parseJsonBigintSafe(data)
  } catch (cause) {
    if (this.responseType === 'json' && this.transitional?.silentJSONParsing === false) {
      throw AxiosError.from(cause, AxiosError.ERR_BAD_RESPONSE, this)
    }
    // HTML 挑战页、JSONP 与畸形 JSON 原样保留，交给平台的 judge/decoder 处理。
    return data
  }
}

/**
 * HttpClient 与 legacy 共用的 Axios 长整数解析配置。
 * 显式 reviver 优先；新版运行时只补 reviver，旧版仅替换原生 transform，保留自定义链。
 * @param layers - 由高到低优先级的配置层（单次 → 实例）
 * @returns 要展开进 axios 配置的增量；无需补时是空对象
 */
export const bigintSafeParseConfig = (...layers: (AxiosRequestConfig | undefined)[]): AxiosRequestConfig => {
  if (layers.some((layer) => layer?.parseReviver) || axios.defaults.parseReviver) return {}
  if (jsonSourceSupported) return { parseReviver: bigintSafeReviver }
  if (layers.some((layer) => layer?.transformResponse !== undefined)) return {}
  return hasNativeAxiosTransform() ? { transformResponse: [transformResponseBigintSafe] } : {}
}
