/**
 * 控制台主界面。左栏端点列表（可收起），右栏表单 + 结果队列。
 *
 * 两条设计约束：
 *
 * 1. **切端点不清空结果队列**。原先那版（手拼 HTML）一切端点就把结果抹掉，
 *    于是「批量录了 24 组、只处理前几条」时剩下的待定样本在服务端还在、
 *    而页面上再也碰不到它们 —— 那是个内存泄漏也是个错觉。
 *    队列里每张卡片都标着自己属于哪个端点，所以混着看不会认错。
 * 2. **界面状态进 URL**（选中的端点、左栏开合、折叠的平台分组）。
 *    这个工具的日常动作里刷新很频繁（改了 seeds、换了 cookie、想看新的样本数），
 *    而每次刷新都清空等于每次都要重新点一遍。见 `lib/urlState.ts`。
 */

import { Alert, Button, Chip, Kbd, Separator, toast, Toast, Tooltip } from '@heroui/react'
import { useCallback, useEffect, useState } from 'react'

import { CookieDrawer } from './components/CookieDrawer'
import { EndpointList } from './components/EndpointList'
import { OutcomeCard } from './components/OutcomeCard'
import { ParamForm } from './components/ParamForm'
import {
  type CookiesResult,
  discardSample,
  fetchCookies,
  fetchEndpoints,
  generateTypes,
  type JsonValue,
  type PlatformInfo,
  recordBatch,
  recordOne,
  type RecordOutcome,
  saveCookies,
  storeSample
} from './lib/api'
import { useUrlFlag, useUrlParam, useUrlSet } from './lib/urlState'

/** 队列里的一条。`settled` 记「已入库到哪 / 已丢弃」，让人看得见自己刚做了什么 */
interface QueueItem {
  key: string
  platform: string
  endpoint: string
  outcome: RecordOutcome
  settled?: string
}

/** 自增的队列 key。**不用时间戳** —— 批量 push 时同一毫秒会撞，撞了 React 会复用错卡片 */
let queueSeq = 0

export const App = () => {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([])
  const [cookies, setCookies] = useState<CookiesResult | undefined>(undefined)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [busy, setBusy] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  // 界面状态存 URL：刷新后还在、能分享、前进后退能用
  const [selected, setSelected] = useUrlParam('endpoint')
  const [navOpen, toggleNav] = useUrlFlag('nav')
  const [collapsed, toggleCollapsed] = useUrlSet('collapsed')

  const reload = useCallback(async () => {
    try {
      const [nextPlatforms, nextCookies] = await Promise.all([fetchEndpoints(), fetchCookies()])
      setPlatforms(nextPlatforms)
      setCookies(nextCookies)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // `[` 收起 / 展开左栏。不用 Cmd/Ctrl 组合键 —— 这是本机工具，单键更快，
  // 而输入框里按 `[` 不该触发（所以要看事件源）
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '[' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target !== null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      event.preventDefault()
      toggleNav()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleNav])

  const [platformName, endpointName] = selected?.split('/') ?? []
  const platform = platforms.find((entry) => entry.platform === platformName)
  const endpoint = platform?.endpoints.find((entry) => entry.name === endpointName)

  /** 一次动作的公共外壳：置忙、抓错、收尾。成功的告知走 toast，不占版面 */
  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label)
    setError(undefined)
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(undefined)
    }
  }

  const push = (outcomes: RecordOutcome[]) => {
    if (platformName === undefined || endpointName === undefined) return
    setQueue((current) => [
      ...outcomes.map((outcome) => ({
        key: `q${queueSeq++}`,
        platform: platformName,
        endpoint: endpointName,
        outcome
      })),
      ...current
    ])
  }

  const settle = (key: string, settled: string) =>
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, settled } : item)))

  /** 还没处理、且能入库的那些 */
  const pending = queue.filter((item) => item.settled === undefined && item.outcome.pendingId !== undefined)
  /** 其中没带来新形状的 —— 队头直接告诉人「有几份可以直接丢」，不用一张张卡片翻 */
  const noShapeChange = pending.filter((item) => item.outcome.shapeChanged === false).length

  const saveCookieUpdates = async (updates: Record<string, string>) => {
    await run('cookies', async () => {
      const result = await saveCookies(updates)
      setCookies(result.status)
      // 端点清单里的 `hasCookie` 也变了，重拉一遍
      setPlatforms(await fetchEndpoints())
      toast(`已写进 .env：${result.written} 项${result.removed > 0 ? `，清空 ${result.removed} 项` : ''}`, {
        description: '当前进程已生效，不用重启',
        variant: 'success'
      })
    })
  }

  return (
    <Toast.Provider placement="bottom end">
      <main className="bg-background text-foreground min-h-screen">
        <header className="border-border bg-background/80 sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b px-4 py-3 backdrop-blur">
          <Tooltip delay={400}>
            <Button isIconOnly variant="tertiary" size="sm" aria-label={navOpen ? '收起端点列表' : '展开端点列表'} onPress={toggleNav}>
              {navOpen ? '⟨' : '⟩'}
            </Button>
            <Tooltip.Content>
              <p>
                {navOpen ? '收起' : '展开'}端点列表（
                <Kbd>
                  <Kbd.Content>[</Kbd.Content>
                </Kbd>
                ）
              </p>
            </Tooltip.Content>
          </Tooltip>

          <h1 className="text-base font-semibold">amagi 响应类型控制台</h1>

          {endpoint !== undefined && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <Chip color="accent" variant="soft">
                <Chip.Label className="font-mono">{selected}</Chip.Label>
              </Chip>
              <span className="text-muted min-w-0 truncate text-sm">{endpoint.summary}</span>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <CookieDrawer status={cookies} onSave={saveCookieUpdates} busy={busy === 'cookies'} />
          </div>
        </header>

        {error !== undefined && (
          <Alert status="danger" className="mx-4 mt-4">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>出错了</Alert.Title>
              {/* `whitespace-pre-wrap`：错误文案是多行的（`lib/api.ts` 的 readableError
                  会在 HTML 响应那种情况下给出三行诊断），不保留换行就全挤成一行 */}
              <Alert.Description className="font-mono text-xs whitespace-pre-wrap">{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <div className={`grid gap-6 p-4 ${navOpen ? 'lg:grid-cols-[300px_minmax(0,1fr)]' : 'lg:grid-cols-1'}`}>
          {navOpen && (
            <aside className="lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <EndpointList
                platforms={platforms}
                selected={selected}
                onSelect={(p, e) => setSelected(`${p}/${e}`)}
                collapsed={collapsed}
                onToggleCollapsed={toggleCollapsed}
              />
            </aside>
          )}

          <section className="flex min-w-0 flex-col gap-6">
            {endpoint === undefined ? (
              <div className="border-border flex flex-col items-start gap-3 rounded-2xl border border-dashed p-8">
                <h2 className="text-base font-semibold">先选一个端点</h2>
                <p className="text-muted max-w-prose text-sm leading-relaxed">
                  左栏按平台分组，一共 {platforms.reduce((sum, entry) => sum + entry.endpoints.length, 0)} 个端点。 选中之后这里会出现由 zod
                  schema 派生的参数表单 —— 填参数、录一发、看类型 diff、决定留下还是丢掉。
                </p>
                {cookies !== undefined && cookies.platforms.every((entry) => !entry.hasCookie) && (
                  <p className="text-warning-soft-foreground text-sm">
                    还没有配置任何 cookie。右上角「Cookie」里填，会写进 <code className="font-mono">.env</code>。
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {platform?.hasCookie === false && (
                    <Alert status="warning">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>这个平台没有 cookie</Alert.Title>
                        <Alert.Description>
                          右上角「Cookie」里填一条，会写进 <code className="font-mono">.env</code> 并立刻生效。 没 cookie
                          的端点大多会拿回登录页或风控页，那些会被入库判定拒掉。
                        </Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}

                  <ParamForm
                    // **`key` 必须带上端点名。** 表单里的控件是非受控的（用 FormData 取值），
                    // 不换 key 时 React 会复用同一批 input —— 于是切到另一个共享同名参数的端点
                    // （`aweme_id` 在 6 个抖音端点里都有）时，上一个端点的值留在框里，
                    // 而新端点的 `defaultValue` / 种子被忽略
                    key={`${platform!.platform}/${endpoint.name}`}
                    endpoint={endpoint}
                    disabled={busy !== undefined}
                    onSubmit={(params: Record<string, JsonValue>) =>
                      void run('record', async () => {
                        push([await recordOne({ platform: platform!.platform, endpoint: endpoint.name, params })])
                      })
                    }
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Tooltip delay={400} isDisabled={endpoint.unseeded.length === 0}>
                      <Button
                        variant="secondary"
                        isDisabled={busy !== undefined || endpoint.unseeded.length > 0}
                        isPending={busy === 'batch'}
                        onPress={() =>
                          void run('batch', async () => {
                            const result = await recordBatch({ platform: platform!.platform, endpoint: endpoint.name })
                            push(result.outcomes)
                            if (result.notes.length > 0) {
                              toast('参数矩阵有话说', { description: result.notes.join('；'), variant: 'warning' })
                            }
                          })
                        }
                      >
                        一键补样本（{endpoint.combinations} 组 · 每组间隔 1.5&nbsp;秒）
                      </Button>
                      <Tooltip.Content>
                        <p>缺种子：{endpoint.unseeded.join(' / ')}</p>
                      </Tooltip.Content>
                    </Tooltip>

                    <Button
                      variant="secondary"
                      isDisabled={busy !== undefined || endpoint.stored === 0}
                      isPending={busy === 'generate'}
                      onPress={() =>
                        void run('generate', async () => {
                          const result = await generateTypes({ platform: platform!.platform, endpoint: endpoint.name })
                          toast(
                            result.written.length === 0
                              ? '没有产出文件（这个端点还没有可用样本）'
                              : `已写出 ${result.written.length} 个文件`,
                            {
                              description:
                                result.warnings.length > 0
                                  ? `需要你看一眼：${result.warnings.join('；')}`
                                  : '整棵树的一致性还要跑 pnpm gen:types',
                              variant: result.warnings.length > 0 ? 'warning' : 'success'
                            }
                          )
                        })
                      }
                    >
                      生成这个端点的类型
                    </Button>

                    <span className="text-muted text-sm tabular-nums">本地已有 {endpoint.stored} 份样本</span>
                  </div>

                  {endpoint.unseeded.length > 0 && (
                    <Alert status="warning">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>缺种子，批量录不了</Alert.Title>
                        <Alert.Description>
                          <code className="font-mono">{endpoint.unseeded.join(' / ')}</code> 是必填的不透明 ID，
                          没有种子就编不出合法值（编一个只会换回错误页）。去 <code className="font-mono">corpus/seeds.json</code>{' '}
                          补，或者在上面手工填一次。
                        </Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}

                  <p className="text-muted text-xs">
                    定义在 <code className="font-mono">{endpoint.source}</code>
                  </p>
                </div>

                <Separator />

                {queue.length === 0 ? (
                  <p className="text-muted text-sm">还没有录过。上面填参数，或者点「一键补样本」。</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold">待定队列</h2>
                      <Chip size="sm" variant="soft" color={pending.length > 0 ? 'accent' : 'default'}>
                        <Chip.Label className="tabular-nums">{pending.length} 份可入库</Chip.Label>
                      </Chip>
                      {noShapeChange > 0 && (
                        <Chip size="sm" variant="soft" color="warning">
                          <Chip.Label className="tabular-nums">{noShapeChange} 份没带来新形状</Chip.Label>
                        </Chip>
                      )}
                      <span className="text-muted text-xs tabular-nums">共 {queue.length} 条</span>
                    </div>

                    {queue.map((item) => (
                      <OutcomeCard
                        key={item.key}
                        outcome={item.outcome}
                        // 队列不随切端点清空，所以每张卡片必须说清自己是哪个端点的
                        endpointLabel={`${item.platform}/${item.endpoint}`}
                        settled={item.settled}
                        busy={busy !== undefined}
                        onStore={() =>
                          void run('store', async () => {
                            const result = await storeSample(item.outcome.pendingId!)
                            settle(item.key, `已写入 ${result.written}`)
                            await reload()
                          })
                        }
                        onDiscard={() =>
                          void run('discard', async () => {
                            await discardSample(item.outcome.pendingId!)
                            settle(item.key, '已丢弃')
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </Toast.Provider>
  )
}
