/** 历史端点中使用 Android 协议的条目；iesdouyin 的 /web/api/v2 仍属于 Web/H5。 */
export const douyinChannelOf = (endpoint: string): 'web' | 'app' =>
  endpoint.startsWith('app') || endpoint === 'emojiResourceMeta' ? 'app' : 'web'
