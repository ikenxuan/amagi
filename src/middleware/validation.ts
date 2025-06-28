import { Request, Response, NextFunction } from 'express'
import {
  validateDouyinParams,
  validateBilibiliParams,
  validateKuaishouParams,
  DouyinMethodType,
  BilibiliMethodType,
  KuaishouMethodType
} from 'amagi/validation'
import { handleError, ValidationError } from 'amagi/utils/errors'

/**
 * 创建通用验证中间件
 * @param validateFn - 验证函数
 * @param methodType - 方法类型
 * @returns Express中间件函数
 */
const createValidationMiddleware = <T>(
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
      const errorResponse = handleError(error)
      res.status(errorResponse.code || 500).json(errorResponse)
    }
  }
}

/**
 * 创建抖音参数验证中间件
 * @param methodType - 抖音方法类型
 * @returns Express中间件函数
 */
export const createDouyinValidationMiddleware = <T extends DouyinMethodType>(
  methodType: T
) => createValidationMiddleware(validateDouyinParams, methodType)

/**
 * 创建B站参数验证中间件
 * @param methodType - B站方法类型
 * @returns Express中间件函数
 */
export const createBilibiliValidationMiddleware = <T extends BilibiliMethodType>(
  methodType: T
) => createValidationMiddleware(validateBilibiliParams, methodType)

/**
 * 创建快手参数验证中间件
 * @param methodType - 快手方法类型
 * @returns Express中间件函数
 */
export const createKuaishouValidationMiddleware = <T extends KuaishouMethodType>(
  methodType: T
) => createValidationMiddleware(validateKuaishouParams, methodType)

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      validatedParams?: any
    }
  }
}