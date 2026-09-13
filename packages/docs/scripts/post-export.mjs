// 静态导出之后要补的三件事 —— 都是「Next 在服务端能做、静态托管做不了」的活。
//
// 跑在 `next build`（`output: 'export'`）之后，产物在 `packages/docs/out/`。
import { cp, mkdir, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'

const OUT = 'out'

/** 站点在 GitHub Pages 上的子路径，跳转目标要带它 */
const BASE_PATH = '/amagi'

/** 1. `.nojekyll` —— **不加的话 Next 的 `_next/` 目录会被 GitHub Pages 整份忽略** */
await writeFile(join(OUT, '.nojekyll'), '')

/**
 * 2. 旧链接兜底。
 *
 * 从前这五条写在 `next.config.mjs` 的 `redirects()` 里，而静态导出不支持它、
 * GitHub Pages 也没有服务端重定向。改成生成带 `<meta http-equiv="refresh">`
 * 的静态页 —— 语义上等价（都是跳转），代价是那一次跳转由浏览器发起。
 *
 * 两条的形态不同：
 *   - `/docs` 是**单页**，直接写一个文件；
 *   - 其余四条是**通配**（`:path*`），静态站上没法枚举「所有可能的路径」，
 *     所以反过来：遍历 v6 那棵已产出的树，为每个真实存在的页面在旧地址下
 *     生成一个跳转页。这样覆盖的恰好是「真的有的页面」，不会造出一堆 404 跳转。
 */
const SECTIONS = ['usage', 'dev', 'ai', 'changelog']

const redirectPage = (target) => `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=${target}" />
    <link rel="canonical" href="${target}" />
    <title>已迁移</title>
  </head>
  <body>
    <p>这一页已迁移到 <a href="${target}">${target}</a>。</p>
  </body>
</html>
`

/**
 * 把 `out` 下某个目录里所有的页面 HTML 的相对路径列出来。
 *
 * 两种形态都要认：`x/index.html`（开了 `trailingSlash` 时）与 `x.html`（默认）。
 * 本仓库刻意用后者。
 */
async function walkPages(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walkPages(full)))
    // **必须归一化成正斜杠**：Windows 上 `relative()` 给的是反斜杠，而下面
    // 按 `docs/v6/<section>/` 做前缀替换 —— 不归一化的话一条都匹配不上，
    // 跳转页静默一个都不生成（实测：打印「跳转页 1 个」，实际漏了 60 多个）
    else if (entry.name.endsWith('.html')) out.push(relative(OUT, full).split(sep).join('/'))
  }
  return out
}

/** `docs/v6/usage/guide/sdk.html` → `/docs/v6/usage/guide/sdk`；`.../index.html` → 去掉 index */
const pageUrl = (rel) => `/${rel.replace(/index\.html$/, '').replace(/\.html$/, '')}`

const written = []

// `/docs` → `/docs/v7/usage`
const docsHome = join(OUT, 'docs', 'index.html')
await mkdir(dirname(docsHome), { recursive: true })
await writeFile(docsHome, redirectPage(`${BASE_PATH}/docs/v7/usage`))
written.push('docs/index.html')

// `/docs/<section>/...` → `/docs/v6/<section>/...`
for (const section of SECTIONS) {
  // 板块**索引页**是目录之外的一个文件（`docs/v6/usage.html`），单独处理 ——
  // 下面的 walkPages 只扫 `docs/v6/usage/` 那个目录，够不到它
  const legacyIndex = join(OUT, 'docs', `${section}.html`)
  const v6Index = join(OUT, 'docs', 'v6', `${section}.html`)
  if (existsSync(v6Index)) {
    await mkdir(dirname(legacyIndex), { recursive: true })
    await writeFile(legacyIndex, redirectPage(`${BASE_PATH}/docs/v6/${section}`))
    written.push(`docs/${section}.html`)
  }

  const v6Root = join(OUT, 'docs', 'v6', section)
  if (!existsSync(v6Root)) continue
  for (const rel of await walkPages(v6Root)) {
    // rel 有两种形态，都要管：
    //   `docs/v6/usage.html`            —— 板块索引页
    //   `docs/v6/usage/guide/sdk.html`  —— 板块内的页
    // 旧地址把 `v6/` 整段去掉
    const legacy = rel.replace(`docs/v6/${section}`, `docs/${section}`)
    if (legacy === rel) continue
    const target = join(OUT, legacy)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, redirectPage(`${BASE_PATH}${pageUrl(rel)}`))
    written.push(legacy)
  }
}

console.log(`✅ 旧链接跳转页 ${written.length} 个`)

/**
 * 3. 把源 MDX 复制成 `/docs/**.mdx`。
 *
 * 从前这是两件事：`next.config.mjs` 里一条 `rewrites()`（`/docs/:path*.mdx` →
 * `/llms.mdx/docs/:path*`）加一个路由处理器。**静态导出下两者都留不住**：
 *   - rewrites 不支持；
 *   - 路由处理器在导出时产出**无扩展名**的文件，于是
 *     `out/llms.mdx/docs/v6/changelog`（文件）与 `changelog/6.1.3`（目录）撞名，
 *     导出直接 `EPERM: copyfile ... -> out/llms.mdx/docs/v6/changelog`。
 *     （页面路由不受影响，因为它们产出 `changelog.html`。）
 *
 * 换成从**源文件**复制：那个路由做的事就是 `getText('raw')` —— 把 `content/docs`
 * 下的原文读出来。所以这里等价，而且少一个路由、少一份产物。
 *
 * 对外的地址与从前一致（`/docs/v7/usage.mdx`），「复制 Markdown」按钮、
 * llms.txt 里的示例、AI 代理直接取 `.mdx` 都指着它。
 */
const CONTENT_DIR = join('content', 'docs')
const MDX_OUT = join(OUT, 'docs')
let mdxCount = 0

if (!existsSync(CONTENT_DIR)) {
  console.error(`❌ 找不到 ${CONTENT_DIR} —— 这条判据扫不到东西，不能当作通过`)
  process.exit(1)
}

/** 递归把 content/docs 下的每个 .mdx 复制到 out/docs 的同名位置 */
const copyMdx = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await copyMdx(full)
      continue
    }
    if (!entry.name.endsWith('.mdx')) continue

    const rel = relative(CONTENT_DIR, full).split(sep).join('/')
    const target = join(MDX_OUT, rel)
    await mkdir(dirname(target), { recursive: true })
    await cp(full, target)
    mdxCount++
  }
}
await copyMdx(CONTENT_DIR)

if (mdxCount === 0) {
  console.error('❌ 一份 .mdx 都没复制 —— 源目录结构变了，先修脚本')
  process.exit(1)
}

console.log(`✅ /docs/**.mdx 复制 ${mdxCount} 份`)
