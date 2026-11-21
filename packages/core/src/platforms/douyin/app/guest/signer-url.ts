export type AppSignerOperation = 'sign' | 'tt-encrypt'

/** 把 unidbg 站点地址解析为对应的本地操作端点。 */
export const signerEndpointUrl = (signerBaseUrl: string, operation: AppSignerOperation): string => {
  if (!/^https?:\/\/[^/?#]+\/?$/i.test(signerBaseUrl)) {
    throw new TypeError('douyin.app.signerBaseUrl 必须是无路径、查询或凭据的 HTTP(S) 站点地址')
  }
  const url = new URL(signerBaseUrl)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new TypeError('douyin.app.signerBaseUrl 必须是无路径、查询或凭据的 HTTP(S) 站点地址')
  }
  return new URL(`/v1/app/${operation}`, url.origin).toString()
}
