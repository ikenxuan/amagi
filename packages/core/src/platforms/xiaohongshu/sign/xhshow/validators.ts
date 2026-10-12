import { z } from 'zod'

export type Method = 'GET' | 'POST'
export type Payload = Record<string, any> | null
export type SignFormat = 'xys' | 'xyw'

// Schema definitions
const methodSchema = z.enum(['GET', 'POST'], {
  message: 'method must be "GET" or "POST"'
})

const uriSchema = z
  .string({
    message: 'uri must be a string'
  })
  .min(1, 'uri cannot be empty')

const a1ValueSchema = z
  .string({
    message: 'a1Value must be a string'
  })
  .min(1, 'a1Value cannot be empty')

const cookieSchema = z.union([z.record(z.string(), z.any()), z.string()])

// Combined schemas
const signatureParamsSchema = z.object({
  method: methodSchema,
  uri: uriSchema,
  a1Value: a1ValueSchema
})

const getSignatureParamsSchema = z.object({
  uri: uriSchema,
  a1Value: a1ValueSchema
})

const postSignatureParamsSchema = z.object({
  uri: uriSchema,
  a1Value: a1ValueSchema
})

const xsCommonParamsSchema = z.object({
  cookieDict: cookieSchema
})

export function validateSignatureParams(method: Method, uri: string, a1Value: string): void {
  try {
    signatureParamsSchema.parse({ method, uri, a1Value })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new TypeError(firstError.message)
    }
    throw error
  }
}

export function validateGetSignatureParams(uri: string, a1Value: string): void {
  try {
    getSignatureParamsSchema.parse({ uri, a1Value })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new TypeError(firstError.message)
    }
    throw error
  }
}

export function validatePostSignatureParams(uri: string, a1Value: string): void {
  try {
    postSignatureParamsSchema.parse({ uri, a1Value })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new TypeError(firstError.message)
    }
    throw error
  }
}

export function validateXsCommonParams(cookieDict: Record<string, any> | string): void {
  try {
    xsCommonParamsSchema.parse({ cookieDict })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new TypeError(firstError.message)
    }
    throw error
  }
}

export class RequestSignatureValidator {
  static validateMethod(method: any): Method {
    if (typeof method !== 'string') {
      throw new TypeError(`method must be str, got ${typeof method}`)
    }

    const normalized = method.trim().toUpperCase()
    if (normalized !== 'GET' && normalized !== 'POST') {
      throw new Error(`method must be 'GET' or 'POST', got '${method}'`)
    }

    return normalized as Method
  }

  static validateUri(uri: any): string {
    if (typeof uri !== 'string') {
      throw new TypeError(`uri must be str, got ${typeof uri}`)
    }

    if (!uri.trim()) {
      throw new Error('uri cannot be empty')
    }

    return uri.trim()
  }

  static validateA1Value(a1Value: any): string {
    if (typeof a1Value !== 'string') {
      throw new TypeError(`a1Value must be str, got ${typeof a1Value}`)
    }

    if (!a1Value.trim()) {
      throw new Error('a1Value cannot be empty')
    }

    return a1Value.trim()
  }

  static validateXsecAppid(xsecAppid: any): string {
    if (typeof xsecAppid !== 'string') {
      throw new TypeError(`xsecAppid must be str, got ${typeof xsecAppid}`)
    }

    if (!xsecAppid.trim()) {
      throw new Error('xsecAppid cannot be empty')
    }

    return xsecAppid.trim()
  }

  static validatePayload(payload: any): Record<string, any> | null {
    if (payload !== null && payload !== undefined && typeof payload !== 'object') {
      throw new TypeError(`payload must be object or null, got ${typeof payload}`)
    }

    if (payload !== null && payload !== undefined) {
      for (const key of Object.keys(payload)) {
        if (typeof key !== 'string') {
          throw new TypeError(`payload keys must be string, got ${typeof key} for key '${key}'`)
        }
      }
    }

    return payload ?? null
  }

  static validateCookie(cookie: any): Record<string, any> | string {
    if (cookie === null || cookie === undefined) {
      throw new TypeError('cookie must be object or string, got null')
    }
    if (typeof cookie !== 'object' && typeof cookie !== 'string') {
      throw new TypeError(`cookie must be object or string, got ${typeof cookie}`)
    }

    if (typeof cookie === 'object') {
      for (const key of Object.keys(cookie)) {
        if (typeof key !== 'string') {
          throw new TypeError(`cookie keys must be string, got ${typeof key} for key '${key}'`)
        }
      }
    }

    return cookie
  }
}
