/**
 * 参数表单：**由端点的 JSON Schema 派生，一个字段都不手写。**
 *
 * schema 来自 `zod.toJSONSchema(def.params, { io: 'input' })`，所以它跟端点声明永远同步 ——
 * 端点加一个参数，这里自动多一个控件。
 */

import { Alert, Button, Description, FieldError, Form, Input, Label, ListBox, Select, Switch, TextField } from '@heroui/react'
import { useState } from 'react'

import type { EndpointInfo, FieldSchema, JsonValue } from '../lib/api'

/** 这个字段声明成数字了吗（`integer` 也算） */
const isNumeric = (schema: FieldSchema): boolean => schema.type === 'number' || schema.type === 'integer'

/**
 * 取值转换：表单值都是字符串，得按 schema 声明的类型掰回去。
 *
 * **数字掰不动时回 `undefined` 而不是 `NaN`。** 这一条是真会咬人的：
 * `Number('abc')` 是 `NaN`，`JSON.stringify` 把它写成 `null`，
 * 而 server 侧的 `zod.coerce.number()` 对 `null` 做 `Number(null)` = **0**。
 * 于是 `mode: 0`（B站 comments 的合法取值）通过校验、请求真的发出去、
 * 样本按 `mode=0` 算参数哈希落盘 —— 一次「成功」的录制，而参数不是人填的那个。
 */
const coerce = (raw: string, schema: FieldSchema): JsonValue | undefined => {
  if (isNumeric(schema)) {
    const value = Number(raw)
    if (!Number.isFinite(value)) return undefined
    if (schema.type === 'integer' && !Number.isInteger(value)) return undefined
    return value
  }
  if (schema.type === 'boolean') return raw === 'true'
  return raw
}

const optionLabel = (value: JsonValue): string => (typeof value === 'string' ? value : JSON.stringify(value))

export interface ParamFormProps {
  endpoint: EndpointInfo
  disabled: boolean
  onSubmit: (params: Record<string, JsonValue>) => void
}

export const ParamForm = ({ endpoint, disabled, onSubmit }: ParamFormProps) => {
  const properties = endpoint.schema.properties ?? {}
  const required = new Set(endpoint.schema.required ?? [])
  /** 上一次提交里掰不动的字段。非空时不发请求 */
  const [invalid, setInvalid] = useState<string | undefined>(undefined)

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params: Record<string, JsonValue> = {}
    const bad: string[] = []
    for (const [name, field] of Object.entries(properties)) {
      const raw = data.get(name)
      if (typeof raw !== 'string' || raw === '') continue
      const value = coerce(raw, field)
      // 掰不动就**拦住整次提交**，不让一个静默变成 0 的值发出去（见 `coerce` 的注释）
      if (value === undefined) {
        bad.push(`${name} 要是${field.type === 'integer' ? '整数' : '数字'}`)
        continue
      }
      params[name] = value
    }
    if (bad.length > 0) {
      setInvalid(bad.join('，'))
      return
    }
    setInvalid(undefined)
    onSubmit(params)
  }

  return (
    <Form className="flex flex-col gap-4" onSubmit={submit}>
      {Object.entries(properties).map(([name, field]) => {
        // `seeds.json` 里的第一个值预填 —— 省掉每次手敲 bvid 这类不透明 ID
        const seeded = endpoint.seeds[name]?.[0]
        const preset = seeded === undefined ? undefined : optionLabel(seeded)
        const options = field.enum ?? (field.const === undefined ? undefined : [field.const])

        if (options !== undefined) {
          return (
            <Select
              key={name}
              name={name}
              className="w-full max-w-sm"
              isRequired={required.has(name)}
              defaultValue={preset ?? (required.has(name) ? optionLabel(options[0]) : undefined)}
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
            <Switch key={name} name={name} value="true" defaultSelected={preset === 'true'}>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                {name}
              </Switch.Content>
            </Switch>
          )
        }

        return (
          <TextField
            key={name}
            name={name}
            className="w-full max-w-sm"
            isRequired={required.has(name)}
            defaultValue={preset ?? (field.default === undefined ? undefined : optionLabel(field.default))}
          >
            <Label>
              {name}
              <span className="text-muted ml-1 font-mono text-xs">{field.type ?? 'any'}</span>
            </Label>
            {/* `inputMode` 而不是 `type="number"`：后者在部分浏览器上把非数字字符直接吞掉，
                于是人看不出自己打错了；`inputMode` 只影响移动端键盘，校验交给 `coerce` */}
            <Input
              inputMode={isNumeric(field) ? 'numeric' : undefined}
              placeholder={isNumeric(field) ? '数字…' : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            {field.description !== undefined && <Description>{field.description}</Description>}
            <FieldError />
          </TextField>
        )
      })}
      {invalid !== undefined && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>参数填得不对，没有发出去</Alert.Title>
            <Alert.Description>{invalid}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

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
