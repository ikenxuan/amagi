/**
 * 控制台主界面。左栏端点列表，右栏表单 + 结果队列。
 *
 * 一条设计约束：**切端点不清空结果队列**。原先那版（手拼 HTML）一切端点就把结果抹掉，
 * 于是「批量录了 24 组、只处理前几条」时剩下的待定样本在服务端还在、
 * 而页面上再也碰不到它们 —— 那是个内存泄漏也是个错觉。
 */

import { Alert, Button, Chip, Separator } from '@heroui/react'
import { useCallback, useEffect, useState } from 'react'

import { EndpointList } from './components/EndpointList'
import { OutcomeCard } from './components/OutcomeCard'
import { ParamForm } from './components/ParamForm'
import {
  discardSample,
  fetchEndpoints,
  generateTypes,
  type PlatformInfo,
  recordBatch,
  recordOne,
  type RecordOutcome,
  storeSample
} from './lib/api'

/** 队列里的一条。`settled` 记「已入库到哪 / 已丢弃」，让人看得见自己刚做了什么 */
interface QueueItem {
  key: string
  platform: string
  endpoint: string
  outcome: RecordOutcome
  settled?: string
}

export const App = () => {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([])
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [busy, setBusy] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  const reload = useCallback(async () => {
    try {
      setPlatforms(await fetchEndpoints())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const [platformName, endpointName] = selected?.split('/') ?? []
  const platform = platforms.find((entry) => entry.platform === platformName)
  const endpoint = platform?.endpoints.find((entry) => entry.name === endpointName)

  /** 一次动作的公共外壳：置忙、抓错、收尾 */
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
      ...outcomes.map((outcome, index) => ({
        key: outcome.pendingId ?? `${Date.now()}-${index}`,
        platform: platformName,
        endpoint: endpointName,
        outcome
      })),
      ...current
    ])
  }

  const settle = (key: string, settled: string) =>
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, settled } : item)))

  return (
    <main className="bg-background text-foreground min-h-screen">
      <header className="border-border flex items-center gap-3 border-b px-6 py-3">
        <h1 className="text-lg font-semibold">amagi 响应类型控制台</h1>
        {endpoint !== undefined && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <Chip color="accent" variant="soft">
              <Chip.Label>{selected}</Chip.Label>
            </Chip>
            <span className="text-muted text-sm">{endpoint.summary}</span>
          </>
        )}
      </header>

      {error !== undefined && (
        <Alert status="danger" className="mx-6 mt-4">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>出错了</Alert.Title>
            <Alert.Description className="font-mono text-xs">{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="grid gap-6 p-6 lg:grid-cols-[320px_1fr]">
        <aside>
          <EndpointList platforms={platforms} selected={selected} onSelect={(p, e) => setSelected(`${p}/${e}`)} />
        </aside>

        <section className="flex flex-col gap-6">
          {endpoint === undefined ? (
            <p className="text-muted">左边选一个端点。</p>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {platform?.hasCookie === false && (
                  <Alert status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>这个平台没有 cookie</Alert.Title>
                      <Alert.Description>
                        设环境变量 <code className="font-mono">AMAGI_COOKIE_{platformName?.toUpperCase()}</code> 再重启 server。 没 cookie
                        的端点大多会拿回登录页或风控页，那些会被入库判定拒掉。
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                <ParamForm
                  endpoint={endpoint}
                  disabled={busy !== undefined}
                  onSubmit={(params) =>
                    void run('record', async () => {
                      push([await recordOne({ platform: platformName!, endpoint: endpoint.name, params })])
                    })
                  }
                />

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    isDisabled={busy !== undefined || endpoint.unseeded.length > 0}
                    isPending={busy === 'batch'}
                    onPress={() =>
                      void run('batch', async () => {
                        const result = await recordBatch({ platform: platformName!, endpoint: endpoint.name })
                        push(result.outcomes)
                      })
                    }
                  >
                    一键补样本（{endpoint.combinations} 组，每组间隔 1.5 秒）
                  </Button>
                  <Button
                    variant="secondary"
                    isDisabled={busy !== undefined || endpoint.stored === 0}
                    isPending={busy === 'generate'}
                    onPress={() =>
                      void run('generate', async () => {
                        const result = await generateTypes({ platform: platformName!, endpoint: endpoint.name })
                        setError(
                          result.written.length === 0
                            ? '没有产出文件（这个端点还没有可用样本）'
                            : `已写出 ${result.written.length} 个文件：${result.written.join('、')}。整棵树的一致性还要跑 pnpm gen:types`
                        )
                      })
                    }
                  >
                    生成这个端点的类型
                  </Button>
                  <span className="text-muted text-sm">本地已有 {endpoint.stored} 份样本</span>
                </div>

                {endpoint.unseeded.length > 0 && (
                  <Alert status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>缺种子，批量录不了</Alert.Title>
                      <Alert.Description>
                        <code className="font-mono">{endpoint.unseeded.join(' / ')}</code> 是必填的不透明 ID，没有种子就编不出合法值
                        （编一个只会换回错误页）。去 <code className="font-mono">corpus/seeds.json</code> 补，或者在上面手工填一次。
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
                <p className="text-muted">还没有录过。上面填参数，或者点「一键补样本」。</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-semibold">
                    待定队列（{queue.filter((item) => item.settled === undefined && item.outcome.pendingId !== undefined).length} 份可入库 /
                    共 {queue.length} 条）
                  </h2>
                  {queue.map((item) => (
                    <OutcomeCard
                      key={item.key}
                      outcome={item.outcome}
                      settled={item.settled}
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
  )
}
