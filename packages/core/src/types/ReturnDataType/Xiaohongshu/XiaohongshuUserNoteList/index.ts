// 名字带 `Xiaohongshu` 前缀：这一格是 `userProfile` 的兄弟端点，而小红书的
// `User*` 快照类型都带平台名（`XiaohongshuUserProfile`）—— 四个平台的响应类型都被
// `ReturnDataType/index.ts` 平铺到同一个命名空间，`UserNoteList` 这种通名迟早撞。
import { XiaohongshuUserNoteList_V0 } from './XiaohongshuUserNoteList_V0'

export type XiaohongshuUserNoteList = XiaohongshuUserNoteList_V0
