import { CryptoConfig } from './xhshow'

/**
 * 小红书 Web 端的签名世代版本号 —— 三个字段必须同代。
 *
 * 真机抓包（2026-10-12，游客会话）实证：平台在 x-s 本体的 `x0`、x-s-common 的 `x1`、
 * webprofile 的 `sdkVersion` 三处**发同一个值**（抓包时为 `4.4.3`）；x-s-common 的 `x4`
 * 与 `webBuild` cookie 一致（抓包时为 `6.57.2`）。
 *
 * 库默认停留在旧世代（`4.3.5` / `4.3.5` / `6.3.0`）。只把 x-s 本体的 `x0` 抬到 4.4.3、
 * 其余留在 4.3.5，会让同一个请求的两个信封自相矛盾 —— 平台对此的处置是**静默返回空
 * data**（HTTP 200 但 `data` 为空），不报错，因此无法从响应反推，只能靠抓包比对。
 * 这也解释了「签名能过、token 能换到，但拿不到数据」那类现象。
 */
const SIGN_VERSION = '4.4.3'
const WEB_BUILD = '6.57.2'

/**
 * 初始化签名配置。
 *
 * 四个版本位（`DATA_WEB_BUILD` / `DATA_SDK_VERSION` / x-s 的 `x0` / x-s-common 的 `x1`、
 * `x4`）全部锚到 {@link SIGN_VERSION} 与 {@link WEB_BUILD}，保证跨信封一致。
 */
export const createXiaohongshuCryptoConfig = (): CryptoConfig =>
  new CryptoConfig().withOverrides({
    DATA_WEB_BUILD: WEB_BUILD,
    DATA_SDK_VERSION: SIGN_VERSION,
    SIGNATURE_DATA_TEMPLATE: {
      x0: SIGN_VERSION,
      x1: 'xhs-pc-web',
      x2: 'Windows',
      x3: '',
      x4: ''
    },
    SIGNATURE_XSCOMMON_TEMPLATE: {
      s0: 5,
      s1: '',
      x0: '1',
      x1: SIGN_VERSION,
      x2: 'Windows',
      x3: 'xhs-pc-web',
      x4: WEB_BUILD,
      x5: '',
      x6: '',
      x7: '',
      x8: '',
      x9: -596800761,
      x10: 0,
      x11: 'normal'
    }
  })
