/**
 * 解析 JSON，且不对超出 JavaScript 安全范围的整数标识符做舍入。
 * 字符串（含转义）作为完整 token 整体消费，因此评论正文、URL 与标识符等字符串值里形似数字的文本
 * 永远不会被改写。小数与指数字面量保持常规的 JSON 数字语义。
 */
export const parseJsonBigintSafe = (text: string): unknown => {
  const quoted = text.replace(/"(?:\\[\s\S]|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g, (token: string, offset: number) => {
    if (token.startsWith('"') || /[.eE]/.test(token) || Number.isSafeInteger(Number(token))) return token
    // 数字后跟 ':' 说明它是非法的无引号键，而不是值。
    // 畸形输入留给 JSON.parse 报错，不要悄悄修复。
    if (!/^\s*(?:[,}\]]|$)/.test(text.slice(offset + token.length))) return token
    return `"${token}"`
  })
  return JSON.parse(quoted)
}
