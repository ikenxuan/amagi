import type { RequestConfig } from '../../../contracts/request'
import { AmagiHeaders } from '../../../contracts/request'

/** App 公共头和游客身份都由签名对象提供，不采用 Web 平台基线。 */
export const createAwemeConfig = (_cookie: string, requestConfig: RequestConfig = {}) => ({
  headers: new AmagiHeaders(),
  requestConfig: { timeout: 10000, ...requestConfig }
})
