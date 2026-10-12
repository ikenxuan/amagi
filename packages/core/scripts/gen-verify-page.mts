// 把 `src/platforms/douyin/verifyPage.html`（人可编辑的模板）烘焙成运行时可读的
// TS 产物 `verifyPage.template.generated.ts`。用法：
//   tsx scripts/gen-verify-page.mts            重新生成并写出
//   tsx scripts/gen-verify-page.mts --check    与已提交产物比对，不一致退出码 1
//
// 为什么要烘焙而不是运行时 readFileSync：`pnpm build`（tsdown）把 `src/` 整棵树打成
// 单文件 `dist/default/index.mjs`，`.html` 不会被拷进 dist，且 `files` 只发布 `dist/*`，
// 所以运行时相对 `import.meta.url` 读 `.html` 在已安装的包里必然 ENOENT。把模板变成
// 一个 `export const` 字符串，bundler 当普通 TS 模块收进去，dev / 测试 / 发布三处一致。
// 这与 `response-schemas.generated.ts`、`response-types/src/generated/**` 是同一套
// 「非 TS 源 → 产物 TS + --check 门禁」约定。手改产物无意义：改模板请改 `.html`。
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const CORE = join(here, '..')
const HTML_FILE = join(CORE, 'src/platforms/douyin/verifyPage.html')
const OUT_FILE = join(CORE, 'src/platforms/douyin/verifyPage.template.generated.ts')

/**
 * 读模板 HTML，产出 generated.ts 的完整文本。
 * @returns 产物文件内容（LF 行尾）
 */
const build = (): string => {
  const html = readFileSync(HTML_FILE, 'utf8').replace(/\r\n/g, '\n')
  // JSON.stringify 产出合法 TS 双引号字符串字面量：所有 `"` / `\` / 换行 / `</script>`
  // 里的字符都被安全转义，没有反引号与 ${} 的坑，且对同一份输入逐字节可复现。
  const literal = JSON.stringify(html)
  return [
    '// 自动生成，手改无意义 —— 由 packages/core/scripts/gen-verify-page.mts 从',
    '// packages/core/src/platforms/douyin/verifyPage.html 烘焙而来，重新生成会覆盖。',
    '//',
    '// 存在的理由：`pnpm build`（tsdown）把 src 打成单文件 dist/default/index.mjs，`.html`',
    '// 不进 dist、`files` 也只发 dist/*，运行时读不到 `.html`。把模板变成 `export const`',
    '// 字符串，bundler 当普通模块收进去，dev / 测试 / 发布一致。改模板请改那份 .html。',
    '//',
    '// 模板里有三个占位符，由 `renderDouyinVerifyPage` 一次性替换：',
    '//   __DOUYIN_TITLE__（×2，已 HTML 转义的标题）',
    '//   __DOUYIN_CHALLENGE_JSON__（challenge 数据，toInlineJson 后内联）',
    '//   __DOUYIN_PAGE_JSON__（宿主常量 commonOptions/captchaOptions，toInlineJson 后内联）',
    '',
    `export const DOUYIN_VERIFY_PAGE_TEMPLATE = ${literal}`,
    ''
  ].join('\n')
}

// CLI：`tsx scripts/gen-verify-page.mts [--check]`
if (process.argv[1] && import.meta.url.endsWith(relative(process.cwd(), process.argv[1]).replace(/\\/g, '/'))) {
  const next = build()
  if (process.argv.includes('--check')) {
    const current = (() => {
      try {
        return readFileSync(OUT_FILE, 'utf8').replace(/\r\n/g, '\n')
      } catch {
        return ''
      }
    })()
    if (current !== next) {
      console.error(
        'verifyPage.template.generated.ts 与 verifyPage.html 不一致 —— 跑 `pnpm gen:verify-page` 重新生成并提交（不要手改产物）'
      )
      process.exitCode = 1
    } else {
      console.log(`verifyPage.template.generated.ts 与 verifyPage.html 一致：${next.length} 字节模板`)
    }
  } else {
    writeFileSync(OUT_FILE, next)
    console.log(`已写出 verifyPage.template.generated.ts：${next.length} 字节`)
  }
}
