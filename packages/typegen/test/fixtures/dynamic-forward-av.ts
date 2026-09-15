/**
 * PRD 阶段 0 点名的第一个用例：那两个**假变体**反推出来的样本。
 *
 * `DYNAMIC_TYPE_FORWARD/Forward/DYNAMIC_TYPE_AV/` 下的 `_V0`（599 行）与 `_V1`（565 行）
 * 不是「两个变体」，是同一个接口两次抓包赶上的数据不一样（PRD 1.3）。这里把两份**类型**
 * 反推成两份**样本**：结构精简过，但下面这张差异表逐条保真（对着两个 .ts 文件核过）。
 *
 * | # | 位置 | V0 | V1 | 合并后应该是 |
 * |---|---|---|---|---|
 * | 1 | `data.item.basic.editable` | 有 | 没有 | `editable?: boolean` |
 * | 2 | `data.item.modules.module_author.decoration_card` | 没有 | 有（`fan` 是空对象） | `decoration_card?` |
 * | 3 | `data.item.orig.…module_author.decoration_card` | 有（`fan` 有结构） | 没有 | `decoration_card?` |
 * | 4 | `data.item.modules.module_dynamic.topic` | `{id,jump_url,name}` | `null` | `topic: Topic \| null` |
 * | 5 | `…module_dynamic.desc.rich_text_nodes[]` | 带 `rid` | 换成 `jump_url` + `style` | 三个都可选 |
 * | 6 | `…rich_text_nodes[].emoji` | 4 个键 | 多 `id` / `package_id` | 多出来的两个可选 |
 * | 7 | `…module_more.three_point_items[]` | 有 `modal` / `params` | 没有 | 两个都可选 |
 * | 8 | `data.item.orig.…module_dynamic.desc` | `null` | 有对象 | `desc: Desc \| null` |
 * | 9 | `data.item.orig.…fallback_layers.layers[]` | 四个键齐全 | 元素形状不齐 | 四个键都可选 |
 * | 10 | `…image_src` | 有 `local` | 没有 `local`，有 `placeholder`/`remote` | 各自可选 |
 *
 * 一处要留意：被反推的两个 .ts 文件里 `data.item.type` 写的是 `DynamicType.AV`
 * （不是 FORWARD）—— 转发壳子的 `item.type` 是由 `DYNAMIC_TYPE_FORWARD/index.ts`
 * 事后覆写的。样本忠于被反推的文件，覆写那层属于手写语义（PRD 六），不是合并器的事。
 */

import type { JsonValue } from '../../src/types'

// 下面一律写 `: JsonValue` 类型标注而不是 `satisfies JsonValue`：数组元素形状不一致时
// （差异 5 / 7 / 9 就是这种），TS 推出来的元素联合会给缺的键补上 `?: undefined`，
// 而 `undefined` 不是 JSON 值，那种类型过不了 JsonValue。给了标注，元素就按 JsonValue
// 上下文逐个检查，不会先推成联合再补 undefined。

/** 两侧一模一样。现存手写类型把它重复声明成 PurpleLikeIcon / FluffyLikeIcon 两份 —— 合并器应该只产一份 */
const likeIcon: JsonValue = { action_url: 'https://example.invalid/like.png', end_url: '', id: 0, start_url: '' }

const webCssStyle: JsonValue = {
  'background-color': '#FFFFFF',
  border: '2px solid #FFF',
  borderRadius: '50%',
  boxSizing: 'border-box'
}

const generalSpec: JsonValue = {
  pos_spec: { axis_x: 0.9, axis_y: 0.9, coordinate_pos: 2 },
  render_spec: { opacity: 1 },
  // 注意 size_spec 与下面 avatar 的 container_size 结构完全一样：
  // 手写类型里是 PurpleSizeSpec / PurpleContainerSize 两份重复声明，合并器该复用同一个（5.2）
  size_spec: { height: 1.8, width: 1.8 }
}

/** V0 的 layer：四个键齐全 */
const layerV0: JsonValue = {
  general_spec: generalSpec,
  layer_config: {
    is_critical: true,
    tags: { AVATAR_LAYER: {}, GENERAL_CFG: { config_type: 1, general_config: { web_css_style: webCssStyle } }, ICON_LAYER: {} }
  },
  resource: { res_image: { image_src: { local: 1, src_type: 1 } }, res_type: 3 },
  visible: true
}

/** V1 的 layers：两个元素各缺一半键（差异 9），且 image_src 没有 local、多了 placeholder/remote（差异 10） */
const layersV1: JsonValue[] = [
  {
    resource: {
      res_image: {
        image_src: { placeholder: 6, remote: { bfs_style: 'widget-layer-avatar', url: 'https://example.invalid/p.png' }, src_type: 2 }
      },
      res_type: 3
    },
    visible: true
  },
  {
    general_spec: generalSpec,
    layer_config: {
      is_critical: true,
      tags: { AVATAR_LAYER: {}, GENERAL_CFG: { config_type: 1, general_config: { web_css_style: webCssStyle } } }
    }
  }
]

const avatar = (mid: string, layers: JsonValue): JsonValue => ({
  container_size: { height: 1.35, width: 1.35 },
  fallback_layers: { is_critical_group: true, layers },
  mid
})

const vip: JsonValue = { avatar_subscript: 1, due_date: 1800000000, nickname_color: '#FB7299', status: 1, theme_type: 0, type: 2 }

/** 被转发的那条视频动态，两份样本里一样 */
const major: JsonValue = {
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

const moduleStat: JsonValue = {
  // comment 与 forward 结构一样（手写类型里也是两份重复声明）；like 多一个 status，所以是另一个类型
  comment: { count: 3, forbidden: false },
  forward: { count: 1, forbidden: false },
  like: { count: 9, forbidden: false, status: false }
}

/** 第一次抓包（反推自 `DYNAMIC_TYPE_AV_V0.ts`） */
export const SAMPLE_V0: JsonValue = {
  code: 0,
  data: {
    item: {
      basic: {
        comment_id_str: '1001',
        comment_type: 1,
        editable: true, // 差异 1：只有 V0 有
        like_icon: likeIcon,
        rid_str: '1001'
      },
      id_str: '900000000000000001',
      modules: {
        module_author: {
          // 差异 2：V0 的转发者 module_author 上**没有** decoration_card
          avatar: avatar('11111', [layerV0]),
          face: 'https://example.invalid/face1.jpg',
          face_nft: false,
          following: null,
          jump_url: '//space.example.invalid/11111/',
          label: '',
          mid: 11111,
          name: '甲',
          official_verify: { desc: '', type: -1 },
          pendant: { expire: 0, image: '', n_pid: 0, name: '', pid: 0 },
          pub_action: '转发动态',
          pub_time: '1天前',
          pub_ts: 1700000000,
          type: 'AUTHOR_TYPE_NORMAL',
          vip
        },
        module_dynamic: {
          additional: null,
          desc: {
            rich_text_nodes: [
              { orig_text: '看这个', text: '看这个', type: 'RICH_TEXT_NODE_TYPE_TEXT' },
              // 差异 5：V0 的话题节点带 rid，没有 jump_url / style
              { orig_text: '#话题#', rid: '77777', text: '#话题#', type: 'RICH_TEXT_NODE_TYPE_TOPIC' },
              // 差异 6：V0 的 emoji 只有 4 个键
              {
                emoji: { icon_url: 'https://example.invalid/e.png', size: 1, text: '[笑]', type: 1 },
                orig_text: '[笑]',
                text: '[笑]',
                type: 'RICH_TEXT_NODE_TYPE_EMOJI'
              }
            ],
            text: '看这个#话题#[笑]'
          },
          major: null,
          topic: { id: 77777, jump_url: '//example.invalid/topic/77777', name: '话题' } // 差异 4：V0 是对象
        },
        module_more: {
          three_point_items: [
            // 差异 7：V0 的每一项都有 params，第二项还有 modal
            {
              label: '取消关注',
              params: { dyn_id_str: '900000000000000001', dyn_type: 1, rid_str: '1001' },
              type: 'THREE_POINT_FOLLOWING'
            },
            {
              label: '删除',
              modal: { cancel: '取消', confirm: '删除', content: '确定删除该动态?', title: '删除动态' },
              params: {
                dyn_id_str: '900000000000000001',
                dyn_type: 1,
                dynamic_id: '900000000000000001',
                rid_str: '1001',
                status: 1,
                type: 1
              },
              type: 'THREE_POINT_DELETE'
            }
          ]
        },
        module_stat: moduleStat
      },
      orig: {
        basic: { comment_id_str: '2002', comment_type: 1, like_icon: likeIcon, rid_str: '2002' },
        id_str: '800000000000000002',
        modules: {
          module_author: {
            avatar: avatar('22222', [layerV0]),
            // 差异 3：orig 侧的 decoration_card 只有 V0 有，而且 fan 是有结构的
            decoration_card: {
              big_card_url: 'https://example.invalid/big.png',
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
            },
            face: 'https://example.invalid/face2.jpg',
            face_nft: false,
            following: null,
            jump_url: '//space.example.invalid/22222/',
            label: '',
            mid: 22222,
            name: '乙',
            official_verify: { desc: '', type: 0 },
            pendant: { expire: 0, image: '', n_pid: 0, name: '', pid: 0 },
            pub_action: '',
            pub_time: '2天前',
            pub_ts: 1699990000,
            type: 'AUTHOR_TYPE_NORMAL',
            vip
          },
          module_dynamic: { additional: null, desc: null, major, topic: null } // 差异 8：V0 的 orig.desc 是 null
        },
        type: 'DYNAMIC_TYPE_AV',
        visible: true
      },
      type: 'DYNAMIC_TYPE_AV',
      visible: true
    }
  },
  message: '0',
  ttl: 1
}

/** 第二次抓包（反推自 `DYNAMIC_TYPE_AV_V1.ts`）—— 与 V0 的差异全在上面那张表里 */
export const SAMPLE_V1: JsonValue = {
  code: 0,
  data: {
    item: {
      basic: {
        // 差异 1：V1 没有 editable
        comment_id_str: '1003',
        comment_type: 1,
        like_icon: likeIcon,
        rid_str: '1003'
      },
      id_str: '900000000000000003',
      modules: {
        module_author: {
          avatar: avatar('33333', [layerV0]),
          // 差异 2：V1 的转发者 module_author 上有 decoration_card，且 fan 是空对象
          decoration_card: {
            big_card_url: 'https://example.invalid/big2.png',
            card_type: 2,
            card_type_name: '收藏集',
            card_url: 'https://example.invalid/card2.png',
            fan: {},
            id: 6,
            image_enhance: '',
            item_id: 7,
            jump_url: '//example.invalid/decoration2',
            name: '收藏集'
          },
          face: 'https://example.invalid/face3.jpg',
          face_nft: false,
          following: null,
          jump_url: '//space.example.invalid/33333/',
          label: '',
          mid: 33333,
          name: '丙',
          official_verify: { desc: '', type: -1 },
          pendant: { expire: 0, image: '', n_pid: 0, name: '', pid: 0 },
          pub_action: '转发动态',
          pub_time: '3小时前',
          pub_ts: 1700100000,
          type: 'AUTHOR_TYPE_NORMAL',
          vip
        },
        module_dynamic: {
          additional: null,
          desc: {
            rich_text_nodes: [
              // 差异 5：V1 的节点换成 jump_url + style，没有 rid
              { jump_url: '', orig_text: '转发', style: {}, text: '转发', type: 'RICH_TEXT_NODE_TYPE_TEXT' },
              // 差异 6：V1 的 emoji 多 id / package_id
              {
                emoji: { icon_url: 'https://example.invalid/e2.png', id: 12, package_id: 1, size: 1, text: '[妙]', type: 1 },
                jump_url: '',
                orig_text: '[妙]',
                style: {},
                text: '[妙]',
                type: 'RICH_TEXT_NODE_TYPE_EMOJI'
              }
            ],
            text: '转发[妙]'
          },
          major: null,
          topic: null // 差异 4：V1 是 null
        },
        module_more: {
          // 差异 7：V1 的项里既没有 modal 也没有 params；第二项还缺 label
          three_point_items: [{ label: '举报', type: 'THREE_POINT_REPORT' }, { type: 'THREE_POINT_WAIT' }]
        },
        module_stat: moduleStat
      },
      orig: {
        basic: { comment_id_str: '2004', comment_type: 1, like_icon: likeIcon, rid_str: '2004' },
        id_str: '800000000000000004',
        modules: {
          module_author: {
            // 差异 3：V1 的 orig 侧没有 decoration_card
            // 差异 9 + 10：layers 元素形状不齐、image_src 没有 local
            avatar: avatar('44444', layersV1),
            face: 'https://example.invalid/face4.jpg',
            face_nft: false,
            following: null,
            jump_url: '//space.example.invalid/44444/',
            label: '',
            mid: 44444,
            name: '丁',
            official_verify: { desc: '', type: 0 },
            pendant: { expire: 0, image: '', n_pid: 0, name: '', pid: 0 },
            pub_action: '',
            pub_time: '5天前',
            pub_ts: 1699500000,
            type: 'AUTHOR_TYPE_NORMAL',
            vip
          },
          // 差异 8：V1 的 orig.desc 有对象（V0 是 null）。它的 style 恒为 null，忠于被反推的文件
          module_dynamic: {
            additional: null,
            desc: {
              rich_text_nodes: [{ jump_url: '', orig_text: '标题', style: null, text: '标题', type: 'RICH_TEXT_NODE_TYPE_TEXT' }],
              text: '标题'
            },
            major,
            topic: null
          }
        },
        type: 'DYNAMIC_TYPE_AV',
        visible: true
      },
      type: 'DYNAMIC_TYPE_AV',
      visible: true
    }
  },
  message: '0',
  ttl: 1
}
