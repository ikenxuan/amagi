/**
 * 「请求集合」那块面板：`corpus/<平台>/<端点>.requests.json` 里躺着的那几组参数。
 *
 * 这个文件回答的是样本回答不了的那个问题 —— **别人拿什么参数才能重放出这份响应**
 * （PRD 二 ①：样本里的 `metadata.params` 三重意义上都给不出答案）。而它最有价值的部分是
 * **被拒的那几条**（PRD 二 ②）：「我试过这组参数，拿回的是风控页」这件事今天一个字都不留，
 * 而它正是能让下一个贡献者不用再踩一遍的那句话。
 *
 * 所以被拒的行在这里与 `ok` **同一等**：一样的字号、一样实心的 chip、`note` 照样显示。
 * 把它们渲成灰掉的次要行等于把这块面板说成「只有成功的才算记录」—— 那恰好是今天的现状。
 *
 * 数据自己拉（`useRequest` 自动跑一次、`refreshDeps` 跟着端点变，同 `GeneratedPanel.tsx:11-12`
 * 那条约定），于是接进任何地方都是一行，不用调用方再管一份 loading 与错误态。
 */

import { Alert, AlertDialog, Button, Chip, EmptyState, Table } from '@heroui/react'
import { useRequest } from 'ahooks'

import { fetchRequests, type JsonValue, removeRequest, type RequestEntry, type RequestVerdict } from '../lib/api'

/**
 * 四种结论各自的说法。**颜色、中文说法、读屏那句三样一起给。**
 *
 * 只靠颜色分不出来（Web Interface Guidelines 那条 WCAG 1.4.1：颜色不能是唯一的信息载体），
 * 而四条里有三条是「被拒」—— 挤成一片同色的话，这块面板最该说出来的差别就没了：
 * 「风控」要人去换 cookie 或等一会，「空数据」说的是这一组参数问的东西真的不在了，
 * 两者对下一个人的意义完全不同。
 *
 * `variant` 四条全用实心的 `primary`：**没有哪一档比另一档次要。**（`secondary` 那种描边的
 * 留给标题旁边那些计数用 —— 见 `GeneratedPanel.tsx:50`。）
 *
 * `verdict` 的原串也照样渲出来（`reject:risk-control`）：那是文件里真正写着的值，
 * 人要照着它改 JSON，也要靠它对上 `packages/typegen/src/requests.ts:42` 那张表。
 */
const VERDICT: Record<RequestVerdict, { color: 'accent' | 'danger' | 'success' | 'warning'; label: string; hint: string }> = {
  ok: { color: 'success', label: '通过', hint: '入库判定放行了，这一组有样本' },
  'reject:risk-control': { color: 'danger', label: '风控', hint: '换回来的是风控页，这一组没有样本' },
  'reject:login': { color: 'warning', label: '要登录', hint: '换回来的是登录页：这个平台的 cookie 没配或者过期了' },
  'reject:empty': { color: 'accent', label: '空数据', hint: '请求打通了但 data 是空的（已删除的作品、私密账号）' }
}

/**
 * 时间的显示格式。`recordedAt` 在文件里是 ISO 8601 UTC **到秒**（`2026-09-05T06:11:00Z`）——
 * 那个写法是**给文件用的**（它进 git，还要与样本的 `metadata.recordedAt` 对着看），
 * 原样贴到界面上人得自己在脑子里减八小时。
 *
 * 所以这里按**看的人所在的时区**渲，而原串仍然挂在 `<time dateTime>` 与 `title` 上：
 * 显示归显示，「文件里到底写的什么」一个字符都没丢。
 */
const TIME = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })

/**
 * 一条时间。**解析不出来就原样显示** —— 校验器会拦掉写坏的 `recordedAt`
 * （`packages/typegen/src/requests.ts:254-263` 连「2 月 30 号」都判），但那是 server 那一侧的事：
 * 一个手写坏的时间戳不该让整块面板变成白屏。
 */
const showTime = (iso: string): string => {
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? iso : TIME.format(at)
}

/** 截断用**真省略号**而不是三个点（Web Interface Guidelines） */
const clip = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max)}…`)

/** 一行 `键=值`。字符串不加引号 —— `bvid=BV1xx411c7mD` 比 `bvid="BV1xx411c7mD"` 好读，其余按 JSON 写法 */
const showParam = (key: string, value: JsonValue): string => {
  const shown = typeof value === 'string' ? value : JSON.stringify(value)
  return `${key}=${clip(shown, 48)}`
}

/**
 * 行里那颗「删除」，**带一道 `AlertDialog` 确认**。
 *
 * PRD 5.4 只给「另存 + 联合导出」点名了 `AlertDialog`，理由是「它改产物布局」。删一条请求记录
 * 要不要同一档待遇 —— 我选**要，而且它比那个更该确认**，判据是「删掉之后还能不能重新得到」：
 *
 * - 产物布局能重算：`pnpm gen:types` 跑一遍就回来了，那个确认框防的是「布局翻转让人一时看不懂」。
 * - 这条记录里的 `note` **没有任何东西能重算**。它是人手打的一句结论（「拿回 code: -404，data 是
 *   null。留这条是为了别人不用再试一次」），而被拒的那几条压根没有样本可以回溯 ——
 *   连重放一次真请求都换不回同一句话（那时平台可能已经不风控了）。这个文件里唯一不可再生的
 *   内容就在这儿（PRD 二 ②），而它同时是最有价值的那部分。
 * - 表格行密、这颗按钮在行内，误触率比页面级动作高一档。
 *
 * 为什么不做成「直接删 + toast 里给一颗撤销」：撤销得把删掉那条 `upsert` 回去，而 `upsert`
 * 是**追加到末尾**（`server/index.ts:607`），于是「撤销」之后文件的 diff 与删之前不一样 ——
 * 那是一种假的撤销。真正的撤销是 `git checkout`（这个文件进 git，那正是它的设计），
 * 而确认框只花人一次回车。
 *
 * 用 render prop 拿 `close` 而不是 `slot="close"` + `onPress`：后者要赌两个 `onPress`
 * 在 slot 合并时都跑得到，前者是文档里写着的写法（AlertDialog「Using Dialog render props」）。
 */
const RemoveButton = ({ entry, onRemove, isRemoving }: { entry: RequestEntry; onRemove: (id: string) => void; isRemoving: boolean }) => (
  <AlertDialog>
    {/* 可见文案「删除」被 `aria-label` 整句包着（WCAG 2.5.3 要的正是这个方向）——
        一屏几行按钮长得一模一样，读屏得能说出删的是哪一条 */}
    <Button size="sm" variant="tertiary" aria-label={`删除请求记录 ${entry.id}`} isDisabled={isRemoving}>
      删除
    </Button>
    <AlertDialog.Backdrop>
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          {({ close }) => (
            <>
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>删掉「{clip(entry.label, 24)}」这条记录？</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-sm leading-relaxed">
                  <code className="font-mono">{entry.id}</code> 会从集合文件里消失。
                  {entry.note !== undefined && '这条记录带着一句 note（「拿回了什么」），那句话没有任何东西能重算 —— '}
                  集合文件进 git，所以删错了还能 <code className="font-mono">git checkout</code> 找回来，前提是这次改动还没提交。
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" onPress={() => close()}>
                  不删
                </Button>
                <Button
                  variant="danger"
                  onPress={() => {
                    close()
                    onRemove(entry.id)
                  }}
                >
                  删掉这条
                </Button>
              </AlertDialog.Footer>
            </>
          )}
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  </AlertDialog>
)

export interface RequestCollectionTableProps {
  /** 集合里的记录。**空数组是正常状态**（61 个端点现在一个集合文件都没有），走表格自己的空态 */
  requests: readonly RequestEntry[]
  /** `平台/端点`，只用来让表格的 `aria-label` 说得出这是谁的集合 */
  endpointLabel?: string
  /** 删掉一条。**接的是确认框里那颗红按钮**，不是行里那颗 —— 为什么要确认见 {@link RemoveButton} */
  onRemove: (id: string) => void
  /** 有一次删除在飞时禁掉所有删除按钮：列表要等那一发回来才更新，让人对着一份马上要变的表继续点没有好处 */
  isRemoving?: boolean
}

/**
 * 表格本体。**从数据拉取里拆出来是为了能真渲一遍**（同 `OutcomeCard.tsx:62-63` 那条理由）：
 * `useRequest` 在 `renderToStaticMarkup` 下不会跑（effect 不执行），从外面渲带取数的那一层
 * 只能渲到「正在读…」那一帧，四种 verdict 一条都到不了。
 */
export const RequestCollectionTable = ({ requests, endpointLabel, onRemove, isRemoving = false }: RequestCollectionTableProps) => (
  <div className="flex min-w-0 flex-col gap-2">
    {requests.some((entry) => entry.shapeKey === undefined) && (
      <p className="text-muted text-xs leading-relaxed">
        「形状指纹」那列大多写着「还没算」：产它的那一头（PRD 阶段 4）还没落地，现在仓库里没有任何代码在写{' '}
        <code className="font-mono">shapeKey</code>。<b>空着不代表这一组的形状没有指纹</b>，只代表还没人算过它。
      </p>
    )}
    <Table>
      <Table.ScrollContainer>
        {/* `min-w` 让窄栏下横向滚动而不是把每一列挤成两个字 —— 参数与 note 都是要读的正文。
            五列而不是 PRD 5.4 那四列：多出来的是「操作」，`id` 那列则把 `label` 与录制时间收在一起 */}
        <Table.Content aria-label={endpointLabel === undefined ? '请求集合' : `${endpointLabel} 的请求集合`} className="min-w-[52rem]">
          <Table.Header>
            <Table.Column isRowHeader>id</Table.Column>
            <Table.Column>参数</Table.Column>
            <Table.Column>判定</Table.Column>
            <Table.Column>形状指纹</Table.Column>
            <Table.Column>操作</Table.Column>
          </Table.Header>
          <Table.Body
            renderEmptyState={() => (
              // **一个「错误」「失败」都不许出现在这段话里**：空集合是这 61 个端点的现状，
              // 而那两个词会让人以为有什么要修的（`test/requestTable.test.ts` 钉着这条）
              <EmptyState className="flex flex-col items-center gap-1 py-8 text-center">
                <p className="text-sm font-semibold">还没有请求记录</p>
                <p className="text-muted max-w-prose text-sm leading-relaxed">
                  这是常态 —— 61 个端点现在一个 <code className="font-mono">.requests.json</code> 都没有。
                </p>
                <p className="text-muted max-w-prose text-sm leading-relaxed">
                  给一组参数起个 id 记下来，它就会出现在这里。<b>被平台拒掉的那几组一样该记</b>，那正是这个文件对下一个人最有用的部分。
                </p>
              </EmptyState>
            )}
          >
            {requests.map((entry) => (
              <Table.Row key={entry.id} id={entry.id}>
                <Table.Cell>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <code className="font-mono text-xs font-semibold">{entry.id}</code>
                    <span className="text-sm">{entry.label}</span>
                    <time className="text-muted text-xs tabular-nums" dateTime={entry.recordedAt} title={entry.recordedAt}>
                      {showTime(entry.recordedAt)}
                    </time>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {Object.keys(entry.params).length === 0 ? (
                    <span className="text-muted text-xs">这个端点没有参数</span>
                  ) : (
                    <ul className="flex min-w-0 flex-col gap-0.5">
                      {Object.entries(entry.params).map(([key, value]) => (
                        <li key={key} className="truncate font-mono text-xs">
                          {showParam(key, value)}
                        </li>
                      ))}
                    </ul>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex min-w-0 flex-col items-start gap-1">
                    <Chip
                      size="sm"
                      variant="primary"
                      color={VERDICT[entry.verdict].color}
                      aria-label={`判定 ${VERDICT[entry.verdict].label}：${VERDICT[entry.verdict].hint}`}
                    >
                      <Chip.Label>{VERDICT[entry.verdict].label}</Chip.Label>
                    </Chip>
                    <code className="text-muted font-mono text-xs">{entry.verdict}</code>
                    {/* `note` 一定要显示：被拒的那几条全靠它传递信息 */}
                    {entry.note !== undefined && <p className="text-sm leading-relaxed">{entry.note}</p>}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    {entry.shapeKey === undefined ? (
                      <span className="text-muted text-xs">还没算</span>
                    ) : (
                      <code className="font-mono text-xs">{entry.shapeKey}</code>
                    )}
                    {/* **「没有 sampleHash」不是缺失**，而且是两件不同的正常事：被拒的那几条压根没生成样本
                        （校验器连「被拒却带着 sampleHash」都要把那个字段丢掉，`requests.ts:276-279`）；
                        `ok` 而没有指针的是人手写进文件的那几条。留白会被读成「这一格丢了个东西」 */}
                    {entry.sampleHash === undefined ? (
                      <span className="text-muted text-xs">{entry.verdict === 'ok' ? '没记样本文件名' : '被拒的请求没有样本'}</span>
                    ) : (
                      <span className="text-muted font-mono text-xs">样本 {entry.sampleHash}</span>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <RemoveButton entry={entry} onRemove={onRemove} isRemoving={isRemoving} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  </div>
)

export interface RequestTableProps {
  platform: string
  endpoint: string
  /**
   * 改这个值就重拉一次（同 `GeneratedPanel.tsx:24-31` 那条线）。
   *
   * 存在的理由：集合是**别的动作**改的 —— `/api/store` 带上 `id` 时会顺手追加一条
   * （`server/index.ts:538`），或者有人在编辑器里直接改了那个 JSON，而这块面板自己无从知道。
   * 入库之后把它 +1 就跟上了；不接也能用 —— 右上角那个「重新读」是同一件事的手动版。
   */
  revision?: number
}

export const RequestTable = ({ platform, endpoint, revision = 0 }: RequestTableProps) => {
  const list = useRequest(() => fetchRequests({ platform, endpoint }), { refreshDeps: [platform, endpoint, revision] })
  /**
   * 删除。**成功之后不重拉** —— 契约刻意回「动作之后盘上那一份」（`shared/contract.ts:260`），
   * 拿它直接换掉列表比 `list.refresh()` 少一发请求，也少一帧「表格空了一下」。
   */
  const remove = useRequest(removeRequest, { manual: true, onSuccess: (result) => list.mutate(result) })
  const collection = list.data?.collection
  const issues = list.data?.issues ?? []

  return (
    <section className="border-border flex min-w-0 flex-col gap-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">请求集合</h2>
        {collection !== undefined && (
          <Chip size="sm" variant="soft">
            <Chip.Label className="tabular-nums">{collection.requests.length} 组</Chip.Label>
          </Chip>
        )}
        {/* 路径要说出来。契约那句「没写成时也回」的全部理由就是「人要知道说的是哪个文件」
            （`shared/contract.ts:258`）—— 而这个文件是人会直接手改的那一种 */}
        {list.data !== undefined && <code className="text-muted min-w-0 truncate font-mono text-xs">{list.data.path}</code>}
        <Button
          className="ml-auto"
          size="sm"
          variant="tertiary"
          aria-label="重新读一遍这个端点的请求集合"
          isPending={list.loading}
          onPress={() => list.refresh()}
        >
          重新读
        </Button>
      </div>

      {list.error !== undefined ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>读不到请求集合</Alert.Title>
            {/* 多行错误文案（`lib/api.ts` 的 `readableError` 在 HTML 响应那种情况下给三行诊断），
                不保留换行会挤成一行 */}
            <Alert.Description className="font-mono text-xs whitespace-pre-wrap">{list.error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : list.loading && collection === undefined ? (
        // **加载中不说「还没有请求记录」** —— 与左栏那句「后端可能没起」是同一类误报
        <p className="text-muted text-sm">正在读 corpus/ 里的请求集合…</p>
      ) : (
        <>
          {issues.length > 0 && (
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>这份集合文件有问题</Alert.Title>
                <Alert.Description>
                  <p className="text-xs leading-relaxed">
                    下面列出的是<b>读懂了的那几条</b>，坏掉的条目没收进来。而这个状态下任何写动作都会被 409
                    拦住（拒绝覆盖一份没读懂的文件）—— 先把这些修好：
                  </p>
                  <ul className="font-mono text-xs">
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {remove.error !== undefined && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>这条没删掉</Alert.Title>
                {/* server 那两档状态码各自的下一步都写在正文里了（400 改输入 / 409 去修文件，
                    `server/index.ts:564-565`），所以这里原样贴，不再自己拼一句 */}
                <Alert.Description className="font-mono text-xs whitespace-pre-wrap">{remove.error.message}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {remove.data?.effect === 'absent' && (
            // 未知 id 也回 200（幂等），而且 server 不写盘 —— 不说的话这一下看着像「点了没反应」
            <p className="text-muted text-xs">那条 id 已经不在集合里了，集合文件没有被动过。</p>
          )}

          <RequestCollectionTable
            requests={collection?.requests ?? []}
            endpointLabel={`${platform}/${endpoint}`}
            onRemove={(id) => remove.run({ platform, endpoint, id })}
            isRemoving={remove.loading}
          />
        </>
      )}
    </section>
  )
}
