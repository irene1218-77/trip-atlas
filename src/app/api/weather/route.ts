import { NextRequest, NextResponse } from 'next/server'

const WMO: Record<number, { emoji: string; desc: string }> = {
  0:  { emoji: '☀',  desc: '晴天' },
  1:  { emoji: '🌤', desc: '晴時多雲' },
  2:  { emoji: '⛅', desc: '多雲' },
  3:  { emoji: '🌥', desc: '陰天' },
  45: { emoji: '🌫', desc: '霧' },
  48: { emoji: '🌫', desc: '霧' },
  51: { emoji: '🌦', desc: '毛毛雨' },
  53: { emoji: '🌦', desc: '毛毛雨' },
  55: { emoji: '🌦', desc: '毛毛雨' },
  56: { emoji: '🌨', desc: '凍雨' },
  57: { emoji: '🌨', desc: '凍雨' },
  61: { emoji: '🌧', desc: '小雨' },
  63: { emoji: '🌧', desc: '中雨' },
  65: { emoji: '🌧', desc: '大雨' },
  66: { emoji: '🌨', desc: '凍雨' },
  67: { emoji: '🌨', desc: '凍雨' },
  71: { emoji: '❄',  desc: '小雪' },
  73: { emoji: '❄',  desc: '中雪' },
  75: { emoji: '❄',  desc: '大雪' },
  77: { emoji: '❄',  desc: '冰晶' },
  80: { emoji: '🌧', desc: '陣雨' },
  81: { emoji: '🌧', desc: '陣雨' },
  82: { emoji: '🌧', desc: '大陣雨' },
  85: { emoji: '❄',  desc: '陣雪' },
  86: { emoji: '❄',  desc: '大陣雪' },
  95: { emoji: '⛈', desc: '雷雨' },
  96: { emoji: '⛈', desc: '雷暴雨' },
  99: { emoji: '⛈', desc: '強雷暴' },
}

function wmoInfo(code: number) {
  return WMO[code] ?? { emoji: '🌥', desc: '天氣未知' }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  if (!lat || !lng) return NextResponse.json({ error: 'missing lat/lng' }, { status: 400 })

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
      `&timezone=auto&forecast_days=16`

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: 502 })

    const data = await res.json()
    const dates: string[]   = data.daily?.time              ?? []
    const maxT:  number[]   = data.daily?.temperature_2m_max ?? []
    const minT:  number[]   = data.daily?.temperature_2m_min ?? []
    const prec:  number[]   = data.daily?.precipitation_sum  ?? []
    const codes: number[]   = data.daily?.weathercode        ?? []

    const days = dates.map((date, i) => {
      const { emoji, desc } = wmoInfo(codes[i] ?? 0)
      return {
        date,
        max_temp:      Math.round(maxT[i] ?? 0),
        min_temp:      Math.round(minT[i] ?? 0),
        precipitation: Math.round((prec[i] ?? 0) * 10) / 10,
        weathercode:   codes[i] ?? 0,
        emoji,
        desc,
      }
    })

    return NextResponse.json({ days }, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  } catch (err) {
    console.error('[weather] error', err)
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}
