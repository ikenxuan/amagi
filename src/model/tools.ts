import { logger } from './logger'

/**
 * 参数检查
 * @param data - 参数对象
 * @param fields - 要对data进行检查的字段
 */
export const validateData = (data: { methodType: string } & Record<string, any>, fields: string[]): void => {
  const missingFields: string[] = fields.filter(field => !data.hasOwnProperty(field))

  if (missingFields.length > 0) {
    const missingFieldsString = missingFields.map(field => `'${logger.green(field)}'`).join(', ')
    throw new Error(`获取「${data.methodType}」${logger.red('缺少必要的参数')}: ${missingFieldsString}`)
  }
}
