export type EmojiList = {
  emoji_list: EmojiListElement[]
  status_code: number
  version: number;
  [property: string]: any
}

type EmojiListElement = {
  display_name: string
  emoji_url: Emojiurl
  hide: number
  origin_uri: string;
  [property: string]: any
}

type Emojiurl = {
  uri: string
  url_list: string[];
  [property: string]: any
}
