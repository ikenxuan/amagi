export type Av2Bv = {
  code: number
  data: Data
  message: string;
  [property: string]: any
}

type Data = {
  bvid: string;
  [property: string]: any
}
