/**
 * Passport `mix_mode=1`：明文 UTF-8 逐字节 XOR 0x05，两位小写 hex 拼接。
 */
export function mixEncode(plain: string): string {
  const bytes = Buffer.from(plain, 'utf8')
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i]! ^ 5).toString(16).padStart(2, '0')
  }
  return out
}
