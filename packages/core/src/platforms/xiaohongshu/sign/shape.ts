/**
 * 小红书反爬头部的**形状检查** —— 验证工具在小红书这边能做的全部事情。
 *
 * 真正的签名算法在 `@ikenxuan/xhshow-ts` 里，那条依赖链用了 `node:crypto` 与
 * `node:zlib`，进不了浏览器；所以与 a_bogus / X-Bogus 那种「拆开验」不同，
 * 小红书在这里只能验形状：前缀、长度、字符集、时钟的合理范围。这不是偷工减料
 * ——XYS_/XYW_ 前缀区分两套协议（数据接口 2026-03 起拒收 XYS_），x-t 的时钟
 * 范围能暴露「拿秒当毫秒」这类错，形状本身就有鉴别力。
 *
 * 本文件**不得** import `./index`（它会拉进 `@ikenxuan/xhshow-ts`，整条
 * `@ikenxuan/amagi/signing` 的浏览器可用性就毁了）。它只认传入的字符串。
 *
 * @module platforms/xiaohongshu/sign/shape
 */

/** 一个头部被检查后的结果 */
export interface XhsHeaderInspection {
  /** 头名（原样返回，方便调用方渲染） */
  name: string
  /** x-s 独有：识别出的协议格式 */
  format?: 'XYS' | 'XYW'
  /** 发现的全部问题；空数组 = 形状良好 */
  problems: string[]
}

/** x-s 之外的头部按什么规则查 */
const CHECKS: Record<string, { label: string; test: (value: string) => boolean; why: string }> = {
  'x-t': { label: '13 位毫秒时间戳', test: (value) => /^1[0-9]{12}$/.test(value), why: 'generateXT 返回 Date.now()，13 位毫秒' },
  'x-b3-traceid': { label: '16 位十六进制', test: (value) => /^[0-9a-f]{16}$/.test(value), why: 'generateXB3Traceid 的输出形状' },
  'x-xray-traceid': { label: '32 位十六进制', test: (value) => /^[0-9a-f]{32}$/.test(value), why: 'generateXrayTraceid 的输出形状' },
  'x-s-common': { label: '非空', test: (value) => value.length > 0, why: '压缩+编码的不透明串，底下没有明文可找' }
}

/**
 * 检查一个签名头部的形状。
 * @param name - 头名（`x-s` / `x-s-common` / `x-t` / `x-xray-traceid` / `x-b3-traceid`）
 * @param value - 头部的值
 * @returns 检查结果；不认识的头名按「非空」处理
 */
export const inspectXhsHeader = (name: string, value: string): XhsHeaderInspection => {
  if (name === 'x-s') {
    const inspection: XhsHeaderInspection = { name, problems: [] }
    if (value.startsWith('XYW_')) {
      inspection.format = 'XYW'
      if (value.length <= 'XYW_'.length) inspection.problems.push('XYW_ 之后是空的')
    } else if (value.startsWith('XYS_')) {
      inspection.format = 'XYS'
      if (value.length <= 'XYS_'.length) inspection.problems.push('XYS_ 之后是空的')
    } else {
      inspection.problems.push('既不是 XYS_ 也不是 XYW_ 开头 —— 2026-03 之后数据接口会以 406 拒收')
    }
    return inspection
  }

  const check = CHECKS[name]
  if (!check) return { name, problems: value.length > 0 ? [] : ['是空的'] }
  return { name, problems: check.test(value) ? [] : [`不符合 ${check.label}（${check.why}）`] }
}
