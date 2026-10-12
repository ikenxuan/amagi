import { createHash } from 'node:crypto'
import { crc32 } from 'node:zlib'

import { callEndpoint, type ClientCtx } from 'amagi/client/fetcher'
import type { AnyEndpointDef } from 'amagi/contracts/endpoint'
import { AmagiHeaders, type RequestSpec } from 'amagi/contracts/request'
import { generateSecChUa } from 'amagi/contracts/ua'
import * as api from 'amagi/platforms/xiaohongshu/api'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
import { xiaohongshuJudge } from 'amagi/platforms/xiaohongshu/judge'
import { createXiaohongshuGuestCookie } from 'amagi/platforms/xiaohongshu/sign/guestCookie'
import { createXiaohongshuSigners } from 'amagi/platforms/xiaohongshu/sign/signers'
import { FingerprintGenerator } from 'amagi/platforms/xiaohongshu/sign/xhshow'
import { describe, expect, it, vi } from 'vitest'

const COOKIE = 'a1=1900000000abcdef0123456789abcdef; web_session=040069abc; webId=deadbeef; userId=viewer-1'

const harness = (responses: unknown[] = [], cookie = COOKIE) => {
  const requests: RequestSpec[] = []
  const ctx: ClientCtx = {
    clientId: 'xhs-port-test',
    platform: 'xiaohongshu',
    cookie,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/142.0.0.0',
    requestConfig: {},
    signers: createXiaohongshuSigners(),
    judge: xiaohongshuJudge,
    send: async (spec) => {
      requests.push(spec)
      return {
        status: 200,
        headers: new AmagiHeaders(),
        body: responses[requests.length - 1] ?? { code: 0, success: true, data: {} },
        durationMs: 0,
        url: spec.url
      }
    }
  }
  const call = async (name: string, params = {}) => {
    const def = (xiaohongshuRegistry as Record<string, AnyEndpointDef>)[name]
    expect(def, name + ' should be registered').toBeDefined()
    return callEndpoint(def, ctx, params)
  }
  return { requests, ctx, call }
}

const headersOf = (spec: RequestSpec) => new AmagiHeaders(spec.headers)

describe('xiaohongshu v7 port: requests', () => {
  it('searchUser sends nested request and accepts its code 1000 success response', async () => {
    const h = harness([{ code: 1000, success: true, data: { result: { code: 1000 }, users: [{ id: 'u1' }] } }])
    const result = await h.call('searchUser', { keyword: '猫', page: '2', page_size: '5' })
    expect(result.success).toBe(true)
    expect(h.requests[0]).toMatchObject({
      method: 'POST',
      url: 'https://edith.xiaohongshu.com/api/sns/web/v1/search/usersearch',
      body: { search_user_request: { keyword: '猫', page: 2, page_size: 5, biz_type: 'web_search_user' } }
    })
    expect(h.requests[0].body).toMatchObject({
      search_user_request: {
        search_id: expect.stringMatching(/^[a-z0-9]+$/),
        request_id: expect.stringMatching(/^\d+-\d+$/)
      }
    })
    expect(headersOf(h.requests[0]).get('x-s')).toMatch(/^XYS_/)
  })

  it('searchUser code 1000 does not make the same business code successful on other endpoints', async () => {
    const h = harness([{ code: 1000, success: false, msg: 'failed' }])
    const result = await h.call('noteDetail', { note_id: 'n1', xsec_token: 'tk' })
    expect(result.success).toBe(false)
  })

  it('searchHotList uses the mobile hot-list path without query or body', async () => {
    const h = harness()
    expect((await h.call('searchHotList')).success).toBe(true)
    expect(h.requests[0]).toMatchObject({ method: 'GET', url: 'https://edith.xiaohongshu.com/api/sns/mobile/v1/search/hot_list_h5' })
    expect(h.requests[0].body).toBeUndefined()
    expect(headersOf(h.requests[0]).get('x-s')).toMatch(/^XYS_/)
  })

  it('subComments carries the returned cursor and reduces the requested count on the next page', async () => {
    const h = harness([
      { code: 0, success: true, data: { comments: [{ id: 'c1' }], has_more: true, cursor: 'next==' } },
      { code: 0, success: true, data: { comments: [{ id: 'c2' }], has_more: false, cursor: 'end' } }
    ])
    const result = await h.call('subComments', { note_id: 'n1', root_comment_id: 'r1', xsec_token: 'token=', number: 2 })
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ data: { comments: [{ id: 'c1' }, { id: 'c2' }], cursor: 'end' } })
    expect(h.requests).toHaveLength(2)
    expect(h.requests[0].url).toBe(
      'https://edith.xiaohongshu.com/api/sns/web/v2/comment/sub/page?note_id=n1&root_comment_id=r1&num=2&cursor=&image_formats=jpg,webp,avif&top_comment_id=&xsec_token=token%3D'
    )
    expect(h.requests[1].url).toContain('num=1&cursor=next%3D%3D')
    expect(headersOf(h.requests[1]).get('x-b3-traceid')).toMatch(/^[a-f0-9]{16}$/)
  })

  it('liveRoom derives the web viewer id from the cookie and adds the live host headers', async () => {
    const h = harness()
    expect((await h.call('liveRoom', { room_id: 'room1' })).success).toBe(true)
    const req = h.requests[0]
    expect(req.url).toBe(
      'https://live-room.xiaohongshu.com/api/sns/red/live/web/v1/room/current_room_info?room_id=room1&source=web_live&request_user_id=viewer-1&client_type=1'
    )
    const headers = headersOf(req)
    expect(headers.get('xy-common-params')).toBe('platform=web')
    expect(headers.get('x-ratelimit-meta')).toBe('roomId=room1')
    expect(headers.get('x-xray-traceid')).toBeUndefined()
    expect(headers.get('x-b3-traceid')).toBeUndefined()
  })

  it('liveRoom h5 omits the web-only params and honors an explicit source', async () => {
    const h = harness()
    await h.call('liveRoom', { room_id: 'r1', variant: 'h5', source: 'share_out_of_app', request_user_id: 'ignored' })
    expect(h.requests[0].url).toBe(
      'https://live-room.xiaohongshu.com/api/sns/red/live/h5/v1/room/current_room_info?room_id=r1&source=share_out_of_app'
    )
  })

  it('liveStatus uses h5 status and does not add room-info rate-limit metadata', async () => {
    const h = harness()
    await h.call('liveStatus', { room_id: 'r1', scene: 'other' })
    expect(h.requests[0].url).toBe(
      'https://live-room.xiaohongshu.com/api/sns/red/live/h5/v1/core/current_live_status?room_id=r1&scene=other'
    )
    expect(headersOf(h.requests[0]).get('xy-common-params')).toBe('platform=web')
    expect(headersOf(h.requests[0]).get('x-ratelimit-meta')).toBeUndefined()
  })

  it('liveSquare encodes extra_info once and signs exactly the transmitted query', async () => {
    const h = harness()
    await h.call('liveSquare', { source: '13', size: '5', extra_info: { image_formats: ['jpg'] } })
    const req = h.requests[0]
    expect(req.url).toBe(
      'https://live-room.xiaohongshu.com/api/sns/red/live/web/feed/v1/squarefeed?source=13&category=0&pre_source=&extra_info=%7B%22image_formats%22:%5B%22jpg%22%5D%7D&size=5'
    )
    expect(req.extra?.signParams).toMatchObject({ size: 5, extra_info: '%7B%22image_formats%22:%5B%22jpg%22%5D%7D' })
  })

  it('liveSquare rejects an invalid page size before sending', async () => {
    const h = harness()
    expect((await h.call('liveSquare', { size: -1 })).success).toBe(false)
    expect(h.requests).toHaveLength(0)
  })

  it('userNoteList sends xsec_token and uses the captured XYS plus rap signing profile', async () => {
    const h = harness()
    await h.call('userNoteList', { user_id: 'u1', xsec_token: 'tk=', xsec_source: 'pc_search' })
    expect(h.requests[0].url).toContain('xsec_token=tk%3D&xsec_source=pc_search')
    expect(h.requests[0].extra?.signParams).toMatchObject({ xsec_token: 'tk=', xsec_source: 'pc_search' })
    expect(headersOf(h.requests[0]).get('x-s')).toMatch(/^XYS_/)
    expect(headersOf(h.requests[0]).get('x-rap-param')).toBeTruthy()
  })

  it('userProfile fetches JSON directly using target_user_id', async () => {
    const h = harness([{ code: 0, success: true, data: { basic_info: { nickname: 'test' } } }])
    expect((await h.call('userProfile', { user_id: 'u1' })).data).toMatchObject({ data: { basic_info: { nickname: 'test' } } })
    expect(h.requests[0].url).toBe('https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo?target_user_id=u1')
    expect(h.requests[0].responseType).not.toBe('text')
  })

  it('searchNotes uses v2 and preserves caller search/session ids and filters for later pages', async () => {
    const h = harness()
    await h.call('searchNotes', {
      keyword: 'cat',
      page: 2,
      sort: 'time_descending',
      note_type: 1,
      search_id: 'search1',
      session_id: 'session1'
    })
    expect(h.requests[0]).toMatchObject({
      url: 'https://so.xiaohongshu.com/api/sns/web/v2/search/notes',
      body: {
        keyword: 'cat',
        page: 2,
        sort: 'time_descending',
        note_type: 1,
        search_id: 'search1',
        session_id: 'session1',
        ext_flags: [],
        geo: ''
      }
    })
    expect(h.requests[0].body).toMatchObject({ search_request_id: expect.stringMatching(/^\d+-\d+$/) })
  })

  it('homeFeed uses a real first-page body instead of a fixed historical cursor', () => {
    expect(api.homeFeed().Body).toEqual({
      cursor_score: '',
      num: 27,
      refresh_type: 1,
      note_index: 0,
      unread_begin_note_id: '',
      unread_end_note_id: '',
      unread_note_count: 0,
      category: 'homefeed_recommend',
      search_key: '',
      need_num: 8,
      image_formats: ['jpg', 'webp', 'avif'],
      need_filter_image: false
    })
  })
})

const scriptingPayload = () => {
  const encoded = Buffer.from(String.fromCharCode(1, 1, 101, 1, 1).repeat(802)).toString('base64')
  return 'callback({"b":"' + encoded + '","d":{"92":0,"93":801,"100":97}})'
}

const guestSession = () => {
  const requests: RequestSpec[] = []
  const send = async (spec: RequestSpec) => {
    requests.push(spec)
    return {
      status: 200,
      headers: new AmagiHeaders(),
      durationMs: 0,
      url: spec.url,
      setCookie: requests.length === 3 ? ['web_session=guest-session; Path=/', 'session_aux=aux==; Path=/'] : [],
      body: requests.length === 1 ? { data: { data: scriptingPayload(), secPoisonId: 'poison' } } : { code: 0, success: true, data: {} }
    }
  }
  return { requests, send }
}

describe('xiaohongshu v7 port: guest sessions', () => {
  it.each([
    // 前端 getPlatformCode 没有 Windows 分支，Windows 落 default → other(5)。
    // 2026-09-25 真机 Edge 153 的 a1 尾部实测就是 50000。
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '50000'],
    ['Mozilla/5.0 (Linux; Android 15)', '20000'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', '10000']
  ])('a1 encodes the requested UA platform and has a valid checksum (%s)', async (ua, suffix) => {
    const h = guestSession()
    const fingerprint = vi.spyOn(FingerprintGenerator.prototype, 'generate')
    const cookie = await createXiaohongshuGuestCookie(h.send, { headers: { 'USER-AGENT': ua } })
    const pairs = Object.fromEntries(
      cookie.split('; ').map((entry) => [entry.slice(0, entry.indexOf('=')), entry.slice(entry.indexOf('=') + 1)])
    )
    expect(pairs.a1).toHaveLength(52)
    expect(pairs.a1.slice(41, 46)).toBe(suffix)
    expect(pairs.a1.slice(46)).toBe(String(crc32(pairs.a1.slice(0, 46))).slice(0, 6))
    expect(pairs.webId).toBe(createHash('md5').update(pairs.a1).digest('hex'))
    expect(pairs.web_session).toBe('guest-session')
    expect(pairs.session_aux).toBe('aux==')
    expect(fingerprint).toHaveBeenCalledWith(expect.objectContaining({ a1: pairs.a1 }), ua)
    for (const spec of h.requests) {
      expect(headersOf(spec).get('user-agent')).toBe(ua)
      expect(Object.keys(spec.headers ?? {}).filter((name) => name.toLowerCase() === 'user-agent')).toHaveLength(1)
    }
  })

  it('guest session sec-ch-ua follows the effective UA unless the caller sets one', async () => {
    // 以前写死 Edge 141 的 sec-ch-ua，调用方换成 Chrome UA 后两个头描述的是两个浏览器
    const chrome = guestSession()
    await createXiaohongshuGuestCookie(chrome.send, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/142.0.0.0' } })
    for (const spec of chrome.requests) expect(headersOf(spec).get('sec-ch-ua')).toBe(generateSecChUa('Chrome/142.0.0.0'))

    const explicit = guestSession()
    await createXiaohongshuGuestCookie(explicit.send, { headers: { 'sec-ch-ua': '"X";v="1"' } })
    for (const spec of explicit.requests) expect(headersOf(spec).get('sec-ch-ua')).toBe('"X";v="1"')
  })

  it('a guest-capable note endpoint prepares once and then sends the business request with the guest cookie', async () => {
    const h = guestSession()
    const ctx = harness([], '').ctx
    const result = await callEndpoint(xiaohongshuRegistry.noteDetail, { ...ctx, send: h.send }, { note_id: 'n1', xsec_token: 'tk' })
    expect(result.success).toBe(true)
    expect(h.requests).toHaveLength(4)
    expect(h.requests[3].url).toBe('https://edith.xiaohongshu.com/api/sns/web/v1/feed')
    expect(headersOf(h.requests[3]).get('cookie')).toContain('web_session=guest-session')
  })
})
