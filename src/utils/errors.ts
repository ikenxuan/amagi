import { z } from 'zod'

/**
 * API错误类
 */
export class ApiError extends Error {
  public readonly code: number
  public readonly platform: string

  /**
   * 构造API错误
   * @param message - 错误消息
   * @param code - 错误代码
   * @param platform - 平台名称
   */
  constructor (message: string, code: number = 500, platform: string = 'unknown') {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.platform = platform
  }
}

/**
 * 参数验证错误类
 */
export class ValidationError extends Error {
  public readonly errors: Array<{ field: string; message: string }>
  public readonly requestPath?: string

  /**
   * 构造参数验证错误
   * @param message - 错误消息
   * @param errors - 详细错误信息
   * @param requestPath - HTTP请求路径
   */
  constructor (message: string, errors: Array<{ field: string; message: string }>, requestPath?: string) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
    this.requestPath = requestPath
  }

  /**
   * 从Zod错误创建验证错误
   * @param zodError - Zod验证错误
   * @param requestPath - HTTP请求路径
   * @returns 验证错误实例
   */
  static fromZodError (zodError: z.ZodError<any>, requestPath?: string): ValidationError {
    const errors = zodError.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))

    return new ValidationError('参数验证失败', errors, requestPath)
  }
}

/**
 * 处理错误并返回统一格式
 * @param error - 错误对象
 * @param requestPath - HTTP请求路径（可选）
 * @returns 统一的错误响应格式
 */
export const handleError = (error: unknown, requestPath?: string): {
  data: null
  message: string
  code: number
  errors?: Array<{ field: string; message: string }>
  platform?: string
  requestPath?: string
} => {
  if (error instanceof ValidationError) {
    return {
      code: 400,
      message: error.message,
      data: null,
      errors: error.errors,
      requestPath: error.requestPath || requestPath
    }
  }

  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      data: null,
      platform: error.platform,
      requestPath
    }
  }

  if (error instanceof z.ZodError) {
    const validationError = ValidationError.fromZodError(error, requestPath)
    return handleError(validationError, requestPath)
  }

  // 未知错误
  const errorMessage = error instanceof Error ? error.message : '未知错误'
  return {
    code: 500,
    message: errorMessage,
    data: null,
    requestPath
  }
}