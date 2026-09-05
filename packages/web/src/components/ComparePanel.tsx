/**
 * 「并排对比」那块面板（PRD 4.2 那张表里的「对比」、阶段 4 第 2 与第 4 条）：
 * 同一个端点的**两组参数**各自单独生成的类型，两栏并排 + 逐字段差异清单。
 *
 * 这块面板回答的是一份类型自己回答不了的问题 —— **这两组参数产出的形状是不是同一份**。
 * 今天要回答它只能把两份产物 checkout 出来手工对着看，而子类型编号是每次渲染独立算的
 * （`Data` / `Data2`，`render.ts:224`），肉眼对齐必然对错行。差异由 server 算完再回
 * （`server/compare.ts`），这一侧只负责显示与「选哪两份」。
 *
 * **两处必须说出来的话，都不是这一侧发明的**：
 *
 * 1. `note`（PRD 4.3 那句「单份视角比合并更严」）由 server 每次都回 —— 原样渲染。
 * 2. `recursive` 非空 = 那些路径**底下一个字段都没有参与比对**，同 `HighlightedCode.totalChars`
 *    那条约定：截断必须说出来（`CodeBlock.tsx:63`）。
 *
 * 数据自己拉（同 `GeneratedPanel.tsx:11-12` / `RequestTable.tsx:12-13` 那条约定），
 * 于是接进任何地方都是一行，不用调用方再管一份 loading 与错误态。
 */

import { Alert, Button, Chip, EmptyState, Label, ListBox, Select, Table } from '@heroui/react'
import { useRequest } from 'ahooks'
import { useState } from 'react'

import { type CompareFieldDiff, type CompareResult, type CompareSide, fetchCompare, fetchRequests, type RequestEntry } from '../lib/api'
import { CodeBlock } from './CodeBlock'

/**
 * 四种差异各自的说法。**记号、中文说法、读屏那句、颜色四样一起给。**
 *
 * 只靠颜色分不出来（WCAG 1.4.1：颜色不能是唯一的信息载体，同 `RequestTable.tsx:22-27`
 * 那条），而这四类要人做的事完全不同：`type` 是会让下游编译红的那一类，`optionality`
 * 里有一大半是「这一组只录了一份样本」的影子（`note` 说的正是这件事），
 * `only-*` 则是「那一侧压根没有这个字段」。挤成一片同色等于把这块面板最该说的差别抹掉。
 *
 * `mark` 跟着 diff 的老规矩（PRD 4.1 版面图里就是 `+` / `-` / `~`），它是**扫一眼**用的 ——
 * 所以挂 `aria-hidden`：读屏念一串 `~ ?` 是噪音，那一句由 chip 的 `aria-label` 说。
 * 中文说法本身是文本，所以「不靠颜色也分得出」这条由它兜住，`mark` 只是锦上添花。
 */
const KIND: Record<
  CompareFieldDiff['kind'],
  { mark: string; label: string; hint: string; color: 'accent' | 'danger' | 'success' | 'warning' }
> = {
  'only-left': { mark: '-', label: '只有左边有', color: 'warning', hint: '右边那份样本里压根没有这个字段' },
  'only-right': { mark: '+', label: '只有右边有', color: 'success', hint: '左边那份样本里压根没有这个字段' },
  type: { mark: '~', label: '类型不同', color: 'danger', hint: '两边都有这个字段，类型表达式不一样 —— 这一类会让下游编译红' },
  optionality: { mark: '?', label: '可选性不同', color: 'accent', hint: '两边都有这个字段，一边必需一边可选' }
}

/** 四种 kind 的固定顺序。给上面那排计数用 —— `Object.keys` 的顺序不该决定界面顺序 */
const KINDS = ['only-left', 'only-right', 'type', 'optionality'] as const

/**
 * 差异清单里的一格。
 *
 * **缺的那一侧不能留白**：契约里 `only-right` 时 `left` 那个键**整个不在**
 * （`shared/contract.ts:367-373`），而空白格会被读成「这个值没取到」。
 * 它要说的是一句结论 —— 那一侧真的没有这个字段，同 `RequestTable.tsx:234-236`
 * 那两处空位各自说清自己是什么。
 */
const SideCell = ({ shown }: { shown?: string }) =>
  shown === undefined ? (
    <span className="text-muted text-xs">这一侧没有这个字段</span>
  ) : (
    <code className="font-mono text-xs break-all">{shown}</code>
  )

/**
 * 一边的抬头：比的是哪份样本、这一侧摊平出多少个字段。
 *
 * `fields` 是差异规模的分母（`shared/contract.ts:389`）—— 「7 处差异」在 90 个字段上
 * 和在 12 个字段上是两个结论，不给分母那句话没法读。
 */
const SideHead = ({ side, which }: { side: CompareSide; which: string }) => (
  <div className="flex min-w-0 flex-wrap items-center gap-2">
    <Chip size="sm" variant="soft">
      <Chip.Label>{which}</Chip.Label>
    </Chip>
    <code className="font-mono text-xs font-semibold">{side.sampleHash}</code>
    <span className="text-muted text-xs tabular-nums">{side.fields} 个字段</span>
  </div>
)

export interface CompareViewProps {
  result: CompareResult
}

/**
 * 结果本体。**从数据拉取里拆出来是为了能真渲一遍**（同 `RequestTable.tsx:148-152` 那条理由）：
 * `useRequest` 在 `renderToStaticMarkup` 下不会跑（effect 不执行），从外面渲带取数的那一层
 * 只能渲到「正在读…」那一帧，四种差异一条都到不了。
 */
export const CompareView = ({ result }: CompareViewProps) => {
  /** 两边加起来那些「底下没比过」的路径。空数组是常态 */
  const stopped = [
    ...result.left.recursive.map((path) => ({ which: '左', path })),
    ...result.right.recursive.map((path) => ({ which: '右', path }))
  ]

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* PRD 4.3 那句话。**原样渲染 server 回的那一份，不在这儿拼第二份** ——
          契约把它放进结果里的理由就是「curl 用户也该看到这句」（`shared/contract.ts:412-420`），
          而前端另写一份的代价是两份措辞哪天会错开，那时有人照着一份假差异去改类型。
          里面的 `**` 与反引号是这句话自己的强调（同 `GENERATE_NOTE` —— 它在 toast 里也是原样出去的），
          这里不做 markdown 渲染：那等于在显示层重新解释一遍一段已经定稿的文案 */}
      <p className="text-muted text-xs leading-relaxed whitespace-pre-wrap">{result.note}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted text-xs tabular-nums">
          {result.diffs.length} 处差异 · {result.same} 个字段一致
        </span>
        {KINDS.filter((kind) => result.counts[kind] > 0).map((kind) => (
          <Chip
            key={kind}
            size="sm"
            variant="primary"
            color={KIND[kind].color}
            aria-label={`${KIND[kind].label} ${result.counts[kind]} 处：${KIND[kind].hint}`}
          >
            <Chip.Label className="tabular-nums">
              <span aria-hidden="true" className="mr-1 font-mono">
                {KIND[kind].mark}
              </span>
              {KIND[kind].label} {result.counts[kind]}
            </Chip.Label>
          </Chip>
        ))}
      </div>

      {stopped.length > 0 && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>这几条路径底下没有比过</Alert.Title>
            <Alert.Description>
              <p className="text-xs leading-relaxed">
                类型在这里自引用了（<code className="font-mono">Reply.replies: Reply[]</code> 这种），摊平到这一层就停下了 ——{' '}
                <b>这些路径底下的字段一个都没有参与比对</b>
                ，下面那张清单里不会有它们。所以「零差异」在这些子树上说的是「没看」，不是「一样」。
              </p>
              <ul className="font-mono text-xs">
                {stopped.map((item) => (
                  <li key={`${item.which}:${item.path}`}>
                    {item.which}：{item.path}
                  </li>
                ))}
              </ul>
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* 并排两栏。窄屏下自动叠成上下 —— 两份类型源码挤在半个手机屏上谁也读不了，
          而 `min-w-0` 是这里的必需品：没有它，代码块里的长行会把整列撑宽（flex/grid 子项
          默认 `min-width: auto`），于是两栏一起溢出到卡片外面 */}
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <SideHead side={result.left} which="左" />
          <CodeBlock code={result.left.code} maxHeight="max-h-[32rem]" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <SideHead side={result.right} which="右" />
          <CodeBlock code={result.right.code} maxHeight="max-h-[32rem]" />
        </div>
      </div>

      <Table>
        <Table.ScrollContainer>
          {/* `min-w` 让窄栏下横向滚动而不是把每列挤成两个字：路径与类型表达式都是要逐字读的正文 */}
          <Table.Content aria-label={`${result.platform}/${result.endpoint} 的字段级差异`} className="min-w-[44rem]">
            <Table.Header>
              <Table.Column isRowHeader>字段路径</Table.Column>
              <Table.Column>差异</Table.Column>
              {/* 列头带上哈希：这张表比的是哪两份，不能只靠上面两栏的抬头说一遍 */}
              <Table.Column>左 {result.left.sampleHash}</Table.Column>
              <Table.Column>右 {result.right.sampleHash}</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                // **一个「错误」「失败」都不许出现在这段话里**：零差异是一条真结论
                // （这两组参数产出同一份类型），同 `RequestTable.tsx:175-177` 那条纪律
                <EmptyState className="flex flex-col items-center gap-1 py-8 text-center">
                  <p className="text-sm font-semibold">两边逐字段一致</p>
                  <p className="text-muted max-w-prose text-sm leading-relaxed">
                    {result.same} 个字段的路径、类型、可选性一处不差 —— <b>这两组参数产出的是同一份类型</b>，可以合并。 那正是{' '}
                    <code className="font-mono">shapeKey</code>（形状指纹）想一眼回答的问题。
                  </p>
                </EmptyState>
              )}
            >
              {result.diffs.map((diff) => (
                <Table.Row key={diff.path} id={diff.path}>
                  <Table.Cell>
                    <code className="font-mono text-xs break-all">{diff.path}</code>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      <Chip
                        size="sm"
                        variant="primary"
                        color={KIND[diff.kind].color}
                        aria-label={`${KIND[diff.kind].label}：${KIND[diff.kind].hint}`}
                      >
                        <Chip.Label>
                          <span aria-hidden="true" className="mr-1 font-mono">
                            {KIND[diff.kind].mark}
                          </span>
                          {KIND[diff.kind].label}
                        </Chip.Label>
                      </Chip>
                      {/* `kind` 的原串也照渲：契约、`/api/compare` 的正文、这张表说的是同一个词，
                          人要靠它对上 `shared/contract.ts:362-366` 那四个取值 */}
                      <code className="text-muted font-mono text-xs">{diff.kind}</code>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <SideCell shown={diff.left} />
                  </Table.Cell>
                  <Table.Cell>
                    <SideCell shown={diff.right} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  )
}

/** 下拉框里的一项。`id` / `label` 是人给的那两个字段，`sampleHash` 才是 `/api/compare` 认的东西 */
export interface Candidate {
  sampleHash: string
  id: string
  label: string
}

/**
 * 能选的那些样本。**数据只有一个来源：请求集合里带 `sampleHash` 的记录。**
 *
 * 这是这块面板唯一的短板，得说清缺的是什么：**没有任何接口列得出 corpus 里的样本文件名。**
 * `EndpointInfo.stored` 只有个数（`shared/contract.ts:47-48`）；`readSamples` 在 server 侧
 * 但没有路由透出去；`/api/compare` 挑不到样本时那句 404 里倒是把现有哈希列全了
 * （`server/index.ts:755-759`）—— 那是错误路径，不能当清单用。
 *
 * 于是**「留下」时没给 id 的样本在这里看不见**（`appendStoreEntry` 在 `id === ''` 时直接返回，
 * `server/index.ts:409-414`）。这件事必须写在界面上：不说的话，一个有 5 份样本的端点
 * 在这里显示成「没有能比的样本」，看起来像功能坏了。
 *
 * 按 `sampleHash` 去重：两条不同 `id` 的记录可以指着同一份样本（`paramsHash` 由参数算，
 * 参数相同就是同一份文件）。留两个选起来一模一样的选项会让下面「禁掉同选」那条看起来失灵。
 */
const candidatesOf = (requests: readonly RequestEntry[]): Candidate[] => {
  const seen = new Set<string>()
  const picked: Candidate[] = []
  for (const entry of requests) {
    if (entry.sampleHash === undefined || seen.has(entry.sampleHash)) continue
    seen.add(entry.sampleHash)
    picked.push({ sampleHash: entry.sampleHash, id: entry.id, label: entry.label })
  }
  return picked
}

/**
 * 一个样本选择器。
 *
 * **`disabledKeys` 里放的是对面那一侧选中的那份 —— 这是「不让 400 发出去」的第一道闸。**
 * `POST /api/compare` 在 `left === right` 时回 400（`server/index.ts:748`），而那**不是后端故障**：
 * 一份样本跟自己比处处一致，那句话对任何样本都成立，所以它是「改你的输入」那一档。
 * 两个下拉框摆在一起，选重是最常见的手误 —— 挡在这里，人就不会看见一条读起来像故障的红条。
 *
 * 用 `value` / `onChange` 而不是 `selectedKey` / `onSelectionChange`：后两个在这个版本的
 * react-stately 里已经标了 `@deprecated`（`useSelectState.d.ts:16-34`），而 `ParamForm.tsx:171`
 * 走的也是 `value` 那套写法。
 */
const SamplePicker = ({
  which,
  value,
  taken,
  candidates,
  onChange
}: {
  which: string
  value?: string
  /** 对面选中的那份。它在这个框里选不了 */
  taken?: string
  candidates: readonly Candidate[]
  onChange: (sampleHash: string | undefined) => void
}) => (
  <Select
    className="w-full max-w-sm"
    placeholder="选一份样本"
    value={value ?? null}
    disabledKeys={taken === undefined ? [] : [taken]}
    onChange={(key) => onChange(key === null ? undefined : String(key))}
  >
    <Label>{which}边那一组</Label>
    <Select.Trigger>
      {/* **收起来的那颗按钮上只放文本。** `Select.Value` 默认渲的是选中项那份完整 children
          （RAC 渲 `selectedItem.rendered`），于是选项行末尾那个勾会被一起搬进按钮里 ——
          而它是 `absolute end-2`（`list-box-item.css`），在按钮里正好压在右边那个箭头上。
          `selectedText` 就是下面那个 `textValue`，所以三样信息一个都没少 */}
      <Select.Value>{({ isPlaceholder, defaultChildren, selectedText }) => (isPlaceholder ? defaultChildren : selectedText)}</Select.Value>
      <Select.Indicator />
    </Select.Trigger>
    <Select.Popover>
      <ListBox>
        {candidates.map((candidate) => (
          <ListBox.Item
            key={candidate.sampleHash}
            id={candidate.sampleHash}
            textValue={`${candidate.id} · ${candidate.label} · ${candidate.sampleHash}`}
          >
            {/* 三样都要：`id` 是人认的那个短名，`label` 是那句说明，而 `sampleHash` 才是这条接口
                认的东西（`/api/compare` 收的就是它）。装在一个元素里、分隔符自己带着 ——
                摆成三个兄弟节点就得靠选项行上的 `gap-3`（`list-box-item` 那条 CSS）撑开 */}
            <span className="min-w-0 truncate text-xs">
              <span className="font-mono font-semibold">{candidate.id}</span> · {candidate.label} ·{' '}
              <span className="text-muted font-mono">{candidate.sampleHash}</span>
            </span>
            <ListBox.ItemIndicator />
          </ListBox.Item>
        ))}
      </ListBox>
    </Select.Popover>
  </Select>
)

export interface ComparePickerProps {
  candidates: readonly Candidate[]
  left?: string
  right?: string
  /** 有一发在飞 */
  isPending?: boolean
  onPick: (which: 'left' | 'right', sampleHash?: string) => void
  onCompare: () => void
}

/**
 * 「选哪两份」那一行。**从取数那一层拆出来是为了能真渲一遍**（同 {@link CompareView} 那条理由）：
 * 这一行是这块面板唯一有机会把 400 送出去的地方，而它在 `renderToStaticMarkup` 下渲得出来 ——
 * 于是「两个框都在、选中的那两份在收起来的按钮上就看得见、撞上时按钮按不下去」量的是真 DOM。
 *
 * 「哪一项被禁掉了」仍然渲不出来（选项在 popover 里，关着的时候不在 DOM 里），
 * 那条只能读源码钉 —— 同 `RequestTable.tsx` 里那个确认框（`test/requestTable.test.ts:204-215`）。
 */
export const ComparePicker = ({ candidates, left, right, isPending, onPick, onCompare }: ComparePickerProps) => {
  /** 两边凑齐、而且不是同一份。**按钮的禁用判据**，也是那条 400 的最后一道闸 */
  const ready = left !== undefined && right !== undefined && left !== right

  return (
    <div className="flex flex-wrap items-end gap-3">
      <SamplePicker which="左" value={left} taken={right} candidates={candidates} onChange={(hash) => onPick('left', hash)} />
      <SamplePicker which="右" value={right} taken={left} candidates={candidates} onChange={(hash) => onPick('right', hash)} />
      <Button variant="secondary" isDisabled={!ready} isPending={isPending} onPress={onCompare}>
        并排比一比
      </Button>
    </div>
  )
}

export interface ComparePanelProps {
  platform: string
  endpoint: string
  /**
   * 本地已入库的样本数（`EndpointInfo.stored`）。**只用来把缺口说清**：
   * 「本地有 5 份、这里只列得出 1 份」是一句必须能说出来的话，理由见 {@link candidatesOf}。
   */
  stored?: number
  /**
   * 改这个值就重读一遍样本清单（同 `RequestTable.tsx:258-266` 那条线）。
   *
   * 存在的理由：清单来自请求集合，而集合是**别的动作**改的 —— `/api/store` 带上 `id` 时
   * 会顺手追加一条（`server/index.ts:545`），那一刻新样本就该出现在这两个下拉框里，
   * 而这块面板自己无从知道。
   *
   * **它接的是「集合变了」那件事，不是「产物变了」那件事。** `GeneratedPanel` 那个计数器由
   * 「生成这个端点的类型」推进，两件事不同时发生：共用一个的话，生成一次类型会让这里白拉一趟，
   * 而入库一次又不会让「已有类型」跟上 —— 两个都是错的。
   */
  revision?: number
}

export const ComparePanel = ({ platform, endpoint, stored, revision = 0 }: ComparePanelProps) => {
  const list = useRequest(() => fetchRequests({ platform, endpoint }), { refreshDeps: [platform, endpoint, revision] })
  /**
   * 比一次。**手动，不自动跑** —— 这一发在 server 侧要跑两遍生成器、再过两遍 shiki
   * （`server/compare.ts:156-169`），而左栏点一下就换一个端点。自动跑等于把左栏里
   * 每一次点击都变成一次全量渲染。
   */
  const compare = useRequest(fetchCompare, { manual: true })
  const candidates = candidatesOf(list.data?.collection.requests ?? [])

  const [leftPick, setLeftPick] = useState<string | undefined>(undefined)
  const [rightPick, setRightPick] = useState<string | undefined>(undefined)
  /** 人选的那个还在清单里吗 —— 删掉一条记录之后它可能已经不在了，那时要落回默认值 */
  const known = (hash?: string): boolean => candidates.some((candidate) => candidate.sampleHash === hash)
  /** 默认头两份：一进来就能直接按下去，不用先点两个下拉框 */
  const left = known(leftPick) ? leftPick : candidates[0]?.sampleHash
  /**
   * 右边**永远落在与左边不同的那一份上** —— 这是不让 400 发出去的第二道闸。
   * 两道都要：`SamplePicker` 的 `disabledKeys` 只管人点出来的那一下，而默认值这条路上没有人点。
   */
  const right = known(rightPick) && rightPick !== left ? rightPick : candidates.find((item) => item.sampleHash !== left)?.sampleHash
  /** 下面那份结果与现在选的对不上了。契约让 `sampleHash` 回答「比的是谁」，就是为了这一刻 */
  const stale = compare.data !== undefined && (compare.data.left.sampleHash !== left || compare.data.right.sampleHash !== right)

  return (
    <section className="border-border flex min-w-0 flex-col gap-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">并排对比</h2>
        {candidates.length > 0 && (
          <Chip size="sm" variant="soft">
            <Chip.Label className="tabular-nums">{candidates.length} 份可选</Chip.Label>
          </Chip>
        )}
        {/* 「重新读清单」而不是「重新读」：这颗刷的是**能选哪些样本**，不是下面那份对比结果
            （那个由「并排比一比」重跑）。集合还会被这块面板管不着的地方改 —— 请求集合表里删掉一条、
            或者有人直接手改了那个 JSON，`revision` 只接得住入库那一条路 */}
        <Button
          className="ml-auto"
          size="sm"
          variant="tertiary"
          aria-label="重新读一遍这个端点能选的样本清单"
          isPending={list.loading}
          onPress={() => list.refresh()}
        >
          重新读清单
        </Button>
      </div>

      {list.error !== undefined ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>读不到能选的样本清单</Alert.Title>
            {/* 多行错误文案（`lib/api.ts` 的 `readableError` 在 HTML 响应那种情况下给三行诊断），
                不保留换行会挤成一行 */}
            <Alert.Description className="font-mono text-xs whitespace-pre-wrap">{list.error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : list.loading && list.data === undefined ? (
        // **加载中不说「没有样本」** —— 与左栏那句「后端可能没起」是同一类误报
        <p className="text-muted text-sm">正在读这个端点的请求集合…</p>
      ) : candidates.length < 2 ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm leading-relaxed">
            {candidates.length === 0 ? '这个端点还没有能并排比的样本。' : '这里只列得出一份样本，而对比要两份不同的。'}
            下拉框里的选项来自<b>请求集合里带样本指针的那些记录</b> —— 也就是{' '}
            <code className="font-mono">{`corpus/${platform}/${endpoint}.requests.json`}</code> 里带{' '}
            <code className="font-mono">sampleHash</code> 的条目。
          </p>
          <p className="text-muted text-sm leading-relaxed">
            {stored !== undefined && (
              <>
                这个端点<b className="tabular-nums">本地有 {stored} 份样本</b>，而这里列得出{' '}
                <span className="tabular-nums">{candidates.length}</span> 份。
              </>
            )}
            两个数不一样是正常的：<b>没有任何接口列得出 corpus 里的样本文件名</b>（端点清单里只有个数）。 于是「留下」时没给 id
            的那些样本在这里看不见 —— 入库时给一个 id 与一句说明，它就会出现在这两个下拉框里。
          </p>
        </div>
      ) : (
        <>
          <ComparePicker
            candidates={candidates}
            left={left}
            right={right}
            isPending={compare.loading}
            onPick={(which, hash) => (which === 'left' ? setLeftPick(hash) : setRightPick(hash))}
            // **第三道闸。** 前两道在 `SamplePicker` 的 `disabledKeys` 与上面 `right` 的兜底上；
            // 这一道让「按下去」这条路上根本没有能送出 `left === right` 的分支，也顺手把
            // 两个 `string | undefined` 收窄掉 —— 不用在参数上写 `!`
            onCompare={() => {
              if (left !== undefined && right !== undefined && left !== right) compare.run({ platform, endpoint, left, right })
            }}
          />

          {compare.error !== undefined && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>这两份比不出来</Alert.Title>
                {/* server 那几档状态码各自的下一步都写在正文里了（404 那档还把现有的哈希列全了，
                    `server/index.ts:756-762`），所以这里原样贴，不再自己拼一句 */}
                <Alert.Description className="font-mono text-xs whitespace-pre-wrap">{compare.error.message}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {compare.data !== undefined && (
            <>
              {stale && (
                // 选择改了而结果没重算 —— 不说的话这份对比看着像是在说现在选中的那两份
                <p className="text-muted text-xs leading-relaxed">
                  下拉框已经改过了：下面这份比的还是 <code className="font-mono">{compare.data.left.sampleHash}</code> 与{' '}
                  <code className="font-mono">{compare.data.right.sampleHash}</code> —— 再点一次「并排比一比」。
                </p>
              )}
              <CompareView result={compare.data} />
            </>
          )}
        </>
      )}
    </section>
  )
}
