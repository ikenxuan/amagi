/**
 * `account_sdk_source_info`：对 JSON 字符串逐字符 XOR 5，再按 JS `toString(16)` 无补零拼成 hex。
 */
export function encodeSourceInfo(plain: string): string {
  let out = ''
  for (const ch of plain) {
    out += ((ch.codePointAt(0) ?? 0) ^ 5).toString(16)
  }
  return out
}
