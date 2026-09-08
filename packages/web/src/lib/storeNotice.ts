/**
 * 「样本存了，那参数进 git 了吗」—— `POST /api/store` 回来之后要说的那句话。
 *
 * **界面原先一个字都没说。** `/api/store` 回五个字段（`StoreResult`：`written`、
 * `requestsAppended`、`requestsPath?`、`requestsReplaced?`、`requestsIssues`），而 `App` 原先
 * 只读 `written` —— 于是「样本存了、但请求集合一条都没加」，也就是 PRD 二 ① 那条核心诉求
 * （参数进 git）没落地的那一格，在版面上无声无息。这是这一轮第三次同一类问题
 * （前两次：`GeneratedPanel` 从未挂载、`payloadHighlight` 被丢弃）。
 *
 * ## 这一层为什么在 React 外面
 *
 * 同 `lib/theme.ts` 那条先例（判定从组件里抽出来，再测那一层）：
 *
 * - 判据本来就是纯的 ——「给定一份 `StoreResult` 该说什么」，没有一个字取决于界面状态。
 * - `App` 整个渲不出来：它一挂载就发两拨请求（`fetchEndpoints` / `fetchCookies`），
 *   而 vitest 跑在 node 环境、effect 压根不跑（同 `requestTable.test.ts:8-10` 那条判据）。
 * - 也不能就写在 `App.tsx` 里导出：从一份导出组件的 `.tsx` 里再导出一个函数，
 *   oxlint 的 `react/only-export-components` 会当场报一条（fast refresh 只在整份文件
 *   全是组件时管用）—— 实测过，就是那一条 warning。
 *
 * ## 三档语气，判据各是什么
 *
 * | 这一档 | 什么时候 | `variant` | 人要做的事 |
 * |---|---|---|---|
 * | 参数也写进 git | `requestsAppended` | `success` | 没有 |
 * | 只留样本 | 没给 `id` | `default` | 没有 —— 这是那颗按钮明确承诺的结果 |
 * | 有东西要你处理 | 凭证命中 / 盘上那份读不了 | `warning` | 改参数 / 修文件，然后再入库一次 |
 *
 * **只留样本那档刻意不是红的。** 人按的是「只留样本」，server 不碰请求集合正是成功结果。
 *
 * **第三档也刻意不是 `danger`。** 那一档里样本已经安全落盘、集合一个字节都没动
 * （凭证没进 git，那正是校验器想要的结果），没有任何东西坏掉 —— 要的只是人改一处再来一次。
 * `danger` 留给真的失败：那条路上 `useRequest` 会 reject，顶部那条红条自己会亮
 * （`App.tsx` 的 `shell.onError`）。
 *
 * ## 三档都把 `requestsIssues` 原样念出来
 *
 * 分档只决定**标题与语气**，理由永远是 server 那几句原话。于是下面那个关键词认不出来的代价
 * 只是标题降一格，不会吞掉任何信息 —— 而「吞掉信息」正是这个文件在修的那件事。
 * 顺带：那几句原话里带着仓库相对路径（`corpus/<平台>/<端点>.requests.json`，
 * `server/storage.ts:402` 的 `label` 与 `appendRequest` 的 `${path}：` 前缀），
 * 所以「有东西要你处理」那两档里人照样有一个能粘进 `git status` 的路径 ——
 * 尽管 `requestsPath` 按契约只有真追加了才有。
 */

import type { StoreResult } from '../../shared/contract'

/**
 * server 那句「像凭证」的指纹（`packages/typegen/src/requests.ts:248`）。
 *
 * **按文案分档是这里唯一的选择**：`StoreResult` 上没有理由码，而契约与 server 都不在这一轮的
 * 改动面内。代价已经在文件头交代过 —— 认不出来只是少一句更准的标题，理由照样原样念。
 * `test/appStore.test.ts` 拿**真的** `appendRequest` 产出来的那句话喂进来，所以两边走散会红。
 */
const CREDENTIAL_HIT = '像凭证'

/** 入库之后关于「请求集合」的说法。三个落点各不相同，见 {@link storeNotice} 的返回值注释 */
export interface StoreNotice {
  /** HeroUI toast 的 `variant`。**`default` 是「只留样本正常完成」那一档**，理由见文件头 */
  variant: 'success' | 'default' | 'warning'
  /** toast 的标题。一句话说完「样本怎么了、参数怎么了」这两件事 */
  title: string
  /** toast 的 description，**一行一句**（调用方负责让它真的分行） */
  lines: string[]
  /**
   * 「最近」那一条上、以及「结果」栏动作条上那句**不会消失**的话（`ResultActionsProps.settled`）。
   *
   * toast 会走，而「参数没进 git」是一个持续的状态 —— 所以这一句必须留在版面上。
   * 判据见 `App.tsx` 里 `store` 那段上面的注释。
   */
  settled: string
}

/**
 * 该说什么。
 *
 * @param sharedParams 这次是否选择了 `sample-and-params`。显式模式能把「只留样本」与
 *   「共享参数但写入失败」分开，不再靠可变的人类 id 猜。
 */
export const storeNotice = (result: StoreResult, sharedParams: boolean | string | undefined): StoreNotice => {
  const sample = `样本：${result.written}`
  /**
   * 契约说 `requestsAppended: false` 时 `requestsIssues` 必定非空。真空了是契约破了，
   * **那也得说出来** —— 显示一片空白正是这个文件在修的那件事
   */
  const reasons =
    result.requestsIssues.length > 0
      ? result.requestsIssues
      : ['请求集合没动，而 server 没说为什么 —— 按契约 StoreResult.requestsIssues 这时该是非空的']

  if (result.requestsAppended) {
    // `requestsPath` 按契约**只有真追加了才有**，所以这一档里它必定在；兜底那句只为不显示 `undefined`
    const path = result.requestsPath ?? '请求集合（server 没回路径，按契约这时该有）'
    if (result.requestsReplaced === true) {
      return {
        variant: 'success',
        title: '样本已写入；参数换掉了同参数的那条旧记录',
        // 文案里不写 markdown：toast 的 description 是纯文本节点，`**` 与反引号会原样显示出来
        lines: [sample, `请求集合：${path}`, '同参数的那条被整条替换了 —— 集合里还是一条，不是新增（幂等性判据是参数哈希）'],
        settled: `已写入 ${result.written}；参数替换了 ${path} 里同参数的那条`
      }
    }
    return {
      variant: 'success',
      title: '样本与参数都进了仓库',
      lines: [sample, `请求集合：${path}（新增一条）`, '两个路径都能粘进 git status'],
      settled: `已写入 ${result.written}；参数记进了 ${path}`
    }
  }

  // 显式 sample-only ⇒ server 压根没碰请求集合，属于正常完成。
  if (sharedParams !== true && (typeof sharedParams !== 'string' || sharedParams.trim() === '')) {
    return {
      variant: 'default',
      title: '已只留样本；参数没有进 git',
      lines: [
        sample,
        '这正是「只留样本」的结果，不是失败。下次录制时，如果也想让其他贡献者重放这组参数，先展开「把这组参数也记进 git」再提交。'
      ],
      settled: `已写入 ${result.written}；只留样本，参数没进 git`
    }
  }

  if (reasons.some((reason) => reason.includes(CREDENTIAL_HIT))) {
    return {
      variant: 'warning',
      title: '样本已写入；参数里有像凭证的键，那一条整条没收',
      lines: [
        sample,
        ...reasons,
        '集合一个字节都没动 —— 这个文件进 git，凭证进去就收不回来了。把那个键从参数里去掉（凭证走 .env），再入库一次'
      ],
      settled: `已写入 ${result.written}；参数没进请求集合 —— 有像凭证的键，整条没收`
    }
  }

  return {
    variant: 'warning',
    title: '样本已写入；请求集合那个文件要你先修一下',
    lines: [
      sample,
      ...reasons,
      '集合要么整条写进去、要么一个字节都不动 —— 上面指名的那个文件修好之后，再入库一次（样本已经在盘上，不用重录）'
    ],
    settled: `已写入 ${result.written}；参数没进请求集合 —— 集合文件要先修好`
  }
}
