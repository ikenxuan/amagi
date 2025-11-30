/**
 * dm_img系列风控。生成 dm_img_inter 参数
 * @returns dm_img_inter 参数
 */
export const gen_dm_img_inter = () => {
  const getWh = (width = 1920, height = 1080): number[] => {
    const res0 = width
    const res1 = height
    const rnd = Math.floor(114 * Math.random())
    return [2 * res0 + 2 * res1 + 3 * rnd, 4 * res0 - res1 + rnd, rnd]
  }
  const getOf = (scrollTop = 10, scrollLeft = 10): number[] => {
    const res0 = scrollTop
    const res1 = scrollLeft
    const rnd = Math.floor(514 * Math.random())
    return [3 * res0 + 2 * res1 + rnd, 4 * res0 - 4 * res1 + 2 * rnd, rnd]
  }
  return JSON.stringify({
    ds: [],
    wh: getWh(),
    of: getOf()
  })
}
