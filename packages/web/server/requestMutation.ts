import type { JsonValue } from '../shared/contract'

const PARAMS_HASH = /^[0-9a-f]{12}$/

type InvalidMutation = { ok: false; issue: string }
type ValidUpsert = { ok: true; op: 'upsert'; params: Record<string, JsonValue>; issue?: undefined }
type ValidRemove = { ok: true; op: 'remove'; paramsHash: string; issue?: undefined }

export function validateRequestMutation(op: 'upsert', body: Record<string, JsonValue>): InvalidMutation | ValidUpsert
export function validateRequestMutation(op: 'remove', body: Record<string, JsonValue>): InvalidMutation | ValidRemove
/** `/api/requests` 写操作的无副作用边界校验。 */
export function validateRequestMutation(
  op: 'upsert' | 'remove',
  body: Record<string, JsonValue>
): InvalidMutation | ValidUpsert | ValidRemove {
  if (op === 'upsert') {
    const params = body.params
    if (typeof params !== 'object' || params === null || Array.isArray(params)) {
      return { ok: false, issue: 'upsert 要显式给 params JSON 对象；无参数端点也要给 {}' }
    }
    return { ok: true, op, params: params as Record<string, JsonValue> }
  }

  const paramsHash = body.paramsHash
  if (typeof paramsHash !== 'string' || !PARAMS_HASH.test(paramsHash)) {
    return { ok: false, issue: 'remove 要给 12 位小写十六进制 paramsHash（不接受空白、前后空格或其他格式）' }
  }
  return { ok: true, op, paramsHash }
}
