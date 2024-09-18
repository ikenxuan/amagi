import { generateX_S } from './generateX_S'
// @ts-ignore
import { xsCommon } from './generateX_S_Common.js'
class S {
  x_b3_traceid (): string {
    for (var t = "", e = 0; e < 16; e++)
      t += "abcdef0123456789".charAt(Math.floor(16 * Math.random()))
    return t
  }

  /**
   * 
   * @param url 接口地址
   * @param cookie 小红书用户 ck
   * @returns 
   */
  x_s (url: string, cookie: string): string {
    return generateX_S(url, cookie)

  }

  x_s_common (data: { x_s: string, cookie: string }): string {
    return xsCommon({
      x_t: Date.now(),
      x_s: data.x_s,
      a1: data.cookie.includes('a1=') ? data.cookie.split('a1=')[1].split(';')[0] : 'undefined',
      fingerprint: 'I38rHdgsjopgIvesdVwgIC+oIELmBZ5e3VwXLgFTIxS3bqwErFeexd0ekncAzMFYnqthIhJed9MDKutRI3KsYorWHPtGrbV0P9WfIi/eWc6eYqtyQApPI37ekmR1QL+5Ii6sdnoeSfqYHqwl2qt5B0DoIx+PGDi/sVtkIxdsxuwr4qtiIkrwIi/skcc3I3VvIC7sYuwXq9qtpFveDSJsSPwXIEvsiVtJOPw8BuwfPpdeTDWOIx4VIiu1ZPwbPutXIvlaLb/s3qtxIxes1VwHIkumIkIyejgsY/WTge7eSqte/D7sDcpipedeYrDtIC6eDVw2IENsSqtlnlSuNjVtIvoekqwMgbOe1eY2IESPIhhgQdIUI38PqW88IizuBVwMIvGF4B6sdcNskVwVIC7eWo7sYeSqIk5eTDmY2uwjIhJs6f0s3SgeiVt/c9deYqwCICMyL/0efPwELnOsSVwBI3T2I3kkouw+gVwesBZ/yLOsYeOeVPwyIh7sjg6exmSuIENejlOe3dhkIiJsTVt0IkLdPuwJ2qw0ICvs6qwAIiNs3uw5Ikvsdqt5wuwLoVw7IvrEIxWcGnFD4IvexPtIIhDrIi6eDVwgbmm2Ls5sjjY6IiLoJqtPmVwvIv7exVtf+ree1lJsVrMZIE0s37JskutnpPwHIvKe0qwUIi5eTAubICdeS9oeDVtlIxds6uwTG7QBIEr4IvesxMgeka/ejDesYPtQIiM7ICcDcuwzICIJI33sVzbIy7OsWqw+IhpcbuwFJWesYpKeSuwprVwZIxkAIiqynPwtqPtNIv5sSM5siPt+sVwBICEYLPt1'
    })
  }
}

export const Sign = new S()