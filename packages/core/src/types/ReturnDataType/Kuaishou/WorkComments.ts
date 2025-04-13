export type KsWorkComments = {
  data: Data;
  [property: string]: any
}

type Data = {
  visionCommentList: VisionCommentList;
  [property: string]: any
}

type VisionCommentList = {
  __typename: string
  commentCount: number
  pcursor: string
  rootComments: RootComment[];
  [property: string]: any
}

type RootComment = {
  __typename: string
  authorId: string
  authorLiked: boolean
  authorName: string
  commentId: string
  content: string
  headurl: string
  liked: boolean
  likedCount: string
  realLikedCount: number
  status: string
  subCommentCount: number | null
  subComments: SubComment[]
  subCommentsPcursor: null | string
  timestamp: number;
  [property: string]: any
}

type SubComment = {
  __typename: string
  authorId: string
  authorLiked: boolean
  authorName: string
  commentId: string
  content: string
  headurl: string
  liked: boolean
  likedCount: string
  realLikedCount: number
  replyTo: string
  replyToUserName: string
  status: string
  timestamp: number;
  [property: string]: any
}
