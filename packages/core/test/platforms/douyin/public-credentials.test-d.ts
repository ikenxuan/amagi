import amagi, { tools, checkDouyinLoginState, mintDouyinGuestCookie, normalizeDouyinCookie, resolveDouyinCredential } from 'amagi/index'
import type {
  CheckDouyinLoginStateOptions,
  DouyinCredentialOrigin,
  DouyinCredentialRequestOptions,
  DouyinLoginCheck,
  DouyinLoginState,
  DouyinUifidSource,
  MintDouyinGuestCookieOptions,
  NormalizedDouyinCookie,
  ResolvedDouyinCredential,
  ResolveDouyinCredentialOptions
} from 'amagi/index'
import { describe, expectTypeOf, it } from 'vitest'

describe('public Douyin credential types', () => {
  it('exports every options/result type used by the package entry points', () => {
    expectTypeOf<ReturnType<typeof normalizeDouyinCookie>>().toEqualTypeOf<NormalizedDouyinCookie>()
    expectTypeOf<Awaited<ReturnType<typeof resolveDouyinCredential>>>().toEqualTypeOf<ResolvedDouyinCredential>()
    expectTypeOf<Parameters<typeof resolveDouyinCredential>[1]>().toEqualTypeOf<ResolveDouyinCredentialOptions | undefined>()
    expectTypeOf<Parameters<typeof checkDouyinLoginState>[1]>().toEqualTypeOf<CheckDouyinLoginStateOptions | undefined>()
    expectTypeOf<Awaited<ReturnType<typeof checkDouyinLoginState>>>().toEqualTypeOf<DouyinLoginCheck>()
    expectTypeOf<Parameters<typeof mintDouyinGuestCookie>[0]>().toEqualTypeOf<MintDouyinGuestCookieOptions | undefined>()
    expectTypeOf<ResolvedDouyinCredential['origin']>().toEqualTypeOf<DouyinCredentialOrigin>()
    expectTypeOf<NormalizedDouyinCookie['uifidSource']>().toEqualTypeOf<DouyinUifidSource>()
    expectTypeOf<DouyinLoginCheck['state']>().toEqualTypeOf<DouyinLoginState>()
    expectTypeOf<ResolveDouyinCredentialOptions>().toExtend<DouyinCredentialRequestOptions>()
  })

  it('retains credential signatures on root tools and legacy static namespace', () => {
    expectTypeOf(amagi.douyin.credentials.resolve).toEqualTypeOf<typeof resolveDouyinCredential>()
    expectTypeOf(tools.douyin.credentials.resolve).toEqualTypeOf<typeof resolveDouyinCredential>()
    expectTypeOf(tools.douyin.credentials.checkLoginState).toEqualTypeOf<typeof checkDouyinLoginState>()
    expectTypeOf(tools.douyin.credentials.mintGuestCookie).toEqualTypeOf<typeof mintDouyinGuestCookie>()
  })
})
