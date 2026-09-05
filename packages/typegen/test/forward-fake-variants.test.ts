/**
 * PRD 阶段 0 点名的第一个用例：**那两个假变体必须合成一个类型**。
 *
 * `DYNAMIC_TYPE_FORWARD/Forward/DYNAMIC_TYPE_AV/` 下的 `_V0` 与 `_V1` 不是两个变体，
 * 是同一个接口两次抓包赶上的数据不一样（PRD 1.3）。把两份类型反推成两份样本喂进合并器，
 * 合出来应该是**一个**类型：`editable?`、`decoration_card?`、`topic: Topic | null`。
 * 合不掉就说明合并规则还不对 —— 这个用例比任何新样本都便宜。
 *
 * 样本在 `fixtures/dynamic-forward-av.ts`，那里有逐条差异表。
 */

import { describe, expect, it } from 'vitest'

import { generateTypes } from '../src/index'
import { SAMPLE_V0, SAMPLE_V1 } from './fixtures/dynamic-forward-av'

/** `data.item.type` 是 B站动态的判别字段（PRD 1.4），也是唯一该收窄成字面量的位置 */
const OPTIONS = { rootName: 'DynamicTypeAV', banner: false as const, literalPaths: ['data.item.type'] }

const merged = generateTypes([SAMPLE_V0, SAMPLE_V1], OPTIONS)

/** 取出一段 `type X = { … }` 声明，用来做整块断言 —— 比逐行 toContain 更能说明「长什么样」 */
const typeBlock = (name: string): string => {
  const matched = new RegExp(String.raw`^(?:export )?type ${name} = \{[\s\S]*?^\}$`, 'm').exec(merged.source)
  if (!matched) throw new Error(`生成结果里没有类型 ${name}`)
  return matched[0]
}

const lines = (...text: string[]): string => text.join('\n')

describe('两个假变体合并（PRD 阶段 0 的第一个用例）', () => {
  it('输出的是一个类型族，不是两个 —— 只有一个导出的根类型', () => {
    expect(merged.rootName).toBe('DynamicTypeAV')
    expect(merged.source.match(/^export type /gm)).toHaveLength(1)
    // 也不该出现 _V0 / _V1 这种「抓包漂移就再开一个文件」的产物
    expect(merged.source).not.toMatch(/_V\d/)
  })

  it('差异 1：`editable` 只有 V0 有 → 可选', () => {
    expect(typeBlock('Basic')).toBe(
      lines(
        'type Basic = {',
        '  comment_id_str: string',
        '  comment_type: number',
        '  editable?: boolean',
        '  like_icon: LikeIcon',
        '  rid_str: string',
        '  [property: string]: any',
        '}'
      )
    )
  })

  it('差异 2 / 3：两侧的 `decoration_card` 各自只出现在一份样本里 → 都可选', () => {
    expect(typeBlock('ModuleAuthor')).toContain('  decoration_card?: DecorationCard')
    expect(typeBlock('ModuleAuthor2')).toContain('  decoration_card?: DecorationCard2')
  })

  it('差异 4：`topic` 一份是对象一份是 null → `Topic | null`（必需 + 可为 null 是两个维度）', () => {
    expect(typeBlock('ModuleDynamic')).toBe(
      lines(
        'type ModuleDynamic = {',
        '  additional: null',
        '  desc: Desc',
        '  major: null',
        '  topic: Topic | null',
        '  [property: string]: any',
        '}'
      )
    )
  })

  it('差异 5 / 6：`rid` 与 `jump_url` / `style` 各自只在一份里出现 → 都可选', () => {
    expect(typeBlock('RichTextNode')).toBe(
      lines(
        'type RichTextNode = {',
        '  emoji?: Emoji',
        '  jump_url?: string',
        '  orig_text: string',
        '  rid?: string',
        '  style?: { [property: string]: any }',
        '  text: string',
        '  type: string',
        '  [property: string]: any',
        '}'
      )
    )
    // emoji 在 V1 里多两个键
    expect(typeBlock('Emoji')).toContain('  id?: number')
    expect(typeBlock('Emoji')).toContain('  package_id?: number')
  })

  it('差异 7：`modal` / `params` 只有 V0 有 → 都可选', () => {
    expect(typeBlock('ThreePointItem')).toBe(
      lines(
        'type ThreePointItem = {',
        '  label?: string',
        '  modal?: Modal',
        '  params?: Params',
        '  type: string',
        '  [property: string]: any',
        '}'
      )
    )
  })

  it('差异 8：`orig` 的 `desc` 一份是 null 一份是对象 → `Desc2 | null`', () => {
    expect(typeBlock('ModuleDynamic2')).toContain('  desc: Desc2 | null')
  })

  it('差异 9 / 10：数组元素形状不一致 → 键各自可选（这条现存类型里也是这么写的）', () => {
    expect(typeBlock('Layer2')).toBe(
      lines(
        'type Layer2 = {',
        '  general_spec?: GeneralSpec',
        '  layer_config?: LayerConfig2',
        '  resource?: Resource2',
        '  visible?: boolean',
        '  [property: string]: any',
        '}'
      )
    )
    expect(typeBlock('ImageSrc2')).toBe(
      lines(
        'type ImageSrc2 = {',
        '  local?: number',
        '  placeholder?: number',
        '  remote?: Remote',
        '  src_type: number',
        '  [property: string]: any',
        '}'
      )
    )
  })

  it('硬约束 1：每一层都带 `[property: string]: any`', () => {
    // 每个 `type X = {` 块里有且只有一个索引签名，内联的空对象也带
    const blocks = merged.source.match(/^(?:export )?type \w+ = \{/gm) ?? []
    const inlineEmpty = merged.source.match(/\{ \[property: string\]: any \}/g) ?? []
    const all = merged.source.match(/\[property: string\]: any/g) ?? []
    expect(blocks.length).toBeGreaterThan(30)
    expect(all).toHaveLength(blocks.length + inlineEmpty.length)
  })

  it('5.2：结构等价的子树复用同一个类型，不重新展开', () => {
    // 手写类型里这三对都是重复声明（PurpleLikeIcon/FluffyLikeIcon、
    // PurpleContainerSize/PurpleSizeSpec、Comment/Forward），合并器只产一份
    expect(typeBlock('Basic2')).toContain('  like_icon: LikeIcon')
    expect(typeBlock('GeneralSpec')).toContain('  size_spec: ContainerSize')
    expect(typeBlock('ModuleStat')).toContain('  forward: Comment')
    expect(new Set(merged.typeNames).size).toBe(merged.typeNames.length)
  })

  it('字面量：白名单里的 `data.item.type` 收窄，没进白名单的 `orig.type` 放宽', () => {
    expect(typeBlock('Item')).toContain("  type: 'DYNAMIC_TYPE_AV'")
    expect(typeBlock('Orig')).toContain('  type: string')
    // 不给白名单时连判别字段也放宽 —— 默认放宽是有意的（单账号采样陷阱）
    const widened = generateTypes([SAMPLE_V0, SAMPLE_V1], { ...OPTIONS, literalPaths: [] })
    expect(widened.source).not.toContain("'DYNAMIC_TYPE_AV'")
  })

  it('报告：枚举 token 形状的常量被列成判别式候选，且如实写明没做判别式发现', () => {
    const widened = merged.report.findings.filter((finding) => finding.kind === 'literal-widened').map((finding) => finding.path)
    expect(widened).toEqual([
      'data.item.modules.module_author.type',
      'data.item.orig.modules.module_author.type',
      'data.item.orig.modules.module_dynamic.major.type',
      'data.item.orig.type'
    ])
    expect(merged.report.sampleCount).toBe(2)
    expect(merged.report.notImplemented.join('\n')).toContain('5.1')
  })

  it('确定性：换样本顺序，产出字节完全一样', () => {
    expect(generateTypes([SAMPLE_V1, SAMPLE_V0], OPTIONS).source).toBe(merged.source)
  })
})
