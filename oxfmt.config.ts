import { defineConfig } from 'oxfmt'

export default defineConfig({
  semi: false,
  trailingComma: 'none',
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  printWidth: 140,
  sortImports: {
    newlinesBetween: true
  },
  // 全仓只有这一份配置。**不要在子目录里再放副本** —— `ignorePatterns` 的作用域被
  // 配置文件自身限定（oxc 文档：rooted at the directory containing the configuration file），
  // 一份嵌套副本会让下面所有规则在那个子树里静默失效。
  //
  // 这不是假设：`packages/docs/oxfmt.config.ts` 曾经就是这样一个副本，它缺了 meta.json
  // 那条，于是那条保护规则从写下起就没生效过一天。副本已于 2026-09-14 删除。
  ignorePatterns: [
    // `.html` 是 Vite 的 index.html（模板语法不是 JS）；`.mdx` 是文档正文。
    '**/*.html',
    '**/*.mdx',
    // `content/**/meta.json` 是 fumadocs 的侧边栏清单：`pages` 那个数组一行一条是**有意的** ——
    // 它是人手改最频繁的地方（加一页就加一行），而 oxfmt 会把它压成一行长数组，
    // 于是「加一页」的 diff 变成整行重写，review 时看不出改了什么。
    'packages/docs/content/**/meta.json',
    // `openapi.json` 是 `pnpm openapi` 的产物，`gen:openapi:check` 会与它**逐字节**比对。
    // 让格式化器碰它那道门禁必红 —— oxfmt 会把 `"tags": ["douyin"]` 压成一行，
    // 而生成器输出的是两空格缩进。
    'packages/core/openapi.json',
    // 同上：端点响应类型的 JSON Schema 产物，也由 `pnpm openapi` 写出并被 `--check`
    // 逐字节比对。oxfmt 会重排它的对象字面量，门禁同样必红。
    'packages/core/src/server/response-schemas.generated.ts',
    // 还是同上：`packages/response-types/src/generated/**` 是 `pnpm gen:types` 的产物，
    // `types:check` 拿生成器的输出与它**逐字节**比对。这一条是三条里最晚补上的，
    // 代价是两道门禁互相打架了一阵：`e7ce2321`「全仓应用 oxfmt」把整棵树格式化过一遍，
    // 于是生成器再跑一次就有 4 个文件对不上 —— 联合类型被并回一行、import 被重排、
    // `'你看到我硬币了吗'` 这种属性名的引号被按需去掉。产物该长什么样由生成器说了算。
    'packages/response-types/src/generated/**',
    // 录下来的实测响应样本。类型才是产物，样本只是生成它的输入 ——
    // 重排它们不产生任何价值，只会让「样本变了」和「格式变了」看起来一样。
    'packages/core/test/fixtures/**',
    // `CHANGELOG.md` 是 release-please 时代的产物，它的 markdown 风格（`*` 列表项、
    // `###` 段前空两行）与 oxfmt 互不相让 —— 当年每发一版、合并 release PR 时
    // `format:check` 必红，整条质量门禁跟着红。2026-09-21 发布流程改为 tag 触发后，
    // changelog 由 changelogithub 直接写成 GitHub Release，**不再有任何工具重写这份
    // 文件**，它就此冻结。排除项保留：冻结不等于已按 oxfmt 风格排过，放它进门禁
    // 只会逼出一次纯格式化 diff，没有收益。哪天真想让它进门禁，跑一次 `pnpm fix`
    // 再删掉这行即可。
    'packages/core/CHANGELOG.md'
  ]
})
