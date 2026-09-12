// 预生成 twoslash 的类型缓存，供 CI 复用。
//
// 为什么要这个：twoslash 给 127 个代码块每块都跑一遍 TypeScript 编译器，是
// `next build` 编译阶段的大头。而 **CI 上永远是冷构建** —— GitHub 托管 runner
// 不还原 `.next/cache` —— 所以缓存必须**进仓库**，否则那道优化在 CI 上等于没做
// （2026-09-12 两次 `exit code 143` 就是 7 GiB 的 runner 被 OOM 杀）。
//
// 做法：把每一页都 `load()` 一遍。走的正是 `next build` 编译 MDX 的那条管线
// （同一个 `source.config.ts`、同一个 `createPortableTypesCache()`），
// 所以写出来的键与构建期要查的键一致 —— 这一点很要紧，早先缓存建在
// `source.config.ts` 顶层、路径又用相对的，结果构建期一次都没命中。
//
// 用法：`pnpm docs:twoslash-cache`。改了任何 twoslash 示例之后都要重跑并提交；
// `scripts/check-twoslash.mjs` 会在 CI 上核对缓存与当前示例是否一致，忘了跑会红灯。
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { register } from 'fumadocs-mdx/node'

register()

const { source } = await import('../lib/source.ts')

const CACHE_DIR = '.twoslash-cache'

// 每次全量重来：增量会让「已删除的示例」在缓存里越积越多
await rm(CACHE_DIR, { recursive: true, force: true })
await mkdir(CACHE_DIR, { recursive: true })

const pages = source.getPages()
console.log(`加载 ${pages.length} 页（只为让 twoslash 写缓存）…`)

let failed = 0
for (const [index, page] of pages.entries()) {
  try {
    await page.data.load()
  } catch (error) {
    failed++
    console.error(`  ✗ ${page.path}: ${error.message}`)
  }
  if ((index + 1) % 20 === 0) console.log(`  … ${index + 1}/${pages.length}`)
}

const written = await readdir(CACHE_DIR)
console.log(`✅ 缓存 ${written.length} 条 → ${CACHE_DIR}/`)

if (failed > 0) {
  console.error(`${failed} 页加载失败，缓存不完整`)
  process.exit(1)
}

// 缓存键只含代码文本（归一化换行后），**不含 tsconfig 与依赖版本** ——
// 后两者变了而缓存没重算的话，生成出来的类型信息是过时的，且不会报错。
// 这里把这两个输入记下来，由 `scripts/check-twoslash.mjs` 比对，不一致就红灯。
const readVersion = async (name) => JSON.parse(await readFile(join('node_modules', name, 'package.json'), 'utf8')).version
const meta = {
  note: '由 `pnpm docs:twoslash-cache` 生成。改了 twoslash 示例、或升级了下列依赖之后，必须重跑。',
  typescript: await readVersion('typescript'),
  twoslash: await readVersion('twoslash'),
  fumadocsTwoslash: await readVersion('fumadocs-twoslash'),
  tsconfig: await readFile('tsconfig.json', 'utf8')
}
await writeFile(join(CACHE_DIR, '_meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
console.log('✅ 已记录输入指纹（_meta.json）')
