// corpus 策展工具的单页前端。**故意只有一个字符串、零构建、零依赖**：
// 它是本地开发工具，加个打包步骤换来的那点写起来舒服，远不值「多一套要维护的构建」。
//
// 三块面板对应 PRD 阶段 3 那三件事：响应 JSON、即将写入的类型 diff、样本打标（入库 / 丢弃）。
// cookie 在这里一个字都拿不到 —— 接口只回「已提供 / 未提供」。

export const CURATE_PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>corpus 策展</title>
<style>
  :root { color-scheme: light dark; --line: color-mix(in oklab, currentColor 18%, transparent); }
  body { margin: 0; font: 14px/1.6 ui-sans-serif, system-ui, sans-serif; display: grid; grid-template-columns: 300px 1fr; height: 100vh; }
  aside { border-right: 1px solid var(--line); overflow: auto; padding: 12px; }
  main { overflow: auto; padding: 16px 20px; }
  h1 { font-size: 15px; margin: 0 0 12px; }
  h2 { font-size: 13px; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: .06em; opacity: .7; }
  .ep { display: block; width: 100%; text-align: left; border: 0; background: none; color: inherit; font: inherit;
        padding: 4px 6px; border-radius: 4px; cursor: pointer; }
  .ep:hover { background: var(--line); }
  .ep[aria-current="true"] { background: var(--line); font-weight: 600; }
  .ep small { opacity: .6; }
  .plat { margin: 10px 0 4px; font-weight: 600; }
  .plat span { font-weight: 400; opacity: .6; }
  label { display: block; margin: 6px 0; }
  label b { display: block; font-weight: 500; font-size: 13px; }
  input, select { width: 100%; box-sizing: border-box; padding: 5px 7px; font: inherit;
                  border: 1px solid var(--line); border-radius: 4px; background: transparent; color: inherit; }
  button { font: inherit; padding: 6px 12px; border: 1px solid var(--line); border-radius: 4px;
           background: transparent; color: inherit; cursor: pointer; }
  button.primary { background: currentColor; }
  button.primary span { mix-blend-mode: difference; filter: invert(1); }
  pre { background: var(--line); padding: 10px; border-radius: 6px; overflow: auto; max-height: 40vh; margin: 0; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 10px 0; }
  .add { color: #16a34a; } .del { color: #dc2626; } .warn { color: #d97706; }
  .verdict { padding: 6px 10px; border-radius: 4px; border: 1px solid var(--line); display: inline-block; }
  ul { margin: 4px 0; padding-left: 20px; }
</style>
</head>
<body>
<aside>
  <h1>corpus 策展</h1>
  <div id="list">读取端点…</div>
</aside>
<main>
  <div id="form"></div>
  <div id="out"></div>
</main>
<script>
const token = new URLSearchParams(location.search).get('token')
const api = async (path, body) => {
  const res = await fetch(path + (token ? (path.includes('?') ? '&' : '?') + 'token=' + token : ''), body === undefined
    ? {}
    : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
let platforms = []
let current = null

const render = () => {
  const list = document.getElementById('list')
  list.textContent = ''
  for (const p of platforms) {
    const head = document.createElement('div')
    head.className = 'plat'
    head.innerHTML = p.platform + ' <span>' + (p.hasCookie ? 'cookie 已提供' : '无 cookie') + '</span>'
    list.append(head)
    for (const ep of p.endpoints) {
      const b = document.createElement('button')
      b.className = 'ep'
      b.setAttribute('aria-current', String(current && current.platform === p.platform && current.ep.name === ep.name))
      b.innerHTML = ep.name + ' <small>' + (ep.stored ? ep.stored + ' 份' : '未录') +
        (ep.unseeded.length ? ' · 缺种子' : '') + '</small>'
      b.onclick = () => { current = { platform: p.platform, ep }; render(); renderForm() }
      list.append(b)
    }
  }
}

const renderForm = () => {
  const box = document.getElementById('form')
  document.getElementById('out').textContent = ''
  box.textContent = ''
  if (!current) return
  const { platform, ep } = current
  const title = document.createElement('h2')
  title.textContent = platform + '.' + ep.name + (ep.summary ? ' —— ' + ep.summary : '')
  box.append(title)

  const props = (ep.schema && ep.schema.properties) || {}
  const required = new Set((ep.schema && ep.schema.required) || [])
  const inputs = {}
  for (const [name, schema] of Object.entries(props)) {
    const label = document.createElement('label')
    const b = document.createElement('b')
    b.textContent = name + (required.has(name) ? ' *' : '') + (schema.type ? '  (' + schema.type + ')' : '')
    label.append(b)
    // 有 enum 就给下拉，其余给输入框 —— 表单形状全部由 zod 派生出的 JSON Schema 决定
    const values = schema.enum || (schema.const !== undefined ? [schema.const] : null)
    let field
    if (values) {
      field = document.createElement('select')
      if (!required.has(name)) field.append(new Option('（不带）', ''))
      values.forEach(v => field.append(new Option(String(v), String(v))))
    } else {
      field = document.createElement('input')
      const seed = ep.seeds[name]
      if (seed && seed.length) field.value = String(seed[0])
      field.placeholder = schema.type === 'number' ? '数字' : ''
    }
    inputs[name] = { field, schema }
    label.append(field)
    box.append(label)
  }

  const row = document.createElement('div')
  row.className = 'row'
  const one = document.createElement('button')
  one.className = 'primary'
  one.innerHTML = '<span>录一发</span>'
  one.onclick = async () => {
    const params = {}
    for (const [name, { field, schema }] of Object.entries(inputs)) {
      if (field.value === '') continue
      params[name] = schema.type === 'number' ? Number(field.value) : field.value
    }
    show('请求中…')
    try { showOutcome(await api('/api/record', { platform, endpoint: ep.name, params })) } catch (e) { show(String(e.message)) }
  }
  row.append(one)
  const batch = document.createElement('button')
  batch.textContent = '一键补样本（按参数矩阵录 ' + ep.combinations + ' 组）'
  batch.disabled = ep.unseeded.length > 0
  batch.onclick = async () => {
    show('批量录制中，每组间隔 1.5 秒…')
    try {
      const res = await api('/api/record-batch', { platform, endpoint: ep.name })
      const out = document.getElementById('out')
      out.textContent = ''
      res.outcomes.forEach(o => showOutcome(o, true))
      if (!res.outcomes.length) show('一组都没录：' + (res.unseeded.length ? '缺种子 ' + res.unseeded.join(' / ') : '参数矩阵是空的'))
    } catch (e) { show(String(e.message)) }
  }
  row.append(batch)
  if (ep.unseeded.length) {
    const hint = document.createElement('span')
    hint.className = 'warn'
    hint.textContent = '缺种子：' + ep.unseeded.join(' / ') + '（去 corpus/seeds.json 补）'
    row.append(hint)
  }
  box.append(row)
}

const show = (text) => { document.getElementById('out').textContent = text }

const section = (parent, title, node) => {
  const h = document.createElement('h2'); h.textContent = title; parent.append(h, node)
}

const showOutcome = (o, append = false) => {
  const out = document.getElementById('out')
  if (!append) out.textContent = ''
  const wrap = document.createElement('div')

  const v = document.createElement('div')
  v.className = 'verdict'
  v.textContent = o.verdict.kind + '：' + o.verdict.reason + (o.message ? '（' + o.message + '）' : '')
  wrap.append(v)

  if (o.scrub) {
    const s = document.createElement('div')
    s.innerHTML = '脱敏 ' + o.scrub.replacements + ' 处'
    if (o.scrub.leaks.length) {
      const ul = document.createElement('ul'); ul.className = 'del'
      o.scrub.leaks.forEach(t => { const li = document.createElement('li'); li.textContent = '残留：' + t; ul.append(li) })
      s.append(ul)
      const note = document.createElement('div'); note.className = 'del'
      note.textContent = '有残留，这份样本不能入库 —— 去补一条脱敏规则再重录'
      s.append(note)
    }
    if (o.scrub.suspects.length) {
      const ul = document.createElement('ul'); ul.className = 'warn'
      o.scrub.suspects.slice(0, 10).forEach(t => { const li = document.createElement('li'); li.textContent = '可疑：' + t; ul.append(li) })
      s.append(ul)
    }
    section(wrap, '脱敏', s)
  }

  if (o.payload !== undefined) {
    const pre = document.createElement('pre')
    pre.textContent = JSON.stringify(o.payload, null, 2).slice(0, 20000)
    section(wrap, '响应 JSON（脱敏后）', pre)
  }

  if (o.diff) {
    const pre = document.createElement('pre')
    if (!o.diff.length) pre.textContent = '（类型没有变化 —— 这份样本没带来新形状）'
    o.diff.slice(0, 400).forEach(line => {
      const span = document.createElement('span')
      span.className = line.includes(' + ') ? 'add' : line.includes(' - ') ? 'del' : ''
      span.textContent = line + '\\n'
      pre.append(span)
    })
    section(wrap, '即将写入的类型 diff', pre)
  }

  if (o.breaking && o.breaking.length) {
    const ul = document.createElement('ul'); ul.className = 'del'
    o.breaking.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.append(li) })
    section(wrap, '破坏性变更（下游会红）', ul)
  }

  const row = document.createElement('div')
  row.className = 'row'
  if (o.pendingId) {
    const keep = document.createElement('button')
    keep.className = 'primary'
    keep.innerHTML = '<span>入库</span>'
    keep.onclick = async () => {
      const res = await api('/api/store', { pendingId: o.pendingId })
      keep.disabled = true; keep.innerHTML = '<span>已写入 ' + res.written + '</span>'
      platforms = await api('/api/endpoints'); render()
    }
    const drop = document.createElement('button')
    drop.textContent = '丢弃'
    drop.onclick = async () => { await api('/api/discard', { pendingId: o.pendingId }); drop.disabled = true; drop.textContent = '已丢弃' }
    row.append(keep, drop)
  } else {
    const note = document.createElement('span')
    note.className = 'warn'
    note.textContent = '这份不能入库（被入库判定拒了，或有脱敏残留）'
    row.append(note)
  }
  wrap.append(row)
  out.append(wrap, document.createElement('hr'))
}

api('/api/endpoints').then(data => { platforms = data; render() }).catch(e => { document.getElementById('list').textContent = String(e.message) })
</script>
</body>
</html>
`
