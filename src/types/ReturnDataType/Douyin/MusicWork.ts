export type MusicWork = {
  extra: Extra
  feature_data: { [key: string]: any }
  high_upload_ratio: number
  log_pb: LogPb
  msg: string
  music_info: MusicInfo
  rec_list: string[]
  related_effects: null
  related_musics: null
  small_banner: string[]
  status_code: number
  trends_infos: null;
  [property: string]: any
}

type Extra = {
  fatal_item_ids: string[]
  logid: string
  now: number;
  [property: string]: any
}

type LogPb = {
  impr_id: string;
  [property: string]: any
}

type MusicInfo = {
  album: string
  artist_user_infos: null
  artists: string[]
  audition_duration: number
  author: string
  author_deleted: boolean
  author_position: null
  author_status: number
  avatar_large: AvatarLarge
  avatar_medium: AvatarMedium
  avatar_thumb: AvatarThumb
  binded_challenge_id: number
  can_background_play: boolean
  collect_stat: number
  cover_hd: Coverhd
  cover_large: CoverLarge
  cover_medium: MusicInfoCoverMedium
  cover_thumb: CoverThumb
  dmv_auto_show: boolean
  dsp_status: number
  duration: number
  end_time: number
  external_song_info: string[]
  extra: string
  id: number
  id_str: string
  is_audio_url_with_cookie: boolean
  is_commerce_music: boolean
  is_del_video: boolean
  is_matched_metadata: boolean
  is_original: boolean
  is_original_sound: boolean
  is_pgc: boolean
  is_restricted: boolean
  is_video_self_see: boolean
  luna_info: LunaInfo
  lyric_short_position: null
  matched_pgc_sound: MatchedPgcSound
  mid: string
  music_chart_ranks: null
  music_collect_count: number
  music_cover_atmosphere_color_value: string
  music_status: number
  musician_user_infos: null
  mute_share: boolean
  offline_desc: string
  original_musician_display_name: string
  owner_handle: string
  owner_id: string
  owner_nickname: string
  pgc_music_type: number
  play_url: Playurl
  position: null
  prevent_download: boolean
  prevent_item_download_status: number
  preview_end_time: number
  preview_start_time: number
  reason_type: number
  redirect: boolean
  schema_url: string
  search_impr: SearchImpr
  sec_uid: string
  share_info: ShareInfo
  shoot_duration: number
  song: Song
  source_platform: number
  start_time: number
  status: number
  strong_beat_url: StrongBeaturl
  tag_list: null
  title: string
  trend_music_start_time: number
  unified_music_group: UnifiedMusicGroup
  unshelve_countries: null
  user_count: number
  video_duration: number;
  [property: string]: any
}

type AvatarLarge = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type AvatarMedium = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type AvatarThumb = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Coverhd = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type CoverLarge = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type MusicInfoCoverMedium = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type CoverThumb = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type LunaInfo = {
  has_copyright: boolean
  is_luna_user: boolean;
  [property: string]: any
}

type MatchedPgcSound = {
  author: string
  cover_medium: MatchedPgcSoundCoverMedium
  id: number
  mixed_author: string
  mixed_title: string
  title: string;
  [property: string]: any
}

type MatchedPgcSoundCoverMedium = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Playurl = {
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type SearchImpr = {
  entity_id: string;
  [property: string]: any
}

type ShareInfo = {
  bool_persist: number
  share_desc: string
  share_desc_info: string
  share_quote: string
  share_signature_desc: string
  share_signature_url: string
  share_title: string
  share_title_myself: string
  share_title_other: string
  share_url: string
  share_weibo_desc: string;
  [property: string]: any
}

type Song = {
  artists: null
  chorus_v3_infos: null
  id: number
  id_str: string;
  [property: string]: any
}

type StrongBeaturl = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type UnifiedMusicGroup = {
  author: string
  medium_cover_url: MediumCoverurl
  song_id: number
  title: string;
  [property: string]: any
}

type MediumCoverurl = {
  uri: string
  url_list: string[];
  [property: string]: any
}
