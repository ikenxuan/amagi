import { CryptoConfig } from '@ikenxuan/xhshow-ts'

/** 初始化签名配置。 */
export const createXiaohongshuCryptoConfig = (): CryptoConfig =>
  new CryptoConfig().withOverrides({
    DATA_WEB_BUILD: '6.12.3',
    SIGNATURE_DATA_TEMPLATE: {
      x0: '4.3.5',
      x1: 'xhs-pc-web',
      x2: 'Windows',
      x3: '',
      x4: ''
    },
    SIGNATURE_XSCOMMON_TEMPLATE: {
      s0: 5,
      s1: '',
      x0: '1',
      x1: '4.3.5',
      x2: 'Windows',
      x3: 'xhs-pc-web',
      x4: '6.12.3',
      x5: '',
      x6: '',
      x7: '',
      x8: '',
      x9: -596800761,
      x10: 0,
      x11: 'normal'
    }
  })
