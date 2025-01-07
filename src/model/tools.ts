import { logger } from './logger'

/**
 * 参数检查
 * @param data - 参数对象
 * @param fields - 要对data进行检查的字段
 * @param atLeastOne - 是否至少有一个字段存在即可通过检查，默认为false
 */
export const validateData = (data: { methodType: string } & Record<string, any>, fields: string[], atLeastOne = false): void => {
  const missingFields = atLeastOne
    ? fields.filter(field => !data.hasOwnProperty(field))
    : fields.filter(field => data.hasOwnProperty(field))

  if (missingFields.length) {
    const missingFieldsString = missingFields.map(field => `'${logger.green(field)}'`).join(', ')
    throw new Error(`获取「${data.methodType}」${logger.red('缺少必要的参数')}: ${missingFieldsString}`)
  }
}
