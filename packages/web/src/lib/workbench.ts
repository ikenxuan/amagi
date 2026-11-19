import type { StoreOptions, StoreResult } from './api'

/** 共享参数没有完成时保留待定条目，让用户先修复并重试。 */
export const canGenerateAfterStore = (receipt: StoreResult, options: StoreOptions): boolean =>
  options.mode === 'sample-only' || receipt.requestsAppended
