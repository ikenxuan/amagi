/**
 * 「已有类型」面板：`packages/response-types/` 里**当前提交**的那份产物。
 *
 * 这一栏是 PRD 4.2 那五个面板里完全缺的一个 —— 界面原先对「这个端点已经有类型了」一无所知，
 * 于是「我是不是在重复劳动」「上一份的形状长什么样」只能靠翻文件树回答。
 *
 * **它显示的不是这次录制的结果**，而是仓库里那一份（`pnpm gen:types` 的产出）。
 * 这条区别得写在界面上：单份样本跑出来的类型比合并的更严（可选性、空数组、`null`、大对象四处，
 * 见 PRD 4.3），不说清的话人会以为合并把类型改坏了。
 *
 * 数据自己拉（`useRequest` 自动跑一次，`refreshDeps` 跟着端点变）—— 这样接进任何地方都是一行，
 * 不用调用方再管一份 loading 与错误态。
 */

import { Alert, Button, Chip, Tabs, Tooltip } from '@heroui/react'
import { useRequest } from 'ahooks'

import { fetchGenerated } from '../lib/api'
import { PANE_INNER } from '../lib/pane'
import { CodeBlock } from './CodeBlock'

export interface GeneratedPanelProps {
  platform: string
  endpoint: string
  /**
   * 改这个值就重拉一次。
   *
   * 存在的理由：产物是**别的动作**改的（「生成这个端点的类型」按下去、或者在终端里跑了
   * `pnpm gen:types`），这个面板自己无从知道。按完那个按钮把它 +1，面板就跟着更新；
   * 不接也能用 —— 右上角那个「重新读」是同一件事的手动版。
   */
  revision?: number
}

/** `bilibili/VideoInfo/VideoInfo_V0.ts` → `VideoInfo_V0.ts`。tab 上只放文件名，路径太长 */
const fileNameOf = (path: string): string => path.split('/').pop() ?? path

export const GeneratedPanel = ({ platform, endpoint, revision = 0 }: GeneratedPanelProps) => {
  const generated = useRequest(() => fetchGenerated({ platform, endpoint }), {
    // 端点变了要重拉。**`revision` 也在里面** —— 见它的注释
    refreshDeps: [platform, endpoint, revision]
  })
  const files = generated.data?.files ?? []
  const issues = generated.data?.issues ?? []

  return (
    <section className={PANE_INNER}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">已有类型</h2>
        {files.length > 0 && (
          <Chip size="sm" variant="soft">
            <Chip.Label className="tabular-nums">{files.length} 个文件</Chip.Label>
          </Chip>
        )}
        <Button
          className="ml-auto"
          size="sm"
          variant="tertiary"
          aria-label="重新读一遍已提交的产物"
          isPending={generated.loading}
          onPress={() => generated.refresh()}
        >
          重新读
        </Button>
      </div>

      {generated.error !== undefined ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>读不到产物</Alert.Title>
            {/* 多行错误文案（`lib/api.ts` 的 readableError 会给三行诊断），不保留换行会挤成一行 */}
            <Alert.Description className="font-mono text-xs whitespace-pre-wrap">{generated.error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : generated.loading && generated.data === undefined ? (
        // **加载中不说「没有」** —— 与左栏那个「还没读到端点清单，后端可能没起」是同一类误报
        <p className="text-muted text-sm">正在读 packages/response-types/ 里的产物…</p>
      ) : files.length === 0 ? (
        // 三句话缩成一句。**「这是常态」那半句留着**（61 个端点里只有 12 个有产物），
        // 少了它这块空面板看起来像出错了；而「去哪儿生成」左边那颗按钮就是，不用再写一遍
        <p className="text-muted text-sm">还没生成过 —— 这是常态。左边「生成类型」写一份出来。</p>
      ) : (
        <>
          {/* 原先这里是一段五行的正文，把「单份样本比合并更严」那件事从头讲了一遍。
              **那件事没有被删掉，它搬进了 tooltip**（判据：这块面板与「本次」那一页并排放着时，
              人第一眼要的是两份源码，不是一段解释）。留在版面上的是那句话的**结论** */}
          <Tooltip delay={300}>
            <p className="text-muted w-fit cursor-help text-xs underline decoration-dotted">当前提交的那一份，由全部样本合并而来</p>
            <Tooltip.Content>
              <p className="max-w-xs">
                不是这一次录制的结果。单份样本单独生成的类型会更严 —— 出现过的键全是必需、空数组是 unknown[]、只见过 string 就不会有 |
                null。
              </p>
            </Tooltip.Content>
          </Tooltip>

          {issues.length > 0 && (
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>有产物读不了</Alert.Title>
                <Alert.Description>
                  <ul className="font-mono text-xs">
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {files.length === 1 ? (
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-muted font-mono text-xs">{files[0]!.path}</p>
              <CodeBlock code={files[0]!.code} maxHeight="max-h-[32rem]" />
            </div>
          ) : (
            // 多个文件分 tab。判别联合那种布局一个端点能有五六个文件
            // （`<Endpoint>/<取值>/<取值>_V0.ts` + 两层 barrel + `guards.ts`），
            // 全部堆在一页上翻不动
            <Tabs defaultSelectedKey={files[0]!.path}>
              <Tabs.ListContainer>
                <Tabs.List aria-label="已有的产物文件">
                  {files.map((file) => (
                    <Tabs.Tab key={file.path} id={file.path}>
                      <span className="font-mono">{fileNameOf(file.path)}</span>
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
              {files.map((file) => (
                <Tabs.Panel key={file.path} id={file.path}>
                  <div className="flex min-w-0 flex-col gap-1">
                    {/* 路径写全一遍：tab 上只有文件名，而两个 `index.ts` 长得一模一样 */}
                    <p className="text-muted font-mono text-xs">{file.path}</p>
                    <CodeBlock code={file.code} maxHeight="max-h-[32rem]" />
                  </div>
                </Tabs.Panel>
              ))}
            </Tabs>
          )}
        </>
      )}
    </section>
  )
}
