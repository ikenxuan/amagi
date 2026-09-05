// v6 写法（migration sample，嵌套目录验证递归遍历）：routes map 清单再导出
// （v6 从顶层导入 ApiRoutes 常量；v7 改用 client.endpoints()）
// 覆盖：独立成行的 ApiRoutes 具名删除 → 整条 import 删除
import {
  BilibiliApiRoutes,
  DouyinApiRoutes,
} from '@ikenxuan/amagi'

export const spec = {
  douyin: Object.keys(DouyinApiRoutes),
  bilibili: Object.keys(BilibiliApiRoutes),
}
