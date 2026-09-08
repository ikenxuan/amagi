/**
 * 「请求」那一栏：**拿什么参数打这一发。** 这一栏只回答这一个问题。
 *
 * ## 这一轮把「集合」整页搬出去了
 *
 * 原先这一栏有两页：`参数` 与 `集合`。而 `集合` 那一页是一张**五列的表**
 * （记录 / 参数 / 判定 / 形状指纹 / 操作，最窄 52rem），塞在一栏 22rem 宽的地方 ——
 * 于是它只能横向滚着看，而一张要横向滚的表读不出「哪几条同形状」这种跨行关系。
 * 更要紧的是**那张表里真正属于「请求」的只有两列**：`label` 与 `参数`。
 * 剩下的（判定、形状指纹、同形状分组、「不同参数组各留一份才产得出判别联合」那段说明）
 * 说的都是**类型**的事，跟「我现在要用哪组参数发一发」没关系 ——
 * 这就是它「理解成本高」的真正来源：一栏里同时摆着两个不同的问题。
 *
 * 现在拆成两处，各自摆在读得下的地方：
 *
 * - **「用哪一组参数」留在这一栏**，形状是表单顶上一个下拉（{@link ExamplePicker}）：
 *   `种子默认值` 加每条记录的**说明**（撞名才带哈希消歧）。选一个就填进表单。这是日常动作。
 * - **管理那份集合去了抽屉**（右上角那颗按钮 → `RequestTable.tsx` 的 `CollectionDrawer`）。
 *   抽屉占整个窗口的宽度，那张表终于摊得开。这是偶尔动一次的事。
 *
 * 于是三块读下来正好是一条开发动线：**填参数（这一栏）→ 看「结果」栏
 * （响应 / 声明 / 结构 / diff）→ 在「样本处理」栏决定这份样本与这组参数留不留**。
 *
 * ## 「批量 1 组」那颗按钮
 *
 * 它原先恒在、写着「批量 N 组」，而 N 常常是 1 —— 那时它做的事与「发送」**逐字相同**
 * （拿种子值打一发）。既看不懂又没有用。现在：只有 `combinations > 1` 才渲，
 * 文案是「连录 N 种组合」，而「组合」是什么写在它的 tooltip 里
 * （每个参数的种子取值 × 每个可选参数的「传 / 不传」）。
 */

import { Button, Chip, Label, Link, ListBox, ProgressBar, Select, Surface, Tooltip, Typography } from '@heroui/react'
import { useRequest } from 'ahooks'
import { lazy, Suspense, useState } from 'react'

import { type EndpointInfo, fetchRequests, type JsonValue, type PlatformInfo, type RequestEntry } from '../lib/api'
import { PANE, PANE_BODY, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { requestName } from '../lib/requestName'
import { ParamForm } from './ParamForm'

/**
 * 管理集合那个抽屉。`lazy()` 要 default 导出，而它是命名导出（测试直接 import 它）。
 *
 * 它把 `Table` 那 104 KB 关在自己的 chunk 里 —— 那是这一栏原先摆成 `Tabs` 的理由，
 * 换成抽屉之后这条收益一个字节都没丢：不进这一栏所在的入口包（入口预算只剩四万字节）。
 * 抽屉没打开时 chunk 照样会拉 —— 触发按钮（连那枚计数 Chip）住在 lazy 组件里、无条件
 * 渲染，chunk 随这一栏首帧就到；「没点开就不下载」那条今天只剩 `RepoDrawer` 里那两块面板。
 */
const CollectionDrawer = lazy(() => import('./RequestTable').then((module) => ({ default: module.CollectionDrawer })))

/**
 * 端点定义的源文件在 GitHub 上的地址。
 *
 * **为什么是 GitHub 而不是编辑器**：`vscode://file/…` 那种 scheme 要**绝对**路径，
 * 而 `endpoint.source` 是仓库相对路径（`server/endpoints.ts:36` 拼的），浏览器这一侧
 * 拿不到仓库根在哪。**`main` 而不是当前分支**：页面同样不知道本地 checkout 在哪个 ref 上 ——
 * 代价是点开看到的是 `main` 上那一份，换来的是一个真能点开的地址。
 */
const REPO_BLOB = 'https://github.com/ikenxuan/amagi/blob/main'

/**
 * 「定义在 …」那一行。
 *
 * `Link.Icon` 不给 children 时渲的是 `ExternalLinkIcon`（`@heroui/react` 的 `link.js:56`）——
 * 那正是「这一下会离开这一页」该有的提示；`rel="noreferrer"` 顺带把 referrer 与
 * `window.opener` 一起断掉。**只剩路径本身，「定义在」那三个字去了 `title`** ——
 * 这一行在版面最底下，人认得出那是一条源码路径。
 *
 * **`title` 挂在外面那个 `<p>` 上而不是 `Link` 上**：RAC 的 `Link` 过一道 `filterDOMProps`，
 * 而 `title` 不在那份白名单里 —— 写在它上面会被**静默丢掉**（渲出来的 `<a>` 上一个字都没有）。
 * `Typography.Paragraph` 是普通的 `dom.p`，属性原样透下去。
 */
export const SourceLink = ({ source }: { source: string }) => (
  <Typography.Paragraph size="xs" color="muted" truncate className="min-w-0" title={`定义在 ${source}`}>
    <Link className="font-mono text-xs" href={`${REPO_BLOB}/${source}`} target="_blank" rel="noreferrer">
      {source}
      <Link.Icon />
    </Link>
  </Typography.Paragraph>
)

/**
 * 批量录制那条进度条。**它是 indeterminate 的，而那不是偷懒。**
 *
 * `/api/record-batch` 是**一次 POST 回全部结果**（`server/index.ts` 那个循环连同每组之间
 * 1.5 秒的等待全在 server 一侧跑完），浏览器这一侧在那整段时间里收不到任何「第几组」——
 * `lib/api.ts` 那里就是一个 `await`。画一条按时间自己爬的条子等于把「我不知道」渲成
 * 「我知道」：它会在真的卡住时继续爬，也会在还剩 20 组时抵达头。
 *
 * 能诚实说出口的是两件事，都在这上面：**一共几组**与**这事还在跑**（那正是 indeterminate
 * 的语义）。HeroUI 这一档也真的是 indeterminate：不给 `value` 时 RAC 不渲 `aria-valuenow`，
 * CSS 那条 `&:not([aria-valuenow])` 才把动画挂上（`@heroui/styles` 的 `progress-bar.css:52-61`）。
 * 读屏听到的是「忙，进度未知」而不是一个编出来的百分比。`prefers-reduced-motion` 不用在这儿补 ——
 * 那条动画自带 `motion-reduce:animate-none`。
 */
export const BatchProgress = ({ combinations }: { combinations: number }) => (
  <ProgressBar isIndeterminate size="sm" aria-label={`正在批量录制 ${combinations} 组`}>
    <ProgressBar.Output>{combinations} 组…</ProgressBar.Output>
    <ProgressBar.Track>
      <ProgressBar.Fill />
    </ProgressBar.Track>
  </ProgressBar>
)

export interface RequestPaneProps {
  platform: PlatformInfo
  endpoint: EndpointInfo
  /** 有**任何**动作在跑。跨动作的互斥要留着，理由见 `ParamFormProps.disabled` */
  busy: boolean
  /** 在跑的恰好是「发送」那一发 */
  sending: boolean
  onSend: (params: Record<string, JsonValue>) => void
  onBatch: () => void
  batchLoading: boolean
  /** 「集合」那页重读的计数器（入库过之后 +1） */
  requestsRevision: number
}

const TITLE_ID = 'pane-request-title'
const FORM_ID = 'request-params'

/**
 * 「集合」里被载入的那一条。
 *
 * `hash`（`paramsHash`）不只是显示用的 —— 它进 `ParamForm` 的 `key`，于是**换一条就换一批控件**，
 * 新的 `defaultValue` 才吃得进去（非受控控件只在挂载时读一次 default）。
 * `undefined` = 没载入过，那时预填走的是 `seeds`（老行为）。
 */
interface LoadedRequest {
  hash: string
  params: Record<string, JsonValue>
}

/**
 * 「用哪一组参数」那个下拉。
 *
 * **`种子默认值` 是一个真的选项**，不是「清空选择」—— 它就是这个表单的默认状态
 * （每个参数取 `corpus/seeds.json` 里的第一个值）。做成一个具名选项之后，
 * 「我现在用的是哪一组」在任何时刻都读得出来，而不是「没选中 = 大概是默认吧」。
 *
 * **身份是 `paramsHash`，名字是说明**（`lib/requestName.ts`：撞名才追加哈希消歧）。
 * 收起来的那颗按钮上只放那个名字 —— 一栏 28rem 宽，两行塞不进一颗按钮
 * （`Select.Value` 那个 render prop 与 `ComparePanel.tsx` 里那两处同一条理由）。
 */
const ABSENT = '\0seeds'

export const ExamplePicker = ({
  examples,
  loadedHash,
  onPick
}: {
  examples: readonly RequestEntry[]
  loadedHash?: string
  onPick: (next: LoadedRequest | undefined) => void
}) => (
  <Select
    className="w-full"
    selectedKey={loadedHash ?? ABSENT}
    onSelectionChange={(key) => {
      const found = examples.find((entry) => entry.paramsHash === String(key))
      onPick(found === undefined ? undefined : { hash: found.paramsHash, params: found.params })
    }}
  >
    <Label>
      用哪一组参数
      <span className="text-muted ml-1 text-xs">进 git 的那 {examples.length} 组</span>
    </Label>
    <Select.Trigger>
      <Select.Value>{({ isPlaceholder, defaultChildren, selectedText }) => (isPlaceholder ? defaultChildren : selectedText)}</Select.Value>
      <Select.Indicator />
    </Select.Trigger>
    <Select.Popover>
      <ListBox>
        <ListBox.Item id={ABSENT} textValue="种子默认值">
          <div className="flex min-w-0 flex-col">
            <span className="text-sm">种子默认值</span>
            <span className="text-muted text-xs">每个参数取 corpus/seeds.json 里的第一个值</span>
          </div>
          <ListBox.ItemIndicator />
        </ListBox.Item>
        {examples.map((entry) => {
          const name = requestName(entry, examples)
          return (
            <ListBox.Item key={entry.paramsHash} id={entry.paramsHash} textValue={name}>
              <div className="flex min-w-0 flex-col">
                <span className="text-sm">{name}</span>
                {/* 撞名时 `name` 里已经带着哈希；不撞时给一个能对上 `.requests.json` 的证据行 */}
                <span className="text-muted font-mono text-xs">{entry.paramsHash}</span>
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )
        })}
      </ListBox>
    </Select.Popover>
  </Select>
)

/**
 * 抽屉那颗触发按钮**还在路上时**占的位。
 *
 * 与 `App.tsx` 里 `CookieTriggerFallback` 同一条理由：它待的地方是标题行那个靠右的位置，
 * 缺一颗按钮的话左边那枚参数计数 Chip 会横着挪一下再挪回来。所以这里渲的是**同一颗按钮**
 * 的 disabled 版本 —— 宽高由构造相同，没有可跳的余地。
 *
 * **真身在 `RequestTable.tsx` 里抄了一份**，而那是刻意的：从这里 export 出去会让
 * `RequestPane → lazy(RequestTable) → RequestPane` 成环，而 `pnpm deps:check`（dpdm）
 * 会为循环依赖置非零退出码 —— 那道门禁只拦一件事，就是这个。
 * 抄错了的代价只是「chunk 落地时那颗按钮闪一下」，与 `CookieTriggerFallback` 同一档取舍。
 */
const CollectionTrigger = ({ count, isDisabled = false }: { count: number; isDisabled?: boolean }) => (
  <Button className="ml-auto shrink-0" size="sm" variant="tertiary" isDisabled={isDisabled}>
    集合
    {count > 0 && (
      <Chip size="sm" variant="soft">
        <Chip.Label className="tabular-nums">{count}</Chip.Label>
      </Chip>
    )}
  </Button>
)

export const RequestPane = ({ platform, endpoint, busy, sending, onSend, onBatch, batchLoading, requestsRevision }: RequestPaneProps) => {
  const paramCount = Object.keys(endpoint.schema.properties ?? {}).length
  const [loaded, setLoaded] = useState<LoadedRequest | undefined>(undefined)

  /**
   * 这个端点进 git 的那几组参数。**在「请求」栏就读**，不等人点开「集合」抽屉。
   *
   * 代价是切端点时多一次 `POST /api/requests`（server 侧读一个小 JSON 文件）。
   * 换来的是那几组参数变成**表单顶上一个下拉**，而不是去翻那张五列、最窄 52rem 的表 ——
   * 后者塞进 28rem 的栏只能横向滚着看，那正是它原先难懂的一半原因。
   */
  const collection = useRequest(() => fetchRequests({ platform: platform.platform, endpoint: endpoint.name }), {
    refreshDeps: [platform.platform, endpoint.name, requestsRevision]
  })
  const examples = collection.data?.collection.requests ?? []

  return (
    <Surface className={PANE} aria-labelledby={TITLE_ID} render={(props) => <section {...props} />}>
      <div className={PANE_HEAD}>
        <h2 className={PANE_TITLE} id={TITLE_ID}>
          请求
        </h2>
        {/* **0 个参数时不渲那枚 Chip。** 61 个端点里有 7 个一个参数都没有
            （`packages/core/openapi.json` 数得出来），而「参数 0」是句废话 */}
        {paramCount > 0 && (
          <Chip size="sm" variant="soft">
            <Chip.Label className="tabular-nums">{paramCount} 个参数</Chip.Label>
          </Chip>
        )}
        {/* 管理那份集合的入口靠右。**它是抽屉而不是这一栏里的一页** —— 那张表有五列
            （记录 / 参数 / 判定 / 形状指纹 / 操作，最窄 52rem），28rem 的栏装不下、塞进来
            只能横向滚。抽屉从右边推出来、占整个窗口的宽度，那张表才读得完 */}
        <Suspense fallback={<CollectionTrigger count={examples.length} isDisabled />}>
          <CollectionDrawer
            platform={platform.platform}
            endpoint={endpoint.name}
            count={examples.length}
            revision={requestsRevision}
            onLoad={(entry) => setLoaded({ hash: entry.paramsHash, params: entry.params })}
            onChanged={() => void collection.refresh()}
          />
        </Suspense>
      </div>

      <div className={PANE_BODY}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button type="submit" form={FORM_ID} isPending={sending} isDisabled={busy && !sending}>
            发送
          </Button>
          <Button type="reset" form={FORM_ID} variant="secondary" isDisabled={busy}>
            重置
          </Button>
          {!endpoint.computed && endpoint.combinations > 1 && (
            <Tooltip delay={300}>
              <Button
                size="sm"
                variant="tertiary"
                isDisabled={busy || endpoint.unseeded.length > 0}
                isPending={batchLoading}
                onPress={onBatch}
              >
                连录 {endpoint.combinations} 种组合
              </Button>
              <Tooltip.Content>
                <p className="max-w-xs">
                  {endpoint.unseeded.length > 0
                    ? `缺少参数：${endpoint.unseeded.join(' / ')} 还没有可用取值 —— 在 corpus/seeds.json 里各给它一个真实值`
                    : `「组合」= 每个参数在 corpus/seeds.json 里的取值，乘上每个可选参数的「传 / 不传」。这个端点一共 ${endpoint.combinations} 种，逐个各录一发（每发之间隔 1.5 秒，给平台风控留的余量），结果都进左下角那份「最近」等你处理。`}
                </p>
              </Tooltip.Content>
            </Tooltip>
          )}
        </div>

        {/* 缺 cookie 剩一行。**它直接决定「这一发能不能打」**，所以留在版面上；
            「去哪儿填、为什么那些端点会失败」进 tooltip */}
        {!platform.hasCookie && !endpoint.computed && (
          <Tooltip delay={300}>
            <p className="text-warning-soft-foreground w-fit cursor-help text-xs underline decoration-dotted">
              没有 {platform.platform} 的 cookie
            </p>
            <Tooltip.Content>
              <p className="max-w-xs">
                右上角「Cookie」里填一条，写进 .env 并立刻生效。没 cookie 的端点大多会拿回登录页或风控页，那些会被入库判定拒掉。
              </p>
            </Tooltip.Content>
          </Tooltip>
        )}

        {/* **本地计算的端点先说清楚**，别等人按了「发送」再从一段 `null` 里猜。
            这一行说的是「这一发不会有网络请求、也不会有样本」，而它同时解释了
            下面那两颗按钮为什么不在 —— 判据是 `EndpointInfo.computed`（那边写着为什么
            它必须是端点元数据而不是从响应里猜）。cookie 那一行在这一档不渲：
            这种端点压根不带 cookie 出门，缺不缺都不影响它 */}
        {endpoint.computed && (
          <Tooltip delay={300}>
            <p className="text-muted w-fit cursor-help text-xs underline decoration-dotted">本地计算，不打网络请求</p>
            <Tooltip.Content>
              <p className="max-w-xs">
                这个端点的结果由 core 里的 `compute` 步骤算出来（bv ⇄ av 号互转就是这种），一发请求都不发。
                「发送」照样能按、算出来的值与它的类型声明照样显示，但**不会有样本可入库** —— 它的形状由本仓库的 TS
                完全决定，没有平台漂移可抓。所以「录全部组合」在这一档不出现。
              </p>
            </Tooltip.Content>
          </Tooltip>
        )}

        {/* 「用哪一组参数」。**只在真有记录时才出现** —— 61 个端点里绝大多数一条都没有，
            对它们渲一个只有「种子默认值」一项的下拉是纯噪音 */}
        {examples.length > 0 && <ExamplePicker examples={examples} loadedHash={loaded?.hash} onPick={setLoaded} />}

        <ParamForm
          // **`key` 必须带上端点名。** 控件是非受控的（用 FormData 取值），不换 key 时
          // React 会复用同一批 input —— 于是切到另一个共享同名参数的端点（`aweme_id`
          // 在 6 个抖音端点里都有）时，上一个端点的值留在框里，新端点的种子被忽略。
          //
          // **选中的那条示例也在 key 里**，同一条理由：换一组预填值就得换一批控件，
          // 否则 `defaultValue` 变了而框里还是上一组的值（非受控控件只在挂载时读一次）
          key={`${platform.platform}/${endpoint.name}/${loaded?.hash ?? ''}`}
          endpoint={endpoint}
          formId={FORM_ID}
          preset={loaded?.params}
          onSubmit={onSend}
        />

        {/* 批量在跑时才有这一条。按钮上那个 `isPending` 说的是「这颗按钮忙着」，
            而这条说的是「这一整批还在跑」—— 24 组 × 1.5 秒那个量级的事，小转圈撑不住 */}
        {batchLoading && <BatchProgress combinations={endpoint.combinations} />}

        <SourceLink source={endpoint.source} />
      </div>
    </Surface>
  )
}
