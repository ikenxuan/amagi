import { createOpenAPI } from 'fumadocs-openapi/server'

/**
 * OpenAPI 规范的唯一入口（server-only —— 用了 node:fs，被任何客户端组件 import 都会炸）。
 *
 * 规范本身是 `packages/core` 的产物（`scripts/gen-openapi.mts` 从四个端点注册表派生），
 * 这里只负责读它。文档站不再手写第二份路由表。
 *
 * 两个刻意的选择：
 * - **record 形式的 `input`**：数组形式下 schema id 就是那个相对路径字符串，会被原样
 *   烧进 59 个生成的 MDX（`document="../core/openapi.json"`），且按 `process.cwd()`
 *   解析。record 给它一个稳定短 id `amagi`，与工作目录无关。
 * - **不设 `proxyUrl`**：playground 直连用户自己的 `127.0.0.1:4567`。上游明文警告代理会
 *   转发收到的全部 header 与 body（含 HttpOnly `Cookie` 与 `Authorization`）——
 *   amagi 服务端持有运营者的四平台 cookie，`auth.ts` 的 token 也在 `Authorization` 里，
 *   挂公共代理等于把这两样往外送。
 *
 * 规范用 `import()` 直接当模块读，不走 `node:fs`：Turbopack 下
 * `fileURLToPath(new URL(..., import.meta.url))` 拿到的 URL 与 `node:url` 不同实例，
 * 预渲染时会抛 `ERR_INVALID_ARG_TYPE`；JSON 模块由打包器解析，构建期与运行期都稳。
 */
export const openapi = createOpenAPI({
  input: {
    amagi: async () => (await import('../../core/openapi.json')).default as unknown as Record<string, unknown>
  }
})
