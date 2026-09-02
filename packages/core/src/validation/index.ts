import type { AmagiError, ValidationIssue } from '../contracts/error'
import type { AmagiMeta } from '../contracts/meta'
import type { AmagiFailure, AmagiSuccess } from '../contracts/result'
import { SUCCESS_MESSAGE } from '../contracts/result'
import { ValidationError } from '../utils/errors'
import zod from 'zod'

import { BilibiliMethodType, BilibiliValidationSchemas } from './bilibili'
import { DouyinMethodType, DouyinValidationSchemas } from './douyin'
import { KuaishouMethodType, KuaishouValidationSchemas } from './kuaishou'
import { XiaohongshuMethodType, XiaohongshuValidationSchemas } from './xiaohongshu'

/**
 * 校验结果（v7 形状：不抛错，失败以 `issues` 表达）。
 *
 * v6 的 `validateXxxParams` 直接 `schema.parse`，失败抛 ZodError（C 档
 * 破坏性变更①）。v7 不抛 —— 想要 v6 抛出行为的调用方用
 * `assertValidXxxParams`。
 */
export type ValidateOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] }

const outcomeOf = <S extends zod.ZodTypeAny>(schema: S, input: unknown): ValidateOutcome<zod.infer<S>> => {
  const parsed = schema.safeParse(input)
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      }
}

/** `ValidateOutcome` → value 或抛 `ValidationError`（v6 抛出行为的替代入口） */
const assertOrThrow = <T>(out: ValidateOutcome<T>): T => {
  if (!out.ok) {
    throw new ValidationError(
      '参数验证失败',
      out.issues.map((i) => ({ field: i.path, message: i.message }))
    )
  }
  return out.value
}

/**
 * 验证抖音参数（v7 形状：不抛错）
 * @param methodType - 抖音方法类型
 * @param params - 待验证的参数
 * @returns `ValidateOutcome`：成功带 value，失败带字段级 issues
 */
export const validateDouyinParams = <T extends DouyinMethodType>(
  methodType: T,
  params: unknown
): ValidateOutcome<zod.infer<(typeof DouyinValidationSchemas)[T]>> => {
  return outcomeOf(DouyinValidationSchemas[methodType], typeof params === 'object' && params !== null ? { methodType, ...params } : { methodType, params })
}

/**
 * 验证哔哩哔哩参数（v7 形状：不抛错）
 * @param methodType - 哔哩哔哩方法类型
 * @param params - 待验证的参数
 * @returns `ValidateOutcome`：成功带 value，失败带字段级 issues
 */
export const validateBilibiliParams = <T extends BilibiliMethodType>(
  methodType: T,
  params: unknown
): ValidateOutcome<zod.infer<(typeof BilibiliValidationSchemas)[T]>> => {
  return outcomeOf(BilibiliValidationSchemas[methodType], typeof params === 'object' && params !== null ? { methodType, ...params } : { methodType, params })
}

/**
 * 验证快手参数（v7 形状：不抛错）
 * @param methodType - 快手方法类型
 * @param params - 待验证的参数
 * @returns `ValidateOutcome`：成功带 value，失败带字段级 issues
 */
export const validateKuaishouParams = <T extends KuaishouMethodType>(
  methodType: T,
  params: unknown
): ValidateOutcome<zod.infer<(typeof KuaishouValidationSchemas)[T]>> => {
  return outcomeOf(KuaishouValidationSchemas[methodType], typeof params === 'object' && params !== null ? { methodType, ...params } : { methodType, params })
}

/**
 * 验证小红书参数（v7 形状：不抛错）
 * @param methodType - 小红书方法类型
 * @param params - 待验证的参数
 * @returns `ValidateOutcome`：成功带 value，失败带字段级 issues
 */
export const validateXiaohongshuParams = <T extends XiaohongshuMethodType>(
  methodType: T,
  params: unknown
): ValidateOutcome<zod.infer<(typeof XiaohongshuValidationSchemas)[T]>> => {
  return outcomeOf(XiaohongshuValidationSchemas[methodType], typeof params === 'object' && params !== null ? { methodType, ...params } : { methodType, params })
}

/**
 * 验证抖音参数并保留 v6 的抛出行为（失败抛 `ValidationError`，不产出失败结果）
 * @param methodType - 抖音方法类型
 * @param params - 待验证的参数
 * @returns 校验通过后的参数
 */
export const assertValidDouyinParams = <T extends DouyinMethodType>(
  methodType: T,
  params: unknown
): zod.infer<(typeof DouyinValidationSchemas)[T]> => assertOrThrow(validateDouyinParams(methodType, params))

/**
 * 验证哔哩哔哩参数并保留 v6 的抛出行为（失败抛 `ValidationError`）
 * @param methodType - 哔哩哔哩方法类型
 * @param params - 待验证的参数
 * @returns 校验通过后的参数
 */
export const assertValidBilibiliParams = <T extends BilibiliMethodType>(
  methodType: T,
  params: unknown
): zod.infer<(typeof BilibiliValidationSchemas)[T]> => assertOrThrow(validateBilibiliParams(methodType, params))

/**
 * 验证快手参数并保留 v6 的抛出行为（失败抛 `ValidationError`）
 * @param methodType - 快手方法类型
 * @param params - 待验证的参数
 * @returns 校验通过后的参数
 */
export const assertValidKuaishouParams = <T extends KuaishouMethodType>(
  methodType: T,
  params: unknown
): zod.infer<(typeof KuaishouValidationSchemas)[T]> => assertOrThrow(validateKuaishouParams(methodType, params))

/**
 * 验证小红书参数并保留 v6 的抛出行为（失败抛 `ValidationError`）
 * @param methodType - 小红书方法类型
 * @param params - 待验证的参数
 * @returns 校验通过后的参数
 */
export const assertValidXiaohongshuParams = <T extends XiaohongshuMethodType>(
  methodType: T,
  params: unknown
): zod.infer<(typeof XiaohongshuValidationSchemas)[T]> => assertOrThrow(validateXiaohongshuParams(methodType, params))

/**
 * 创建成功信封（v7 形状）
 *
 * 一般用不到 —— v7 主路径的成功信封由执行管线构造。需要手工组装
 * `AmagiResult` 时用它：`createSuccessResponse(data, meta)`。
 * @param data - 端点声明的返回数据
 * @param meta - 请求元信息（与管线的 `AmagiMeta` 同形）
 * @param message - 覆盖默认的 {@link SUCCESS_MESSAGE}
 * @returns 成功信封
 */
export const createSuccessResponse = <T>(data: T, meta: AmagiMeta, message: string = SUCCESS_MESSAGE): AmagiSuccess<T> => {
  return {
    success: true,
    data,
    message,
    meta
  }
}

/**
 * 创建失败信封（v7 形状）
 *
 * 一般用不到 —— v7 主路径的失败信封由执行管线构造（错误归因、cause 保留
 * 都在管线内）。需要手工组装 `AmagiResult` 时用它：`createErrorResponse(error, meta)`。
 * @param error - 唯一错误载体（`AmagiError`，非空）
 * @param meta - 请求元信息
 * @returns 失败信封（`message` 等价于 `error.message`）
 */
export const createErrorResponse = (error: AmagiError, meta: AmagiMeta): AmagiFailure => {
  return {
    success: false,
    error,
    message: error.message,
    meta
  }
}

// 平台模块（41 个 *ParamsSchema / *ValidationSchemas / *MethodRoutes）不再从
// 顶层导出 —— schema 归端点声明持有（06-migration「删除」类）。validateXxxParams
// 的实现仍用 ValidationSchemas 表（深路径 import，见文件头）；需要 schema 的
// 老代码从 'amagi/validation/<platform>' 子路径取。
// v6 信封（Result / createV6Success 等）在 validation/legacy.ts —— 仅供
// deprecated 内部路径使用，不进顶层（06「8 项形状变更」实施规格）。
