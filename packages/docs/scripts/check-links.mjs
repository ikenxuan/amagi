// 死链检查：构建产物里的内部 `/docs` 链接必须都指向真实存在的页面。
//
// 为什么要有这个脚本：阶段门 8 的「无死链」一度是从「build 退出码 0」推出来的，
// 而 Next **不检查**内部链接目标 —— 实测那会儿站里有 64 条死链（v7 预览横幅
// 无条件把 /docs/v7 换成 /docs/v6，加上几条指向没有索引页的目录）。
//
// 判定方式：扫静态导出产物 `out/` 下所有 HTML 里的 `href="/docs/..."`，
// 逐条比对**产物里真实存在的地址**（由文件本身推出来：`out/a/b/index.html`
// 就是 `/a/b`）。旧链接那条路由不用单独判 —— `scripts/post-export.mjs` 为
// 每个真实存在的 v6 页面在旧地址下生成了跳转页，那些页面自己就在产物里。
//
// 跟在 `next build` + `post-export.mjs` 之后跑（package.json 的 build 脚本）。
//
// 自身失效模式的防护（脚本自己烂掉时必须响，不能静默放行）：
//   1. HTML 数或地址数任一为 0 → exit 1（`out` 没产出时，「没有死链」是平凡真）；
//   2. 产物里找不到 `_next` 目录 → exit 1（那不是一次完整的静态导出）。

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const OUT = 'out'
/** 站点挂在 GitHub Pages 的子路径下，产物里的绝对地址都带这个前缀 */
const BASE_PATH = '/amagi'

const htmlFiles = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (entry.name.endsWith('.html')) htmlFiles.push(path)
  }
}

if (!existsSync(OUT) || !existsSync(join(OUT, '_next'))) {
  console.error(`❌ 缺少静态导出产物（${OUT}/ 或它下面的 _next/）—— 先跑 next build，别把空输入当通过`)
  process.exit(1)
}
walk(OUT)

/** 产物里的文件 → 它对外服务的地址 */
const routeOf = (file) => {
  const rel = relative(OUT, file).split(sep).join('/')
  if (rel === 'index.html') return '/'
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length).replace(/\/$/, '')}`
  return `/${rel.replace(/\.html$/, '')}`
}

const known = new Set(htmlFiles.map(routeOf))
if (htmlFiles.length === 0 || known.size === 0) {
  console.error(`❌ 产物里 HTML ${htmlFiles.length} 个、地址 ${known.size} 条 —— 有一边是 0 就说明导出没产出，本次检查不作数`)
  process.exit(1)
}

const dead = new Map()

for (const file of htmlFiles) {
  const page = routeOf(file)
  const html = readFileSync(file, 'utf8')
  // post-export.mjs 生成的跳转页不算内容页：它只有一个 canonical 目标，不该被当链接来源
  if (html.includes('http-equiv="refresh"')) continue

  for (const match of html.matchAll(/href="(\/amagi\/docs\/[^"#?]*)/g)) {
    // 去掉站点前缀再比对：产物里的地址带 /amagi，而 known 是站内路径
    const href = match[1].slice(BASE_PATH.length).replace(/\/$/, '')
    if (known.has(href)) continue
    if (!dead.has(href)) dead.set(href, new Set())
    dead.get(href).add(page)
  }
}

console.log(`死链检查：扫描 ${htmlFiles.length} 个 HTML，产物里 ${known.size} 条地址`)
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
