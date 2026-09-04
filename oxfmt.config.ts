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
  // `.html` 是 Vite 的 index.html（模板语法不是 JS）；`.mdx` 是文档正文。
  // `content/**/meta.json` 是 fumadocs 的侧边栏清单：`pages` 那个数组一行一条是**有意的** ——
  // 它是人手改最频繁的地方（加一页就加一行），而 oxfmt 会把它压成一行长数组，
  // 于是「加一页」的 diff 变成整行重写，review 时看不出改了什么。
  ignorePatterns: ['**/*.html', '**/*.mdx', 'packages/docs/content/**/meta.json']
})
