/**
 * `ParamForm` 的两件事：**掰参数的那条纯函数**，与**逐字段错误真的渲得出来**。
 *
 * 为什么能渲组件：跟 `outcomeCard.test.ts` 同一条路 —— `react-dom/server` 的
 * `renderToStaticMarkup`，它随 `react-dom` 一起装着，不需要 jsdom 也不需要 testing-library
 * （vitest 跑在 node 环境，见根 `vitest.config.ts`）。HeroUI / react-aria-components 支持 SSR，
 * 所以量到的是真的 DOM 结构。**代价是量不到交互**：`isInvalid` 是受控的，SSR 那一帧就带着它，
 * 于是「提交之后出现错误」这条能验；而「敲一下键盘错误消失」验不了（那需要事件循环）。
 *
 * 三样东西钉在这里：
 *
 * 1. **`coerceParam` 的三态**。原先是 `JsonValue | undefined`，而 `Number('')` 是 0 ——
 *    「没填」与「填了 0」混成一件事，`mode: 0` 就会凭空进请求。
 * 2. **超 2^53 的数字串被拦住**，而不是静默变成邻近的那个 ID。
 * 3. **`isSteppable` 认得出 zod 那个 `.int()` 上界哨兵**。`NumberField` 只给真有上界的量，
 *    判据全文在组件里；这里连着 zod 一起验，哨兵哪天变了这条会红。
 */

import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import * as zod from 'zod'

import type { EndpointInfo, FieldSchema, JsonValue } from '../shared/contract'

/** {@link coerceParam} 的结果。手抄一份 —— 下面那个 import 是动态的，拿不到它的类型 */
type CoercedParam = { kind: 'value'; value: JsonValue } | { kind: 'empty' } | { kind: 'invalid'; reason: string }

interface ParamFieldProps {
  name: string
  field: FieldSchema
  isRequired: boolean
  seed?: JsonValue
  error?: string
  onEdit: () => void
}

/**
 * 被测模块。**说明符刻意是个变量**，于是 `tsc` 不去解析它 —— `test/` 归
 * `tsconfig.node.json` 管，而那份没有 `jsx`（理由见 `outcomeCard.test.ts:31-41`，同一件事）。
 */
const MODULE = '../src/components/ParamForm'
const { ParamField, ParamForm, coerceParam, isSteppable, numberPreset } = (await import(MODULE)) as {
  ParamField: (props: ParamFieldProps) => ReactNode
  ParamForm: (props: {
    endpoint: EndpointInfo
    /** 有**任何**动作在跑 */
    disabled: boolean
    /** 在跑的**恰好是这一发**。两者分开的理由见最后那个 describe */
    sending?: boolean
    onSubmit: (params: Record<string, JsonValue>) => void
  }) => ReactNode
  coerceParam: (raw: string, schema: FieldSchema) => CoercedParam
  isSteppable: (schema: FieldSchema) => boolean
  numberPreset: (raw: JsonValue | undefined) => number | undefined
}

/** zod 那个 `.int()` 自动带上的上界。**它正好等于 `MAX_SAFE_INTEGER`**，这就是它不能当上界用的原因 */
const SENTINEL_MAX = Number.MAX_SAFE_INTEGER

/** 有真上界的数字参数：抖音/快手的「条数」（`zod.coerce.number().int().min(1).max(500)`） */
const COUNT: FieldSchema = { type: 'integer', minimum: 1, maximum: 500 }
/** 只有 `.int().min(1)` 的数字参数：B站 `cid` / `avid` / `host_mid` 都长这样 —— 也就是 ID 的形状 */
const ID_NUMBER: FieldSchema = { type: 'integer', minimum: 1, maximum: SENTINEL_MAX }
/** 字符串 ID（抖音 `aweme_id`、快手 `photoId`）。19 位，超 2^53 —— 它只能是字符串 */
const ID_STRING: FieldSchema = { type: 'string', minLength: 1 }

/** 一次静态渲染。`onEdit` 在 SSR 里永远不会被调 */
const render = (props: Omit<ParamFieldProps, 'onEdit'>): string =>
  renderToStaticMarkup(createElement(ParamField, { ...props, onEdit: () => undefined }))

/**
 * 整张表单的一次静态渲染。分组是 `ParamForm` 自己的事（`ParamField` 不知道有分组），
 * 所以那几条只能从外面渲。
 */
const endpointOf = (
  schema: { properties: Record<string, FieldSchema>; required?: string[] },
  seeds: Record<string, readonly JsonValue[]> = {}
): EndpointInfo => ({
  name: 'videoWork',
  summary: '',
  schema,
  seeds,
  stored: 0,
  combinations: 0,
  unseeded: [],
  source: ''
})

const renderForm = (
  schema: { properties: Record<string, FieldSchema>; required?: string[] },
  seeds: Record<string, readonly JsonValue[]> = {}
): string =>
  renderToStaticMarkup(createElement(ParamForm, { endpoint: endpointOf(schema, seeds), disabled: false, onSubmit: () => undefined }))

/** `zod.toJSONSchema` 出来的 properties —— 与 `server/endpoints.ts:29-30` 逐字同一个调用 */
const propsOf = (shape: Record<string, zod.ZodType>): Record<string, FieldSchema> =>
  (zod.toJSONSchema(zod.object(shape), { io: 'input', unrepresentable: 'any' }) as { properties?: Record<string, FieldSchema> })
    .properties ?? {}

describe('coerceParam：三态', () => {
  it("**空串是「没填」，不是 0** —— `Number('')` 是 0，混成一件事就等于 `mode: 0` 凭空进请求", () => {
    expect(coerceParam('', COUNT)).toEqual({ kind: 'empty' })
    // 反过来，真的填了 0 就要拿到 0（B站 comments 的 `mode: 0` 是合法取值）
    expect(coerceParam('0', { type: 'integer', minimum: 0, maximum: 3 })).toEqual({ kind: 'value', value: 0 })
  })

  it('只打了空格也不是 0，而是「填错了」 —— 原生 required 只看框空不空，空格是不空的', () => {
    expect(Number('   ')).toBe(0)
    expect(coerceParam('   ', COUNT).kind).toBe('invalid')
  })

  it('`abc` 掰不动就报错，**不回 NaN** —— NaN 到了 server 会变成 0（见组件里那段注释）', () => {
    const result = coerceParam('abc', COUNT)
    expect(result.kind).toBe('invalid')
    expect(result).toHaveProperty('reason', '要填数字')
  })

  it('`1e999`（溢出成 Infinity）也算掰不动', () => {
    expect(coerceParam('1e999', COUNT).kind).toBe('invalid')
    expect(coerceParam('Infinity', COUNT).kind).toBe('invalid')
  })

  it('小数喂给 `integer` 被拦住；喂给 `number` 收下', () => {
    expect(coerceParam('1.5', COUNT)).toEqual({ kind: 'invalid', reason: '要填整数' })
    expect(coerceParam('1.5', { type: 'number', maximum: 10 })).toEqual({ kind: 'value', value: 1.5 })
  })

  it('布尔与字符串照原样掰：`true`/`false` 变布尔，字符串**一个字符都不动**（前后空格也留着）', () => {
    expect(coerceParam('true', { type: 'boolean' })).toEqual({ kind: 'value', value: true })
    expect(coerceParam('false', { type: 'boolean' })).toEqual({ kind: 'value', value: false })
    expect(coerceParam(' 猫 ', ID_STRING)).toEqual({ kind: 'value', value: ' 猫 ' })
  })
})

describe('coerceParam：大整数精度（这一条最要紧）', () => {
  it('**超 2^53 的数字串被拦住** —— 那个数已经不是人填的那个了', () => {
    // 这就是它必须被拦的理由：多打一位，`Number` 静默换成邻近的可表示数
    expect(Number('9007199254740993')).toBe(SENTINEL_MAX + 1)
    const result = coerceParam('9007199254740993', ID_NUMBER)
    expect(result.kind).toBe('invalid')
    expect(result).toHaveProperty('reason', expect.stringContaining('9007199254740991'))
  })

  it('19 位的雪花 ID（抖音 `aweme_id` 那种长度）当数字填也被拦住', () => {
    expect(coerceParam('7300000000000000001', ID_NUMBER).kind).toBe('invalid')
    // 而它作为**字符串**参数一位都不会丢 —— 长 ID 在这个仓库里全是 `zod.string()`
    expect(coerceParam('7300000000000000001', ID_STRING)).toEqual({ kind: 'value', value: '7300000000000000001' })
  })

  it('恰好 `MAX_SAFE_INTEGER` 收下 —— 它是能原样表示的，拦它属于误伤', () => {
    expect(coerceParam(String(SENTINEL_MAX), ID_NUMBER)).toEqual({ kind: 'value', value: SENTINEL_MAX })
  })

  it('负的那一侧同样拦', () => {
    expect(coerceParam('-9007199254740993', { type: 'integer' }).kind).toBe('invalid')
  })
})

describe('isSteppable：只有真划了上界的数字参数才配步进器', () => {
  it('有人划的上界 ⇒ 用 `NumberField`', () => {
    expect(isSteppable(COUNT)).toBe(true)
    expect(isSteppable({ type: 'integer', minimum: 0, maximum: 3 })).toBe(true)
    expect(isSteppable({ type: 'number', minimum: 0, maximum: 1 })).toBe(true)
  })

  it('**上界正好是哨兵值 ⇒ 不用** —— `.int()` 自动带的那个不是「人划的上界」，ID 恰好长这样', () => {
    expect(isSteppable(ID_NUMBER)).toBe(false)
    expect(isSteppable({ type: 'integer', minimum: 1 })).toBe(false)
  })

  it('开区间上界当没有上界（宁可少给一个步进器，也不把边界值多放行一个）', () => {
    expect(isSteppable({ type: 'integer', exclusiveMaximum: 100 })).toBe(false)
  })

  it('非数字字段一概不给', () => {
    expect(isSteppable(ID_STRING)).toBe(false)
    expect(isSteppable({ type: 'boolean' })).toBe(false)
    expect(isSteppable({})).toBe(false)
  })

  it('**判据连着 zod 一起钉住**：`.max(500)` 出来是 500，而光 `.int()` 出来正好是 `MAX_SAFE_INTEGER`', () => {
    const properties = propsOf({
      number: zod.coerce.number().int().min(1).max(500),
      cid: zod.coerce.number().int().min(1)
    })
    // 这两行是整条判据的地基：两个参数都有 `maximum`，差别只在那个值是不是哨兵
    expect(properties.number?.maximum).toBe(500)
    expect(properties.cid?.maximum).toBe(SENTINEL_MAX)
    expect(isSteppable(properties.number!)).toBe(true)
    expect(isSteppable(properties.cid!)).toBe(false)
  })
})

describe('numberPreset：种子是人手写的 JSON，掰不动就当没有', () => {
  it('数字与数字串都收', () => {
    expect(numberPreset(20)).toBe(20)
    expect(numberPreset('20')).toBe(20)
  })

  it('掰不动、空的、超安全整数的一律当没预填 —— 预填一个不是种子的值比不预填坏得多', () => {
    expect(numberPreset('abc')).toBeUndefined()
    expect(numberPreset('')).toBeUndefined()
    expect(numberPreset('   ')).toBeUndefined()
    expect(numberPreset('9007199254740993')).toBeUndefined()
    expect(numberPreset(undefined)).toBeUndefined()
    expect(numberPreset(null)).toBeUndefined()
    expect(numberPreset(true)).toBeUndefined()
    expect(numberPreset({ a: 1 })).toBeUndefined()
  })
})

describe('渲出来的控件：有界的数字给 NumberField，其余留在文本框', () => {
  it('有界数字参数渲成 `NumberField` —— 带 +/- 两个按钮，值走一个隐藏 input', () => {
    const html = render({ name: 'number', field: COUNT, isRequired: false, seed: 20 })
    expect(html).toContain('data-slot="number-field"')
    expect(html).toContain('data-slot="number-field-increment-button"')
    expect(html).toContain('data-slot="number-field-decrement-button"')
    // 表单取值靠这个隐藏 input（`FormData` 里只有它），可见的那个 input 没有 name
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="number"[^>]*value="20"/)
    // 而且**只有一个** —— 两个同名控件会让 `data.get()` 拿到先出现的那一个
    expect(html.match(/name="number"/g)).toHaveLength(1)
  })

  it('**没有上界的数字参数留在文本框**，name 挂在可见的 input 上，键盘还是数字键盘', () => {
    const html = render({ name: 'cid', field: ID_NUMBER, isRequired: true, seed: 1176840 })
    expect(html).not.toContain('data-slot="number-field"')
    expect(html).toMatch(/<input[^>]*name="cid"/)
    // 大小写不敏感：RAC 的 `dom.input` 把 `inputMode` 原样渲出来（HTML 属性名本来就不分大小写）
    expect(html).toMatch(/inputmode="numeric"/i)
    expect(html).toContain('required=""')
  })

  it('**长 ID 一位不丢地进到 DOM 里** —— 这正是它不走 `NumberField` 的理由', () => {
    const html = render({ name: 'aweme_id', field: ID_STRING, isRequired: true, seed: '7300000000000000001' })
    expect(html).toContain('value="7300000000000000001"')
  })

  it('超安全整数的种子不会被四舍五入进 `NumberField`，而是干脆不预填', () => {
    const html = render({ name: 'number', field: COUNT, isRequired: false, seed: '9007199254740993' })
    expect(html).not.toContain('9007199254740992')
    expect(html).not.toContain('9007199254740993')
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="number"[^>]*value=""/)
  })

  it('枚举渲成 Select、布尔渲成 Switch（这两条路不可能掰不动，所以没有错误通道）', () => {
    const enumHtml = render({ name: 'type', field: { type: 'string', enum: ['general', 'user'] }, isRequired: false })
    expect(enumHtml).toContain('general')
    expect(enumHtml).not.toContain('data-slot="number-field"')
    const boolHtml = render({ name: 'flag', field: { type: 'boolean' }, isRequired: false })
    expect(boolHtml).toContain('role="switch"')
  })
})

describe('FieldError 真的渲得出来（这条以前恒是空的）', () => {
  /** 那句提示的正文。`data-slot="field-error"` 是 HeroUI 给它的标记 */
  const errorOf = (html: string): string | undefined => /data-slot="field-error"[^>]*>([\s\S]*?)</.exec(html)?.[1]

  it('文本框：错误落在**这个字段旁边**，同时字段自己标上 `data-invalid`', () => {
    const html = render({ name: 'cid', field: ID_NUMBER, isRequired: true, error: '要填整数' })
    expect(errorOf(html)).toBe('要填整数')
    expect(html).toContain('data-invalid="true"')
  })

  it('`NumberField` 那条路上也一样', () => {
    const html = render({ name: 'number', field: COUNT, isRequired: false, error: '要填整数' })
    expect(errorOf(html)).toBe('要填整数')
    expect(html).toContain('data-invalid="true"')
  })

  it('**没有错误时一个字都不渲** —— 不许对着填对了的字段留一块空的红字位', () => {
    const html = render({ name: 'cid', field: ID_NUMBER, isRequired: true, seed: 1176840 })
    expect(html).not.toContain('data-slot="field-error"')
    expect(html).not.toContain('data-invalid="true"')
  })

  it('精度那句原文照渲 —— 界面上要说得出「为什么这个 ID 填不了」', () => {
    const reason = coerceParam('7300000000000000001', ID_NUMBER)
    expect(reason.kind).toBe('invalid')
    const html = render({ name: 'cid', field: ID_NUMBER, isRequired: true, error: (reason as { reason: string }).reason })
    expect(errorOf(html)).toContain('9007199254740991')
  })
})

describe('必填 / 可选分成两个 Fieldset —— 但只在两组都非空时', () => {
  /** `<legend>` 的正文，按出现顺序。`data-slot="fieldset-legend"` 是 HeroUI 给它的标记 */
  const legends = (html: string): string[] => [...html.matchAll(/data-slot="fieldset-legend"[^>]*>([^<]*)</g)].map((match) => match[1]!)

  /** `<fieldset>` 有几个 */
  const fieldsets = (html: string): number => html.match(/data-slot="fieldset"/g)?.length ?? 0

  it('两组都非空 ⇒ 两个 `fieldset`，各自一个 `legend`，必填那组在前', () => {
    const html = renderForm({
      properties: { cid: ID_NUMBER, number: COUNT },
      required: ['cid']
    })
    expect(fieldsets(html)).toBe(2)
    expect(legends(html)).toEqual(['必填', '可选'])
    // 顺序也钉住：必填那组要先被读到，读屏与视觉是同一个次序
    expect(html.indexOf('必填')).toBeLessThan(html.indexOf('可选'))
    // 计数在 legend 正文里（读屏念的是这一整句），数字上挂 `tabular-nums`
    expect(html).toMatch(/data-slot="fieldset-legend"[^>]*>必填<span class="[^"]*tabular-nums[^"]*">1 个</)
  })

  it('**只有必填参数 ⇒ 一个 `fieldset` 都不渲**（不许留一个空的可选组外壳）', () => {
    const html = renderForm({
      properties: { cid: ID_NUMBER, aweme_id: ID_STRING },
      required: ['cid', 'aweme_id']
    })
    expect(fieldsets(html)).toBe(0)
    expect(legends(html)).toEqual([])
    // 两个字段本身照渲 —— 不分组不等于不渲
    expect(html).toMatch(/<input[^>]*name="cid"/)
    expect(html).toMatch(/<input[^>]*name="aweme_id"/)
  })

  it('只有可选参数、以及一个参数都没有 ⇒ 同样不分组', () => {
    expect(fieldsets(renderForm({ properties: { number: COUNT }, required: [] }))).toBe(0)
    expect(fieldsets(renderForm({ properties: {}, required: [] }))).toBe(0)
  })

  it('`required` 整个缺失（schema 里没这个键）也当没有必填 ⇒ 不分组', () => {
    expect(fieldsets(renderForm({ properties: { number: COUNT } }))).toBe(0)
  })

  it('**分组之后每个字段仍然带 `name`** —— 丢了 `FormData` 就收不到，参数发不出去', () => {
    const html = renderForm({
      properties: { cid: ID_NUMBER, number: COUNT, aweme_id: ID_STRING, flag: { type: 'boolean' } },
      required: ['cid', 'aweme_id']
    })
    expect(fieldsets(html)).toBe(2)
    // 四条路各一个：文本框、NumberField（隐藏 input）、字符串、Switch
    for (const name of ['cid', 'number', 'aweme_id', 'flag']) {
      expect(html.match(new RegExp(`name="${name}"`, 'g')), `${name} 的 name 丢了`).toHaveLength(1)
    }
  })

  it('分组不改变字段自己渲出来的东西：`NumberField` 判据、长 ID、`FieldError` 都照旧', () => {
    const grouped = renderForm(
      {
        properties: { cid: ID_NUMBER, number: COUNT, aweme_id: ID_STRING },
        required: ['cid', 'aweme_id']
      },
      { aweme_id: ['7300000000000000001'] }
    )
    expect(fieldsets(grouped)).toBe(2)
    // 有界的仍是步进器，无界的仍不是（`isSteppable` 那条判据没被分组绕过）
    expect(grouped).toContain('data-slot="number-field"')
    expect(grouped).toMatch(/<input[^>]*type="hidden"[^>]*name="number"/)
    expect(grouped).toMatch(/<input[^>]*name="cid"/)
    // 长 ID 的种子一位不丢
    expect(grouped).toContain('value="7300000000000000001"')
    // 没提交过 ⇒ 一句错误都没有（分组不该凭空造出 invalid 态）
    expect(grouped).not.toContain('data-slot="field-error"')
    expect(grouped).not.toContain('data-invalid="true"')
  })

  it('提交按钮在两个 `fieldset` 外面 —— 它不属于任何一组参数', () => {
    const html = renderForm({
      properties: { cid: ID_NUMBER, number: COUNT },
      required: ['cid']
    })
    expect(fieldsets(html)).toBe(2)
    // 最后一个 `</fieldset>` 之后才出现「发送」（这一轮把「录一发」换成了它：一栏里同时有
    // 「批量」与「生成类型」，而三个动作里只有这一个是「打一发看看」—— 名字得说的是那件事）
    expect(html.lastIndexOf('</fieldset>')).toBeGreaterThan(0)
    expect(html.lastIndexOf('</fieldset>')).toBeLessThan(html.indexOf('发送'))
  })
})

/**
 * 「发送」那颗按钮的**两种「忙」**，以及它为什么必须留在视野里。
 *
 * 两种忙分开是这一轮新长出来的一条：三栏之后「发送」「批量」「生成类型」挤在同一栏里，
 * 而跨动作的互斥要留着（批量刻意每组之间隔 1.5 秒 —— 那是给平台风控留的余量，
 * 这时再手工发一发等于把那个间隔白留了）。于是 {@link ParamFormProps.disabled} 是
 * 「有**任何**动作在跑」，而 `sending` 是「在跑的**恰好是这一发**」。
 *
 * **合成一个的话，点「生成类型」会让「发送」也开始转圈** —— 而那颗按钮什么都没在做，
 * 转圈是在说假话。这两种状态在 SSR 那一帧上分得开（`isPending` 与 `isDisabled` 渲出来
 * 不是同一组属性），所以它们量得到。
 */
describe('「发送」只在自己那一发在跑时转圈', () => {
  /** 那颗按钮自己那一段（从它的 `<button` 起，切到文字为止） */
  const buttonOf = (html: string, label: string): string => {
    const at = html.indexOf(`>${label}<`)
    if (at < 0) throw new Error(`渲出来的表单里找不到「${label}」那颗按钮`)
    return html.slice(html.lastIndexOf('<button', at), at)
  }

  const actions = (state: { disabled: boolean; sending?: boolean }): string =>
    renderToStaticMarkup(
      createElement(ParamForm, {
        endpoint: endpointOf({ properties: { cid: ID_STRING }, required: ['cid'] }),
        onSubmit: () => undefined,
        ...state
      })
    )

  it('**在跑的恰好是这一发** ⇒ 只有「发送」带 `data-pending`，「重置」只是禁着', () => {
    const html = actions({ disabled: true, sending: true })
    expect(buttonOf(html, '发送')).toContain('data-pending="true"')
    // 转圈那颗由 react-aria 渲成 `aria-disabled`（而不是原生 `disabled`）：
    // 焦点留在按钮上，读屏才念得出「忙」这件事的变化
    expect(buttonOf(html, '发送')).toContain('aria-disabled="true"')
    expect(buttonOf(html, '重置')).toContain('disabled=""')
    expect(buttonOf(html, '重置')).not.toContain('data-pending')
  })

  it('**别的动作在跑** ⇒ 「发送」只是禁着，一点都不转', () => {
    const html = actions({ disabled: true, sending: false })
    expect(buttonOf(html, '发送')).toContain('disabled=""')
    expect(buttonOf(html, '发送')).not.toContain('data-pending')
  })

  it('闲着的时候两颗都按得下去', () => {
    const html = actions({ disabled: false })
    expect(buttonOf(html, '发送')).not.toContain('disabled')
    expect(buttonOf(html, '重置')).not.toContain('disabled')
  })

  it('**动作行 `sticky bottom-0`** —— 参数多的端点在一栏里要滚，而「发送」是这一栏唯一的出口', () => {
    // `comments` 有 7 个参数，在一栏的高度里装不下 —— 滚到中间时那颗按钮不该在视野外。
    // 这一条与 `lib/pane.ts` 那条「每一栏自己滚」是同一件事在这张表单上的落点：
    // 页面不滚了，滚的是栏，于是栏里的出口必须自己钉住
    expect(actions({ disabled: false })).toContain('class="bg-surface sticky bottom-0 flex gap-2 pt-2"')
  })
})
