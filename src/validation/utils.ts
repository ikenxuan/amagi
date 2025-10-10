import { z } from 'zod'

/**
 * 智能数字转换器 - 自动处理字符串到数字的转换并提供自定义错误信息
 * @param errorMessage - 自定义错误信息
 * @param minValue - 最小值限制（可选，默认为1）
 * @param isInteger - 是否要求整数（可选，默认为false）
 * @returns Zod数字验证器
 */
export function smartNumber (errorMessage: string, minValue?: number, isInteger?: boolean): z.ZodNumber
export function smartNumber (errorMessage: string, minValue: number = 1, isInteger: boolean = false): z.ZodNumber {
  if (isInteger) {
    return z.coerce.number({ required_error: errorMessage })
      .int(`${errorMessage.replace('不能为空', '')}必须是整数，不能包含小数`)
      .min(minValue, `${errorMessage.replace('不能为空', '')}必须大于等于${minValue}`)
  } else {
    return z.coerce.number({ required_error: errorMessage })
      .min(minValue, `${errorMessage.replace('不能为空', '')}必须大于等于${minValue}`)
  }
}

/**
 * 智能整数转换器 - 专门用于整数类型的转换
 * @param errorMessage - 自定义错误信息
 * @param minValue - 最小值限制（可选，默认为0）
 * @returns Zod整数验证器
 */
export const smartInteger = (errorMessage: string, minValue: number = 0): z.ZodNumber => {
  return smartNumber(errorMessage, minValue, true)
}

/**
 * 智能正整数转换器 - 专门用于正整数类型的转换
 * @param errorMessage - 自定义错误信息
 * @returns Zod正整数验证器
 */
export const smartPositiveInteger = (errorMessage: string): z.ZodNumber => {
  return smartNumber(errorMessage, 1, true)
}

/**
 * 从页面HTML中提取用户信息
 * @param html - 包含用户页面HTML的字符串
 * @returns 提取到的用户信息对象或null
 */
export const extractCreatorInfoFromHtml = (html: string) => {
  // 匹配包含初始化状态的script标签
  const match = html.match(/<script>window\.__INITIAL_STATE__=(.+)<\/script>/m)
  if (!match) {
    return null
  }

  try {
    // 替换undefined为null并解析JSON
    const jsonStr = match[1].replace(/:undefined/g, ":null")
    const info = JSON.parse(jsonStr)

    // 提取并返回用户页面数据
    return info?.user?.userPageData || null
  } catch (error) {
    // 处理JSON解析错误
    console.error("解析用户信息失败:", error)
    return null
  }
}