import { NextRequest, NextResponse } from 'next/server'

function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

interface CaptionTrack {
  baseUrl: string
  languageCode: string
  kind?: string        // 'asr' = auto-generated
  name?: { simpleText?: string }
}

// InnerTube clients to try in order — different clients unlock different caption data
const INNERTUBE_CLIENTS = [
  {
    name: 'ANDROID',
    version: '20.10.38',
    userAgent: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
  },
  {
    name: 'WEB',
    version: '2.20240610.01.00',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  },
  {
    name: 'TVHTML5',
    version: '7.20240101.08.00',
    userAgent:
      'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1',
  },
  {
    name: 'ANDROID_EMBEDDED_PLAYER',
    version: '20.10.38',
    userAgent: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
  },
]

const LANG_PREFS = ['zh-TW', 'zh-Hant', 'zh-Hans', 'zh', 'en', 'ja', 'ko']

async function getCaptiontTracks(videoId: string): Promise<CaptionTrack[] | null> {
  for (const client of INNERTUBE_CLIENTS) {
    try {
      const resp = await fetch(
        'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': client.userAgent,
          },
          body: JSON.stringify({
            context: { client: { clientName: client.name, clientVersion: client.version } },
            videoId,
          }),
          signal: AbortSignal.timeout(8000),
        },
      )
      if (!resp.ok) continue
      const data = await resp.json()
      const tracks: CaptionTrack[] | undefined =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks
      if (Array.isArray(tracks) && tracks.length > 0) {
        console.log(`[yt-transcript] ${client.name} found ${tracks.length} tracks for ${videoId}`)
        return tracks
      }
    } catch {
      // try next client
    }
  }
  return null
}

function selectTrack(tracks: CaptionTrack[]): CaptionTrack {
  // 1. Prefer manually-added tracks in priority languages
  for (const lang of LANG_PREFS) {
    const t = tracks.find(tr => tr.languageCode === lang && tr.kind !== 'asr')
    if (t) return t
  }
  // 2. Allow auto-generated in priority languages
  for (const lang of LANG_PREFS) {
    const t = tracks.find(tr => tr.languageCode === lang)
    if (t) return t
  }
  // 3. Anything available
  return tracks[0]
}

function parseTranscriptXml(xml: string): string {
  const decoded = (s: string) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/\n/g, ' ')
      .trim()

  const segments: string[] = []

  // Classic format: <text start="…" dur="…">content</text>
  const classicRe = /<text\b[^>]*>([^<]*)<\/text>/g
  let m: RegExpExecArray | null
  while ((m = classicRe.exec(xml)) !== null) {
    const t = decoded(m[1])
    if (t) segments.push(t)
  }
  if (segments.length) return segments.join(' ').replace(/\s+/g, ' ').trim()

  // srv3 format: <p t="ms" d="ms">…<s>word</s>…</p>
  const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/g
  while ((m = pRe.exec(xml)) !== null) {
    const inner = m[1]
    let text = ''
    const sRe = /<s[^>]*>([^<]*)<\/s>/g
    let sm: RegExpExecArray | null
    while ((sm = sRe.exec(inner)) !== null) text += sm[1]
    if (!text) text = inner.replace(/<[^>]+>/g, '')
    const t = decoded(text)
    if (t) segments.push(t)
  }

  return segments.join(' ').replace(/\s+/g, ' ').trim()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let url: string
  try {
    const body = await request.json()
    url = body.url?.trim()
    if (!url) return NextResponse.json({ error: '請提供 YouTube 連結' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const videoId = extractVideoId(url)
  if (!videoId) {
    return NextResponse.json(
      { error: '無法辨識 YouTube 影片 ID，請確認連結格式' },
      { status: 400 },
    )
  }

  const tracks = await getCaptiontTracks(videoId)
  if (!tracks?.length) {
    return NextResponse.json(
      { error: '此影片未開啟字幕（包括自動字幕），請改用手動貼上文字稿' },
      { status: 422 },
    )
  }

  const track = selectTrack(tracks)
  let xml: string
  try {
    const captionResp = await fetch(track.baseUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!captionResp.ok) throw new Error(`caption fetch ${captionResp.status}`)
    xml = await captionResp.text()
  } catch (err) {
    console.error('[yt-transcript] caption XML fetch failed:', err)
    return NextResponse.json(
      { error: '字幕下載失敗，請稍後再試或改用手動貼上文字稿' },
      { status: 502 },
    )
  }

  const transcript = parseTranscriptXml(xml)
  if (!transcript) {
    return NextResponse.json(
      { error: '字幕內容為空，請改用手動貼上文字稿' },
      { status: 422 },
    )
  }

  return NextResponse.json({ transcript })
}
