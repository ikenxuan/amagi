// 本地预览静态产物。
//
// **不能直接 `serve out`**：站点是按 `basePath: '/amagi'` 构建的，HTML 里引用的
// 是 `/amagi/_next/...`，而 `serve` 把产物挂在根路径 —— 于是所有 JS/CSS 都 404，
// 页面出来是没样式的裸 HTML（实测过：`GET /amagi/_next/static/chunks/*.js` 一片
// 404）。本地预览必须让路径与线上一致，否则「本地验证通过」验的是另一套东西。
//
// 做法：在 `.preview/` 下建一个指向 `out/` 的**目录联接**（Windows 上 junction
// 不需要管理员权限，Linux/macOS 上是普通符号链接），再服务 `.preview/` ——
// 于是 `http://localhost:4321/amagi/` 就是线上 `https://ikenxuan.github.io/amagi/`
// 的样子。
//
// 顺带把 `/` 也接上：线上根路径由 post-export 生成跳转页，本地同样要在
// `/amagi/` 下才看得到，所以这里只打印正确的入口地址。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..'
const OUT = join(ROOT, 'out')
const PREVIEW = join(ROOT, '.preview')
const LINK = join(PREVIEW, 'amagi')

if (!existsSync(OUT)) {
  console.error('❌ 找不到 out/ —— 先跑 `pnpm build` 或 `pnpm build:docs`')
  process.exit(1)
}

// 每次都重建链接：产物路径没变，但上次可能因为 out/ 被删而留下悬空链接
rmSync(LINK, { recursive: true, force: true })
mkdirSync(PREVIEW, { recursive: true })
symlinkSync(OUT, LINK, 'junction')

const PORT = process.env.PORT ?? '4321'
console.log(`\n  本地预览 → http://localhost:${PORT}/amagi/\n`)
console.log('  （根路径 `/` 是空的，站点的 basePath 就是 /amagi）\n')

// **用一条命令字符串而不是参数数组**：`shell: true` 下数组会被拼接，`-l 4321`
// 因此丢过一次（实测：serve 自己跑到随机端口，而 curl 还打在旧服务上，
// 于是「预览没样式」查了半天是打错了端口）。
spawn(`npx --yes serve "${PREVIEW}" -l ${PORT}`, { stdio: 'inherit', shell: true }).on('exit', (code) => {
  rmSync(LINK, { recursive: true, force: true })
  process.exit(code ?? 0)
})
