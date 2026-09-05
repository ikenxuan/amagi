import { defineEndpoint, type } from 'amagi/contracts/endpoint'
/**
 * 阶段 0 的类型推导验证用的假端点。
 *
 * 从 registry 派生 fetcher 的整条链路的唯一前提是「声明足够具体」，
 * 这里用两个假端点钉住最关键的两种形状：
 * - 带必填参数的端点（`fakeEcho`）→ 验证参数类型推导与返回类型。
 * - 无参数、纯本地计算的端点（`fakeCompute`）→ 验证无参方法与 compute 路径。
 *
 * 两个端点的**声明式类型**同时被 `test/types/fetcher-of.test-d.ts`（类型层）
 * 与 `test/client/fetcher.test.ts`（运行时）消费。
 */
import zod from 'zod'

/** 带必填参数与 response 令牌的假端点 */
export const fakeEcho = defineEndpoint({
  name: 'douyin.fakeEcho',
  route: '/__fake_echo',
  params: zod.object({ aweme_id: zod.string().min(1), number: zod.coerce.number().int().default(10) }),
  build: (p) => ({ method: 'GET', url: `https://example.com/?id=${p.aweme_id}&n=${p.number}` }),
  response: type<{ ok: true; echoed: string }>()
})

/** 无参数、纯本地计算的假端点（不发请求） */
export const fakeCompute = defineEndpoint({
  name: 'bilibili.fakeCompute',
  route: '/__fake_compute',
  params: zod.object({}),
  compute: () => ({ aid: 0 })
})

/** 汇总 registry，`as const satisfies Registry` 保证可赋值给 Registry */
export const fakeRegistry = { fakeEcho, fakeCompute } as const
