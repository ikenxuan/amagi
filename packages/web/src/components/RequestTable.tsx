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
 * 表上还说着 PRD 3.2 那句 **「同指纹 ⇒ 建议合并」**（`shape.ts` 文件头点名它落在这一侧）：
 * `shapeKey` 相同的那几条归一组、组内互相点名。**但措辞只走到「这组参数没带来新形状」为止** ——
 * 为什么不能说成「重复」见 {@link SameShapeNote}，为什么没有一颗「合并」按钮见
 * {@link RequestCollectionTable} 里那段。
 *
 * 数据自己拉（`useRequest` 自动跑一次、`refreshDeps` 跟着端点变，同 `GeneratedPanel.tsx:11-12`
 * 那条约定），于是接进任何地方都是一行，不用调用方再管一份 loading 与错误态。
 */

import { Alert, AlertDialog, Button, Chip, EmptyState, Table } from '@heroui/react'
import { useRequest } from 'ahooks'

import { fetchRequests, type JsonValue, removeRequest, type RequestEntry, type RequestVerdict } from '../lib/api'
import { PANE_INNER } from '../lib/pane'

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

/** 一组同形状的记录 */
interface ShapeGroup {
  /** 指纹本身 —— 这一组的身份，也是「为什么是一组」的证据，所以要渲出来 */
  key: string
  /** 扫一眼用的短名（`A` / `B` / …）。为什么需要它见 {@link sameShapeGroups} */
  name: string
  /** 组里所有记录的 id，按它们在集合文件里出现的顺序 */
  ids: readonly string[]
}

/** 组名。26 组以上退化成序号 —— 一个端点的集合是几十条的量级，这条分支基本上是给「不会崩」用的 */
const GROUP_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * 按 `shapeKey` 分组，**只留 ≥2 条的那几组**。这块面板要说的那句话就靠它。
 *
 * 判据是 PRD 3.2 那条：**两条记录同指纹 ⇒ 类型逐字节相同 ⇒ 界面上可以直接建议合并**。
 * 反过来不成立，那是产侧有意选的方向（`packages/typegen/src/shape.ts` 文件头：「不同指纹
 * 不保证类型真的不同，那只是错过一次合并建议」）—— 所以这里**说得出「这几条同形状」，
 * 说不出「这两条形状不同」**，界面上也就没有任何一句话反向断言。
 *
 * 三条边界，每一条都对着一个「空着 / 灰着会说谎」的坑：
 *
 * - **缺 `shapeKey` 的一条都不进来。** 空着不代表形状不同，只代表这条记录手上没有指纹
 *   （被拒的那几条压根没样本可算；`ok` 而空着的是产侧落地之前录的、或人手写进文件的）。
 *   把它们凑成一组等于拿「都不知道」当「都一样」—— 而那正好是这个字段最容易被读错的方向
 *   （`shared/contract.ts` 在 `shapeKey` 上为同一件事写过一遍：空着说的是「还没人算过」）。
 * - **按整个字符串比，不校验格式。** `sk1-` 里那个版本号就是为这一刻放进去的（`shape.ts`
 *   文件头 ②）：判据一改前缀就换，于是新旧算法算出来的指纹永远不相等 —— 跨版本误判不用这里管。
 *   而「像不像一个指纹」是 `requests.ts` 校验器的活（它现在只卡非空字符串，因为产侧当时还没落地），
 *   在这儿再写一条正则等于把那个格式变成两处真相。
 * - **不按 `verdict` 过滤。** 产侧压根不过滤（`shapeKeyOfSamples` 看的是 `normalized ?? raw`，
 *   「`code` 非 0 时 `data` 长什么样」正是这个文件最该留的那类记录），所以一条 `reject:*`
 *   若真带着指纹，它与别人同形状这件事照样是真的。
 *
 * 短名（`A` / `B`）不是装饰：指纹是 16 位十六进制，一列里两串只差中间一位的话肉眼对不出来，
 * 而「这两行是一组」恰恰是这块面板唯一要传达的关系。它同时是**不靠颜色**的那一半 ——
 * 组的身份是一个字母，不是一种底色（WCAG 1.4.1，同 {@link VERDICT} 那条）。
 */
const sameShapeGroups = (requests: readonly RequestEntry[]): ShapeGroup[] => {
  const byKey = new Map<string, string[]>()
  for (const entry of requests) {
    if (entry.shapeKey === undefined) continue
    const ids = byKey.get(entry.shapeKey)
    if (ids === undefined) byKey.set(entry.shapeKey, [entry.id])
    else ids.push(entry.id)
  }
  // `Map` 是插入序，所以 `A` 永远是「第一个成员出现得最早」那一组 —— 组名跟着文件里的顺序走，
  // 不跟着 `shapeKey` 的字典序走（后者与人读表的顺序无关）
  return [...byKey]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids], index) => ({ key, ids, name: GROUP_NAMES[index] ?? `${index + 1}` }))
}

/**
 * 行里那句「另外几条是谁」。**3 条以上只点前两个名字**，剩下的交给表格上面那份完整清单：
 * 一组 6 条时每行都把另外 5 个 id 列一遍，这一列就没法读了 —— 而 `name` 那个短名已经把
 * 这一行接到了上面的清单上，所以行内不必自成完整信息。
 */
const othersLine = (group: ShapeGroup, id: string): string => {
  const others = group.ids.filter((other) => other !== id)
  if (others.length <= 2) return `与 ${others.join('、')} 同形状`
  return `与 ${others.slice(0, 2).join('、')} 等 ${others.length} 条同形状`
}

/**
 * 行里那句「这条与谁同形状」。**没有同形状的时候整个不渲染** —— 这一格已经有指纹与样本两行，
 * 再摆一句「没有同形状的」等于给几乎每一行都加一句废话（而「不同指纹」本来也不是一条结论，
 * 见 {@link sameShapeGroups}）。
 *
 * 措辞刻意落在**「没带来新形状」**这一档，不是「重复 / 可以删」那一档 —— 判据在
 * `packages/typegen/src/shape.ts` 文件头最后一条：默认不收窄字面量，所以判别式取值不同的两组
 * 也可能渲出同一份类型，那时两份样本在判别联合里是不同成员。而「带来了新形状」正是录制那一侧
 * 已经在用的说法（`ResponsePane` 里 `shapeChanged` 那颗「新形状」chip），两处同一套词，不发明第二套。
 *
 * 三样一起给：`≡` 只给扫一眼用所以挂 `aria-hidden`，中文说法与另外那几条的 id 都是文本，
 * 指纹原串在上面一行 —— 规矩是 `ComparePanel` 那四类差异定的。这里干脆一点颜色都不用：
 * `variant="soft"` 是中性的那一档（同 `ResponsePane` 标题行上那些计数 chip），而组的身份是一个字母。
 *
 * `aria-label` 说的是**结论**而不是代号：读屏念「同形状 A」只是个记号，
 * 「与另外 2 条渲出来的类型逐字节相同」才是它的意思。
 */
const SameShapeNote = ({ group, id }: { group?: ShapeGroup; id: string }) => {
  if (group === undefined) return null
  return (
    <div className="flex min-w-0 flex-col items-start gap-0.5 pt-0.5">
      <Chip
        size="sm"
        variant="soft"
        aria-label={`同形状 ${group.name}：这一条与另外 ${group.ids.length - 1} 条渲出来的类型逐字节相同，这组参数没带来新形状`}
      >
        <Chip.Label>
          <span aria-hidden="true" className="mr-1 font-mono">
            ≡
          </span>
          同形状 {group.name}
        </Chip.Label>
      </Chip>
      <span className="text-xs leading-relaxed">
        {othersLine(group, id)} —— <b>这组参数没带来新形状</b>
      </span>
    </div>
  )
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
 *
 * **同形状那句提醒也摆在这里**（`sameShape`），因为这颗按钮是「同形状」这个信息唯一能造成
 * 破坏的地方：表格里读到「这两条同形状」，顺手就会想留一条 —— 而那恰好会毁掉阶段 6
 * 「另存 + 联合导出」的前提（不同参数组各留一份才产得出判别联合）。判据同上一条：
 * **删掉之后还能不能重新得到**，而这里的答案是「重录一次也换不回那份证据」。
 */
const RemoveButton = ({
  entry,
  sameShape,
  onRemove,
  isRemoving
}: {
  entry: RequestEntry
  /** 这条记录所在的那组同形状记录，没有就是没有同形状的 */
  sameShape?: ShapeGroup
  onRemove: (id: string) => void
  isRemoving: boolean
}) => (
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
                {sameShape !== undefined && (
                  <p className="text-sm leading-relaxed">
                    这一条属于<b>同形状 {sameShape.name}</b>（<span className="tabular-nums">{sameShape.ids.length}</span>{' '}
                    条渲出来的类型逐字节相同）。
                    <b>那不是「只留一份就够」的依据</b>：默认不收窄字面量（<code className="font-mono">type: 1</code> 与{' '}
                    <code className="font-mono">type: 8</code> 都渲成 <code className="font-mono">number</code>
                    ），所以判别式取值不同的两组参数也可能渲出同一份类型 —— 那时这两组在判别联合里是<b>不同成员</b>
                    ，少一条就少一个成员的证据。
                  </p>
                )}
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
 * 表格本体。**从数据拉取里拆出来是为了能真渲一遍**（同 `Result.tsx` 里 `PayloadPanel` 那条理由）：
 * `useRequest` 在 `renderToStaticMarkup` 下不会跑（effect 不执行），从外面渲带取数的那一层
 * 只能渲到「正在读…」那一帧，四种 verdict 一条都到不了。
 */
export const RequestCollectionTable = ({ requests, endpointLabel, onRemove, isRemoving = false }: RequestCollectionTableProps) => {
  const groups = sameShapeGroups(requests)
  /** id → 它在哪一组。分组算一次，行里只查表 */
  const groupOf = new Map(groups.flatMap((group) => group.ids.map((id) => [id, group] as const)))

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {groups.length > 0 && (
        /* 「同指纹 ⇒ 建议合并」那句话的完整版摆在**表格上面**，行里只留一句短的。
           两处分工：这里说得出「一共几组、每组都有谁」（一组 5 条时行内只点得出前两个名字），
           而那句**必须只说一次**的提醒（同形状 ≠ 其中一条不必留）挤在每一行里会变成噪音，
           读三遍之后就没人再读它了。 */
        <div className="border-border flex min-w-0 flex-col gap-1 rounded-xl border p-3">
          <p className="text-sm leading-relaxed">
            这个端点的集合里有 <span className="tabular-nums">{groups.length}</span> 组记录<b>同形状</b>：同一个{' '}
            <code className="font-mono">shapeKey</code> 说的是<b>这几条渲出来的类型逐字节相同</b>
            ，也就是说这几组参数<b>没带来新形状</b>，可以考虑合并成一份。
          </p>
          <ul className="flex min-w-0 flex-col gap-0.5 text-xs">
            {groups.map((group) => (
              <li key={group.key} className="min-w-0">
                {/* 记号只给扫一眼用，读屏念一串 `≡` 是噪音 —— 同 `ComparePanel` 那四类差异的 `mark`。
                    这一行不靠它也说得全：组名、条数、id、指纹原串都是文本 */}
                <span aria-hidden="true" className="mr-1 font-mono">
                  ≡
                </span>
                同形状 {group.name}（<span className="tabular-nums">{group.ids.length}</span> 条）：
                <span className="font-mono">{group.ids.join('、')}</span>
                {/* 指纹原串照渲：它是「为什么这几条是一组」的**证据**，也是人去 `.requests.json`
                    里对着找的那个值 —— 同这张表对 `verdict` 与 `sampleHash` 的处理 */}
                <span className="text-muted font-mono"> · {group.key}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted text-xs leading-relaxed">
            准确的说法到<b>「没带来新形状」</b>为止 —— 至于要不要把其中一条从集合里去掉，那要人拍，而默认答案是留着：默认不收窄字面量（
            <code className="font-mono">type: 1</code> 与 <code className="font-mono">type: 8</code> 都渲成{' '}
            <code className="font-mono">number</code>），所以<b>判别式取值不同</b>
            的两组参数也可能渲出同一份类型；那时这两份样本在判别联合里是
            <b>不同成员</b>，只留一份就少一个成员的证据 —— PRD 阶段 6 的「另存 + 联合导出」正是靠不同参数组各留一份来产那个联合。
          </p>
          <p className="text-muted text-xs leading-relaxed">
            这块面板因此<b>只说事实，不给「合并」按钮</b>：合并这个动作今天还不存在（<code className="font-mono">POST /api/generate</code>{' '}
            的 <code className="font-mono">{`mode: 'merge' | 'separate'`}</code> 是阶段 6），一颗点了没反应的按钮比没有按钮更糟。
          </p>
        </div>
      )}
      {requests.some((entry) => entry.shapeKey === undefined) && (
        <p className="text-muted text-xs leading-relaxed">
          「形状指纹」那列写着「还没算」的那几条，<b>空着不代表形状不同</b> —— 只代表这条记录手上没有指纹：被拒的那几条压根没有样本可算，
          <code className="font-mono">ok</code> 而空着的是产侧落地之前录的、或者人手写进文件的那几条。所以「同形状」这个判断只在
          <b>两边都有指纹</b>时才做得出，空着的不会被凑进任何一组（拿「都不知道」当「都一样」是这个字段最容易被读错的方向）——
          重新入库一次就当场算上了。
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
                      {/* 「同指纹」这句话就挂在指纹旁边 —— 它是对这一格那串十六进制的解释，
                          摆到别的列去就得再说一遍「说的是形状指纹」 */}
                      <SameShapeNote group={groupOf.get(entry.id)} id={entry.id} />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <RemoveButton entry={entry} sameShape={groupOf.get(entry.id)} onRemove={onRemove} isRemoving={isRemoving} />
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
    <section className={PANE_INNER}>
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
