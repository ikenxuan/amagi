import crypto from 'crypto'

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

export default async function getCorrespondPath (timestamp: number): Promise<string> {
  const data = new TextEncoder().encode(`refresh_${timestamp}`)
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, data))
  return encrypted.reduce((str, c) => str + c.toString(16).padStart(2, '0'), '')
}
