import { NextRequest, NextResponse } from 'next/server'

interface TripRegion {
  country: string
  countryEn: string
  region: string
  regionEn: string
}

function buildSystemPrompt(tripRegion?: TripRegion): string {
  const regionBlock = tripRegion?.region && tripRegion?.country
    ? `
本次行程目的地為 ${tripRegion.region}（${tripRegion.regionEn}），${tripRegion.country}（${tripRegion.countryEn}）。
分析時請優先找出在此地區的地點。
若文字稿提到的地點無法確認在此地區，請在 is_approximate 標記為 true，並在 name 加上該地區名作為前綴（例如「${tripRegion.region} 老城區」）。
若只提到模糊地點（商圈/區域/街道），直接用地區名+描述命名（例如「${tripRegion.region} 夜市區域」），同樣標記 is_approximate: true。
`
    : ''

  return `你是一個旅遊資訊萃取助理。從用戶輸入的旅遊文字稿（部落格、YouTube字幕、IG說明等）中，萃取出具體地點和行程筆記。
${regionBlock}
請以 JSON 格式回覆，結構如下：
{
  "places": [
    {
      "name": "地點名稱（盡量用在地名稱）",
      "suggestion": "推薦理由（一句話）",
      "pros": ["優點1", "優點2"],
      "cons": ["缺點1"],
      "price_info": "價格資訊或 null",
      "is_approximate": false
    }
  ],
  "other_notes": ["行程小撇步1", "行程小撇步2"]
}

規則：
- places 只包含真實可到訪的地點（餐廳、景點、住宿等），不包含地區或城市名稱
- pros/cons 各 1-4 條，精簡具體
- price_info 若有明確金額或範圍就填字串，否則為 null
- is_approximate: true 代表地點位置模糊或無法確認在目的地範圍內；確定的地點填 false
- other_notes 為非地點資訊的實用建議（交通、訂位提醒等）
- 若無法找到任何地點，places 回傳空陣列
- 無論輸入是什麼語言，所有輸出欄位（name、suggestion、pros、cons、price_info、other_notes）一律使用繁體中文
- 地點名稱只使用當地慣用名稱，不加括號補充英文或其他語言翻譯（例如只寫「普吉老城」而非「普吉老城（Phuket Old Town）」）
- 若當地名稱為非中文（如日文、泰文等），直接使用通用英文名稱（例如「Nishiki Market」而非「錦市場」的音譯）
- 只回傳 JSON，不要有任何說明文字`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  let transcript: string
  let tripRegion: TripRegion | undefined
  try {
    const body = await request.json()
    transcript = body.transcript
    tripRegion = body.tripRegion
    if (!transcript?.trim()) {
      return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: buildSystemPrompt(tripRegion),
        messages: [{ role: 'user', content: transcript.trim() }],
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('[extract-trip-info] Anthropic HTTP', res.status, errBody)
      return NextResponse.json({ error: 'Anthropic API error', detail: errBody }, { status: 502 })
    }

    const data = await res.json()
    const text: string = data.content?.[0]?.text ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[extract-trip-info] No JSON in response:', text)
      return NextResponse.json({ error: 'Could not parse response' }, { status: 502 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('[extract-trip-info]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Unexpected error', detail: message }, { status: 500 })
  }
}
