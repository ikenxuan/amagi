/**
 * bd-ticket-guard 设备票据
 *
 * 抖音的设备真实性风控。常见的说法是必须从浏览器 localStorage 里导出一对密钥才能用，
 * 但那只适用于「已登录之后」的接口 —— **登录流程本身就是票据的签发入口**：
 *
 * 1. 本地生成一对 P-256 密钥
 * 2. 把公钥写进 `bd_ticket_guard_client_data` cookie，在取二维码**之前**交给服务端
 * 3. 服务端在后续响应的 `bd-ticket-guard-server-data` 头里签发 `{ticket, ts_sign, client_cert}`
 * 4. 之后每个请求用 `ECDH(自己的私钥, client_cert 里的服务端公钥)` 派生的密钥
 *    对 `ticket=…&path=…&timestamp=…` 做 HMAC，放进 `bd-ticket-guard-client-data` 头
 *
 * 全程不需要浏览器，票据是服务端真实签发给我们自己这把密钥的，没有任何伪造数据。
 * 密钥与票据以 `__amagi_` 前缀存在 CookieJar 里，只在调用之间传递，不会发给服务端。
 */
import crypto from 'node:crypto'

import { CookieJar, INTERNAL_PREFIX } from './cookieJar'

/** 交给服务端的公钥所在的 cookie */
const CLIENT_DATA_COOKIE = 'bd_ticket_guard_client_data'

/** 声明 web 域版本的 cookie */
const CLIENT_WEB_DOMAIN_COOKIE = 'bd_ticket_guard_client_web_domain'

/** 服务端也可能把签发结果放在这条 cookie 里 */
const SERVER_DATA_COOKIE = 'bd_ticket_guard_server_data'

/** 服务端签发结果所在的响应头 */
const SERVER_DATA_HEADER = 'bd-ticket-guard-server-data'

/** 本地会话状态：PKCS#8 私钥（base64） */
const KEY_ENTRY = `${INTERNAL_PREFIX}tg_key`

/** 本地会话状态：服务端签发的票据 */
const TICKET_ENTRY = `${INTERNAL_PREFIX}tg_ticket`

/** 本地会话状态：票据的时间戳签名 */
const TS_SIGN_ENTRY = `${INTERNAL_PREFIX}tg_ts_sign`

/** 本地会话状态：ECDH 派生出的 HMAC 密钥（hex） */
const ECDH_ENTRY = `${INTERNAL_PREFIX}tg_ecdh`

/** SDK 声明的 ticket-guard 版本 */
const GUARD_VERSION = '2'

/** SDK 声明的迭代版本 */
const ITERATION_VERSION = '1'

/** P-256 公钥的 SubjectPublicKeyInfo 前缀，其后紧跟 65 字节未压缩点 */
const P256_SPKI_PREFIX = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex')

/** 被签名内容的字段列表，需与实际拼接顺序一致 */
const REQ_CONTENT = 'ticket,path,timestamp'

/** 紧凑 JSON，与浏览器的 `JSON.stringify` 一致 */
const compactJson = (value: unknown): string => JSON.stringify(value)

/**
 * 从 PEM 证书或 `pub.<base64>` 里取出服务端公钥
 * @param clientCert 服务端下发的 client_cert
 */
const readServerPublicKey = (clientCert: string): crypto.KeyObject => {
  if (clientCert.startsWith('pub.')) {
    const point = Buffer.from(clientCert.slice(4), 'base64')
    // 兼容带与不带 0x04 前缀两种形式
    const body = point.length === 65 ? point.subarray(1) : point
    const spki = Buffer.concat([P256_SPKI_PREFIX, Buffer.from([0x04]), body])
    return crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' })
  }

  return new crypto.X509Certificate(clientCert).publicKey
}

/** 一次登录会话持有的 ticket-guard 状态 */
export interface TicketGuardState {
  /** 服务端签发的票据 */
  ticket: string
  /** 票据的时间戳签名 */
  tsSign: string
  /** ECDH 派生出的 HMAC 密钥 */
  ecdhKey: Buffer
}

/**
 * bd-ticket-guard 会话
 *
 * 状态全部读写自传入的 CookieJar，因此与 passport 的无状态调用形态天然兼容。
 */
export class TicketGuard {
  /**
   * @param jar 当前会话 cookie
   */
  constructor(private readonly jar: CookieJar) {}

  /** 本会话的私钥，缺失时生成一把并写回 CookieJar */
  private get privateKey(): crypto.KeyObject {
    const stored = this.jar.get(KEY_ENTRY)
    if (stored) {
      return crypto.createPrivateKey({ key: Buffer.from(stored, 'base64'), format: 'der', type: 'pkcs8' })
    }

    const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    const der = privateKey.export({ format: 'der', type: 'pkcs8' })
    this.jar.set(KEY_ENTRY, der.toString('base64'))
    return privateKey
  }

  /** 未压缩格式的公钥（base64），即 `bd-ticket-guard-ree-public-key` */
  get reePublicKey(): string {
    const publicKey = crypto.createPublicKey(this.privateKey)
    const spki = publicKey.export({ format: 'der', type: 'spki' })
    return spki.subarray(spki.length - 65).toString('base64')
  }

  /** 已签发的票据，未签发时为 undefined */
  get state(): TicketGuardState | undefined {
    const ticket = this.jar.get(TICKET_ENTRY)
    const tsSign = this.jar.get(TS_SIGN_ENTRY)
    const ecdh = this.jar.get(ECDH_ENTRY)
    if (!ticket || !tsSign || !ecdh) return undefined
    return { ticket, tsSign, ecdhKey: Buffer.from(ecdh, 'hex') }
  }

  /**
   * 在首个 passport 请求之前把公钥交给服务端
   *
   * 缺了这一步扫码依然能成功，但服务端不会签发票据，后续请求也就无从携带。
   */
  publishPublicKey(): void {
    const payload = compactJson({
      'bd-ticket-guard-version': Number(GUARD_VERSION),
      'bd-ticket-guard-iteration-version': Number(ITERATION_VERSION),
      'bd-ticket-guard-ree-public-key': this.reePublicKey,
      'bd-ticket-guard-web-version': Number(GUARD_VERSION)
    })
    this.jar.set(CLIENT_DATA_COOKIE, encodeURIComponent(Buffer.from(payload, 'utf8').toString('base64')))
    this.jar.set(CLIENT_WEB_DOMAIN_COOKIE, GUARD_VERSION)
  }

  /**
   * 消化响应里可能带回的票据签发结果
   * @param headers 响应头
   * @returns 是否收到了新票据
   */
  applyServerData(headers: Record<string, unknown>): boolean {
    const fromHeader = headers[SERVER_DATA_HEADER]
    const raw = typeof fromHeader === 'string' && fromHeader ? fromHeader : this.jar.get(SERVER_DATA_COOKIE)
    if (!raw) return false

    let info: { ticket?: string; ts_sign?: string; client_cert?: string }
    try {
      info = JSON.parse(Buffer.from(decodeURIComponent(raw), 'base64').toString('utf8'))
    } catch {
      return false
    }

    if (!info.ticket || !info.ts_sign || !info.client_cert) return false

    let ecdhKey: Buffer
    try {
      ecdhKey = this.deriveEcdhKey(info.client_cert)
    } catch {
      return false
    }

    this.jar.set(TICKET_ENTRY, info.ticket)
    this.jar.set(TS_SIGN_ENTRY, info.ts_sign)
    this.jar.set(ECDH_ENTRY, ecdhKey.toString('hex'))
    return true
  }

  /**
   * 生成本次请求的 bd-ticket-guard 请求头
   *
   * 尚未拿到票据时只声明公钥，让服务端有机会签发；拿到之后带完整签名。
   * @param path 请求路径，不含 query
   * @param timestamp 秒级时间戳，默认取当前
   */
  headers(path: string, timestamp = Math.floor(Date.now() / 1000)): Record<string, string> {
    const base: Record<string, string> = {
      'bd-ticket-guard-version': GUARD_VERSION,
      'bd-ticket-guard-iteration-version': ITERATION_VERSION,
      'bd-ticket-guard-ree-public-key': this.reePublicKey
    }

    const state = this.state
    if (!state) return base

    const signed = `ticket=${state.ticket}&path=${path}&timestamp=${timestamp}`
    const clientData = compactJson({
      ts_sign: state.tsSign,
      req_content: REQ_CONTENT,
      req_sign: crypto.createHmac('sha256', state.ecdhKey).update(signed, 'utf8').digest('base64'),
      timestamp
    })

    return {
      ...base,
      'bd-ticket-guard-client-data': Buffer.from(clientData, 'utf8').toString('base64'),
      // ts.1 与 ts.2 是两代票据格式，web-version 跟随票据本身
      'bd-ticket-guard-web-version': state.tsSign.startsWith('ts.1') ? '1' : GUARD_VERSION,
      // 1 表示 req_sign 走 ECDH + HMAC
      'bd-ticket-guard-web-sign-type': '1'
    }
  }

  /**
   * ECDH + HKDF-SHA256 派生 HMAC 密钥
   * @param clientCert 服务端下发的证书或裸公钥
   */
  private deriveEcdhKey(clientCert: string): Buffer {
    const shared = crypto.diffieHellman({
      privateKey: this.privateKey,
      publicKey: readServerPublicKey(clientCert)
    })
    return Buffer.from(crypto.hkdfSync('sha256', shared, Buffer.alloc(32), Buffer.alloc(0), 32))
  }
}
