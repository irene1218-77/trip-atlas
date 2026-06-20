import { NextRequest, NextResponse } from 'next/server'

const MAX_CHARS = 15000
const TIMEOUT_MS = 10000

function extractText(html: string): string {
  let text = html
  // Remove entire <head>
  text = text.replace(/<head[\s\S]*?<\/head>/gi, '')
  // Remove noisy structural/script tags with their content
  for (const tag of ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', 'iframe']) {
    text = text.replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, 'gi'), '')
  }
  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  // Collapse whitespace
  return text.replace(/\s+/g, ' ').trim()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let url: string
  try {
    const body = await request.json()
    url = body.url?.trim()
    if (!url) return NextResponse.json({ error: '請提供網址' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: '無效的請求內容' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: '只支援 http/https 網址' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: '網址格式不正確，請確認後再試' }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `無法抓取網頁（HTTP ${res.status}），請確認網址正確或改用手動貼上文字稿` },
        { status: 502 },
      )
    }
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/html') && !ct.includes('text/plain')) {
      return NextResponse.json(
        { error: '此連結不是網頁內容，請改用手動貼上文字稿' },
        { status: 422 },
      )
    }
    html = await res.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('timeout') || msg.includes('TimeoutError') || msg.includes('timed out')) {
      return NextResponse.json(
        { error: '抓取網頁逾時，請稍後再試或改用手動貼上文字稿' },
        { status: 504 },
      )
    }
    return NextResponse.json(
      { error: '無法連線到該網址，請確認連結是否正確' },
      { status: 502 },
    )
  }

  const text = extractText(html)
  if (!text) {
    return NextResponse.json(
      { error: '網頁無法擷取到文字內容，請改用手動貼上文字稿' },
      { status: 422 },
    )
  }

  return NextResponse.json({ text: text.slice(0, MAX_CHARS) })
}
