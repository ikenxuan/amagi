/** 抖音 Android 接口的实例配置。设备身份、游客 Cookie 和签名由服务维护。 */
export interface DouyinAppOptions {
  /** 完整签名端点，例如 http://127.0.0.1:8787/v1/app/sign；默认空，调用时返回配置错误信封。 */
  signerUrl?: string
}
