const XOR_CODE = 23442827791579n
const MASK_CODE = 2251799813685247n
const MAX_AID = 1n << 51n
const BASE = 58n

const data = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf'

/**
 * av号转bv号
 * @param aid av号
 * @returns 
 */
export const av2bv = (aid: number) => {
  const bytes = ['B', 'V', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0']
  let bvIndex = bytes.length - 1
  let tmp = (MAX_AID | BigInt(aid)) ^ XOR_CODE
  while (tmp > 0) {
    bytes[bvIndex] = data[Number(tmp % BigInt(BASE))]
    tmp = tmp / BASE
    bvIndex -= 1
  }
  [bytes[3], bytes[9]] = [bytes[9], bytes[3]];
  [bytes[4], bytes[7]] = [bytes[7], bytes[4]]
  return bytes.join('') as `BV1${string}`
}

/**
 * bv号转av号
 * @param bvid bv号
 * @returns 
 */
export const bv2av = (bvid: string) => {
  const bvidArr = Array.from(bvid);
  [bvidArr[3], bvidArr[9]] = [bvidArr[9], bvidArr[3]];
  [bvidArr[4], bvidArr[7]] = [bvidArr[7], bvidArr[4]]
  bvidArr.splice(0, 3)
  const tmp = bvidArr.reduce((pre, bvidChar) => pre * BASE + BigInt(data.indexOf(bvidChar)), 0n)
  return Number((tmp & MASK_CODE) ^ XOR_CODE)
}
