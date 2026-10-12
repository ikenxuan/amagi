/** b1 按不透明字符串保留；undefined 表示未提供。 */
export function validateB1(b1: unknown): asserts b1 is string | undefined {
  if (b1 !== undefined && (typeof b1 !== 'string' || b1.trim().length === 0)) {
    throw new TypeError('b1 必须是非空字符串')
  }
}
