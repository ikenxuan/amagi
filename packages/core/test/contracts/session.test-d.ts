import { expectTypeOf, describe, expect, it } from 'vitest'
import type { ChallengeAnswer, LoginChallenge, SmsChallenge, CaptchaChallenge } from 'amagi/contracts/session'
/**
 * ChallengeAnswer 的严格签名。
 *
 * 判据：`onChallenge` 返回错字段编译报错 ——
 * `sms` 分支返 `{ ticket }` 报错、`captcha` 分支返 `{ code }` 报错。
 */

declare const sms: SmsChallenge
declare const captcha: CaptchaChallenge
declare const mixed: LoginChallenge

describe('ChallengeAnswer 的判别联合', () => {
  it('sms 分支 → { code: string }', () => {
    expectTypeOf<ChallengeAnswer<typeof sms>>().toEqualTypeOf<{ code: string }>()
  })

  it('captcha 分支 → { ticket: string; randstr?: string }', () => {
    expectTypeOf<ChallengeAnswer<typeof captcha>>().toEqualTypeOf<{ ticket: string; randstr?: string }>()
  })

  it('未收窄的 LoginChallenge → 两个分支的联合', () => {
    type Union = { code: string } | { ticket: string; randstr?: string }
    expectTypeOf<ChallengeAnswer<typeof mixed>>().toEqualTypeOf<Union>()
  })

  // —— 错字段编译报错（tsc 层面，vitest typecheck 会失败） ——
  // sms 分支返回 { ticket } 必须报错：
  // @ts-expect-error sms 分支只能返回 { code: string }
  const badSms: ChallengeAnswer<SmsChallenge> = { ticket: 'x' }
  // captcha 分支返回 { code } 必须报错：
  // @ts-expect-error captcha 分支不接受 code
  const badCaptcha: ChallengeAnswer<CaptchaChallenge> = { code: '1' }
  // code 必须是 string，不能是 number：
  // @ts-expect-error code 必须是 string
  const badCodeType: ChallengeAnswer<SmsChallenge> = { code: 123456 }

  expect([badSms, badCaptcha, badCodeType]).toBeDefined()
})
