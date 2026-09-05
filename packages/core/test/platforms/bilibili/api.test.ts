import { bilibiliApiUrls as v7Api } from 'amagi/platforms/bilibili/api'
import { bilibiliApiUrls as v6Api } from 'amagi/platform/bilibili/API'
/**
 * platforms/bilibili/api 的契约。
 *
 * 判据：**v6 的 `api-urls.test.ts` 快照一字不变**（无随机参数，直接逐项对照），
 * 另加 #22/A6 改写：`getComments` 的 plat / seek_rpid / web_location 读参数，
 * 不再硬编码。
 */
import { describe, expect, it } from 'vitest'

const same = (v7: () => string, v6: () => string): void => {
  expect(v7()).toBe(v6())
}

describe('platforms/bilibili/api 与 v6 逐项对照', () => {
  it('getLoginStatus', () => {
    same(() => v7Api.getLoginStatus(), () => v6Api.getLoginStatus())
  })

  it('getVideoInfo', () => {
    same(() => v7Api.getVideoInfo({ bvid: 'BV1xx411c7mD' }), () => v6Api.getVideoInfo({ bvid: 'BV1xx411c7mD' } as never))
  })

  it('getVideoStream', () => {
    same(() => v7Api.getVideoStream({ avid: 170001, cid: 29802877 }), () => v6Api.getVideoStream({ avid: 170001, cid: 29802877 } as never))
  })

  it('getComments（缺省参数）', () => {
    same(() => v7Api.getComments({ oid: '170001', type: 1 }), () => v6Api.getComments({ oid: '170001', type: 1 } as never))
  })

  it('getComments（带 mode / pagination_str）', () => {
    same(
      () => v7Api.getComments({ oid: '170001', type: 1, mode: 2, pagination_str: 'TOKEN' }),
      () => v6Api.getComments({ oid: '170001', type: 1, mode: 2, pagination_str: 'TOKEN' } as never)
    )
  })

  it('getCommentStatus / getCommentReplies', () => {
    same(() => v7Api.getCommentStatus({ oid: '1', type: 1 }), () => v6Api.getCommentStatus({ oid: '1', type: 1 } as never))
    same(
      () => v7Api.getCommentReplies({ oid: '1', type: 1, root: '100', number: 5 }),
      () => v6Api.getCommentReplies({ oid: '1', type: 1, root: '100', number: 5 } as never)
    )
  })

  it('getEmojiList / getBangumiInfo / getBangumiStream', () => {
    same(() => v7Api.getEmojiList(), () => v6Api.getEmojiList())
    same(() => v7Api.getBangumiInfo({ season_id: 'ss33802' }), () => v6Api.getBangumiInfo({ season_id: 'ss33802' } as never))
    same(() => v7Api.getBangumiInfo({ ep_id: 'ep330798' }), () => v6Api.getBangumiInfo({ ep_id: 'ep330798' } as never))
    same(
      () => v7Api.getBangumiStream({ cid: 1, ep_id: '330798' }),
      () => v6Api.getBangumiStream({ cid: 1, ep_id: '330798' } as never)
    )
  })

  it('用户类：getUserDynamicList / getUserCard / getUserLiveStatus / getUserSpaceInfo / getUploaderTotalViews', () => {
    const p = { host_mid: 208259 }
    same(() => v7Api.getUserDynamicList(p), () => v6Api.getUserDynamicList(p as never))
    same(() => v7Api.getUserCard(p), () => v6Api.getUserCard(p as never))
    same(() => v7Api.getUserLiveStatus(p), () => v6Api.getUserLiveStatus(p as never))
    same(() => v7Api.getUserSpaceInfo(p), () => v6Api.getUserSpaceInfo(p as never))
    same(() => v7Api.getUploaderTotalViews(p), () => v6Api.getUploaderTotalViews(p as never))
  })

  it('getDynamicDetail / 直播间 / 登录 / 二维码', () => {
    same(() => v7Api.getDynamicDetail({ dynamic_id: 'd1' }), () => v6Api.getDynamicDetail({ dynamic_id: 'd1' } as never))
    same(() => v7Api.getLiveRoomInfo({ room_id: 'r1' }), () => v6Api.getLiveRoomInfo({ room_id: 'r1' } as never))
    same(() => v7Api.getLiveRoomInit({ room_id: 'r1' }), () => v6Api.getLiveRoomInit({ room_id: 'r1' } as never))
    same(() => v7Api.getLoginQrcode(), () => v6Api.getLoginQrcode())
    same(() => v7Api.getQrcodeStatus({ qrcode_key: 'k1' }), () => v6Api.getQrcodeStatus({ qrcode_key: 'k1' } as never))
  })

  it('专栏类', () => {
    same(() => v7Api.getArticleContent({ id: 'cv1' }), () => v6Api.getArticleContent({ id: 'cv1' } as never))
    same(() => v7Api.getArticleCards({ ids: ['av1', 'cv2'] }), () => v6Api.getArticleCards({ ids: ['av1', 'cv2'] } as never))
    same(() => v7Api.getArticleInfo({ id: 'cv1' }), () => v6Api.getArticleInfo({ id: 'cv1' } as never))
    same(() => v7Api.getArticleListInfo({ id: 'a1' }), () => v6Api.getArticleListInfo({ id: 'a1' } as never))
  })

  it('验证码 / 弹幕', () => {
    const voucher = { v_voucher: 'v1' }
    same(() => v7Api.getCaptchaFromVoucher(voucher).Url, () => v6Api.getCaptchaFromVoucher(voucher as never).Url)
    const captcha = { challenge: 'c', token: 't', validate: 'v', seccode: 's' }
    same(() => v7Api.validateCaptcha(captcha).Url, () => v6Api.validateCaptcha(captcha as never).Url)
    same(() => v7Api.getVideoDanmaku({ cid: 1 }), () => v6Api.getVideoDanmaku({ cid: 1 } as never))
  })
})

describe('#22/A6 改写：getComments 读参数，不再硬编码', () => {
  it('plat / seek_rpid / web_location 从 params 取', () => {
    const query = new URL(v7Api.getComments({ oid: '1', type: 1, plat: 9, seek_rpid: '123', web_location: '111' })).searchParams
    expect(query.get('plat')).toBe('9')
    expect(query.get('seek_rpid')).toBe('123')
    expect(query.get('web_location')).toBe('111')
  })

  it('缺省值与 v6 硬编码一致', () => {
    const query = new URL(v7Api.getComments({ oid: '1', type: 1 })).searchParams
    expect(query.get('plat')).toBe('1')
    expect(query.get('seek_rpid')).toBe('')
    expect(query.get('web_location')).toBe('1315875')
  })
})
