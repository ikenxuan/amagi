/**
 * 参数表单：**由端点的 JSON Schema 派生，一个字段都不手写。**
 *
 * schema 来自 `zod.toJSONSchema(def.params, { io: 'input' })`，所以它跟端点声明永远同步 ——
 * 端点加一个参数，这里自动多一个控件。
 */

import { Button, Description, FieldError, Form, Input, Label, ListBox, Select, Switch, TextField } from '@heroui/react'

import type { EndpointInfo, FieldSchema, JsonValue } from '../lib/api'

/** 取值转换：表单值都是字符串，得按 schema 声明的类型掰回去 */
const coerce = (raw: string, schema: FieldSchema): JsonValue => {
  if (schema.type === 'number' || schema.type === 'integer') return Number(raw)
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

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params: Record<string, JsonValue> = {}
    for (const [name, field] of Object.entries(properties)) {
      const raw = data.get(name)
      if (typeof raw !== 'string' || raw === '') continue
      params[name] = coerce(raw, field)
    }
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
            <Input placeholder={field.type === 'number' || field.type === 'integer' ? '数字' : undefined} />
            {field.description !== undefined && <Description>{field.description}</Description>}
            <FieldError />
          </TextField>
        )
      })}
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
