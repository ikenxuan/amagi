/**
 * 动态类型枚举
 *
 * 独立成叶子模块：Dynamic 子树各叶子类型文件都要用它做判别字段，
 * 若定义在 `DynamicInfo/index.ts` 会形成叶子反向导入 barrel 的环。
 *
 * 它是**运行时 enum**，不是任何端点响应的形状映射，所以没有「形状序号 `_V<n>`」，
 * 也不必按响应类型的目录约定包一层。
 */
export enum DynamicType {
  AV = 'DYNAMIC_TYPE_AV',
  DRAW = 'DYNAMIC_TYPE_DRAW',
  WORD = 'DYNAMIC_TYPE_WORD',
  LIVE_RCMD = 'DYNAMIC_TYPE_LIVE_RCMD',
  FORWARD = 'DYNAMIC_TYPE_FORWARD',
  ARTICLE = 'DYNAMIC_TYPE_ARTICLE'
}
