import { encodeSourceInfo } from './source'

export function encodeBrowserInfo(info: Record<string, unknown>): string {
  return encodeSourceInfo(JSON.stringify(info))
}

/** 抓包解码后的 browserInfo 模板（脱敏，无用户 id）；时间戳每次调用刷新 */
export function browserInfo(): Record<string, unknown> {
  return {
    hardwareConcurrency: 10,
    webdriver: false,
    chromedriver: false,
    shelldriver: false,
    plugins: 5,
    permissions: [{ name: 'notifications', state: 'prompt' }],
    innerHeight: 982,
    innerWidth: 1728,
    outerHeight: 1117,
    outerWidth: 1728,
    stoargeStatus: {
      indexedDB: {
        idb: 'object',
        open: 'function',
        indexedDB: 'object',
        IDBKeyRange: 'function',
        openDatabase: 'undefined',
        isSafari: false,
        hasFetch: true
      },
      localStorage: { isSupportLStorage: true, size: 0, write: true },
      storageQuotaStatus: { usage: 0, quota: 10737426463, isPrivate: false }
    },
    webgl: {
      vendor: 'Google Inc. (Apple)',
      renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M5, Unspecified Version)'
    },
    notificationPermission: 'default',
    performance: {
      timeOrigin: Date.now(),
      usedJSHeapSize: 50_000_000,
      navigationTiming: {
        entryType: 'navigation',
        initiatorType: 'navigation',
        name: 'https://creator.douyin.com/creator-micro/home'
      }
    },
    request_host: 'creator.douyin.com',
    request_pathname: '/creator-micro/home',
    browser: {
      t: String(Date.now()),
      bit_protocol: 'false',
      bit_helper: false
    }
  }
}
