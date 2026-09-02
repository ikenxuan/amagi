// 死链检查：构建产物里的内部 `/docs` 链接必须都指向真实存在的页面。
//
// 为什么要有这个脚本：阶段门 8 的「无死链」一度是从「build 退出码 0」推出来的，
// 而 Next **不检查**内部链接目标 —— 实测那会儿站里有 64 条死链（v7 预览横幅
// 无条件把 /docs/v7 换成 /docs/v6，加上几条指向没有索引页的目录）。
//
// 判定方式：扫 `.next/server/app` 下所有预渲染 HTML 里的 `href="/docs/..."`，
// 逐条比对 `.next/prerender-manifest.json` 的路由清单；next.config.mjs 里
// 声明的重定向按其 source→destination 解析一次再判。
//
// 跟在 `next build` 之后跑（package.json 的 build 脚本），死链即非 0 退出。
//
// 自身失效模式的防护（脚本自己烂掉时必须响，不能静默放行）：
//   1. 重定向规则一条都解析不出来 → exit 1（next.config.mjs 改写法后规则过期）；
//   2. 预渲染 HTML 数或路由清单数任一为 0 → exit 1（`.next` 没产出时，
//      「没有死链」这个结论是平凡真，毫无信息量）。

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const APP_DIR = join('.next', 'server', 'app')
const MANIFEST = join('.next', 'prerender-manifest.json')

/** 从 next.config.mjs 的文本里取重定向表（避免 import 配置时连带跑 MDX / 插件） */
const readRedirects = () => {
  const text = readFileSync('next.config.mjs', 'utf8')
  const rules = [...text.matchAll(/source:\s*'([^']+)'\s*,\s*destination:\s*'([^']+)'/g)].map((m) => ({ source: m[1], destination: m[2] }))
  if (rules.length === 0) {
    console.error('❌ 没能从 next.config.mjs 解析出任何重定向 —— 解析规则过期了，先修脚本再谈死链')
    process.exit(1)
  }
  return rules
}

/** 把 `/docs/usage/:path*` 这类规则套到一个地址上，命中则返回重定向后的地址 */
const applyRedirects = (href, rules) => {
  for (const { source, destination } of rules) {
    const wildcard = source.match(/^(.*)\/:[A-Za-z]+\*$/)
    if (wildcard) {
      const prefix = wildcard[1]
      if (href === prefix || href.startsWith(`${prefix}/`)) {
        const rest = href.slice(prefix.length)
        return destination.replace(/\/:[A-Za-z]+\*$/, '') + rest
      }
      continue
    }
    if (href === source) return destination
  }
  return href
}

const htmlFiles = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (entry.name.endsWith('.html')) htmlFiles.push(path)
  }
}

// 没构建产物就不能报「0 死链」—— 空输入下所有检查都会平凡通过，那是最坏的一种绿。
if (!existsSync(APP_DIR) || !existsSync(MANIFEST)) {
  console.error(`❌ 缺少构建产物（${APP_DIR} / ${MANIFEST}）—— 先跑 next build，别把空输入当通过`)
  process.exit(1)
}
walk(APP_DIR)

const known = new Set(Object.keys(JSON.parse(readFileSync(MANIFEST, 'utf8')).routes))
if (htmlFiles.length === 0 || known.size === 0) {
  console.error(`❌ 预渲染 HTML ${htmlFiles.length} 个、路由清单 ${known.size} 条 —— 有一边是 0 就说明构建没产出，本次检查不作数`)
  process.exit(1)
}

const redirects = readRedirects()
const dead = new Map()

for (const file of htmlFiles) {
  const page = `/${relative(APP_DIR, file).split(sep).join('/').replace(/\.html$/, '')}`
  const html = readFileSync(file, 'utf8')
  for (const match of html.matchAll(/href="(\/docs\/[^"#?]*)/g)) {
    const href = match[1].replace(/\/$/, '')
    if (known.has(href) || known.has(applyRedirects(href, redirects))) continue
    if (!dead.has(href)) dead.set(href, new Set())
    dead.get(href).add(page)
  }
}

console.log(`死链检查：扫描 ${htmlFiles.length} 个预渲染 HTML，路由清单 ${known.size} 条`)
if (dead.size === 0) {
  console.log('✅ 内部 /docs 链接全部有效')
  process.exit(0)
}

console.error(`❌ ${dead.size} 个链接指向不存在的页面：`)
for (const [href, pages] of dead) {
  const list = [...pages]
  console.error(`   ${href}\n     ← ${list.slice(0, 5).join(', ')}${list.length > 5 ? ` (+${list.length - 5} 处)` : ''}`)
}
process.exit(1)
