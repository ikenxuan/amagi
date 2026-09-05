/**
 * 抖音免鉴权接口 (iesdouyin v2 游客端点、App 表情资源包)
 *
 * 这几条都不需要 cookie、不算签名、不经 Argus，但仍走 `fetchDouyinInternal`，
 * 因此事件、超时与错误信封与其他接口一致。返回的是原样 JSON，字段怎么读由调用方决定。
 *
 * @module fetchers/douyin/guest
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, DouyinGuestMusicListOptions, DouyinGuestMusicOptions, DouyinGuestUserOptions, TypeMode } from '../types'
import { fetchDouyinInternal } from './internal'

/**
 * 通过抖音号获取用户信息
 *
 * 唯一免签名的抖音号转 sec_uid 途径。`searchContent` 需要 a_bogus、会被风控按概率拦下，
 * 而且是模糊匹配。抖音号不存在时接口返回 `status_code: 5`，落在失败信封里。
 *
 * @param options - 请求选项
 * @param options.unique_id - 抖音号
 * @param cookie - 抖音 Cookie (该接口不需要，保留以与其他 fetcher 同形)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户信息
 * @example
 * ```typescript
 * const result = await fetchGuestUserInfo({ unique_id: 'ubb_up' })
 * console.log(result.data.user_info.sec_uid)
 * ```
 */
export async function fetchGuestUserInfo<M extends TypeMode = 'loose'>(
  options: DouyinGuestUserOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['guestUserInfo'], M>>> {
  return fetchDouyinInternal('guestUserInfo', options, { cookie, requestConfig })
}

/**
 * 获取原声本体 (免鉴权)
 *
 * 返回的 `music_info` 没有 `play_url`，mp3 只能从源作品上取 ——
 * `extra.extract_item_id` 就是创建这条原声的那个作品。
 *
 * @param options - 请求选项
 * @param options.music_id - 原声 ID (mid)
 * @param cookie - 抖音 Cookie (该接口不需要)
 * @param requestConfig - 请求配置 (可选)
 * @returns 原声信息
 */
export async function fetchGuestMusicInfo<M extends TypeMode = 'loose'>(
  options: DouyinGuestMusicOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['guestMusicInfo'], M>>> {
  return fetchDouyinInternal('guestMusicInfo', options, { cookie, requestConfig })
}

/**
 * 获取使用某条原声的作品列表 (免鉴权)
 *
 * 每条的 `music` 字段被抖音裁成空对象，所以这条接口只能用来拿 `aweme_id`。
 *
 * @param options - 请求选项
 * @param options.music_id - 原声 ID
 * @param options.number - 获取数量，默认 10
 * @param options.cursor - 游标，用于翻页
 * @param cookie - 抖音 Cookie (该接口不需要)
 * @param requestConfig - 请求配置 (可选)
 * @returns 作品列表
 */
export async function fetchGuestMusicAwemeList<M extends TypeMode = 'loose'>(
  options: DouyinGuestMusicListOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['guestMusicAwemeList'], M>>> {
  return fetchDouyinInternal('guestMusicAwemeList', options, { cookie, requestConfig })
}

/**
 * 获取表情资源包元信息 (免鉴权)
 *
 * 返回的 `android_emoji_resource` 形如 `{ id, md5, resource_url, update_time }`，
 * `md5` 同时是版本号，抖音 App 自己就按它做增量判断。下载、校验、解包属于业务逻辑，
 * 这里只回答「是哪个包、去哪下」。
 *
 * @param options - 请求选项 (可选)
 * @param options.typeMode - 类型模式: 'strict' 返回严格类型, 'loose' 返回 any
 * @param cookie - 抖音 Cookie (该接口不需要)
 * @param requestConfig - 请求配置 (可选)
 * @returns 资源包元信息
 */
export async function fetchEmojiResourceMeta<M extends TypeMode = 'loose'>(
  options?: { typeMode?: M },
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['emojiResourceMeta'], M>>> {
  return fetchDouyinInternal('emojiResourceMeta', {}, { cookie, requestConfig })
}
