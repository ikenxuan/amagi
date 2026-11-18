import type zod from 'zod'

import { defineEndpoint, type EndpointDef, type ExclusiveShaping, type PageOf } from '../../../contracts/endpoint'
import { awemeJudge } from './judge'
import { requireAppSigner, signAppRequest } from './sign'

export { internalParam, type } from '../../../contracts/endpoint'

/** App 的设备签名与 Web 签名独立，仍复用同一执行管线和 AmagiResult。 */
export const defineAwemeEndpoint = <P extends zod.ZodType, D = unknown, Page = PageOf<D>, Item = unknown>(
  def: EndpointDef<P, D, string, Page, Item> & ExclusiveShaping
): EndpointDef<P, D, string, Page, Item> => defineEndpoint({ ...def, prepare: requireAppSigner, sign: signAppRequest, judge: awemeJudge })
