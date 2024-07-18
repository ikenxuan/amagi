import crypto from 'crypto'

export default function MsToken (length: number) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomBytes = crypto.randomBytes(length)
  return Array.from(randomBytes, (byte) => characters[byte % characters.length]).join('')
}
