import crypto from 'crypto'

// https://github.com/liasica/desjs/blob/master/src/index.ts
function des (key: string, message: string, encrypt: number, mode: number, iv: string, padding: number) {
  //declaring this locally speeds things up a bit
  var spfunction1 = new Array(0x1010400, 0, 0x10000, 0x1010404, 0x1010004, 0x10404, 0x4, 0x10000, 0x400, 0x1010400, 0x1010404, 0x400, 0x1000404, 0x1010004, 0x1000000, 0x4, 0x404, 0x1000400, 0x1000400, 0x10400, 0x10400, 0x1010000, 0x1010000, 0x1000404, 0x10004, 0x1000004, 0x1000004, 0x10004, 0, 0x404, 0x10404, 0x1000000, 0x10000, 0x1010404, 0x4, 0x1010000, 0x1010400, 0x1000000, 0x1000000, 0x400, 0x1010004, 0x10000, 0x10400, 0x1000004, 0x400, 0x4, 0x1000404, 0x10404, 0x1010404, 0x10004, 0x1010000, 0x1000404, 0x1000004, 0x404, 0x10404, 0x1010400, 0x404, 0x1000400, 0x1000400, 0, 0x10004, 0x10400, 0, 0x1010004)
  var spfunction2 = new Array(-0x7fef7fe0, -0x7fff8000, 0x8000, 0x108020, 0x100000, 0x20, -0x7fefffe0, -0x7fff7fe0, -0x7fffffe0, -0x7fef7fe0, -0x7fef8000, -0x80000000, -0x7fff8000, 0x100000, 0x20, -0x7fefffe0, 0x108000, 0x100020, -0x7fff7fe0, 0, -0x80000000, 0x8000, 0x108020, -0x7ff00000, 0x100020, -0x7fffffe0, 0, 0x108000, 0x8020, -0x7fef8000, -0x7ff00000, 0x8020, 0, 0x108020, -0x7fefffe0, 0x100000, -0x7fff7fe0, -0x7ff00000, -0x7fef8000, 0x8000, -0x7ff00000, -0x7fff8000, 0x20, -0x7fef7fe0, 0x108020, 0x20, 0x8000, -0x80000000, 0x8020, -0x7fef8000, 0x100000, -0x7fffffe0, 0x100020, -0x7fff7fe0, -0x7fffffe0, 0x100020, 0x108000, 0, -0x7fff8000, 0x8020, -0x80000000, -0x7fefffe0, -0x7fef7fe0, 0x108000)
  var spfunction3 = new Array(0x208, 0x8020200, 0, 0x8020008, 0x8000200, 0, 0x20208, 0x8000200, 0x20008, 0x8000008, 0x8000008, 0x20000, 0x8020208, 0x20008, 0x8020000, 0x208, 0x8000000, 0x8, 0x8020200, 0x200, 0x20200, 0x8020000, 0x8020008, 0x20208, 0x8000208, 0x20200, 0x20000, 0x8000208, 0x8, 0x8020208, 0x200, 0x8000000, 0x8020200, 0x8000000, 0x20008, 0x208, 0x20000, 0x8020200, 0x8000200, 0, 0x200, 0x20008, 0x8020208, 0x8000200, 0x8000008, 0x200, 0, 0x8020008, 0x8000208, 0x20000, 0x8000000, 0x8020208, 0x8, 0x20208, 0x20200, 0x8000008, 0x8020000, 0x8000208, 0x208, 0x8020000, 0x20208, 0x8, 0x8020008, 0x20200)
  var spfunction4 = new Array(0x802001, 0x2081, 0x2081, 0x80, 0x802080, 0x800081, 0x800001, 0x2001, 0, 0x802000, 0x802000, 0x802081, 0x81, 0, 0x800080, 0x800001, 0x1, 0x2000, 0x800000, 0x802001, 0x80, 0x800000, 0x2001, 0x2080, 0x800081, 0x1, 0x2080, 0x800080, 0x2000, 0x802080, 0x802081, 0x81, 0x800080, 0x800001, 0x802000, 0x802081, 0x81, 0, 0, 0x802000, 0x2080, 0x800080, 0x800081, 0x1, 0x802001, 0x2081, 0x2081, 0x80, 0x802081, 0x81, 0x1, 0x2000, 0x800001, 0x2001, 0x802080, 0x800081, 0x2001, 0x2080, 0x800000, 0x802001, 0x80, 0x800000, 0x2000, 0x802080)
  var spfunction5 = new Array(0x100, 0x2080100, 0x2080000, 0x42000100, 0x80000, 0x100, 0x40000000, 0x2080000, 0x40080100, 0x80000, 0x2000100, 0x40080100, 0x42000100, 0x42080000, 0x80100, 0x40000000, 0x2000000, 0x40080000, 0x40080000, 0, 0x40000100, 0x42080100, 0x42080100, 0x2000100, 0x42080000, 0x40000100, 0, 0x42000000, 0x2080100, 0x2000000, 0x42000000, 0x80100, 0x80000, 0x42000100, 0x100, 0x2000000, 0x40000000, 0x2080000, 0x42000100, 0x40080100, 0x2000100, 0x40000000, 0x42080000, 0x2080100, 0x40080100, 0x100, 0x2000000, 0x42080000, 0x42080100, 0x80100, 0x42000000, 0x42080100, 0x2080000, 0, 0x40080000, 0x42000000, 0x80100, 0x2000100, 0x40000100, 0x80000, 0, 0x40080000, 0x2080100, 0x40000100)
  var spfunction6 = new Array(0x20000010, 0x20400000, 0x4000, 0x20404010, 0x20400000, 0x10, 0x20404010, 0x400000, 0x20004000, 0x404010, 0x400000, 0x20000010, 0x400010, 0x20004000, 0x20000000, 0x4010, 0, 0x400010, 0x20004010, 0x4000, 0x404000, 0x20004010, 0x10, 0x20400010, 0x20400010, 0, 0x404010, 0x20404000, 0x4010, 0x404000, 0x20404000, 0x20000000, 0x20004000, 0x10, 0x20400010, 0x404000, 0x20404010, 0x400000, 0x4010, 0x20000010, 0x400000, 0x20004000, 0x20000000, 0x4010, 0x20000010, 0x20404010, 0x404000, 0x20400000, 0x404010, 0x20404000, 0, 0x20400010, 0x10, 0x4000, 0x20400000, 0x404010, 0x4000, 0x400010, 0x20004010, 0, 0x20404000, 0x20000000, 0x400010, 0x20004010)
  var spfunction7 = new Array(0x200000, 0x4200002, 0x4000802, 0, 0x800, 0x4000802, 0x200802, 0x4200800, 0x4200802, 0x200000, 0, 0x4000002, 0x2, 0x4000000, 0x4200002, 0x802, 0x4000800, 0x200802, 0x200002, 0x4000800, 0x4000002, 0x4200000, 0x4200800, 0x200002, 0x4200000, 0x800, 0x802, 0x4200802, 0x200800, 0x2, 0x4000000, 0x200800, 0x4000000, 0x200800, 0x200000, 0x4000802, 0x4000802, 0x4200002, 0x4200002, 0x2, 0x200002, 0x4000000, 0x4000800, 0x200000, 0x4200800, 0x802, 0x200802, 0x4200800, 0x802, 0x4000002, 0x4200802, 0x4200000, 0x200800, 0, 0x2, 0x4200802, 0, 0x200802, 0x4200000, 0x800, 0x4000002, 0x4000800, 0x800, 0x200002)
  var spfunction8 = new Array(0x10001040, 0x1000, 0x40000, 0x10041040, 0x10000000, 0x10001040, 0x40, 0x10000000, 0x40040, 0x10040000, 0x10041040, 0x41000, 0x10041000, 0x41040, 0x1000, 0x40, 0x10040000, 0x10000040, 0x10001000, 0x1040, 0x41000, 0x40040, 0x10040040, 0x10041000, 0x1040, 0, 0, 0x10040040, 0x10000040, 0x10001000, 0x41040, 0x40000, 0x41040, 0x40000, 0x10041000, 0x1000, 0x40, 0x10040040, 0x1000, 0x41040, 0x10001000, 0x40, 0x10000040, 0x10040000, 0x10040040, 0x10000000, 0x40000, 0x10001040, 0, 0x10041040, 0x40040, 0x10000040, 0x10040000, 0x10001000, 0x10001040, 0, 0x10041040, 0x41000, 0x41000, 0x1040, 0x1040, 0x40040, 0x10000000, 0x10041000)

  //create the 16 or 48 subkeys we will need
  // var keys = des_createKeys(key);
  var keys = [187050025, 472920585, 186915882, 876157969, 255199502, 806945584, 220596020, 958210835, 757275681, 940378667, 489892883, 705504304, 354103316, 688857884, 890312192, 219096591, 622400037, 254088489, 907618332, 52759587, 907877143, 53870614, 839463457, 389417746, 975774727, 372382245, 437136414, 909246726, 168694017, 473575703, 52697872, 1010440969]


  var m = 0, i, j, temp, temp2, right1, right2, left, right, looping
  var cbcleft = 0, cbcleft2 = 0, cbcright = 0, cbcright2 = 0
  var endloop, loopinc
  var len = message.length
  var chunk = 0
  //set up the loops for single and triple des
  var iterations = keys.length == 32 ? 3 : 9 //single or triple des
  if (iterations == 3) {
    looping = encrypt ? new Array(0, 32, 2) : new Array(30, -2, -2)
  } else {
    looping = encrypt ? new Array(0, 32, 2, 62, 30, -2, 64, 96, 2) : new Array(94, 62, -2, 32, 64, 2, 30, -2, -2)
  }

  //pad the message depending on the padding parameter
  if (padding == 2) message += "        " //pad the message with spaces
  else if (padding == 1) {
    temp = 8 - (len % 8)
    message += String.fromCharCode(temp, temp, temp, temp, temp, temp, temp, temp)
    if (temp == 8) len += 8
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
    if (mode == 1) {
      if (encrypt) {
        left ^= cbcleft
        right ^= cbcright
      } else {
        cbcleft2 = cbcleft
        cbcright2 = cbcright
        cbcleft = left
        cbcright = right
      }
    }

    //first each 64 but chunk of the message must be permuted according to IP
    temp = ((left >>> 4) ^ right) & 0x0f0f0f0f
    right ^= temp
    left ^= (temp << 4)
    temp = ((left >>> 16) ^ right) & 0x0000ffff
    right ^= temp
    left ^= (temp << 16)
    temp = ((right >>> 2) ^ left) & 0x33333333
    left ^= temp
    right ^= (temp << 2)
    temp = ((right >>> 8) ^ left) & 0x00ff00ff
    left ^= temp
    right ^= (temp << 8)
    temp = ((left >>> 1) ^ right) & 0x55555555
    right ^= temp
    left ^= (temp << 1)

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
      temp = left
      left = right
      right = temp //unreverse left and right
    } //for either 1 or 3 iterations

    //move then each one bit to the right
    left = ((left >>> 1) | (left << 31))
    right = ((right >>> 1) | (right << 31))

    //now perform IP-1, which is IP in the opposite direction
    temp = ((left >>> 1) ^ right) & 0x55555555
    right ^= temp
    left ^= (temp << 1)
    temp = ((right >>> 8) ^ left) & 0x00ff00ff
    left ^= temp
    right ^= (temp << 8)
    temp = ((right >>> 2) ^ left) & 0x33333333
    left ^= temp
    right ^= (temp << 2)
    temp = ((left >>> 16) ^ right) & 0x0000ffff
    right ^= temp
    left ^= (temp << 16)
    temp = ((left >>> 4) ^ right) & 0x0f0f0f0f
    right ^= temp
    left ^= (temp << 4)

    //for Cipher Block Chaining mode, xor the message with the previous result
    if (mode == 1) {
      if (encrypt) {
        cbcleft = left
        cbcright = right
      } else {
        left ^= cbcleft2
        right ^= cbcright2
      }
    }
    tempresult += String.fromCharCode((left >>> 24), ((left >>> 16) & 0xff), ((left >>> 8) & 0xff), (left & 0xff), (right >>> 24), ((right >>> 16) & 0xff), ((right >>> 8) & 0xff), (right & 0xff))

    chunk += 8
    if (chunk == 512) {
      result += tempresult
      tempresult = ""
      chunk = 0
    }
  } //for every 8 characters, or 64 bits in the message

  //return the result as an array
  return result + tempresult
} //end of des


//des_createKeys
//this takes as input a 64 bit key (even though only 56 bits are used)
//as an array of 2 integers, and returns 16 48 bit keys
function des_createKeys (key: string) {
  //declaring this locally speeds things up a bit
  var pc2bytes0 = new Array(0, 0x4, 0x20000000, 0x20000004, 0x10000, 0x10004, 0x20010000, 0x20010004, 0x200, 0x204, 0x20000200, 0x20000204, 0x10200, 0x10204, 0x20010200, 0x20010204)
  var pc2bytes1 = new Array(0, 0x1, 0x100000, 0x100001, 0x4000000, 0x4000001, 0x4100000, 0x4100001, 0x100, 0x101, 0x100100, 0x100101, 0x4000100, 0x4000101, 0x4100100, 0x4100101)
  var pc2bytes2 = new Array(0, 0x8, 0x800, 0x808, 0x1000000, 0x1000008, 0x1000800, 0x1000808, 0, 0x8, 0x800, 0x808, 0x1000000, 0x1000008, 0x1000800, 0x1000808)
  var pc2bytes3 = new Array(0, 0x200000, 0x8000000, 0x8200000, 0x2000, 0x202000, 0x8002000, 0x8202000, 0x20000, 0x220000, 0x8020000, 0x8220000, 0x22000, 0x222000, 0x8022000, 0x8222000)
  var pc2bytes4 = new Array(0, 0x40000, 0x10, 0x40010, 0, 0x40000, 0x10, 0x40010, 0x1000, 0x41000, 0x1010, 0x41010, 0x1000, 0x41000, 0x1010, 0x41010)
  var pc2bytes5 = new Array(0, 0x400, 0x20, 0x420, 0, 0x400, 0x20, 0x420, 0x2000000, 0x2000400, 0x2000020, 0x2000420, 0x2000000, 0x2000400, 0x2000020, 0x2000420)
  var pc2bytes6 = new Array(0, 0x10000000, 0x80000, 0x10080000, 0x2, 0x10000002, 0x80002, 0x10080002, 0, 0x10000000, 0x80000, 0x10080000, 0x2, 0x10000002, 0x80002, 0x10080002)
  var pc2bytes7 = new Array(0, 0x10000, 0x800, 0x10800, 0x20000000, 0x20010000, 0x20000800, 0x20010800, 0x20000, 0x30000, 0x20800, 0x30800, 0x20020000, 0x20030000, 0x20020800, 0x20030800)
  var pc2bytes8 = new Array(0, 0x40000, 0, 0x40000, 0x2, 0x40002, 0x2, 0x40002, 0x2000000, 0x2040000, 0x2000000, 0x2040000, 0x2000002, 0x2040002, 0x2000002, 0x2040002)
  var pc2bytes9 = new Array(0, 0x10000000, 0x8, 0x10000008, 0, 0x10000000, 0x8, 0x10000008, 0x400, 0x10000400, 0x408, 0x10000408, 0x400, 0x10000400, 0x408, 0x10000408)
  var pc2bytes10 = new Array(0, 0x20, 0, 0x20, 0x100000, 0x100020, 0x100000, 0x100020, 0x2000, 0x2020, 0x2000, 0x2020, 0x102000, 0x102020, 0x102000, 0x102020)
  var pc2bytes11 = new Array(0, 0x1000000, 0x200, 0x1000200, 0x200000, 0x1200000, 0x200200, 0x1200200, 0x4000000, 0x5000000, 0x4000200, 0x5000200, 0x4200000, 0x5200000, 0x4200200, 0x5200200)
  var pc2bytes12 = new Array(0, 0x1000, 0x8000000, 0x8001000, 0x80000, 0x81000, 0x8080000, 0x8081000, 0x10, 0x1010, 0x8000010, 0x8001010, 0x80010, 0x81010, 0x8080010, 0x8081010)
  var pc2bytes13 = new Array(0, 0x4, 0x100, 0x104, 0, 0x4, 0x100, 0x104, 0x1, 0x5, 0x101, 0x105, 0x1, 0x5, 0x101, 0x105)

  //how many iterations (1 for des, 3 for triple des)
  var iterations = key.length > 8 ? 3 : 1 //changed by Paul 16/6/2007 to use Triple DES for 9+ byte keys
  //stores the return keys
  var keys = new Array(32 * iterations)
  //now define the left shifts which need to be done
  var shifts = new Array(0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0)
  //other variables
  var lefttemp, righttemp, m = 0, n = 0, temp, left, right

  for (var j = 0; j < iterations; j++) { //either 1 or 3 iterations
    left = (key.charCodeAt(m++) << 24) | (key.charCodeAt(m++) << 16) | (key.charCodeAt(m++) << 8) | key.charCodeAt(m++)
    right = (key.charCodeAt(m++) << 24) | (key.charCodeAt(m++) << 16) | (key.charCodeAt(m++) << 8) | key.charCodeAt(m++)

    temp = ((left >>> 4) ^ right) & 0x0f0f0f0f
    right ^= temp
    left ^= (temp << 4)
    temp = ((right >>> -16) ^ left) & 0x0000ffff
    left ^= temp
    right ^= (temp << -16)
    temp = ((left >>> 2) ^ right) & 0x33333333
    right ^= temp
    left ^= (temp << 2)
    temp = ((right >>> -16) ^ left) & 0x0000ffff
    left ^= temp
    right ^= (temp << -16)
    temp = ((left >>> 1) ^ right) & 0x55555555
    right ^= temp
    left ^= (temp << 1)
    temp = ((right >>> 8) ^ left) & 0x00ff00ff
    left ^= temp
    right ^= (temp << 8)
    temp = ((left >>> 1) ^ right) & 0x55555555
    right ^= temp
    left ^= (temp << 1)

    //the right side needs to be shifted and to get the last four bits of the left side
    temp = (left << 8) | ((right >>> 20) & 0x000000f0)
    //left needs to be put upside down
    left = (right << 24) | ((right << 8) & 0xff0000) | ((right >>> 8) & 0xff00) | ((right >>> 24) & 0xf0)
    right = temp

    //now go through and perform these shifts on the left and right keys
    for (var i = 0; i < shifts.length; i++) {
      //shift the keys either one or two bits to the left
      if (shifts[i]) {
        left = (left << 2) | (left >>> 26)
        right = (right << 2) | (right >>> 26)
      } else {
        left = (left << 1) | (left >>> 27)
        right = (right << 1) | (right >>> 27)
      }
      left &= -0xf
      right &= -0xf

      //now apply PC-2, in such a way that E is easier when encrypting or decrypting
      //this conversion will look like PC-2 except only the last 6 bits of each byte are used
      //rather than 48 consecutive bits and the order of lines will be according to
      //how the S selection functions will be applied: S2, S4, S6, S8, S1, S3, S5, S7
      lefttemp = pc2bytes0[left >>> 28] | pc2bytes1[(left >>> 24) & 0xf]
        | pc2bytes2[(left >>> 20) & 0xf] | pc2bytes3[(left >>> 16) & 0xf]
        | pc2bytes4[(left >>> 12) & 0xf] | pc2bytes5[(left >>> 8) & 0xf]
        | pc2bytes6[(left >>> 4) & 0xf]
      righttemp = pc2bytes7[right >>> 28] | pc2bytes8[(right >>> 24) & 0xf]
        | pc2bytes9[(right >>> 20) & 0xf] | pc2bytes10[(right >>> 16) & 0xf]
        | pc2bytes11[(right >>> 12) & 0xf] | pc2bytes12[(right >>> 8) & 0xf]
        | pc2bytes13[(right >>> 4) & 0xf]
      temp = ((righttemp >>> 16) ^ lefttemp) & 0x0000ffff
      keys[n++] = lefttemp ^ temp
      keys[n++] = righttemp ^ (temp << 16)
    }
  } //for each iterations
  //return the keys we've created
  return keys
} //end of des_createKeys

enum Padding {
  NULL = 0,
  PKCS7 = 1,
  SPACES = 2,
  NONE = 3
}

enum Mode {
  ECB = 0,
  CBC = 1
}

var encodeHex = function (s: string) {
  let r = ''
  const hexes = new Array('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f')
  for (let i = 0; i < s.length; i++) {
    r += hexes[s.charCodeAt(i) >> 4] + hexes[s.charCodeAt(i) & 0xf]
  }
  return r
}

var decodeHex = function (h: string) {
  let r = ''
  for (let i = (h.substring(0, 2) === '0x') ? 2 : 0; i < h.length; i += 2) {
    r += String.fromCharCode(parseInt(h.substring(i, i + 2), 16))
  }
  return r
}


function get_des (message: any) {
  return encodeHex(des('', message, 1, 0, '', 0))
}


//
export const encrypt = (key: string, message: string, iv?: string, padding: Padding = Padding.NONE): string => {
  const mode = iv ? Mode.CBC : Mode.ECB
  return encodeHex(des(key, message, 1, mode, '0', padding))
}

export const decrypt = (key: string, message: string, iv?: string, padding: Padding = Padding.NONE) => {
  const mode = iv ? Mode.CBC : Mode.ECB
  return des(key, decodeHex(message), 0, mode, '0', padding).replace(/\0/g, '')
}

// const args = 'x1=92c7ec80b4feef42115c62d485016884;x2=0|0|0|1|0|0|1|0|0|0|1|0|0|0|0;x3=18ca5e2e2f9ohp3xfg6wjydj9e14187w0owsxd7av50000324964;x4=1703656749375;'

// let base64String = btoa(args)

// // 加密测试
// var message = base64String
// var aaa = encodeHex(des(undefined, message, 1, 0, undefined, 0));
// console.log(aaa);

export function generateX_S (url: string, cookie: string, body?: any) {
  const P = new URL(url)
  let extra = ''
  if (body) {
    extra = JSON.stringify(body)
  } else {
    extra = ''
  }

  const zhiwen = 'I38rHdgsjopgIvesdVwgIC+oIELmBZ5e3VwXLgFTIxS3bqwErFeexd0ekncAzMFYnqthIhJeSBMDKutRI3KsYorWHPtGrbV0P9WfIi/eWc6eYqtyQApPI37ekmR6QL+5Ii6sdneeSfqYHqwl2qt5B0DBIx+PGDi/sVtkIxdsxuwr4qtiIhuaIE3e3LV0I3VTIC7e0utl2ADmsLveDSKsSPw5IEvsiVtJOqw8BuwfPpdeTFWOIx4TIiu6ZPwrPut5IvlaLbgs3qtxIxes1VwHIkumIkIyejgsY/WTge7eSqte/D7sDcpipedeYrDtIC6eDVw2IENsSqtlnlSuNjVtIx5e1qt3bmAeVn8LIESaIEY+wn4iI3Yq8lEgIkLxoqwkICqV2d3ejIgs1uwRIvge00de00uPIi7e1bmDyuwuIiKeTf0sxm/e1Vt4LsJeWVwRIvYpaAdedVwALngsfPwgIxQrIvkkoVwGzVw+ag4QPW/edngeTVwoIEosjBAsxLrvIE0s0L3s6fGdIhNs3uwvIEmWtuwpOqwCI3JeTVtFIk3siqwVIEosfVtFNVwJsuwXIvHAIxh/8oHW2ZgexVt7IhhKIiNeDqw4rY+z/U6sYa+TIiPe4VtbmqwlIv6exVtDtF/eTm7sVDTeIhOskdgs3qtcpPwoIC0ejqwRIi/eT/ieIvNedfNefPt7Ix0s1uwu2fWBIEcnICgsVM6s6eesSI3eDVtQIvzzIxcEaqwpI3+CIk3s6FD3GUOsjutaIEM2mPtXylAsdM6efqwBeVwJIC+xIiqNpuwG8utbIvoe0zNskut2rVw2Ik4Urut4Iv8Qzs4ZIEve0agedD3edutQwI=='

  const params = {
    x1: crypto.createHash('md5').update(`url=${P.pathname}${extra}`).digest('hex'), // 直接使用路径部分
    x2: '0|0|0|1|0|0|1|0|0|0|1|0|0|0|0', // 固定值
    x3: cookie.includes('a1=') ? cookie.split('a1=')[1].split(';')[0] : 'undefined', // 从cookie中获取a1
    x4: Date.now().toString() // 当前时间戳
  }

  // 使用 Object.entries 将对象转换为键值对数组，然后使用 join 方法构建查询字符串
  const payloadParts: string[] = Object.entries(params).map(([key, value]) => `${key}=${value}`)
  const mergeplst = payloadParts.join(';')

  const origin = {
    signSvn: '55',
    signType: 'x2',
    appId: 'xhs-pc-web',
    signVersion: '1',
    payload: encodeHex(des('', btoa(mergeplst), 1, 0, '', 0))
  }
  console.log('X-s: ' + origin.payload)
  return {
    'X-s': 'XYW_' + btoa(JSON.stringify(origin)) + '=',
    'X-t': params.x4
  }
}


// // 解密测试
// var result = des(undefined, decodeHex(aaa), 0, 0, undefined, 0).replace(/\0/g, '');
// console.log(atob(result));
