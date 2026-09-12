import { fileURLToPath } from 'node:url'

import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs'

/**
 * twoslash 类型缓存：仓库里的 `.twoslash-cache/` + 换行归一化。
 *
 * 两个都要紧，缺一个这道优化就白做：
 *
 * 1. **目录在仓库里**（不用框架默认的 `.next/cache/twoslash`）。CI 上永远是冷构建
 *    —— GitHub 托管 runner 不还原 `.next/cache` —— 放那儿等于没缓存，而没缓存时
 *    twoslash 会让编译阶段峰值翻倍，7 GiB 的 runner 直接 OOM
 *    （2026-09-12 两次 `exit code 143`）。缓存由 `pnpm docs:twoslash-cache` 预生成并提交。
 *
 * 2. **换行归一化**。`fumadocs-twoslash/cache-fs` 的键是代码文本的 SHA256 前 12 位，
 *    而文本带不带 CR 取决于工作区换行 —— 本仓库 MDX 在 Windows 上是 CRLF，
 *    git 在 Linux 上 checkout 出来是 LF，不归一化的话本机生成的缓存到 CI 上一个都命不中。
 *
 * **必须在 MDX loader 自己的进程里构造**：`next build` 会把 `rehypeCodeOptions`
 * 交给 Turbopack 的 loader 子进程，而缓存对象带着闭包函数 —— 在 `source.config.ts`
 * 顶层造好了再传下去，跨进程时 `read`/`write` 会被丢掉。
 *
 * 路径不能用 `process.cwd()`（loader 子进程的 cwd 不保证是 `packages/docs`），
 * `dir` 也不能给绝对值 —— `cache-fs` 内部是 `path.join(cwd, options.dir)`。
 * 命中情况由 `scripts/check-twoslash.mjs` 在 CI 上把关（它校验每个块都有对应缓存）。
 */
const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url))
const CACHE_DIR_NAME = '.twoslash-cache'
/**
 * 造一个指向仓库内缓存的 twoslash 类型缓存。
 * @returns {import('fumadocs-twoslash').TwoslashTypesCache} 键已归一化的文件系统缓存
 */
export function createPortableTypesCache() {
  const base = createFileSystemTypesCache({ cwd: PACKAGE_ROOT, dir: CACHE_DIR_NAME })
  const normalize = (code) => (typeof code === 'string' ? code.replace(/\r\n/g, '\n') : code)
  return {
    ...base,
    read: (code, ...rest) => base.read(normalize(code), ...rest),
    write: (code, ...rest) => base.write(normalize(code), ...rest)
  }
}
