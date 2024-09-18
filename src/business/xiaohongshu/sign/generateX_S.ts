import md5 from 'md5'

let key = [187050025, 472920585, 186915882, 876157969, 255199502, 806945584, 220596020, 958210835, 757275681,
  940378667, 489892883, 705504304, 354103316, 688857884, 890312192, 219096591, 622400037, 254088489,
  907618332, 52759587, 907877143, 53870614, 839463457, 389417746, 975774727, 372382245, 437136414,
  909246726, 168694017, 473575703, 52697872, 1010440969
]

function des (key: number[], message: any, encrypt: boolean, mode: number | undefined, iv: string, padding: number | undefined) {
  if (encrypt) //如果是加密的话，首先转换编码
    message = unescape(encodeURIComponent(message))
  //declaring this locally speeds things up a bit
  const spfunction1 = new Array(0x1010400, 0, 0x10000, 0x1010404, 0x1010004, 0x10404, 0x4, 0x10000, 0x400, 0x1010400, 0x1010404, 0x400, 0x1000404, 0x1010004, 0x1000000, 0x4, 0x404, 0x1000400, 0x1000400, 0x10400, 0x10400, 0x1010000, 0x1010000, 0x1000404, 0x10004, 0x1000004, 0x1000004, 0x10004, 0, 0x404, 0x10404, 0x1000000, 0x10000, 0x1010404, 0x4, 0x1010000, 0x1010400, 0x1000000, 0x1000000, 0x400, 0x1010004, 0x10000, 0x10400, 0x1000004, 0x400, 0x4, 0x1000404, 0x10404, 0x1010404, 0x10004, 0x1010000, 0x1000404, 0x1000004, 0x404, 0x10404, 0x1010400, 0x404, 0x1000400, 0x1000400, 0, 0x10004, 0x10400, 0, 0x1010004)
  const spfunction2 = new Array(-0x7fef7fe0, -0x7fff8000, 0x8000, 0x108020, 0x100000, 0x20, -0x7fefffe0, -0x7fff7fe0, -0x7fffffe0, -0x7fef7fe0, -0x7fef8000, -0x80000000, -0x7fff8000, 0x100000, 0x20, -0x7fefffe0, 0x108000, 0x100020, -0x7fff7fe0, 0, -0x80000000, 0x8000, 0x108020, -0x7ff00000, 0x100020, -0x7fffffe0, 0, 0x108000, 0x8020, -0x7fef8000, -0x7ff00000, 0x8020, 0, 0x108020, -0x7fefffe0, 0x100000, -0x7fff7fe0, -0x7ff00000, -0x7fef8000, 0x8000, -0x7ff00000, -0x7fff8000, 0x20, -0x7fef7fe0, 0x108020, 0x20, 0x8000, -0x80000000, 0x8020, -0x7fef8000, 0x100000, -0x7fffffe0, 0x100020, -0x7fff7fe0, -0x7fffffe0, 0x100020, 0x108000, 0, -0x7fff8000, 0x8020, -0x80000000, -0x7fefffe0, -0x7fef7fe0, 0x108000)
  const spfunction3 = new Array(0x208, 0x8020200, 0, 0x8020008, 0x8000200, 0, 0x20208, 0x8000200, 0x20008, 0x8000008, 0x8000008, 0x20000, 0x8020208, 0x20008, 0x8020000, 0x208, 0x8000000, 0x8, 0x8020200, 0x200, 0x20200, 0x8020000, 0x8020008, 0x20208, 0x8000208, 0x20200, 0x20000, 0x8000208, 0x8, 0x8020208, 0x200, 0x8000000, 0x8020200, 0x8000000, 0x20008, 0x208, 0x20000, 0x8020200, 0x8000200, 0, 0x200, 0x20008, 0x8020208, 0x8000200, 0x8000008, 0x200, 0, 0x8020008, 0x8000208, 0x20000, 0x8000000, 0x8020208, 0x8, 0x20208, 0x20200, 0x8000008, 0x8020000, 0x8000208, 0x208, 0x8020000, 0x20208, 0x8, 0x8020008, 0x20200)
  const spfunction4 = new Array(0x802001, 0x2081, 0x2081, 0x80, 0x802080, 0x800081, 0x800001, 0x2001, 0, 0x802000, 0x802000, 0x802081, 0x81, 0, 0x800080, 0x800001, 0x1, 0x2000, 0x800000, 0x802001, 0x80, 0x800000, 0x2001, 0x2080, 0x800081, 0x1, 0x2080, 0x800080, 0x2000, 0x802080, 0x802081, 0x81, 0x800080, 0x800001, 0x802000, 0x802081, 0x81, 0, 0, 0x802000, 0x2080, 0x800080, 0x800081, 0x1, 0x802001, 0x2081, 0x2081, 0x80, 0x802081, 0x81, 0x1, 0x2000, 0x800001, 0x2001, 0x802080, 0x800081, 0x2001, 0x2080, 0x800000, 0x802001, 0x80, 0x800000, 0x2000, 0x802080)
  const spfunction5 = new Array(0x100, 0x2080100, 0x2080000, 0x42000100, 0x80000, 0x100, 0x40000000, 0x2080000, 0x40080100, 0x80000, 0x2000100, 0x40080100, 0x42000100, 0x42080000, 0x80100, 0x40000000, 0x2000000, 0x40080000, 0x40080000, 0, 0x40000100, 0x42080100, 0x42080100, 0x2000100, 0x42080000, 0x40000100, 0, 0x42000000, 0x2080100, 0x2000000, 0x42000000, 0x80100, 0x80000, 0x42000100, 0x100, 0x2000000, 0x40000000, 0x2080000, 0x42000100, 0x40080100, 0x2000100, 0x40000000, 0x42080000, 0x2080100, 0x40080100, 0x100, 0x2000000, 0x42080000, 0x42080100, 0x80100, 0x42000000, 0x42080100, 0x2080000, 0, 0x40080000, 0x42000000, 0x80100, 0x2000100, 0x40000100, 0x80000, 0, 0x40080000, 0x2080100, 0x40000100)
  const spfunction6 = new Array(0x20000010, 0x20400000, 0x4000, 0x20404010, 0x20400000, 0x10, 0x20404010, 0x400000, 0x20004000, 0x404010, 0x400000, 0x20000010, 0x400010, 0x20004000, 0x20000000, 0x4010, 0, 0x400010, 0x20004010, 0x4000, 0x404000, 0x20004010, 0x10, 0x20400010, 0x20400010, 0, 0x404010, 0x20404000, 0x4010, 0x404000, 0x20404000, 0x20000000, 0x20004000, 0x10, 0x20400010, 0x404000, 0x20404010, 0x400000, 0x4010, 0x20000010, 0x400000, 0x20004000, 0x20000000, 0x4010, 0x20000010, 0x20404010, 0x404000, 0x20400000, 0x404010, 0x20404000, 0, 0x20400010, 0x10, 0x4000, 0x20400000, 0x404010, 0x4000, 0x400010, 0x20004010, 0, 0x20404000, 0x20000000, 0x400010, 0x20004010)
  const spfunction7 = new Array(0x200000, 0x4200002, 0x4000802, 0, 0x800, 0x4000802, 0x200802, 0x4200800, 0x4200802, 0x200000, 0, 0x4000002, 0x2, 0x4000000, 0x4200002, 0x802, 0x4000800, 0x200802, 0x200002, 0x4000800, 0x4000002, 0x4200000, 0x4200800, 0x200002, 0x4200000, 0x800, 0x802, 0x4200802, 0x200800, 0x2, 0x4000000, 0x200800, 0x4000000, 0x200800, 0x200000, 0x4000802, 0x4000802, 0x4200002, 0x4200002, 0x2, 0x200002, 0x4000000, 0x4000800, 0x200000, 0x4200800, 0x802, 0x200802, 0x4200800, 0x802, 0x4000002, 0x4200802, 0x4200000, 0x200800, 0, 0x2, 0x4200802, 0, 0x200802, 0x4200000, 0x800, 0x4000002, 0x4000800, 0x800, 0x200002)
  const spfunction8 = new Array(0x10001040, 0x1000, 0x40000, 0x10041040, 0x10000000, 0x10001040, 0x40, 0x10000000, 0x40040, 0x10040000, 0x10041040, 0x41000, 0x10041000, 0x41040, 0x1000, 0x40, 0x10040000, 0x10000040, 0x10001000, 0x1040, 0x41000, 0x40040, 0x10040040, 0x10041000, 0x1040, 0, 0, 0x10040040, 0x10000040, 0x10001000, 0x41040, 0x40000, 0x41040, 0x40000, 0x10041000, 0x1000, 0x40, 0x10040040, 0x1000, 0x41040, 0x10001000, 0x40, 0x10000040, 0x10040000, 0x10040040, 0x10000000, 0x40000, 0x10001040, 0, 0x10041040, 0x40040, 0x10000040, 0x10040000, 0x10001000, 0x10001040, 0, 0x10041040, 0x41000, 0x41000, 0x1040, 0x1040, 0x40040, 0x10000000, 0x10041000)
  // create the 16 or 48 subkeys we will need
  // var keys = des_createKeys(key)
  const keys = key
  let m = 0, i, j, temp, temp2, right1, right2, left, right, looping
  let cbcleft, cbcleft2, cbcright, cbcright2
  let endloop, loopinc
  let len = message.length
  let chunk = 0
  //set up the loops for single and triple des
  var iterations = keys.length == 32 ? 3 : 9 //single or triple des
  if (iterations == 3) { looping = encrypt ? new Array(0, 32, 2) : new Array(30, -2, -2) }
  else { looping = encrypt ? new Array(0, 32, 2, 62, 30, -2, 64, 96, 2) : new Array(94, 62, -2, 32, 64, 2, 30, -2, -2) }
  //pad the message depending on the padding parameter
  if (padding == 2) message += "    " //pad the message with spaces
  else if (padding == 1) {
    if (encrypt) {
      temp = 8 - (len % 8)
      message += String.fromCharCode(temp, temp, temp, temp, temp, temp, temp, temp)
      if (temp === 8) len += 8
    }
  } //PKCS7 padding
  else if (!padding) message += "\0\0\0\0\0\0\0\0" //pad the message out with null bytes
  //store the result here
  var result = ""
  var tempresult = ""
  if (mode == 1) { //CBC mode
    cbcleft = (iv.charCodeAt(m++) << 24) | (iv.charCodeAt(m++) << 16) | (iv.charCodeAt(m++) << 8) | iv.charCodeAt(m++)
    cbcright = (iv.charCodeAt(m++) << 24) | (iv.charCodeAt(m++) << 16) | (iv.charCodeAt(m++) << 8) | iv.charCodeAt(m++)
    m = 0
  }
  //loop through each 64 bit chunk of the message
  while (m < len) {
    left = (message.charCodeAt(m++) << 24) | (message.charCodeAt(m++) << 16) | (message.charCodeAt(m++) << 8) | message.charCodeAt(m++)
    right = (message.charCodeAt(m++) << 24) | (message.charCodeAt(m++) << 16) | (message.charCodeAt(m++) << 8) | message.charCodeAt(m++)
    //for Cipher Block Chaining mode, xor the message with the previous result
    if (mode == 1) { if (encrypt) { left ^= cbcleft as any; right ^= cbcright as any } else { cbcleft2 = cbcleft; cbcright2 = cbcright; cbcleft = left; cbcright = right } }
    //first each 64 but chunk of the message must be permuted according to IP
    temp = ((left >>> 4) ^ right) & 0x0f0f0f0f; right ^= temp; left ^= (temp << 4)
    temp = ((left >>> 16) ^ right) & 0x0000ffff; right ^= temp; left ^= (temp << 16)
    temp = ((right >>> 2) ^ left) & 0x33333333; left ^= temp; right ^= (temp << 2)
    temp = ((right >>> 8) ^ left) & 0x00ff00ff; left ^= temp; right ^= (temp << 8)
    temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1)
    left = ((left << 1) | (left >>> 31))
    right = ((right << 1) | (right >>> 31))
    //do this either 1 or 3 times for each chunk of the message
    for (j = 0; j < iterations; j += 3) {
      endloop = looping[j + 1]
      loopinc = looping[j + 2]
      //now go through and perform the encryption or decryption
      for (i = looping[j]; i != endloop; i += loopinc) { //for efficiency
        right1 = right ^ keys[i]
        right2 = ((right >>> 4) | (right << 28)) ^ keys[i + 1]
        //the result is attained by passing these bytes through the S selection functions
        temp = left
        left = right
        right = temp ^ (spfunction2[(right1 >>> 24) & 0x3f] | spfunction4[(right1 >>> 16) & 0x3f]
          | spfunction6[(right1 >>> 8) & 0x3f] | spfunction8[right1 & 0x3f]
          | spfunction1[(right2 >>> 24) & 0x3f] | spfunction3[(right2 >>> 16) & 0x3f]
          | spfunction5[(right2 >>> 8) & 0x3f] | spfunction7[right2 & 0x3f])
      }
      temp = left; left = right; right = temp //unreverse left and right
    } //for either 1 or 3 iterations
    //move then each one bit to the right
    left = ((left >>> 1) | (left << 31))
    right = ((right >>> 1) | (right << 31))
    //now perform IP-1, which is IP in the opposite direction
    temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1)
    temp = ((right >>> 8) ^ left) & 0x00ff00ff; left ^= temp; right ^= (temp << 8)
    temp = ((right >>> 2) ^ left) & 0x33333333; left ^= temp; right ^= (temp << 2)
    temp = ((left >>> 16) ^ right) & 0x0000ffff; right ^= temp; left ^= (temp << 16)
    temp = ((left >>> 4) ^ right) & 0x0f0f0f0f; right ^= temp; left ^= (temp << 4)
    //for Cipher Block Chaining mode, xor the message with the previous result
    if (mode == 1) { if (encrypt) { cbcleft = left; cbcright = right } else { left ^= cbcleft2 as any; right ^= cbcright2 as any } }
    // tempresult += String.fromCharCode((left >>> 24), ((left >>> 16) & 0xff), ((left >>> 8) & 0xff), (left & 0xff), (right >>> 24), ((right >>> 16) & 0xff), ((right >>> 8) & 0xff), (right & 0xff))
    tempresult += String.fromCharCode(left >>> 24)
    tempresult += String.fromCharCode((left >>> 16) & 255)
    tempresult += String.fromCharCode((left >>> 8) & 255)
    tempresult += String.fromCharCode(left & 255)
    tempresult += String.fromCharCode(right >>> 24)
    tempresult += String.fromCharCode((right >>> 16) & 255)
    tempresult += String.fromCharCode((right >>> 8) & 255)
    tempresult += String.fromCharCode(right & 255)
    chunk += 8
    if (chunk == 512) { result += tempresult; tempresult = ""; chunk = 0 }
  } //for every 8 characters, or 64 bits in the message
  //return the result as an array
  result += tempresult
  result = result.replace(/\\0*$/g, "")
  if (!encrypt) { //如果是解密的话，解密结束后对PKCS7 padding进行解码，并转换成utf-8编码
    if (padding === 1) { //PKCS7 padding解码
      let len = result.length, paddingChars = 0
      len && (paddingChars = result.charCodeAt(len - 1));
      (paddingChars <= 8) && (result = result.substring(0, len - paddingChars))
    }
    //转换成UTF-8编码
    result = decodeURIComponent(escape(result))
  }
  return result
} //end of des

export function getPayload (base64String: string) {
  let result = ''
  for (let char of des(key, base64String, true, 0, '', 0)) {
    let n = char.charCodeAt(0)
    result += (n >> 4).toString(16)
    result += (n & 15).toString(16)
  }
  return result
}

export function generateX_S (url: string, cookie: string, body?: any): string {
  const P = new URL(url)
  let extra = ''
  if (body) {
    extra = JSON.stringify(body)
  } else {
    extra = ''
  }
  const params = {
    x1: md5(`url=${P.pathname}${extra}`), // 直接使用路径部分
    x2: '0|0|0|1|0|0|1|0|0|0|1|0|0|0|0', // 固定值
    x3: cookie.includes('a1=') ? cookie.split('a1=')[1].split(';')[0] : 'undefined', // 从cookie中获取a1
    x4: String(Date.now()) // 当前时间戳
  }
  // 使用 Object.entries 将对象转换为键值对数组，然后使用 join 方法构建查询字符串
  const payloadParts: string[] = Object.entries(params).map(([key, value]) => `${key}=${value}`)
  const mergeplst = payloadParts.join(';')

  const origin = {
    signSvn: '55',
    signType: 'x2',
    appId: 'xhs-pc-web',
    signVersion: '1',
    payload: getPayload(mergeplst)
  }
  return 'XYW_' + btoa(JSON.stringify(origin)) + '='
}
/*
x1=get直接md5(url的路径部分)，post就再拼接参数
x2=固定值
x3=可以写成undefined  cookie中的a1
x4=时间戳
* */