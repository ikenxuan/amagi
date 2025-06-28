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
  constructor(message: string, code: number = 500, platform: string = 'unknown') {
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
  
  /**
   * 构造参数验证错误
   * @param message - 错误消息
   * @param errors - 详细错误信息
   */
  constructor(message: string, errors: Array<{ field: string; message: string }>) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
  
  /**
   * 从Zod错误创建验证错误
   * @param zodError - Zod验证错误
   * @returns 验证错误实例
   */
  static fromZodError(zodError: z.ZodError): ValidationError {
    const errors = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
    
    return new ValidationError('参数验证失败', errors)
  }
}

/**
 * 处理错误并返回统一格式
 * @param error - 错误对象
 * @returns 统一的错误响应格式
 */
export const handleError = (error: unknown): {
  data: null;
  message: string;
  code: number;
  errors?: Array<{ field: string; message: string }>;
  platform?: string;
} => {
  if (error instanceof ValidationError) {
    return {
      data: null,
      message: error.message,
      code: 400,
      errors: error.errors
    }
  }
  
  if (error instanceof ApiError) {
    return {
      data: null,
      message: error.message,
      code: error.code,
      platform: error.platform
    }
  }
  
  if (error instanceof z.ZodError) {
    const validationError = ValidationError.fromZodError(error)
    return handleError(validationError)
  }
  
  // 未知错误
  const errorMessage = error instanceof Error ? error.message : '未知错误'
  return {
    data: null,
    message: errorMessage,
    code: 500
  }
}