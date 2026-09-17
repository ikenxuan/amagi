/** 各平台「成功」响应的最小骨架，形状取自 v6 各 internal.ts 的成功判定条件。 */

/** 抖音：`internal.ts` 要求 `status_code === 0` 且 `data !== ''` */
export const douyinOk = <T extends Record<string, unknown>>(extra: T) => ({ status_code: 0, ...extra })

/** B站：`internal.ts` 要求 `code === 0` */
export const bilibiliOk = <T>(data: T, extra: Record<string, unknown> = {}) => ({
  code: 0,
  message: '0',
  ttl: 1,
  data,
  ...extra
})

/** 快手：`internal.ts` 只在 code 命中 kuaishouAPIErrorCode 时判失败，故成功可不带 code */
export const kuaishouOk = <T extends Record<string, unknown>>(extra: T) => ({ ...extra })

/** 小红书：getdata 的 GlobalGetData 要求 code === 0 */
export const xiaohongshuOk = <T extends Record<string, unknown>>(extra: T) => ({ code: 0, success: true, ...extra })

/** 一个合法的 douyin sec_uid 形状 */
export const SEC_UID = 'MS4wLjABAAAAtest_sec_uid_value_0123456789'
/** 一个合法的 aweme_id */
export const AWEME_ID = '7123456789012345678'
/** 一个合法的 bvid */
export const BVID = 'BV1xx411c7mD'
