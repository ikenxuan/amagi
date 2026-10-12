// 把 `verify-page/`（React 验证页）用 Vite 打成单个 IIFE + CSS，套上 HTML 壳，
// 烘焙成 `src/verify/page.generated.ts`。用法：
//   tsx scripts/gen-verify-page.mts            重新构建并写出
//   tsx scripts/gen-verify-page.mts --check    重新构建并与已提交产物比对，不一致退出码 1
//
// tsdown 把 src 打成单文件 dist，静态资源不进 dist、`files` 也只发 dist/*，运行时读不到；
// 变成 `export const` 字符串后 bundler 当普通模块收进去，dev / 测试 / 发布一致。
// 产物头部记源码哈希，单测只比哈希（不跑 Vite），`--check` 才完整重建比对。
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..')
const APP_DIR = join(CORE, 'verify-page')
const OUT_FILE = join(CORE, 'src/verify/page.generated.ts')
/** 验证页源码：verify-page 整个目录 + 两边共用的数据契约 */
const SOURCES = [...readdirSync(APP_DIR).map((f) => join(APP_DIR, f)), join(CORE, 'src/verify/data.ts')].sort()

/** 源码内容哈希（LF 归一），产物与漂移单测各算一次比对 */
export const sourceHash = (): string => {
  const h = createHash('sha256')
  for (const f of SOURCES)
    h.update(relative(CORE, f).replace(/\\/g, '/')).update('\0').update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n'))
  return h.digest('hex').slice(0, 16)
}

/** 跑 Vite 库模式构建（不落盘），取出 JS 与 CSS */
const bundle = async (): Promise<{ js: string; css: string }> => {
  const { build } = await import('vite')
  const { default: react } = await import('@vitejs/plugin-react')
  const out = await build({
    root: APP_DIR,
    configFile: false,
    logLevel: 'warn',
    plugins: [react()],
    // 库模式不替换 process.env，React 要靠它摇掉开发分支
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      write: false,
      minify: true,
      target: 'es2020',
      lib: { entry: join(APP_DIR, 'main.tsx'), formats: ['iife'], name: 'AmagiVerify', fileName: () => 'page.js', cssFileName: 'page' }
    }
  })
  const outputs = (Array.isArray(out) ? out : [out]).flatMap((o) => ('output' in o ? o.output : []))
  const pick = (ext: string) =>
    outputs
      .filter((o) => o.fileName.endsWith(ext))
      .map((o) => (o.type === 'chunk' ? o.code : String(o.source)))
      .join('\n')
  return { js: pick('.js'), css: pick('.css') }
}

/** HTML 壳：标题与数据两个占位符由 renderVerifyPage 一次性替换 */
const shell = ({ js, css }: { js: string; css: string }): string => {
  // 内联进 <script> / <style> 不能出现闭合标签，否则页面被截断
  const safeJs = js.replace(/<\/(script)/gi, '<\\/$1')
  if (/<\/style/i.test(css)) throw new Error('CSS 里出现了 </style')
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>__AMAGI_TITLE__</title>',
    `<style>${css.trim()}</style>`,
    '</head>',
    '<body>',
    '<div id="app"></div>',
    '<noscript>本页需要启用 JavaScript。</noscript>',
    '<script>window.__AMAGI_VERIFY__=__AMAGI_VERIFY_JSON__;</script>',
    `<script>${safeJs.trim()}</script>`,
    '</body>',
    '</html>',
    ''
  ].join('\n')
}

/** 产出 generated.ts 的完整文本 */
const generate = async (): Promise<string> => {
  const html = shell(await bundle())
  for (const p of ['__AMAGI_TITLE__', '__AMAGI_VERIFY_JSON__'])
    if (html.split(p).length !== 2) throw new Error(`占位符 ${p} 在产物里应恰好出现一次`)
  return [
    '// 自动生成，勿手改：由 scripts/gen-verify-page.mts 从 verify-page/（React）构建烘焙。',
    '// 占位符 __AMAGI_TITLE__ 与 __AMAGI_VERIFY_JSON__ 由 renderVerifyPage 一次性替换。',
    '',
    `export const VERIFY_PAGE_SOURCE_HASH = '${sourceHash()}'`,
    '',
    `export const VERIFY_PAGE_TEMPLATE = ${JSON.stringify(html)}`,
    ''
  ].join('\n')
}

// CLI：`tsx scripts/gen-verify-page.mts [--check]`
if (process.argv[1] && import.meta.url.endsWith(relative(process.cwd(), process.argv[1]).replace(/\\/g, '/'))) {
  const next = await generate()
  if (process.argv.includes('--check')) {
    let current = ''
    try {
      current = readFileSync(OUT_FILE, 'utf8').replace(/\r\n/g, '\n')
    } catch {
      current = ''
    }
    if (current !== next) {
      console.error('page.generated.ts 与 verify-page/ 不一致：跑 `pnpm gen:verify-page` 重新生成并提交（不要手改产物）')
      process.exitCode = 1
    } else {
      console.log(`page.generated.ts 与 verify-page/ 一致：${next.length} 字节`)
    }
  } else {
    writeFileSync(OUT_FILE, next)
    console.log(`已写出 page.generated.ts：${next.length} 字节`)
  }
}
