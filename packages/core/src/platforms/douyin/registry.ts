import type { Registry } from '../../contracts/endpoint'
import { douyinAppRegistry, douyinGuestAppRegistry } from './app/endpoints'
import { douyinWebRegistry } from './web/endpoints'

export { awemeRegistry, douyinAppRegistry, douyinGuestAppRegistry } from './app/endpoints'
export { douyinWebRegistry } from './web/endpoints'

/** 静态 Fetcher 与兼容门面的历史方法集合。 */
export const douyinLegacyRegistry = { ...douyinWebRegistry, ...douyinGuestAppRegistry } as const satisfies Registry
/** 完整注册表：Web/H5 + App，键顺序与重构前一致。 */
export const douyinRegistry = { ...douyinWebRegistry, ...douyinAppRegistry } as const satisfies Registry
