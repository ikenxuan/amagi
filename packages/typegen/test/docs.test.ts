/**
 * 注释 sidecar（PRD 六）。
 *
 * 这一条的价值全在「注释与形状分开存」上：形状能从样本重新生成，语义不能。
 * 所以测试的重心是**注释在什么情况下落不到产物上**，以及那时有没有如实报出来 ——
 * 一条静默丢掉的注释，下次生成时人会以为它还在。
 */

import { describe, expect, it } from 'vitest'

import { collectShapePaths, findOrphanDocs, generateTypes, type JsonValue, mergeSamples, parseDocSidecar, renderJsDoc } from '../src/index'

const shapeOf = (samples: JsonValue[]) => mergeSamples(samples).shape

describe('sidecar 解析：人手改的文件', () => {
  it('正常文件没有错误', () => {
    const { sidecar, errors } = parseDocSidecar({ paths: { 'data.item.type': '动态类型（判别式）' } })
    expect(errors).toEqual([])
    expect(sidecar.paths['data.item.type']).toBe('动态类型（判别式）')
  })

  it('空注释要报 —— 它占着位置，看起来像已经写过说明了', () => {
    expect(parseDocSidecar({ paths: { a: '   ' } }).errors[0]).toContain('空字符串')
  })

  it('注释写成非字符串要报出具体路径', () => {
    expect(parseDocSidecar({ paths: { a: 1 } }).errors[0]).toContain('paths["a"]')
  })

  it('未知键要报（`$comment` 除外，JSON 没有注释）', () => {
    expect(parseDocSidecar({ paths: {}, note: 'x' }).errors[0]).toContain('note')
    expect(parseDocSidecar({ paths: {}, $comment: 'x' }).errors).toEqual([])
  })

  it('根不是对象 / 缺 paths → 退化成空 sidecar，不抛', () => {
    expect(parseDocSidecar([]).errors[0]).toContain('根不是对象')
    expect(parseDocSidecar({}).errors[0]).toContain('缺 paths')
  })
})

describe('sidecar 的 declaredValues：手写枚举与样本的漂移账本', () => {
  it('正常清单解析出来，且不报错', () => {
    const { sidecar, errors } = parseDocSidecar({ paths: {}, declaredValues: ['DYNAMIC_TYPE_AV', 'DYNAMIC_TYPE_DRAW'] })
    expect(errors).toEqual([])
    expect(sidecar.declaredValues).toEqual(['DYNAMIC_TYPE_AV', 'DYNAMIC_TYPE_DRAW'])
  })

  it('数字与布尔也收 —— 判别式不一定是字符串（业务码就常是数字）', () => {
    expect(parseDocSidecar({ paths: {}, declaredValues: [0, 1, true] }).sidecar.declaredValues).toEqual([0, 1, true])
  })

  it('**写错一个取值时其余的仍然参与比对，而错的那个被指名** —— 整条静默失效最难查', () => {
    const { sidecar, errors } = parseDocSidecar({ paths: {}, declaredValues: ['AV', { bad: 1 }, 'DRAW'] })
    expect(errors[0]).toContain('declaredValues[1]')
    expect(sidecar.declaredValues).toEqual(['AV', 'DRAW'])
  })

  it('重复取值要报 —— 那通常是复制粘贴漏改', () => {
    expect(parseDocSidecar({ paths: {}, declaredValues: ['AV', 'AV'] }).errors[0]).toContain('重复')
  })

  it('不是数组要报', () => {
    expect(parseDocSidecar({ paths: {}, declaredValues: 'AV' }).errors[0]).toContain('只能是数组')
  })

  it('缺 paths 时 declaredValues 照样带出来 —— 两个字段互不牵连', () => {
    const { sidecar, errors } = parseDocSidecar({ declaredValues: ['AV'] })
    expect(errors[0]).toContain('缺 paths')
    expect(sidecar.declaredValues).toEqual(['AV'])
  })
})

describe('注释注入', () => {
  it('属性上方生成单行 JSDoc', () => {
    const { source } = generateTypes([{ mid: 1 }], { rootName: 'R', banner: false, docs: { mid: '作者 UID' } })
    expect(source).toContain('  /** 作者 UID */\n  mid: number')
  })

  it('多行注释渲染成块注释', () => {
    const { source } = generateTypes([{ type: 'A' }], { rootName: 'R', banner: false, docs: { type: '第一行\n第二行' } })
    expect(source).toContain(['  /**', '   * 第一行', '   * 第二行', '   */', '  type: string'].join('\n'))
  })

  it('空路径的注释挂在根类型上', () => {
    const { source } = generateTypes([{ a: 1 }], { rootName: 'R', banner: false, docs: { '': '一条动态' } })
    expect(source.startsWith('/** 一条动态 */\nexport type R = {')).toBe(true)
  })

  it('嵌套路径与数组元素路径都能命中', () => {
    const samples: JsonValue[] = [{ data: { items: [{ id: 1 }] } }]
    const { source } = generateTypes(samples, {
      rootName: 'R',
      banner: false,
      docs: { 'data.items': '条目列表', 'data.items[].id': '条目 ID' }
    })
    expect(source).toContain('/** 条目列表 */')
    expect(source).toContain('/** 条目 ID */')
  })

  it('注释结束符被转义，不会提前闭合注释块', () => {
    const { source } = generateTypes([{ a: 1 }], { rootName: 'R', banner: false, docs: { a: '形如 /** x */ 的写法' } })
    expect(source).toContain('*\\/')
    // 转义没做对的话后面这半句会跑到代码里去，源码就不合法了
    expect(source).toContain('  a: number')
  })

  it('注释不影响类型本身（去掉 docs 后除注释行外逐字节相同）', () => {
    const samples: JsonValue[] = [{ a: 1, b: { c: 2 } }]
    const withDocs = generateTypes(samples, { rootName: 'R', banner: false, docs: { a: 'x', 'b.c': 'y' } }).source
    const without = generateTypes(samples, { rootName: 'R', banner: false }).source
    expect(
      withDocs
        .split('\n')
        .filter((line) => !line.includes('/**'))
        .join('\n')
    ).toBe(without)
  })
})

describe('孤立 pointer：注释开始说谎的那一刻', () => {
  it('指向不存在的路径 → 报 orphan', () => {
    const { docIssues } = generateTypes([{ a: 1 }], { rootName: 'R', banner: false, docs: { 'a.gone': '没了' } })
    expect(docIssues).toEqual([{ path: 'a.gone', kind: 'orphan', message: expect.stringContaining('已经在说谎') }])
  })

  it('findOrphanDocs 单独也能查（生成前先校验 sidecar）', () => {
    const shape = shapeOf([{ a: { b: 1 } }])
    expect(findOrphanDocs({ paths: { 'a.b': 'x', 'a.c': 'y' } }, shape)).toEqual(['a.c'])
  })

  it('判据是「路径在形状树里存在」，不是「渲染时走到了」', () => {
    // a 与 b 子树等价，b 的类型直接引用从 a 生成的那个 —— 渲染时不会再走 b.x，
    // 按渲染访问判会把 b.x 误报成孤立的
    const shape = shapeOf([{ a: { x: 1 }, b: { x: 1 } }])
    expect(findOrphanDocs({ paths: { 'b.x': '有效注释' } }, shape)).toEqual([])
    const { docIssues } = generateTypes([{ a: { x: 1 }, b: { x: 1 } }], { rootName: 'R', banner: false, docs: { 'b.x': '有效注释' } })
    expect(docIssues.filter((issue) => issue.kind === 'orphan')).toEqual([])
  })

  it('collectShapePaths 收全每一层，包括根与数组元素', () => {
    expect([...collectShapePaths(shapeOf([{ a: [{ b: 1 }] }]))].sort()).toEqual(['', 'a', 'a[]', 'a[].b'])
  })
})

describe('共用类型上的注释冲突', () => {
  const samples: JsonValue[] = [{ a: { x: 1 }, b: { x: 1 } }]

  it('两条不同注释指向同一个共用类型 → 留第一条，第二条报 conflict', () => {
    const { source, docIssues } = generateTypes(samples, { rootName: 'R', banner: false, docs: { 'a.x': '甲的说明', 'b.x': '乙的说明' } })
    expect(source).toContain('/** 甲的说明 */')
    expect(source).not.toContain('/** 乙的说明 */')
    expect(docIssues).toEqual([{ path: 'b.x', kind: 'conflict', message: expect.stringContaining('那个位置留的是 a.x 的注释') }])
  })

  it('注释相同就不算冲突（同一句话挂在共用类型上没有歧义）', () => {
    const { docIssues } = generateTypes(samples, { rootName: 'R', banner: false, docs: { 'a.x': '同一句', 'b.x': '同一句' } })
    expect(docIssues).toEqual([])
  })

  it('注释不参与结构等价判定 —— 否则加一条注释就多出一份重复类型，人就不敢写注释了', () => {
    const withDocs = generateTypes(samples, { rootName: 'R', banner: false, docs: { 'a.x': '甲' } })
    const without = generateTypes(samples, { rootName: 'R', banner: false })
    expect(withDocs.typeNames).toEqual(without.typeNames)
  })
})

describe('renderJsDoc', () => {
  it('单行带缩进', () => {
    expect(renderJsDoc('说明', '  ')).toBe('  /** 说明 */')
  })

  it('多行每行加星号，空行不留尾随空格', () => {
    expect(renderJsDoc('一\n\n二', '')).toBe(['/**', ' * 一', ' *', ' * 二', ' */'].join('\n'))
  })
})
