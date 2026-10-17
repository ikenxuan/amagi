import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const docsDir = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(new URL('../package.json', import.meta.url))
const { scripts } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const buildStage = scripts.build.match(/\bnext\s+build\b([^&]*)/)
assert.ok(buildStage, 'The regression fixture must use the docs build command')
const buildArgs = buildStage[1].trim().split(/\s+/).filter(Boolean)

const examples = [
  "import amagi from '@ikenxuan/amagi'\nconst client = amagi()\nconsole.log(client.bilibili.fetcher)",
  '// @errors: 2322\nconst value: string = 1\nconsole.log(value)',
  'const value = { answer: 42 }\nvalue.answer\n//    ^?',
  'const view = <span>synthetic fixture</span>'
]

function buildFixture(invalid) {
  const dir = mkdtempSync(join(docsDir, 'test/.build-resource-'))
  const write = (file, content) => {
    const path = join(dir, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
  try {
    write('package.json', JSON.stringify({ name: 'docs-build-resource-test', private: true, type: 'module' }))
    write(
      'next.config.mjs',
      `import config from '../../next.config.mjs'
const resolved = await config
export default { ...resolved, turbopack: { ...resolved.turbopack, root: ${JSON.stringify(resolve(docsDir, '../..'))} } }
`
    )
    write(
      'source.config.ts',
      `import { defineDocs } from 'fumadocs-mdx/config'
export { default } from '../../source.config'
export const docs = defineDocs({ dir: 'content/docs', docs: { async: true } })
`
    )
    write('mdx-components.js', 'export function useMDXComponents(components) { return components }\n')
    write('app/layout.js', 'export default function Layout({ children }) { return <html><body>{children}</body></html> }\n')
    write(
      'app/page.js',
      `import { docs } from 'fumadocs-mdx:collections/server'
${examples.map((_, i) => `import Page${i} from '../content/docs/page${i}.mdx'`).join('\n')}
export default function Page() { return <main>{[typeof docs, ${examples.map((_, i) => `typeof Page${i}`).join(',')}].join(',')}</main> }
`
    )
    for (const [i, code] of examples.entries()) {
      const source = invalid && i === 0 ? 'const wrong: string = 1' : code
      write(`content/docs/page${i}.mdx`, `---\ntitle: Synthetic ${i}\n---\n\n\`\`\`${i === 3 ? 'tsx' : 'ts'} twoslash\n${source}\n\`\`\`\n`)
    }
    // Observe native compiler creation without replacing the compiler or its results.
    write(
      'observe.cjs',
      `const cp = require('node:child_process')
const spawn = cp.spawn
cp.spawn = function (file, args, ...rest) {
  const child = spawn.call(this, file, args, ...rest)
  if (Array.isArray(args) && args.some(arg => /^--?api$/.test(arg))) console.log('[twoslash-native-api]')
  return child
}
require('node:module').syncBuiltinESMExports()
`
    )
    return spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build', dir, ...buildArgs], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require=${JSON.stringify(join(dir, 'observe.cjs'))}`
      }
    })
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 })
  }
}

test('the docs build shares a native Twoslash compiler across MDX modules', () => {
  const result = buildFixture(false)
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.equal(result.stdout.split('[twoslash-native-api]').length - 1, 1, 'MDX modules must not each retain a native compiler')
})

test('the docs build rejects unannotated Twoslash type errors', () => {
  const result = buildFixture(true)
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`)
  assert.match(`${result.stdout}\n${result.stderr}`, /2322/)
})
