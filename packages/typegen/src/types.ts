/**
 * 形状树的数据结构与选项定义。
 *
 * 设计要点（对应 `RESPONSE-TYPE-AUTOGEN-PRD.md` 五的规则表）：**这棵树是「证据累加器」，
 * 不是「类型」**。每个节点记的是「在 N 份样本里这个位置见过什么」的计数，
 * 而不是已经拍板的 TS 类型。可选性、联合、放宽/收窄全都在渲染时从计数推出来。
 *
 * 为什么要这么分：规则表里最容易做错的一条是「`null` 与缺键必须分成两个维度」。
 * 如果边读样本边拍板类型，两者一定会在某处被合并掉（比如统一写成 `T | undefined`）。
 * 拆成「累加证据 → 渲染」两步之后，`seen`（键出现过几次）与 `nulls`（值为 null 几次）
 * 天然是两个独立计数，想合并掉反而更费劲。
 */

/** corpus 里躺的就是 `JSON.parse` 的结果 —— 合并器只认这些，不碰 Date / BigInt / undefined */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

/** JSON 里能出现的非 null 原始类型 */
export type PrimitiveName = 'string' | 'number' | 'boolean'

/** 可以被收窄成字面量的取值 */
export type LiteralValue = string | number | boolean

/** 某个位置上「见过的某一种原始类型」的证据 */
export interface PrimitiveShape {
  /** 见过多少次这种原始类型 */
  seen: number
  /**
   * 见过的取值集合。`undefined` 表示**已放弃收集**（不同取值超过 `maxLiterals`），
   * 这种位置必然放宽成基础类型 —— 把 500 个 id 渲染成字面量联合没有意义。
   */
  literals: Set<LiteralValue> | undefined
  /**
   * 超过 `Number.MAX_SAFE_INTEGER` 的整数取值（只有 number 会有）。
   * 注意：**精度在 `JSON.parse` 时就已经丢了**，这里存的是丢完之后的值。
   * 所以这条只能当「需要人决策」的报告项，不能当成能自动修的事，见 `Finding`。
   */
  unsafeIntegers: number[]
}

/** 某个位置上「见过的对象」的证据 */
export interface ObjectShape {
  /** 这个位置见过多少个对象 —— 判「必需 / 可选」时它是分母 */
  seen: number
  /** 键 → 子节点。子节点的 `seen` 就是这个键出现过的次数 */
  props: Map<string, Shape>
}

/** 某个位置上「见过的数组」的证据 */
export interface ArrayShape {
  /** 见过多少个数组 */
  seen: number
  /** 其中空数组的个数。`seen === empty` 说明全空，元素类型只能给 `unknown` */
  empty: number
  /** 所有样本里所有元素合并进这一个节点 —— 元素形状不一致就在这里变成联合/可选键 */
  element: Shape
}

/**
 * 形状树的节点。同一个位置可以同时见过对象、数组和原始类型
 * （平台真的会这样：业务码有的接口给 `-412`、有的给 `"12061"`），
 * 所以三个槽位并存，渲染时取联合。
 */
export interface Shape {
  /** 这个位置出现过多少次（键存在即算，值为 null 也算）—— 与 `nulls` 是两个维度 */
  seen: number
  /** 值为 `null` 的次数。`seen === nulls` 表示恒为 null，渲染成 `null` */
  nulls: number
  /** 见过的原始类型 */
  primitives: Map<PrimitiveName, PrimitiveShape>
  /** 见过的对象形状 */
  object: ObjectShape | undefined
  /** 见过的数组形状 */
  array: ArrayShape | undefined
  /**
   * 是否把字面量收窄。**默认 false（放宽成基础类型）**：单账号采样会让 `userId`
   * 在全部样本里恒等于同一个值，收窄成字面量是错的。只有 `literalPaths` 命中的路径
   * 才置 true。这个决策在读样本时就按路径定下来，渲染阶段因此不需要再知道路径，
   * 结构等价判定（5.2）也就不会被路径干扰。
   */
  narrowLiterals: boolean
}
