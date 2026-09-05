/**
 * 参数表单：**由端点的 JSON Schema 派生，一个字段都不手写。**
 *
 * schema 来自 `zod.toJSONSchema(def.params, { io: 'input' })`，所以它跟端点声明永远同步 ——
 * 端点加一个参数，这里自动多一个控件。
 *
 * 报错只有一条路：**掰不动的参数在它自己那个字段旁边说话**（`isInvalid` + `FieldError`）。
 * 原先那条汇总 Alert 删了，理由写在 {@link ParamForm} 上面。
 *
 * 字段按 **必填 / 可选** 分成两个 `Fieldset`，但**只在两组都非空时**才分 —— 判据与理由写在
 * {@link ParamForm} 里那个 `isGrouped` 上面。
 */

import {
  Button,
  Description,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Switch,
  TextField
} from '@heroui/react'
import { useState } from 'react'

import type { EndpointInfo, FieldSchema, JsonValue } from '../lib/api'

// 这个文件除了组件还导出三个纯函数（`isSteppable` / `coerceParam` / `numberPreset`），
// 于是 fast-refresh 那条规则会响：改这个文件时 HMR 退化成整页刷新。
// 仓库的惯例是把纯函数放 `src/lib/*.ts`（`urlState.ts` 就是），那样更好 —— 只是这三个的读者
// 只有本文件的两个组件和 `test/paramForm.test.ts`，而这一轮的改动范围只有这两个文件。
// 搬家是下一轮的事；在那之前，**能被测**比 HMR 保状态要紧。
// oxlint-disable react/only-export-components

/** 这个字段声明成数字了吗（`integer` 也算） */
const isNumeric = (schema: FieldSchema): boolean => schema.type === 'number' || schema.type === 'integer'

/**
 * JSON Schema 里的一个数值关键字（`minimum` / `maximum`）。只认有限数字，其余当没写。
 *
 * **刻意不认 `exclusiveMinimum` / `exclusiveMaximum`**：把开区间当闭区间用会多放行一个边界值
 * （`.positive()` 出来的是 `exclusiveMinimum: 0`，当成 `minValue: 0` 就等于允许 0）。
 * 而「当它没有上界」是安全的那一侧 —— 那只会少给一个步进器，不会送错值。
 */
const boundOf = (raw: unknown): number | undefined => (typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined)

/**
 * 这个字段能不能用 `NumberField`（带 +/- 的那个步进器）。
 *
 * 判据是**「schema 自己划了一个人的量级的上界」**，而不是「它是数字」。理由是精度：
 * `NumberField` 的状态是一个 JS `number`（`useNumberFieldState` 的 `numberValue`），
 * 挂上 `name` 之后它渲出来的是 `<input type="hidden" value={state.numberValue}>`
 * （`react-aria-components/dist/private/NumberField.mjs:128-133`）—— 人打进去的那串数字
 * **在这一步就不存在了**。于是超 2^53 的 ID 会被换成邻近的可表示数（19 位的抖音
 * `aweme_id` 差最后两三位），输入框里的文本还会被 `Intl.NumberFormat` 重排成分组格式
 * （`useNumberFieldState` 的 `commit()` 里那句 `parse(format(v))`），人看不出哪一位变了；
 * 更要紧的是**我们再也没有依据判「这个数没原样回来」** —— 原文已经被吃掉。
 * 所以那种字段留在 `TextField` 上，由 {@link coerceParam} 拿着原文去拦。
 *
 * 而 `.int()` 在 zod v4 里自动带上 `maximum: 9007199254740991`（正是 `MAX_SAFE_INTEGER`），
 * 那不是人划的上界、而是「任意安全整数」—— ID 恰好长这样（`avid` / `cid` / `host_mid`
 * 都只写了 `.min(1)`）。所以这里必须**严格小于**：拿等号放行等于把所有 ID 都收进来。
 * 全仓 40 个数字参数里划了真上界的有 10 个（`.max(500)` 条数、`.max(100)` 页大小、
 * `.max(3)` 是B站 comments 的 `mode`，`packages/core/openapi.json` 里数得出来），
 * 而步进器也正好只在这类有界量上有用 —— 在不透明 ID 上按 +1 毫无意义。
 */
export const isSteppable = (schema: FieldSchema): boolean => {
  if (!isNumeric(schema)) return false
  const max = boundOf(schema.maximum)
  return max !== undefined && max < Number.MAX_SAFE_INTEGER
}

/** 一个字段掰出来的结果。**三态** —— 理由见 {@link coerceParam} */
export type CoercedParam =
  | { kind: 'value'; value: JsonValue }
  /** 没填。这个参数不进请求。必填由控件的 `isRequired` 拦（原生校验），不在这里判 */
  | { kind: 'empty' }
  /** 掰不动。`reason` 直接渲在那个字段旁边 */
  | { kind: 'invalid'; reason: string }

/**
 * 取值转换：表单值都是字符串（`FormData` 里只有字符串），得按 schema 声明的类型掰回去。
 *
 * **三态而不是「值 or undefined」**：「没填」与「填了 0」必须是两件事。
 * `Number('')` 是 **0** —— 空框一旦被当成值，`mode: 0`（B站 comments 的合法取值）
 * 就会凭空出现在请求里，而那不是人填的。
 *
 * 数字掰不动时回 `invalid` 而不是 `NaN`，这一条是真会咬人的：
 * `Number('abc')` 是 `NaN`，`JSON.stringify` 把它写成 `null`，
 * 而 server 侧的 `zod.coerce.number()` 对 `null` 做 `Number(null)` = **0**。
 * 于是 `mode: 0` 通过校验、请求真的发出去、样本按 `mode=0` 算参数哈希落盘 ——
 * 一次「成功」的录制，而参数不是人填的那个。
 *
 * 超 `MAX_SAFE_INTEGER` 的数字串同样拦住：`Number('9007199254740993')` 静默变成 `…992`，
 * 那是**另一个 ID**。这一档的代价只是「这种参数在界面上填不了」，而它本来就不该声明成数字 ——
 * 长 ID 在这个仓库里全是 `zod.string()`（抖音 `aweme_id`、快手 `photoId`），
 * 字符串那条路一位都不会丢。
 */
export const coerceParam = (raw: string, schema: FieldSchema): CoercedParam => {
  if (raw === '') return { kind: 'empty' }
  if (isNumeric(schema)) {
    // `Number('   ')` 也是 0。只打了空格的框算「填错了」：算成没填会让必填参数静默从请求里
    // 消失（原生 required 只看框空不空，空格是不空的）
    if (raw.trim() === '') return { kind: 'invalid', reason: '要填数字' }
    const value = Number(raw)
    if (!Number.isFinite(value)) return { kind: 'invalid', reason: '要填数字' }
    if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      return { kind: 'invalid', reason: `超出 ±${Number.MAX_SAFE_INTEGER}：再往上 JS 存不住，尾几位会被改掉 —— 那就是另一个对象了` }
    }
    if (schema.type === 'integer' && !Number.isInteger(value)) return { kind: 'invalid', reason: '要填整数' }
    return { kind: 'value', value }
  }
  if (schema.type === 'boolean') return { kind: 'value', value: raw === 'true' }
  return { kind: 'value', value: raw }
}

/**
 * `NumberField` 的预填值。它只吃 `number`，而种子是人手写的 JSON（`corpus/seeds.json`），
 * 可能是 `1` 也可能是 `"1"`。掰不动就当没有预填 —— 绝不把 `NaN` 喂进去。
 *
 * 超安全整数的也当没有：那种值喂进 `NumberField` 会被静默换成邻近的可表示数，
 * 而「预填了一个不是种子的值」比「没预填」坏得多。
 */
export const numberPreset = (raw: JsonValue | undefined): number | undefined => {
  if (typeof raw !== 'number' && typeof raw !== 'string') return undefined
  if (typeof raw === 'string' && raw.trim() === '') return undefined
  const value = Number(raw)
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) return undefined
  return value
}

const optionLabel = (value: JsonValue): string => (typeof value === 'string' ? value : JSON.stringify(value))

export interface ParamFieldProps {
  name: string
  field: FieldSchema
  isRequired: boolean
  /** `seeds.json` 里的第一个值，预填用 —— 省掉每次手敲 bvid 这类不透明 ID */
  seed?: JsonValue
  /** 上一次提交在这个字段上掰不动的原因。`undefined` = 这个字段没问题 */
  error?: string
  /** 人动了这个字段。上一次那句提示要立刻作废，理由见 {@link ParamForm} */
  onEdit: () => void
}

/**
 * 一个参数一个控件。
 *
 * **导出是为了能测**：`test/paramForm.test.ts` 用 `react-dom/server` 把它渲成静态 HTML
 * （node 环境，不需要 jsdom），而从外面渲整张 `ParamForm` 拿不到「上一次提交报了错」这个状态 ——
 * 那是这个组件唯一一条需要看 DOM 才能验的接线。
 */
export const ParamField = ({ name, field, isRequired, seed, error, onEdit }: ParamFieldProps) => {
  const preset = seed === undefined ? undefined : optionLabel(seed)
  const options = field.enum ?? (field.const === undefined ? undefined : [field.const])
  /**
   * **`false` 与「不传」不是一回事。** `isInvalid={false}` 也会造出一个 controlledError 对象
   * （`react-stately/dist/private/form/useFormValidationState.mjs:59-63`），它坐在
   * `displayValidation` 链条最前面，把原生校验那一档整个挡掉 —— 于是「必填却空着」
   * 那句话再也显示不出来。没有错误时这里必须是 `undefined`。
   */
  const isInvalid = error === undefined ? undefined : true
  /**
   * 那一句提示。**两个来源合在一处**：`error` 是提交时掰不动的那句
   * （`isInvalid` 造出来的 controlledError 自己不带文案，它的 `validationErrors` 是空数组），
   * `validationErrors` 是原生校验那句（必填空着时浏览器给的那一句）。
   *
   * children **必须传**：HeroUI 的包装恒把 children 传成一个函数
   * （`@heroui/react/dist/components/field-error/field-error.js:12-18`），于是 RAC 那个
   * 「没有 children 就渲 validationErrors」的默认值永远走不到 —— 原先 `<FieldError />`
   * 空着挂在这儿，一个字都渲不出来。那是它「挂着却从不触发」的另一半原因。
   */
  const fieldError = <FieldError>{({ validationErrors }) => error ?? (validationErrors.join('，') || undefined)}</FieldError>

  // enum / const 与 boolean 这两条路上 {@link coerceParam} 不可能失败（取值直接来自 schema
  // 自己，或者只有 true/false 两种），所以它们没有错误通道，也就不挂 `FieldError`
  if (options !== undefined) {
    return (
      <Select
        name={name}
        className="w-full max-w-sm"
        isRequired={isRequired}
        defaultValue={preset ?? (isRequired ? optionLabel(options[0]) : undefined)}
      >
        <Label>
          {name}
          <span className="text-muted ml-1 font-mono text-xs">{field.type ?? 'enum'}</span>
        </Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {options.map((option) => (
              <ListBox.Item key={optionLabel(option)} id={optionLabel(option)} textValue={optionLabel(option)}>
                {optionLabel(option)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
        {field.description !== undefined && <Description>{field.description}</Description>}
      </Select>
    )
  }

  if (field.type === 'boolean') {
    return (
      <Switch name={name} value="true" defaultSelected={preset === 'true'}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          {name}
        </Switch.Content>
      </Switch>
    )
  }

  if (isSteppable(field)) {
    return (
      <NumberField
        name={name}
        className="w-full max-w-sm"
        isRequired={isRequired}
        isInvalid={isInvalid}
        defaultValue={numberPreset(seed ?? field.default)}
        // 上下界一起交给控件：步进器到边界就停，越界的输入在失焦时被夹回来。
        // 夹回来是**看得见**的（框里的文本跟着变），而且这条路上的上界都是人划的、人的量级
        // （见 {@link isSteppable}），夹不出精度问题
        minValue={boundOf(field.minimum)}
        maxValue={boundOf(field.maximum)}
        onChange={onEdit}
      >
        <Label>
          {name}
          <span className="text-muted ml-1 font-mono text-xs">{field.type}</span>
        </Label>
        {/* `NumberField.Input` 自己就是 `type="text"` + `inputMode`（`useNumberField` 里写死的），
            所以下面 `TextField` 那条路上「不用 `type="number"`」的理由在这儿不会被推翻 */}
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input />
          <NumberField.IncrementButton />
        </NumberField.Group>
        {field.description !== undefined && <Description>{field.description}</Description>}
        {fieldError}
      </NumberField>
    )
  }

  return (
    <TextField
      name={name}
      className="w-full max-w-sm"
      isRequired={isRequired}
      isInvalid={isInvalid}
      defaultValue={preset ?? (field.default === undefined ? undefined : optionLabel(field.default))}
      onChange={onEdit}
    >
      <Label>
        {name}
        <span className="text-muted ml-1 font-mono text-xs">{field.type ?? 'any'}</span>
      </Label>
      {/* 没有上界的数字参数（`avid` / `cid` / `host_mid` / 各种 `cursor`）**刻意留在这条路上**，
          判据见 {@link isSteppable}：这里的值到 `FormData` 之前一直是人打的那串字符，
          于是 {@link coerceParam} 能拿着原文判「这个数超出精度了」并拦住。
          `inputMode` 而不是 `type="number"`：后者在部分浏览器上把非数字字符直接吞掉，
          于是人看不出自己打错了；`inputMode` 只影响移动端键盘 */}
      <Input
        inputMode={isNumeric(field) ? 'numeric' : undefined}
        placeholder={isNumeric(field) ? '数字…' : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      {field.description !== undefined && <Description>{field.description}</Description>}
      {fieldError}
    </TextField>
  )
}

export interface ParamFormProps {
  endpoint: EndpointInfo
  disabled: boolean
  onSubmit: (params: Record<string, JsonValue>) => void
}

/** 一张稳定的空错误表。**同一个引用** —— 于是「本来就没错」的提交不白触发一次重渲染 */
const NO_ERRORS: Record<string, string> = {}

/**
 * 参数表单。控件全是非受控的（取值靠 `FormData`），所以这里只有一份状态：
 * **上一次提交在哪些字段上掰不动**。
 *
 * **原先那条汇总 Alert（「参数填得不对，没有发出去」+ 逗号拼起来的清单）删了。** 三条理由：
 *
 * 1. 它说的话现在每个字段旁边逐条说了，而且说得更准（哪个字段、为什么）。横幅只是把同样的话
 *    再拼一遍 —— PRD 5.4 那张表点名的正是「错误提示要落到字段上」。
 * 2. 它那句「没有发出去」在**第二次**点「录一发」时根本走不到：第一次提交之后出错的字段带上了
 *    `isInvalid`，react-aria 把它写成原生 `setCustomValidity(...)`，于是浏览器连 `submit` 事件
 *    都不派发、这里的 `onSubmit` 一次都不会跑 —— 横幅只能显示上一轮的旧话。
 * 3. 那次点击也不是没有反馈：react-aria 会把焦点移到第一个出错的字段
 *    （`react-aria/dist/private/form/useFormValidation.mjs` 的 `onInvalid`），比一条横幅更直接。
 *
 * 顺带被这条通道修好的是「必填却空着」：原生那句提示原先被 RAC 的 `onInvalid` `preventDefault()`
 * 掉（不弹浏览器气泡），而 `<FieldError />` 又什么都渲不出来 —— 于是点按钮**什么都不会发生**。
 * 现在那句话落在字段下面。
 */
export const ParamForm = ({ endpoint, disabled, onSubmit }: ParamFormProps) => {
  const properties = endpoint.schema.properties ?? {}
  const required = new Set(endpoint.schema.required ?? [])
  /** 上一次提交里掰不动的字段 → 那一句提示。非空时不发请求 */
  const [errors, setErrors] = useState<Record<string, string>>(NO_ERRORS)

  /**
   * 人动了某个字段：那一句立刻作废。
   *
   * **这不只是体验，是死锁的解药。** `isInvalid` 会被 react-aria 写成原生
   * `setCustomValidity(...)`（`react-aria/dist/private/form/useFormValidation.mjs:23-33`），
   * 于是浏览器不再派发 `submit` 事件 —— 而 `errors` 只在 `submit` 里更新。
   * 不在这里清掉，人把值改对了也永远交不上去。`type="reset"` 那个按钮走 `onReset`，同一条理由。
   */
  const clearError = (name: string) =>
    setErrors((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })

  /**
   * **取值这一条路刻意不认识分组。** 它按 `properties` 的键去 `data.get(name)` 取，
   * 而 `FormData` 把整张表单里的控件一视同仁地收进来 —— 控件外面套了几层 `<fieldset>`
   * 它一概不看。所以下面怎么分组都不会改变发出去的参数，这是结构上成立的，不靠自觉。
   */
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params: Record<string, JsonValue> = {}
    const bad: Record<string, string> = {}
    for (const [name, field] of Object.entries(properties)) {
      const raw = data.get(name)
      if (typeof raw !== 'string') continue
      const parsed = coerceParam(raw, field)
      if (parsed.kind === 'empty') continue
      // 掰不动就**拦住整次提交**，不让一个静默变成 0 的值发出去（见 {@link coerceParam}）
      if (parsed.kind === 'invalid') {
        bad[name] = parsed.reason
        continue
      }
      params[name] = parsed.value
    }
    if (Object.keys(bad).length > 0) {
      setErrors(bad)
      return
    }
    setErrors(NO_ERRORS)
    onSubmit(params)
  }

  const names = Object.keys(properties)
  /** 分组用的两条名单。**保持 `properties` 的原顺序** —— 那是端点声明里的顺序 */
  const requiredNames = names.filter((name) => required.has(name))
  const optionalNames = names.filter((name) => !required.has(name))

  /**
   * 分不分组的判据：**两组都非空才分。**
   *
   * 分组的全部价值是无障碍语义 —— `fieldset` + `legend` 让读屏进到这一片时先说一句
   * 「必填」，人不用逐个字段听 `required` 才知道哪些非填不可。而那句话只有在**存在对照**时
   * 才携带信息。61 个端点数一遍（`packages/core/openapi.json` 的 `parameters`）：
   * **两组都非空的只有 19 个**，只有必填的 33 个（`douyin_videoWork` 就一个 `aweme_id`）、
   * 只有可选的 2 个、一个参数都没有的 7 个 —— 也就是说 **61 个里有 42 个走的是不分组那条路**。
   * 对那 42 个渲一个「必填」外壳等于把「所有参数」重命名成「必填参数」：读屏多念一层嵌套、
   * 版面多一条 legend，一个字的新信息都没有。
   *
   * 空组更糟：`<fieldset><legend>可选</legend></fieldset>` 里一个控件都没有，读屏进去
   * 只会念到一个标题然后什么都没有，那是纯噪音。所以判据不是「参数够多」而是
   * **「两组都真的有字段」** —— 它同时挡掉「只有必填」「只有可选」「一个都没有」三种退化，
   * 也就不需要再挑一个「几个参数以上才分」的阈值（那种阈值挑多少都是任意的）。
   */
  const isGrouped = requiredNames.length > 0 && optionalNames.length > 0

  /** 一个字段。`name` 由它自己挂到控件上，与它落在哪个分组里无关 */
  const fieldOf = (name: string) => (
    <ParamField
      key={name}
      name={name}
      field={properties[name]!}
      isRequired={required.has(name)}
      seed={endpoint.seeds[name]?.[0]}
      error={errors[name]}
      onEdit={() => clearError(name)}
    />
  )

  /**
   * 一个分组。`Fieldset.Group` 那层 div 是 HeroUI 给字段间距用的（`.fieldset__field_group`
   * 自带 `space-y-4`，与原先 `Form` 上那个 `gap-4` 同一个量），所以这里不再自己写间距；
   * `.fieldset` 那个 `grow shrink basis-0` 也留着不覆盖 —— 它是 HeroUI 为「带 legend 的
   * fieldset 当 flex 子项」写的 Safari 修补（`@heroui/styles/dist/components/fieldset.css:1-5`）。
   *
   * legend 说中文：界面全中文，「必填」/「可选」比 required/optional 贴。
   *
   * **计数写进 legend 的正文，而不是指望读屏自己数。** fieldset/legend 的语义只给这一组
   * 一个可及名字，读屏进组时念的是那个名字 —— 它不像 `<ul>` 那样报「3 项」。所以要让人听见
   * 「必填 2 个」，那句话就得真的在 legend 里。数字用 `tabular-nums`：两组的计数竖直对齐，
   * 切端点时字宽不跳。
   *
   * **`Fieldset` 绝不能接这个组件的 `disabled`。** 那个 prop 现在只喂给两个按钮
   * （`isPending` / `isDisabled`），看着顺手就想「录制中把整组也禁掉」—— 而 `Fieldset` 把
   * `...props` 原样落到 `<fieldset>` 上（`@heroui/react/dist/components/fieldset/fieldset.js`
   * 的 `dom.fieldset`），`<fieldset disabled>` 会让**它里面所有控件退出表单提交**
   * （HTML 标准：disabled 的控件不是 submittable element）。于是 `new FormData(form)` 变成空的、
   * `data.get(name)` 全是 `null`、每个参数都被当成「没填」—— 一次静默发空参数的录制。
   */
  const groupOf = (legend: string, group: readonly string[]) => (
    <Fieldset key={legend}>
      <Fieldset.Legend>
        {legend}
        <span className="text-muted ml-2 text-xs font-normal tabular-nums">{group.length} 个</span>
      </Fieldset.Legend>
      <Fieldset.Group>{group.map(fieldOf)}</Fieldset.Group>
    </Fieldset>
  )

  return (
    <Form className="flex flex-col gap-4" onSubmit={submit} onReset={() => setErrors(NO_ERRORS)}>
      {isGrouped ? [groupOf('必填', requiredNames), groupOf('可选', optionalNames)] : names.map(fieldOf)}

      <div className="flex gap-2">
        <Button type="submit" isPending={disabled}>
          录一发
        </Button>
        <Button type="reset" variant="secondary" isDisabled={disabled}>
          重置
        </Button>
      </div>
    </Form>
  )
}
