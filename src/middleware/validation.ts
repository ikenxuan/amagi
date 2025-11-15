import { handleError } from 'amagi/utils/errors'
import {
  BilibiliMethodType,
  DouyinMethodType,
  KuaishouMethodType,
  validateBilibiliParams,
  validateDouyinParams,
  validateKuaishouParams,
  validateXiaohongshuParams,
  XiaohongshuMethodType
} from 'amagi/validation'
import { NextFunction, Request, Response } from 'express'

/**
 * 创建通用验证中间件
 * @param validateFn - 验证函数
 * @param methodType - 方法类型
 * @returns Express中间件函数
 */
export const createValidationMiddleware = <T> (
  validateFn: (methodType: T, params: unknown) => any,
  methodType: T
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 合并query和body参数
      const params = { ...req.query, ...req.body }

      // 验证参数
      const validatedParams = validateFn(methodType, params)

      // 将验证后的参数附加到请求对象
      req.validatedParams = validatedParams

      next()
    } catch (error) {
      const errorResponse = handleError(error, req.originalUrl)
      res.status(errorResponse.code || 500).json(errorResponse)
    }
  }
}

/**
 * 创建抖音参数验证中间件
 * @param methodType - 抖音方法类型
 * @returns Express中间件函数
 */
export const createDouyinValidationMiddleware = <T extends DouyinMethodType> (
  methodType: T
) => createValidationMiddleware(validateDouyinParams, methodType)

/**
 * 创建B站参数验证中间件
 * @param methodType - B站方法类型
 * @returns Express中间件函数
 */
export const createBilibiliValidationMiddleware = <T extends BilibiliMethodType> (
  methodType: T
) => createValidationMiddleware(validateBilibiliParams, methodType)

/**
 * 创建快手参数验证中间件
 * @param methodType - 快手方法类型
 * @returns Express中间件函数
 */
export const createKuaishouValidationMiddleware = <T extends KuaishouMethodType> (
  methodType: T
) => createValidationMiddleware(validateKuaishouParams, methodType)

/**
 * 创建小红书参数验证中间件
 * @param methodType - 小红书方法类型
 * @returns Express中间件函数
 */
export const createXiaohongshuValidationMiddleware = <T extends XiaohongshuMethodType> (
  methodType: T
) => createValidationMiddleware(validateXiaohongshuParams, methodType)

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      validatedParams?: any
    }
  }
}
