/**
 * cookie 配置抽屉。**这是界面上唯一碰凭证的地方。**
 *
 * 三条纪律，都在 UI 上看得见：
 *
 * 1. **已存的值一个字都不显示。** 输入框永远是空的，旁边只写「已配置 · 1,842 字符 · 来自 .env」。
 *    显示已存的 cookie 没有任何用途，只是多一个泄漏面（截图、录屏、贴日志）。
 *    所以输入框的语义是「填进去就替换」，而不是「编辑现有的」。
 * 2. **`.env` 没被 git 忽略时禁掉保存。** 往一个会被提交的文件里写 cookie 是不可撤销的错误。
 *    server 那边也拦一道（curl 绕不过去），这里是为了让人当场知道原因。
 * 3. **`source: 'env'` 要显式警告。** 进程环境变量压过 `.env`，所以那种情况下
 *    「我在界面上改了但没生效」—— 不说清就是个查半天的问题。
 */

import { Alert, Button, Chip, Drawer, Input, Label, Separator, TextField } from '@heroui/react'
import { useState } from 'react'

import type { CookiesResult, CookieStatus } from '../lib/api'

/** 「来自哪」的中文说法。`env` 那条要带上「改 .env 覆盖不了它」 */
const sourceLabel = (source: CookieStatus['source']): string => {
  if (source === 'file') return '来自 .env'
  if (source === 'env') return '来自进程环境变量'
  return '未配置'
}

export interface CookieDrawerProps {
  status: CookiesResult | undefined
  /** 保存。只传要改的平台，空串表示删掉 */
  onSave: (updates: Record<string, string>) => Promise<void>
  busy: boolean
}

export const CookieDrawer = ({ status, onSave, busy }: CookieDrawerProps) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const configured = status?.platforms.filter((entry) => entry.hasCookie).length ?? 0
  const total = status?.platforms.length ?? 0
  const blocked = status !== undefined && !status.envIsGitIgnored
  /** 有改动的平台。空串也算改动（那是「清空」） */
  const dirty = Object.entries(drafts).filter(([, value]) => value !== undefined)

  const submit = async () => {
    if (dirty.length === 0) return
    await onSave(Object.fromEntries(dirty.map(([platform, value]) => [platform, value.trim()])))
    setDrafts({})
  }

  return (
    <Drawer>
      <Button variant="secondary" size="sm">
        Cookie
        <Chip size="sm" color={configured === 0 ? 'warning' : configured === total ? 'success' : 'accent'} variant="soft">
          <Chip.Label>
            {configured}/{total}
          </Chip.Label>
        </Chip>
      </Button>

      <Drawer.Backdrop variant="blur">
        <Drawer.Content placement="right">
          <Drawer.Dialog className="w-full max-w-lg">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>配置 Cookie</Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body className="flex flex-col gap-5">
              {blocked && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>拒绝保存：`.env` 没被 git 忽略</Alert.Title>
                    <Alert.Description>
                      往一个会被提交的文件里写 cookie 是不可撤销的。先在 <code className="font-mono">.gitignore</code> 里加一条光秃秃的{' '}
                      <code className="font-mono">.env</code>，再回来。
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <p className="text-muted text-sm leading-relaxed">
                从浏览器开发者工具里复制**整条** <code className="font-mono">Cookie</code> 请求头 ——
                整条，不要只挑几个字段，平台的风控会看那些看起来无关的（
                <code className="font-mono">ttwid</code> / <code className="font-mono">odin_tt</code> 这类）。 保存后写进{' '}
                <code className="font-mono">{status?.envPath ?? '.env'}</code>，并立刻对当前进程生效，不用重启。
              </p>

              <Separator />

              {status?.platforms.map((entry) => {
                const draft = drafts[entry.platform]
                return (
                  <div key={entry.platform} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{entry.platform}</span>
                      <Chip size="sm" color={entry.hasCookie ? 'success' : 'default'} variant="soft">
                        <Chip.Label>{entry.hasCookie ? `已配置 · ${entry.length.toLocaleString('zh-CN')} 字符` : '未配置'}</Chip.Label>
                      </Chip>
                      {entry.hasCookie && <span className="text-muted text-xs">{sourceLabel(entry.source)}</span>}
                    </div>

                    {entry.source === 'env' && (
                      <p className="text-warning-soft-foreground text-xs">
                        这个值来自进程环境变量（shell 里 export 的），**它压过 `.env`** —— 在这儿改了不会生效，要改就去改那个
                        export，或者关掉再起。
                      </p>
                    )}

                    <TextField
                      name={entry.platform}
                      className="w-full"
                      value={draft ?? ''}
                      onChange={(value) => setDrafts((current) => ({ ...current, [entry.platform]: value }))}
                      isDisabled={blocked || busy}
                    >
                      <Label className="sr-only">{entry.envName}</Label>
                      <Input
                        placeholder={entry.hasCookie ? '填新值替换，或留空不改…' : '粘贴整条 Cookie 请求头…'}
                        // 不用 type="password"：这是本机工具，遮起来只会让人没法核对自己粘对了没有，
                        // 而真正的风险（截图、录屏）遮不住
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </TextField>

                    {entry.hasCookie && draft === undefined && (
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={blocked || busy}
                        onPress={() => setDrafts((current) => ({ ...current, [entry.platform]: '' }))}
                      >
                        清空这一项
                      </Button>
                    )}
                  </div>
                )
              })}
            </Drawer.Body>

            <Drawer.Footer>
              <Button slot="close" variant="secondary" isDisabled={busy}>
                取消
              </Button>
              <Button isDisabled={blocked || busy || dirty.length === 0} isPending={busy} onPress={() => void submit()}>
                {dirty.length === 0 ? '没有改动' : `保存 ${dirty.length} 项`}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
