import { douyinAppRegistry } from './app/endpoints'

const APP_ENDPOINTS = new Set(Object.keys(douyinAppRegistry))

/** 按 App 注册表成员判定通道；历史免签 App 资源（emojiResourceMeta）同样走 App。 */
export const douyinChannelOf = (endpoint: string): 'web' | 'app' => (APP_ENDPOINTS.has(endpoint) ? 'app' : 'web')
