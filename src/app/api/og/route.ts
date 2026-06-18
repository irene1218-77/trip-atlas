import { NextRequest, NextResponse } from 'next/server'

// 從 HTML 字串中用 regex 抓指定 og: property 的 content 值
// 支援兩種屬性順序：property 在前 / content 在前
function extractOGMeta(html: string, property: string): string {
  const re1 = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  )
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    'i'
  )
  return (html.match(re1) ?? html.match(re2))?.[1]?.trim() ?? ''
}

// 解碼常見 HTML entities
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ title: '', thumbnail_url: '' })

  try {
    // 從後端 fetch，避免前端直接請求外部 URL 被 CORS 擋住
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(6000), // 6 秒超時，避免卡住
    })

    if (!res.ok) return NextResponse.json({ title: '', thumbnail_url: '' })

    const html = await res.text()

    // 抓 og:title，fallback 到 <title> 標籤
    let title =
      extractOGMeta(html, 'og:title') ||
      (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? '')
    title = decodeEntities(title)

    // 抓 og:image
    let thumbnail_url = extractOGMeta(html, 'og:image')

    // 若是相對路徑，補全 base URL
    if (thumbnail_url && !thumbnail_url.startsWith('http')) {
      try {
        thumbnail_url = new URL(thumbnail_url, url).toString()
      } catch {
        thumbnail_url = ''
      }
    }

    return NextResponse.json({ title, thumbnail_url })
  } catch {
    // 任何失敗（timeout、網路錯誤、解析錯誤）都靜默回傳空字串
    // 前端 UI 會以平台圖示做 fallback
    return NextResponse.json({ title: '', thumbnail_url: '' })
  }
}
