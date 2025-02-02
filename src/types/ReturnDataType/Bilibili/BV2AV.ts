export type Bv2AV = {
  code: number
  data: Data
  message: string;
  [property: string]: any
}

type Data = {
  aid: string;
  [property: string]: any
}
