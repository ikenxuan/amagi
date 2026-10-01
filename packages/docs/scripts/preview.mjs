// 本地预览静态产物。
//
// **不能直接 `serve out` 就完事**：产物按哪个前缀构建，HTML 里的资源引用就带
// 哪个前缀（GitHub Pages 产物是 `/amagi/_next/...`），`serve` 把产物挂在根路径
// —— 前缀对不上时所有 JS/CSS 都 404，页面出来是没样式的裸 HTML（实测过：
// `GET /amagi/_next/static/chunks/*.js` 一片 404）。
//
// 做法：在 `.preview/` 下建一个指向 `out/` 的**目录联接**（Windows 上 junction
// 不需要管理员权限，Linux/macOS 上是普通符号链接），联接的名字就是产物的前缀
// —— 「线上长什么样」本地就长什么样：GitHub Pages 产物在
// `http://localhost:4321/amagi/`，根路径产物（Netlify / Vercel 的形态）直接在
// `http://localhost:4321/`。
//
// 前缀不靠环境变量传（构建与预览往往不在同一个 shell 里，传丢了就是又一轮
// 「预览没样式」），从产物自己反推：任一 HTML 里的 `_next/` 引用长什么样，
// 构建时的 basePath 就是什么。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..'
const OUT = join(ROOT, 'out')
const PREVIEW = join(ROOT, '.preview')

if (!existsSync(OUT)) {
  console.error('❌ 找不到 out/ —— 先跑 `pnpm build` 或 `pnpm build:docs`')
  process.exit(1)
}

// `href="/amagi/_next/..."` → `/amagi`；`href="/_next/..."` → ''（根路径部署）。
// 404.html 是完整页面，一定带资源引用
const probe = readFileSync(join(OUT, '404.html'), 'utf8')
const BASE_PATH = probe.match(/(?:href|src)="([^"]*\/)_next\//)?.[1]?.replace(/\/$/, '') ?? ''

const LINK = join(PREVIEW, BASE_PATH ? BASE_PATH.slice(1) : 'site')

// 每次都重建链接：产物路径没变，但上次可能因为 out/ 被删而留下悬空链接
rmSync(LINK, { recursive: true, force: true })
mkdirSync(PREVIEW, { recursive: true })
symlinkSync(OUT, LINK, 'junction')

const PORT = process.env.PORT ?? '4321'
console.log(`\n  本地预览 → http://localhost:${PORT}${BASE_PATH}/\n`)
console.log(`  （产物按 basePath=${BASE_PATH || '/'} 构建，预览路径与线上形态一致）\n`)

// **用一条命令字符串而不是参数数组**：`shell: true` 下数组会被拼接，`-l 4321`
// 因此丢过一次（实测：serve 自己跑到随机端口，而 curl 还打在旧服务上，
// 于是「预览没样式」查了半天是打错了端口）。
spawn(`npx --yes serve "${PREVIEW}" -l ${PORT}`, { stdio: 'inherit', shell: true }).on('exit', (code) => {
  rmSync(LINK, { recursive: true, force: true })
  process.exit(code ?? 0)
})
