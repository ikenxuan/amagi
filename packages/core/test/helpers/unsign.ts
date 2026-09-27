import type { Registry } from 'amagi/contracts/endpoint'

/**
 * 「摘掉签名」的测试工具：把端点的 `sign` 置 `false`，让端到端用例只测链路、不验签
 * （签名正确性由各平台的 `sign.test.ts` 单独锁）。
 *
 * 为什么不能再用老写法（往 `ctx.signers` 注入恒等签名器 `(spec) => spec` 来跳过签名）：
 * 端点的签名现在是内联的原子 `SignStep[]` 清单，`execute` 里的 `resolveSigner` 对
 * 数组 / 对象 / 函数形态**直接编译执行、根本不查 `ctx.signers` 那张表**（只有
 * `sign: '<name>'` 字符串形态才按名查表）。所以注入恒等签名器对 SignStep 端点毫无
 * 作用 —— 请求照样被真签名器改写。唯一能真正跳过签名的办法是把端点的 `sign` 置为
 * `false`：此时 `resolveSigner` 直接返回 `undefined`，签名阶段被整体跳过。
 */

/**
 * 返回整张注册表的副本，每个端点的 `sign` 都置 `false`（不改动入参）。
 *
 * 类型与入参保持一致（`<T>(registry: T): T`），可无缝替换手写的
 * `Object.fromEntries(... sign: false ...)` 桩表。
 * @param registry - 平台注册表
 * @returns sign 全部置 false 的新表
 */
export const unsignRegistry = <T extends Registry>(registry: T): T =>
  Object.fromEntries(Object.entries(registry).map(([name, def]) => [name, { ...def, sign: false as const }])) as T

/**
 * 返回注册表的副本，只把指定端点的 `sign` 置 `false`，其余端点原样保留（不改动入参）。
 * @param registry - 平台注册表
 * @param name - 要摘掉签名的端点名
 * @returns 仅目标端点 sign 置 false 的新表
 */
export const unsignEndpoint = <T extends Registry>(registry: T, name: keyof T): T =>
  ({ ...registry, [name]: { ...registry[name], sign: false as const } }) as T
