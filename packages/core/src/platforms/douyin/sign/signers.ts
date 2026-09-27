import { type SignFn, stepsToSigner } from '../../../contracts/endpoint'
import { douyinBogus, douyinXBogus } from './steps'

/**
 * 抖音签名器表：**只做「注册名 → `SignStep` 清单」的映射，不含算法**。
 *
 * 算法的唯一实现在 `./steps.ts`（含前置条件校验、webid 补参、secsdk 收尾的理由）。
 * 依赖方向是单向的 —— `signers.ts → steps.ts`，永不反向：两份实现并存时会改一边忘一边，
 * 而抖音的签名是**抽样校验**的（签错时大部分请求照样成功，只是被判高风险的概率上升），
 * 这类分叉极难发现。
 *
 * ## 两条路，一份实现
 *
 * 端点声明 `sign: douyinBogus(184)` 走清单；`client.douyin.request` 不给 `amagi.sign`
 * 时走字符串 `'a-bogus'`（见 `client/request/profile.ts`）查这张表。两者现在压的是同一份
 * step 清单，所以签出来必然一致。
 *
 * ## 为什么注册名对应的是三段清单
 *
 * 真实浏览器发这些请求的顺序是 **webid → msToken → a_bogus / x_bogus → secsdk**，每一步都改
 * query，颠倒任意一步签名就不成立。顺序不靠这里保证，由 `SignPhase` 的固定次序保证。
 *
 * 其中 webid 与 secsdk 那两段都是「命中才动、否则原样返回」，对不相关的端点是无操作，
 * 所以可以无条件套用 —— 详见 `./steps.ts` 文件头。
 *
 * ## 为什么 secsdk 没有自己的注册名
 *
 * 它对策略表外的 path 是无操作，无条件复合进这两个名字是安全的；而 `sign` 是单槽位，
 * 另起一个名字只会逼出 `'a-bogus+secsdk'` 这种复合命名。要精细控制的调用方给 step
 * 清单，不是加注册名。
 *
 * @module platforms/douyin/sign/signers
 */

/**
 * 平台签名器表，交给 runtime 的 `signers` 查名。
 *
 * 两个名字都取 **184** 那档 msToken 长度：这张表只在 `client.<平台>.request` 那条路上被查到，
 * 而那条路打的是「本库还没收录的接口」—— 猜不出该用 184（作品详情类）还是 116（评论 / 音乐类），
 * 统一取前者。收录进端点的接口各自在声明里写准确的那一档，不经过这里。
 *
 * 用 `satisfies` 而非显式 `: Record<string, SignFn>` 返回：后者会把键联合抹成宽
 * `string`，而 {@link DouyinSignerName} 要靠 `keyof` 从这张表推导出精确的名字联合。
 * @returns 注册名 → 签名器
 */
export const createDouyinSigners = () =>
  ({
    'a-bogus': stepsToSigner(douyinBogus(184)),
    'x-bogus': stepsToSigner(douyinXBogus(184))
  }) satisfies Record<string, SignFn>

/**
 * 抖音签名器名联合（`'a-bogus' | 'x-bogus'`），从签名器表推导、不手写第二遍。
 *
 * `defineDouyinEndpoint` 用它把端点 `sign` 的字符串分支从宽 `string` 收窄到这个
 * 联合 —— 写错名字（如 `'a-bogas'`）编译期即报错，不必等运行时查表失败。
 */
export type DouyinSignerName = keyof ReturnType<typeof createDouyinSigners>
