import { logger } from './logger'

/**
 * 参数检查
 * @param data - 参数对象
 * @param fields - 要对data进行检查的字段
 * @param atLeastOne - 是否至少有一个字段存在即可通过检查，默认为false
 */
export const validateData = (data: { methodType: string } & Record<string, any>, fields: string[], atLeastOne = false): void => {
  const checkField = (field: string) => Object.prototype.hasOwnProperty.call(data, field)

  const isValid = atLeastOne
    ? fields.some(checkField) // 至少一个字段存在
    : fields.every(checkField) // 所有字段都必须存在

  if (isValid === false) {
    const missingFields = atLeastOne
      ? fields // 如果是至少一个，则提示所有字段
      : fields.filter(field => !checkField(field)) // 否则只提示缺失的字段

    const missingFieldsString = missingFields.map(field => `'${logger.green(field)}'`).join(', ')
    throw new Error(`获取「${data.methodType}」${logger.red('缺少必要的参数')}: ${missingFieldsString}`)
  }
}
