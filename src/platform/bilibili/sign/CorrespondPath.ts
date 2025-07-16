import crypto from 'node:crypto'

const publicKey = await crypto.subtle.importKey(
  'jwk',
  {
    kty: 'RSA',
    n: 'y4HdjgJHBlbaBN04VERG4qNBIFHP6a3GozCl75AihQloSWCXC5HDNgyinEnhaQ_4-gaMud_GF50elYXLlCToR9se9Z8z433U3KjM-3Yx7ptKkmQNAMggQwAVKgq3zYAoidNEWuxpkY_mAitTSRLnsJW-NCTa0bqBFF6Wm1MxgfE',
    e: 'AQAB'
  },
  { name: 'RSA-OAEP', hash: 'SHA-256' },
  true,
  ['encrypt']
)

/**
 * 根据时间戳生成对应的加密路径
 * @param timestamp - 时间戳
 * @returns 返回加密后的十六进制字符串
 */
const getCorrespondPath = async (timestamp: number): Promise<string> => {
  const data = new TextEncoder().encode(`refresh_${timestamp}`)
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, data))
  return encrypted.reduce((str, c) => str + c.toString(16).padStart(2, '0'), '')
}

export default getCorrespondPath
