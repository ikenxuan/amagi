/**
 * a_bogus 签名（passport 登录接口形态）。
 *
 * ## 这里曾经有一份独立实现
 *
 * 本文件原先自带一整套 SM3 / 变体 RC4 / 自定义 base64 / 字段表，理由是「抖音同时
 * 在线着多个 a_bogus 版本，login.douyin.com 用的是另一版，两者互不通用」。
 * 那份实现是**独立逆向**的，不是抄的，而且它的盐值 `dhzx` 恰好是对的——比数据接口
 * 那份还新。
 *
 * 现在它换成了 `../sign/a_bogus` 的共享实现，只把「登录页专有」的部分留成参数。
 * 理由是两条独立逆向的结论**逐字节对上了**，没有必要维护两份算法：
 *
 * | 维度 | 登录页那份 | 数据接口那份(dtk) | 实测结论 |
 * |---|---|---|---|
 * | 盐值 | `dhzx` | `dhzx` | 一致 |
 * | 三条链的下标 | `digest[9]/[18]` 等 | 同 | 一致 |
 * | 链的第三个字节 | `digest[offset]` | `canary(digest, offset, 哨兵, 兜底)` | 见下 |
 * | body 链 | `SM3(SM3(SALT))` | `digestOf("")` | **是同一个值** |
 * | `L38` | 129 | `0x21` = 33 | 真实捕获是 **33**，dtk 对 |
 *
 * 「链的第三个字节」那条曾经看起来是分歧，实际不是：`canary` 取的是 `digest[offset]`，
 * 只有当该字节恰好等于保留的哨兵值时才往后顺延。所以 `digest[offset]` 是它的朴素形式，
 * 二者在真实捕获上完全一致。两份独立逆异能互相印证到这一步，已经是能拿到的最强证据。
 *
 * 而 `L38` 那条是**真的分歧**——两边都是未经验证的常量，直到拿真实浏览器捕获去查，
 * 才发现 33 是对的、129 是错的。这正是「自证模型发现不了常量过期」的又一个实例。
 *
 * ## 仍然由本文件保留的差异
 *
 * 只剩 `pageId`：登录页是 7571，数据接口是 6241。这是**页面身份**，不是算法参数——
 * 它同时出现在签名和 query 的 `p_bd` 里，两边必须一致，而且 dtk 只逆向了数据页，
 * 对登录页没有发言权。所以这个值沿用 amagi 自己的结论。
 *
 * ## 顺带被修正的两处
 *
 * - `L28` 原先写的是「模块加载至今的毫秒数 & 0xff」，现在随共享实现用常量 3
 *   （`now_ms` 自 SDK 初始化起加三）。真实捕获里就是 3：那是一个刚加载完的页面
 *   会报的值，也正是「进程不保持页面常开」时唯一诚实的答案。
 * - 旧实现无条件给结果补一个 `=`。真实浏览器的 a_bogus 是 192 字符、**没有补位**，
 *   现在与浏览器一致。
 */

import { ABogus, buildBrowserInfo } from '../sign/a_bogus'

/** bdms SDK 版本号，同时也是 passport 通用参数里的 p_bd */
export const BDMS_SDK_VERSION = '1.0.1.19-fix.01'

/** 登录页（login.douyin.com）的 pageId。数据接口是 6241，两者不可互换 */
const PASSPORT_PAGE_ID = 7571

/**
 * 浏览器环境快照。
 *
 * 服务器上没有真实窗口，这里给出一组常见的桌面分辨率组合；该值只影响指纹内容本身，
 * 不需要与任何真实设备对应。它会被逐字写进签名，所以**必须是个自洽的几何**——
 * 随请求变动的几何本身就是特征。
 */
const PASSPORT_BROWSER_INFO = buildBrowserInfo({
  innerWidth: 2048,
  innerHeight: 960,
  outerWidth: 2554,
  outerHeight: 1386,
  availWidth: 2560,
  availHeight: 1392,
  screenWidth: 2560,
  screenHeight: 1440,
  platform: 'Win32'
})

/**
 * 生成 a_bogus
 * @param query 除 a_bogus 之外的完整查询串（未加 `?`，保持实际发送顺序）
 * @param userAgent 与请求头一致的 UA
 * @returns a_bogus 参数值（未做 URL 编码）
 */
export const aBogus = (query: string, userAgent: string): string =>
  new ABogus(userAgent, { browserInfo: PASSPORT_BROWSER_INFO, pageId: PASSPORT_PAGE_ID }).getValue(query)
