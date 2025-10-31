export type XiaohongshuEmojiList = {
  code: number
  data: DataData
  msg: string
  success: boolean;
  [property: string]: any
}

type DataData = {
  emoji: DataEmoji
  result: Result
  version: number;
  [property: string]: any
}

type DataEmoji = {
  tabs: Tab[];
  [property: string]: any
}

type Tab = {
  collection?: Collection[];
  [property: string]: any
}

type Collection = {
  emoji: EmojiElement[]
  name: string;
  [property: string]: any
}

type EmojiElement = {
  image: string
  image_name: string;
  [property: string]: any
}

type Result = {
  code: number
  message: string
  success: boolean;
  [property: string]: any
}
