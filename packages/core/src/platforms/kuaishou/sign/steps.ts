import type { SignStep } from '../../../contracts/endpoint'
import { createKuaishouSigner } from './index'
import { createHxfalconSigner } from './signers'

/**
 * 快手反爬参数的原子单元（{@link SignStep}）。
 *
 * `hxfalcon` 签名器实例带状态（`count` / `startupRandom` / 匿名 kww），模块级共享一份，
 * 同旧 `createKuaishouSigners` 的默认实例。
 */
const hxfalconSigner = createHxfalconSigner(createKuaishouSigner())

/** `__NS_hxfalcon` 签名（live_api 与 H5 共用一套算法，区别只在喂什么料） */
export const hxfalcon = (): SignStep => ({ phase: 'sign', apply: hxfalconSigner })
