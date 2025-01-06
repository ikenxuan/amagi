// 定义一个去除指定字段的类型
export type OmitMethodType<T> = Omit<T, 'methodType'>

/**
 * 参数检查
 * @param data 参数对象
 * @param fields 要对data进行检查的字段
 */
export const validateData = (data: { methodType: string } & Record<string, any>, fields: string[]): void => {
  fields.forEach(field => {
    if (!data.hasOwnProperty(field)) {
      throw new Error(`获取「${data.methodType}」缺少必要的参数: '${field}'`)
    }
  })
}
