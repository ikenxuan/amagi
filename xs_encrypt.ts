// see https://github.com/Cloxl/xhshow/issues/4
// see https://blog.csdn.net/cz124560/article/details/145550404
import Crypto from 'crypto-js'
import { Buffer } from 'buffer'
import axios from 'axios'

function to_hex_str (encodedData: string): string {
  const decodedData: string = Buffer.from(encodedData, 'base64').toString('binary')
  let hexString: string = ''
  for (let i = 0; i < decodedData.length; i++) {
    hexString += decodedData.charCodeAt(i).toString(16).padStart(2, '0')
  }

  return hexString
}

// console.log((Crypto.enc.Utf8.parse("Q,7P80&\x01>gq\x06+S'J")))
// 盐
const iv: Crypto.lib.WordArray = Crypto.enc.Utf8.parse('4hrivgw5s342f9b2')
const key = {
  words: [1735160886, 1748382068, 1631021929, 1936684855],
  sigBytes: 16
}

const xText: string = 'x1=db60136f3d5e6dc6dc2304c3268031e2;x2=0|0|0|1|0|0|1|0|0|0|1|0|0|0|0|1|0|0|0;x3=196d54a86df74nkzjh32akqioy0okxuc7ielezi1r50000628328;x4=1747335515971;'
const text: Crypto.lib.WordArray = Crypto.enc.Utf8.parse(Buffer.from(xText).toString('base64'))

let aes_result: string = Crypto.AES.encrypt(text, Crypto.lib.WordArray.create(key.words, key.sigBytes), {
  iv: iv,
  mode: Crypto.mode.CBC,
  padding: Crypto.pad.Pkcs7
}).toString()
aes_result = to_hex_str(aes_result)
console.log(aes_result)

const obj: { signSvn: string; signType: string; appID: string; signVersion: string; payload?: string } = {
  "signSvn": "55",
  "signType": "x2",
  "appID": "xhs-pc-web",
  "signVersion": "1",
}
obj['payload'] = aes_result

const api = 'url=api/sns/web/v1/feed{"source_note_id":"680e0141000000002102daa5","image_formats":["jpg","webp","avif"],"extra":{"need_body_topic":"1"},"xsec_source":"pc_feed","xsec_token":"AB90HbDHDTAjiCQgdIeJmShEFb5pKgyBRV07A8J2CM7wM="}'
const postPayload = '{"source_note_id":"680e0141000000002102daa5","image_formats":["jpg","webp","avif"],"extra":{"need_body_topic":"1"},"xsec_source":"pc_feed","xsec_token":"AB90HbDHDTAjiCQgdIeJmShEFb5pKgyBRV07A8J2CM7wM="}'

const xs = 'XYW_' + Buffer.from(JSON.stringify(obj), 'binary').toString('base64')

const resp2 = await axios.post(
  'https://edith.xiaohongshu.com/api/sns/web/v1/feed',
  {
    source_note_id: '680e0141000000002102daa5',
    image_formats: ['jpg', 'webp', 'avif'],
    extra: {
      need_body_topic: '1'
    },
    xsec_source: 'pc_feed',
    xsec_token: 'AB90HbDHDTAjiCQgdIeJmShEFb5pKgyBRV07A8J2CM7wM='
  },
  {
    headers: {
      'cookie': 'xxx',
      "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0',
      'x-s': xs,
      'x-t': '1747335515971',
      'x-b3-traceid': 'b34aa86d678ed609',
      'x-mns': 'unload',
      'x-s-common': '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',
      'x-xray-traceid': 'cb6aa8078ceb26856cae9e129ff29a10',
      'referer': 'https://www.xiaohongshu.com/'
    }
  }
)

debugger