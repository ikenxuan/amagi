/**
 * `Dynamic/` 下**现有的 6 个 `DYNAMIC_TYPE_*`** 反推出来的 6 份样本 —— 判别式发现（PRD 5.1）的实测用例。
 *
 * 做法照 `dynamic-forward-av.ts`：结构精简，但「哪个取值下有哪些键」逐条对着
 * `packages/core/src/types/ReturnDataType/Bilibili/Dynamic/<取值>/<取值>_V0.ts` 核过 ——
 * 判别式判据认的正是这个（「不同取值对应的其余键集合不同」），所以这张表必须保真：
 *
 * | 取值 | `basic.jump_url` | `module_author.decoration_card` | `module_dynamic.additional` | `.desc` | `.major` | `.topic` |
 * |---|---|---|---|---|---|---|
 * | `DYNAMIC_TYPE_AV` | 没有 | 没有 | `null` | 对象 | `archive` | `null` |
 * | `DYNAMIC_TYPE_DRAW` | 有 | 有 | `reserve` | `null` | `opus`（`pics` 是对象数组） | 对象 |
 * | `DYNAMIC_TYPE_WORD` | 有 | 有 | `vote` | `null` | `opus`（`pics` 是字符串数组） | `null` |
 * | `DYNAMIC_TYPE_LIVE_RCMD` | 没有 | 有 | `null` | `null` | `live_rcmd` | `null` |
 * | `DYNAMIC_TYPE_ARTICLE` | 有 | 没有 | `null` | `null` | `opus`（`title` 是字符串） | `null` |
 * | `DYNAMIC_TYPE_FORWARD` | 没有 | 没有 | `null` | 对象 | `null` | `null` |
 *
 * 转发那份还多一个 `data.item.orig`（被转发的那条动态，本身又是一条完整动态）——
 * 5.2 的递归就是它：`orig` 里的子树与外层结构等价的部分要复用类型，不能重新展开。
 *
 * 一处要留意：`DYNAMIC_TYPE_FORWARD` 那份的 `data.item.type` 写的是 `DYNAMIC_TYPE_FORWARD`，
 * 而被反推的叶子文件 `Forward/DYNAMIC_TYPE_AV/DYNAMIC_TYPE_AV_V0.ts` 里写的是 `DynamicType.AV`
 * —— 转发壳子的 `item.type` 由 `DYNAMIC_TYPE_FORWARD/index.ts` 事后覆写成 `FORWARD`，
 * 而平台真实响应里就是 `DYNAMIC_TYPE_FORWARD`。样本忠于**响应**，不是忠于那个待修的手写类型。
 */

import type { JsonValue } from '../../src/types'

// 一律写 `: JsonValue` 类型标注而不是 `satisfies JsonValue`，理由见 dynamic-forward-av.ts 的同一处注释

/** 6 份样本里一模一样 —— 手写类型里被重复声明成 PurpleLikeIcon / FluffyLikeIcon，合并器该只产一份 */
const likeIcon: JsonValue = { action_url: '', end_url: '', id: 0, start_url: '' }

const vip: JsonValue = { avatar_subscript: 1, due_date: 1800000000, nickname_color: '#FB7299', status: 1, theme_type: 0, type: 2 }

const pendant: JsonValue = { expire: 0, image: '', n_pid: 0, name: '', pid: 0 }

/** 头像的 fallback 图层。结构在 6 个取值下都一样，只是数量不同 */
const avatarLayer: JsonValue = {
  general_spec: {
    pos_spec: { axis_x: 0.9, axis_y: 0.9, coordinate_pos: 2 },
    render_spec: { opacity: 1 },
    size_spec: { height: 1.8, width: 1.8 }
  },
  layer_config: { is_critical: true, tags: { AVATAR_LAYER: {}, GENERAL_CFG: { config_type: 1 } } },
  resource: { res_image: { image_src: { local: 1, src_type: 1 } }, res_type: 3 },
  visible: true
}

const avatar = (mid: string): JsonValue => ({
  container_size: { height: 1.35, width: 1.35 },
  fallback_layers: { is_critical_group: true, layers: [avatarLayer] },
  mid
})

/** 粉丝装扮。只有 DRAW / WORD / LIVE_RCMD 三个取值的作者身上有 —— 它是判据里的一条证据 */
const decorationCard: JsonValue = {
  big_card_url: '',
  card_type: 1,
  card_type_name: '粉丝装扮',
  card_url: 'https://example.invalid/card.png',
  fan: {
    color: '#c8ff00',
    color_format: { colors: ['#c8ff00'], end_point: '1,0', gradients: [0], start_point: '0,0' },
    is_fan: 1,
    name: '装扮',
    num_desc: '0001',
    number: 1
  },
  id: 4,
  image_enhance: '',
  item_id: 5,
  jump_url: '//example.invalid/decoration',
  name: '装扮'
}

interface AuthorInput {
  mid: number
  name: string
  /** 手写类型里这个键在不同取值下是 `boolean` / `null` —— 忠实照抄 */
  following: JsonValue
  decorated: boolean
}

const moduleAuthor = (input: AuthorInput): JsonValue => ({
  avatar: avatar(String(input.mid)),
  ...(input.decorated ? { decoration_card: decorationCard } : {}),
  face: `https://example.invalid/face${input.mid}.jpg`,
  face_nft: false,
  following: input.following,
  jump_url: `//space.example.invalid/${input.mid}/`,
  label: '',
  mid: input.mid,
  name: input.name,
  official_verify: { desc: '', type: -1 },
  pendant,
  pub_action: '',
  pub_location_text: 'IP属地：广东',
  pub_time: '1天前',
  pub_ts: 1700000000,
  type: 'AUTHOR_TYPE_NORMAL',
  vip
})

const moduleMore: JsonValue = {
  three_point_items: [{ label: '取消关注', type: 'THREE_POINT_FOLLOWING' }, { type: 'THREE_POINT_WAIT' }]
}

/** LIVE_RCMD 那份的 comment 多一个 hidden（手写类型里因此多出一个 `Comment$`），其余五份一样 */
const moduleStat = (hidden: boolean): JsonValue => ({
  comment: hidden ? { count: 3, forbidden: false, hidden: false } : { count: 3, forbidden: false },
  forward: { count: 1, forbidden: false },
  like: { count: 9, forbidden: false, status: false }
})

/** 视频卡：只有 AV（以及转发里的 orig）有 */
const archiveMajor: JsonValue = {
  archive: {
    aid: '1234567890',
    badge: { bg_color: '#FB7299', color: '#FFFFFF', icon_url: null, text: '投稿视频' },
    bvid: 'BV1xx411c7mD',
    cover: 'https://example.invalid/cover.jpg',
    desc: '-',
    disable_preview: 0,
    duration_text: '03:14',
    jump_url: '//example.invalid/video/BV1xx411c7mD',
    stat: { danmaku: '12', play: '3456' },
    title: '标题',
    type: 1
  },
  type: 'MAJOR_TYPE_ARCHIVE'
}

/** `module_dynamic.desc` 与 `major.opus.summary` 在手写类型里就是同一个形状，这里也共用一个构造 */
const textNodes = (text: string): JsonValue => ({
  rich_text_nodes: [{ orig_text: text, text, type: 'RICH_TEXT_NODE_TYPE_TEXT' }],
  text
})

/** 6 份样本的外壳都一样：判别式在 `data.item.type`，第三层（PRD 硬约束 2） */
const envelope = (item: JsonValue): JsonValue => ({ code: 0, data: { item }, message: '0', ttl: 1 })

/** 反推自 `DYNAMIC_TYPE_AV/DYNAMIC_TYPE_AV_V0.ts` */
export const SAMPLE_AV: JsonValue = envelope({
  basic: { comment_id_str: '1001', comment_type: 1, like_icon: likeIcon, rid_str: '1001' },
  id_str: '900000000000000001',
  modules: {
    module_author: moduleAuthor({ mid: 11111, name: '甲', following: true, decorated: false }),
    module_dynamic: { additional: null, desc: textNodes('看这个'), major: archiveMajor, topic: null },
    module_more: moduleMore,
    module_stat: moduleStat(false)
  },
  type: 'DYNAMIC_TYPE_AV',
  visible: true
})

/** 反推自 `DYNAMIC_TYPE_DRAW/DYNAMIC_TYPE_DRAW_V0.ts`：带图动态，`additional` 是预约卡 */
export const SAMPLE_DRAW: JsonValue = envelope({
  basic: { comment_id_str: '1002', comment_type: 1, jump_url: '', like_icon: likeIcon, rid_str: '1002' },
  id_str: '900000000000000002',
  modules: {
    module_author: moduleAuthor({ mid: 22222, name: '乙', following: null, decorated: true }),
    module_dynamic: {
      additional: {
        reserve: {
          button: {
            check: { icon_url: '', text: '已预约' },
            status: 1,
            type: 1,
            uncheck: { disable: 0, icon_url: '', text: '预约', toast: '预约成功' }
          },
          desc1: { style: 0, text: '预约中' },
          desc2: { style: 0, text: '1人预约', visible: true },
          jump_url: '',
          reserve_total: 1,
          rid: 111,
          state: 0,
          stype: 1,
          title: '预约直播',
          up_mid: 22222
        },
        type: 'ADDITIONAL_TYPE_RESERVE'
      },
      desc: null,
      major: {
        opus: {
          fold_action: ['展开'],
          jump_url: '//example.invalid/opus/2',
          pics: [{ height: 1080, live_url: null, size: 233, url: 'https://example.invalid/p.jpg', width: 1920 }],
          summary: textNodes('看图'),
          title: null
        },
        type: 'MAJOR_TYPE_OPUS'
      },
      topic: { id: 77777, jump_url: '//example.invalid/topic/77777', name: '话题' }
    },
    module_more: moduleMore,
    module_stat: moduleStat(false)
  },
  type: 'DYNAMIC_TYPE_DRAW',
  visible: true
})

/** 反推自 `DYNAMIC_TYPE_WORD/DYNAMIC_TYPE_WORD_V0.ts`：纯文字动态，`additional` 是投票卡 */
export const SAMPLE_WORD: JsonValue = envelope({
  basic: { comment_id_str: '1003', comment_type: 1, jump_url: '', like_icon: likeIcon, rid_str: '1003' },
  id_str: '900000000000000003',
  modules: {
    module_author: moduleAuthor({ mid: 33333, name: '丙', following: true, decorated: true }),
    module_dynamic: {
      additional: {
        type: 'ADDITIONAL_TYPE_VOTE',
        vote: {
          button: { jump_style: { text: '投票' }, type: 1 },
          choice_cnt: 2,
          default_share: 0,
          desc: '投个票',
          end_time: 1800000000,
          join_num: 5,
          status: 1,
          title: '投票',
          type: null,
          uid: 33333,
          vote_id: 999
        }
      },
      desc: null,
      major: {
        opus: {
          fold_action: ['展开'],
          jump_url: '//example.invalid/opus/3',
          pics: [],
          summary: textNodes('说两句'),
          title: null
        },
        type: 'MAJOR_TYPE_OPUS'
      },
      topic: null
    },
    module_more: moduleMore,
    module_stat: moduleStat(false)
  },
  type: 'DYNAMIC_TYPE_WORD',
  visible: true
})

/** 反推自 `DYNAMIC_TYPE_LIVE_RCMD/DYNAMIC_TYPE_LIVE_RCMD_V0.ts`：直播推荐，`major` 是 `live_rcmd` */
export const SAMPLE_LIVE_RCMD: JsonValue = envelope({
  basic: { comment_id_str: '1004', comment_type: 1, like_icon: likeIcon, rid_str: '1004' },
  id_str: '900000000000000004',
  modules: {
    module_author: moduleAuthor({ mid: 44444, name: '丁', following: true, decorated: true }),
    module_dynamic: {
      additional: null,
      desc: null,
      major: { live_rcmd: { content: '{"live_play_info":{}}', reserve_type: 0 }, type: 'MAJOR_TYPE_LIVE_RCMD' },
      topic: null
    },
    module_more: moduleMore,
    module_stat: moduleStat(true)
  },
  type: 'DYNAMIC_TYPE_LIVE_RCMD',
  visible: true
})

/** 反推自 `DYNAMIC_TYPE_ARTICLE/DYNAMIC_TYPE_ARTICLE_V0.ts`：专栏，`opus.title` 是字符串（其余取值是 null） */
export const SAMPLE_ARTICLE: JsonValue = envelope({
  basic: { comment_id_str: '1005', comment_type: 1, jump_url: '', like_icon: likeIcon, rid_str: '1005' },
  id_str: '900000000000000005',
  modules: {
    module_author: moduleAuthor({ mid: 55555, name: '戊', following: null, decorated: false }),
    module_dynamic: {
      additional: null,
      desc: null,
      major: {
        opus: {
          fold_action: ['展开'],
          jump_url: '//example.invalid/opus/5',
          pics: ['https://example.invalid/a.jpg'],
          summary: textNodes('正文'),
          title: '专栏标题'
        },
        type: 'MAJOR_TYPE_OPUS'
      },
      topic: null
    },
    module_more: moduleMore,
    module_stat: moduleStat(false)
  },
  type: 'DYNAMIC_TYPE_ARTICLE',
  visible: true
})

/**
 * 反推自 `DYNAMIC_TYPE_FORWARD/DYNAMIC_TYPE_FORWARD_V0.ts`：转发动态。
 *
 * 它是这批里唯一**递归**的一份 —— `orig` 里又是一个完整的动态 item，带自己的
 * `type`（这里嵌的是 AV）。两件事靠它验：
 *
 * 1. 结构等价复用（PRD 5.2）在判别联合下仍然生效 —— `orig` 的子树与顶层同形的部分
 *    不该被重新展开成第二份类型。
 * 2. 判别式发现要认出 `data.item.orig.type` 是**另一个**候选（更深一层），
 *    而选择规则应该挑浅的那个（`data.item.type`）。欠采样的 corpus 有可能让深层候选
 *    反超，那就是端点该显式传 `discriminantPath` 的时候。
 */
export const SAMPLE_FORWARD: JsonValue = envelope({
  basic: { comment_id_str: '1006', comment_type: 1, like_icon: likeIcon, rid_str: '1006' },
  id_str: '900000000000000006',
  modules: {
    module_author: moduleAuthor({ mid: 66666, name: '己', following: true, decorated: false }),
    module_dynamic: { additional: null, desc: textNodes('转发理由'), major: null, topic: null },
    module_more: moduleMore,
    module_stat: moduleStat(false)
  },
  orig: {
    basic: { comment_id_str: '1001', comment_type: 1, like_icon: likeIcon, rid_str: '1001' },
    id_str: '900000000000000001',
    modules: {
      module_author: moduleAuthor({ mid: 11111, name: '甲', following: true, decorated: false }),
      module_dynamic: { additional: null, desc: textNodes('看这个'), major: archiveMajor, topic: null },
      module_more: moduleMore,
      module_stat: moduleStat(false)
    },
    type: 'DYNAMIC_TYPE_AV',
    visible: true
  },
  type: 'DYNAMIC_TYPE_FORWARD',
  visible: true
})

/** 六份样本，顺序固定 —— 用来验「样本顺序不影响产出」时才好比对 */
export const ALL_SIX: JsonValue[] = [SAMPLE_AV, SAMPLE_DRAW, SAMPLE_WORD, SAMPLE_LIVE_RCMD, SAMPLE_ARTICLE, SAMPLE_FORWARD]

/**
 * 第二份 AV 样本（只换 id 与作者）。
 *
 * 存在的理由是判别式发现的一条硬性质：**每个变体只有一份样本时，`id_str` 这种
 * 每份样本一个唯一值的自由字段，与真判别式 `type` 完全同分** —— 都是 N 个取值、
 * 100% 分离度、同一层深度，因为「每份样本自成一组」本身就让分离度满分。
 * 分开它们的是重复：真类别会重复出现，id 不会。
 *
 * 所以 corpus 里每个变体至少要两份样本，这不是「多多益善」而是**发现器能工作的前提**。
 * 对应 PRD「内容驱动的变体只能靠样本量」那条。
 */
export const SAMPLE_AV_2: JsonValue = envelope({
  basic: { comment_id_str: '1007', comment_type: 1, like_icon: likeIcon, rid_str: '1007' },
  id_str: '900000000000000007',
  modules: {
    module_author: moduleAuthor({ mid: 77777, name: '庚', following: false, decorated: true }),
    module_dynamic: { additional: null, desc: textNodes('第二条视频动态'), major: archiveMajor, topic: null },
    module_more: moduleMore,
    module_stat: moduleStat(false)
  },
  type: 'DYNAMIC_TYPE_AV',
  visible: true
})

/** 七份：六个变体 + 一份重复的 AV。判别式发现该用这一组，理由见 {@link SAMPLE_AV_2} */
export const ALL_SEVEN: JsonValue[] = [...ALL_SIX, SAMPLE_AV_2]

/** 反例：取值有限（`kind` 只有 a / b）但两种取值下的键集合**完全一样** —— 不是判别式 */
export const NOT_DISCRIMINANT: JsonValue[] = [
  { data: { item: { kind: 'a', title: '一', count: 1 } } },
  { data: { item: { kind: 'b', title: '二', count: 2 } } },
  { data: { item: { kind: 'a', title: '三', count: 3 } } },
  { data: { item: { kind: 'b', title: '四', count: 4 } } }
]
