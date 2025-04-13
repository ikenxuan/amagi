import { BilibiliDataOptionsMap, DouyinDataOptionsMap, KuaishouDataOptionsMap } from 'amagi/types'
import { logger } from './logger'

/**
 * 参数检查
 * @param data - 参数对象
 * @param fields - 要对data进行检查的字段
 * @param atLeastOne - 是否至少有一个字段存在即可通过检查，默认为false
 */
export const DouyinValidateData = <T extends keyof DouyinDataOptionsMap> (
  data: DouyinDataOptionsMap[T]['opt'], // 根据 methodType 动态关联 opt 类型
  fields: (keyof Omit<DouyinDataOptionsMap[T]['opt'], 'methodType' | 'typeMode'>)[],
  atLeastOne = false
): void => {
  const checkField = (field: keyof Omit<DouyinDataOptionsMap[T]['opt'], 'methodType' | 'typeMode'>) =>
    Object.prototype.hasOwnProperty.call(data, field)

  const isValid = atLeastOne
    ? fields.some(checkField)
    : fields.every(checkField)

  if (!isValid) {
    const missingFields = atLeastOne ? fields : fields.filter(f => !checkField(f))
    const missingStr = missingFields.map(f => `'${logger.green(f.toString())}'`).join(', ')
    throw new Error(`获取「${data.methodType}」${logger.red('缺少参数')}: ${missingStr}`)
  }
}

/**
 * 参数检查
 * @param data - 参数对象
 * @param fields - 要对data进行检查的字段
 * @param atLeastOne - 是否至少有一个字段存在即可通过检查，默认为false
 */
export const BilibiliValidateData = <T extends keyof BilibiliDataOptionsMap> (
  data: BilibiliDataOptionsMap[T]['opt'], // 根据 methodType 动态关联 opt 类型
  fields: (keyof Omit<BilibiliDataOptionsMap[T]['opt'], 'methodType' | 'typeMode'>)[],
  atLeastOne = false
): void => {
  const checkField = (field: keyof Omit<BilibiliDataOptionsMap[T]['opt'], 'methodType' | 'typeMode'>) =>
    Object.prototype.hasOwnProperty.call(data, field)

  const isValid = atLeastOne
    ? fields.some(checkField)
    : fields.every(checkField)

  if (!isValid) {
    const missingFields = atLeastOne ? fields : fields.filter(f => !checkField(f))
    const missingStr = missingFields.map(f => `'${logger.green(f.toString())}'`).join(', ')
    throw new Error(`获取「${data.methodType}」${logger.red('缺少参数')}: ${missingStr}`)
  }
}

/**
 * 参数检查
 * @param data - 参数对象
 * @param fields - 要对data进行检查的字段
 * @param atLeastOne - 是否至少有一个字段存在即可通过检查，默认为false
 */
export const KusiahouValidateData = <T extends keyof KuaishouDataOptionsMap> (
  data: KuaishouDataOptionsMap[T]['opt'], // 根据 methodType 动态关联 opt 类型
  fields: (keyof Omit<KuaishouDataOptionsMap[T]['opt'], 'methodType' | 'typeMode'>)[],
  atLeastOne = false
): void => {
  const checkField = (field: keyof Omit<KuaishouDataOptionsMap[T]['opt'], 'methodType' | 'typeMode'>) =>
    Object.prototype.hasOwnProperty.call(data, field)

  const isValid = atLeastOne
    ? fields.some(checkField)
    : fields.every(checkField)

  if (!isValid) {
    const missingFields = atLeastOne ? fields : fields.filter(f => !checkField(f))
    const missingStr = missingFields.map(f => `'${logger.green(f.toString())}'`).join(', ')
    throw new Error(`获取「${data.methodType}」${logger.red('缺少参数')}: ${missingStr}`)
  }
}