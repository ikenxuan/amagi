/**
 * Amagi API 废弃管理模块
 *
 * 提供标准化的废弃 API 处理机制，支持：
 * - 注册废弃的 API 并配置相关信息
 * - 检查 API 是否已废弃并触发警告或错误
 * - 创建废弃 API 存根函数
 * - 使用装饰器模式标记废弃函数
 *
 * @module utils/deprecation
 */

/**
 * 废弃 API 配置接口
 *
 * 用于描述一个废弃 API 的完整信息，包括废弃版本、替代方案等
 */
export interface DeprecationConfig {
  /** 废弃的 API 名称 */
  name: string
  /** 废弃的版本号，如 "6.0.0" */
  deprecatedIn: string
  /** 计划移除的版本号（可选），如 "7.0.0" */
  removedIn?: string
  /** 替代的 API 名称或使用方式 */
  replacement: string
  /** 迁移指南链接或详细说明（可选） */
  migrationGuide?: string
  /** 是否抛出错误，false 则只打印警告，默认为 false */
  throwError?: boolean
}

/**
 * 废弃 API 注册表
 * 存储所有已注册的废弃 API 配置
 */
const deprecatedApis = new Map<string, DeprecationConfig>()

/**
 * 注册一个废弃的 API
 *
 * 将 API 添加到废弃注册表中，后续可通过 checkDeprecation 检查
 *
 * @param config - 废弃配置对象
 *
 * @example
 * ```typescript
 * registerDeprecatedApi({
 *   name: 'getDouyinData',
 *   deprecatedIn: '6.0.0',
 *   removedIn: '7.0.0',
 *   replacement: 'douyinFetcher',
 *   throwError: true
 * })
 * ```
 */
export function registerDeprecatedApi (config: DeprecationConfig): void {
  deprecatedApis.set(config.name, config)
}

/**
 * 检查 API 是否已废弃并进行相应处理
 *
 * 如果 API 已注册为废弃，根据配置决定是打印警告还是抛出错误
 *
 * @param apiName - 要检查的 API 名称
 * @throws {DeprecatedApiError} 如果 API 已废弃且配置为抛出错误
 *
 * @example
 * ```typescript
 * // 在函数开头调用检查
 * function getDouyinData(options) {
 *   checkDeprecation('getDouyinData')
 *   // ...
 * }
 * ```
 */
export function checkDeprecation (apiName: string): void {
  const config = deprecatedApis.get(apiName)
  if (!config) return

  const message = buildDeprecationMessage(config)

  if (config.throwError) {
    throw new DeprecatedApiError(message, config)
  } else {
    console.warn(message)
  }
}

/**
 * 根据配置构建废弃提示消息
 *
 * @param config - 废弃配置
 * @returns 格式化的废弃提示消息字符串
 */
function buildDeprecationMessage (config: DeprecationConfig): string {
  const lines = [
    `[DEPRECATED] "${config.name}" 已在 v${config.deprecatedIn} 版本废弃。`,
    `请使用 "${config.replacement}" 替代。`
  ]

  if (config.removedIn) {
    lines.push(`此 API 将在 v${config.removedIn} 版本移除。`)
  }

  if (config.migrationGuide) {
    lines.push(`迁移指南: ${config.migrationGuide}`)
  }

  return lines.join('\n')
}

/**
 * 废弃 API 调用错误类
 *
 * 当调用已废弃且配置为抛出错误的 API 时抛出此错误
 * 包含完整的废弃配置信息，便于调试和迁移
 */
export class DeprecatedApiError extends Error {
  /** 废弃配置信息，包含替代方案等详细信息 */
  public readonly config: DeprecationConfig

  /**
   * 创建废弃 API 错误实例
   *
   * @param message - 错误消息
   * @param config - 废弃配置对象
   */
  constructor (message: string, config: DeprecationConfig) {
    super(message)
    this.name = 'DeprecatedApiError'
    this.config = config
    Error.captureStackTrace?.(this, DeprecatedApiError)
  }
}

/**
 * 装饰器/包装器，用于标记函数为废弃
 *
 * 返回一个高阶函数，可用于包装现有函数，使其在调用时触发废弃检查
 *
 * @param config - 废弃配置
 * @returns 包装函数，接收原函数并返回带废弃检查的新函数
 *
 * @example
 * ```typescript
 * const deprecatedFn = deprecated({
 *   name: 'oldFunction',
 *   deprecatedIn: '6.0.0',
 *   replacement: 'newFunction'
 * })(originalFunction)
 * ```
 */
export function deprecated<T extends (...args: any[]) => any> (
  config: DeprecationConfig
): (fn: T) => T {
  registerDeprecatedApi(config)

  return (fn: T): T => {
    const wrapper = function (this: any, ...args: any[]) {
      checkDeprecation(config.name)
      return fn.apply(this, args)
    } as T

    Object.defineProperty(wrapper, 'name', { value: fn.name })

    return wrapper
  }
}

/**
 * 创建一个废弃 API 存根函数
 *
 * 返回一个函数，调用时总是抛出 DeprecatedApiError
 * 用于完全移除旧 API 实现但保留函数签名的场景
 *
 * @param config - 废弃配置
 * @returns 调用时抛出 DeprecatedApiError 的存根函数
 *
 * @example
 * ```typescript
 * export const getDouyinData = createDeprecatedStub({
 *   name: 'getDouyinData',
 *   deprecatedIn: '6.0.0',
 *   removedIn: '7.0.0',
 *   replacement: 'douyinFetcher'
 * })
 * ```
 */
export function createDeprecatedStub (config: DeprecationConfig): (...args: any[]) => never {
  registerDeprecatedApi({ ...config, throwError: true })

  return function deprecatedApiStub (..._args: any[]): never {
    checkDeprecation(config.name)
    throw new DeprecatedApiError(buildDeprecationMessage(config), config)
  }
}

// ============================================================================
// v6 版本预注册的废弃 API
// ============================================================================

// 注册 getDouyinData 为废弃
registerDeprecatedApi({
  name: 'getDouyinData',
  deprecatedIn: '6.0.0',
  removedIn: '7.0.0',
  replacement: 'douyinFetcher 或 client.douyin.fetcher',
  migrationGuide: 'https://github.com/ikenxuan/amagi/blob/main/packages/core/MIGRATION-v6.md',
  throwError: true
})

// 注册 getBilibiliData 为废弃
registerDeprecatedApi({
  name: 'getBilibiliData',
  deprecatedIn: '6.0.0',
  removedIn: '7.0.0',
  replacement: 'bilibiliFetcher 或 client.bilibili.fetcher',
  migrationGuide: 'https://github.com/ikenxuan/amagi/blob/main/packages/core/MIGRATION-v6.md',
  throwError: true
})

// 注册 getKuaishouData 为废弃
registerDeprecatedApi({
  name: 'getKuaishouData',
  deprecatedIn: '6.0.0',
  removedIn: '7.0.0',
  replacement: 'kuaishouFetcher 或 client.kuaishou.fetcher',
  migrationGuide: 'https://github.com/ikenxuan/amagi/blob/main/packages/core/MIGRATION-v6.md',
  throwError: true
})

// 注册 getXiaohongshuData 为废弃
registerDeprecatedApi({
  name: 'getXiaohongshuData',
  deprecatedIn: '6.0.0',
  removedIn: '7.0.0',
  replacement: 'xiaohongshuFetcher 或 client.xiaohongshu.fetcher',
  migrationGuide: 'https://github.com/ikenxuan/amagi/blob/main/packages/core/MIGRATION-v6.md',
  throwError: true
})

// 注册中文方法名为废弃
const chineseMethodDeprecations = [
  // Bilibili
  { name: '单个视频作品数据', replacement: 'fetchVideoInfo' },
  { name: '单个视频下载信息数据', replacement: 'fetchVideoStreamUrl' },
  { name: '评论数据', replacement: 'fetchComments' },
  { name: '指定评论的回复', replacement: 'fetchCommentReplies' },
  { name: '用户主页数据', replacement: 'fetchUserCard' },
  { name: '用户主页动态列表数据', replacement: 'fetchUserDynamicList' },
  { name: '用户空间详细信息', replacement: 'fetchUserSpaceInfo' },
  { name: '获取UP主总播放量', replacement: 'fetchUploaderTotalViews' },
  { name: 'Emoji数据', replacement: 'fetchEmojiList' },
  { name: '番剧基本信息数据', replacement: 'fetchBangumiInfo' },
  { name: '番剧下载信息数据', replacement: 'fetchBangumiStreamUrl' },
  { name: '动态详情数据', replacement: 'fetchDynamicDetail' },
  { name: '动态卡片数据', replacement: 'fetchDynamicCard' },
  { name: '直播间信息', replacement: 'fetchLiveRoomInfo' },
  { name: '直播间初始化信息', replacement: 'fetchLiveRoomInitInfo' },
  { name: '登录基本信息', replacement: 'fetchLoginStatus' },
  { name: '申请二维码', replacement: 'requestLoginQrcode' },
  { name: '二维码状态', replacement: 'checkQrcodeStatus' },
  { name: 'AV转BV', replacement: 'convertAvToBv' },
  { name: 'BV转AV', replacement: 'convertBvToAv' },
  { name: '专栏正文内容', replacement: 'fetchArticleContent' },
  { name: '专栏显示卡片信息', replacement: 'fetchArticleCards' },
  { name: '专栏文章基本信息', replacement: 'fetchArticleInfo' },
  { name: '文集基本信息', replacement: 'fetchArticleListInfo' },
  { name: '实时弹幕', replacement: 'fetchVideoDanmaku' },
  { name: '从_v_voucher_申请_captcha', replacement: 'requestCaptchaFromVoucher' },
  { name: '验证验证码结果', replacement: 'validateCaptchaResult' },

  // Douyin
  { name: '视频作品数据', replacement: 'fetchVideoWork' },
  { name: '图集作品数据', replacement: 'fetchImageAlbumWork' },
  { name: '合辑作品数据', replacement: 'fetchSlidesWork' },
  { name: '文字作品数据', replacement: 'fetchTextWork' },
  { name: '聚合解析', replacement: 'parseWork' },
  { name: '指定评论回复数据', replacement: 'fetchCommentReplies' },
  { name: '用户主页视频列表数据', replacement: 'fetchUserVideoList' },
  { name: '热点词数据', replacement: 'fetchSuggestWords' },
  { name: '搜索数据', replacement: 'searchContent' },
  { name: '音乐数据', replacement: 'fetchMusicInfo' },
  { name: '直播间信息数据', replacement: 'fetchLiveRoomInfo' },
  { name: '申请二维码数据', replacement: 'requestLoginQrcode' },
  { name: '动态表情数据', replacement: 'fetchDynamicEmojiList' },
  { name: '弹幕数据', replacement: 'fetchDanmakuList' },

  // Kuaishou
  { name: '单个视频作品数据', replacement: 'fetchVideoWork' },

  // Xiaohongshu
  { name: '首页推荐数据', replacement: 'fetchHomeFeed' },
  { name: '单个笔记数据', replacement: 'fetchNoteDetail' },
  { name: '用户数据', replacement: 'fetchUserProfile' },
  { name: '用户笔记数据', replacement: 'fetchUserNoteList' },
  { name: '表情列表', replacement: 'fetchEmojiList' },
  { name: '搜索笔记', replacement: 'searchNotes' }
]

chineseMethodDeprecations.forEach(({ name, replacement }) => {
  registerDeprecatedApi({
    name: `methodType: '${name}'`,
    deprecatedIn: '6.0.0',
    removedIn: '7.0.0',
    replacement: `fetcher.${replacement}()`,
    throwError: true
  })
})

export default {
  registerDeprecatedApi,
  checkDeprecation,
  deprecated,
  createDeprecatedStub,
  DeprecatedApiError
}
