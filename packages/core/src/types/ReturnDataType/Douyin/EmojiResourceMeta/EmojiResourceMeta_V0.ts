/**
 * 表情资源包元信息（免鉴权）—— 抖音 App 的 `api.amemv.com` 接口。
 *
 * `md5` 同时是版本号，抖音 App 自己就按它做增量判断。下载、校验、解包属于业务逻辑，
 * 这条接口只回答「是哪个包、去哪下」（#188）。
 *
 * **字段清单未经 corpus 样本验证**，其余靠索引签名开放。
 */
export type DyEmojiResourceMeta_V0 = {
  android_emoji_resource?: EmojiResource
  [property: string]: any
}

type EmojiResource = {
  id?: number | string
  /** 同时是版本号 */
  md5?: string
  resource_url?: string
  update_time?: number | string
  [property: string]: any
}
