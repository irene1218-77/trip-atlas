import { NextRequest, NextResponse } from 'next/server'

const PLACE_TYPE_ZH: Record<string, string> = {
  restaurant: '餐廳',
  cafe: '咖啡廳',
  coffee_shop: '咖啡廳',
  bar: '酒吧',
  hotel: '飯店',
  lodging: '住宿',
  tourist_attraction: '景點',
  museum: '博物館',
  beach: '海灘',
  temple: '寺廟',
  shopping_mall: '購物中心',
  convenience_store: '便利商店',
  spa: 'SPA',
  park: '公園',
  night_club: '夜店',
  bakery: '麵包店',
  store: '商店',
  supermarket: '超市',
  pharmacy: '藥局',
  hospital: '醫院',
  airport: '機場',
  train_station: '火車站',
  bus_station: '巴士站',
  gas_station: '加油站',
  parking: '停車場',
  bank: '銀行',
  atm: 'ATM',
  zoo: '動物園',
  amusement_park: '遊樂園',
  aquarium: '水族館',
  art_gallery: '美術館',
  stadium: '體育場',
  night_market: '夜市',
  food_court: '美食廣場',
}

function resolveZh(displayText: string | null | undefined, primaryType: string | null | undefined): string | null {
  // Already Chinese (contains non-ASCII)
  if (displayText && /[^\x00-\x7F]/.test(displayText)) return displayText
  // Try primaryType key first (more precise)
  const typeKey = (primaryType ?? '').toLowerCase().replace(/ /g, '_')
  if (typeKey && PLACE_TYPE_ZH[typeKey]) return PLACE_TYPE_ZH[typeKey]
  // Try displayText as English key
  const dispKey = (displayText ?? '').toLowerCase().replace(/ /g, '_')
  if (dispKey && PLACE_TYPE_ZH[dispKey]) return PLACE_TYPE_ZH[dispKey]
  // Fallback if we got any value
  if (displayText || primaryType) return '地點'
  return null
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const placeId = request.nextUrl.searchParams.get('place_id')
  if (!placeId) return NextResponse.json({ place_type: null })

  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY?.trim()
  if (!key) return NextResponse.json({ place_type: null })

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=zh-TW`,
      {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'primaryTypeDisplayName,primaryType',
        },
        signal: AbortSignal.timeout(6000),
      }
    )
    if (!res.ok) {
      console.error('[place-type] API error', res.status, await res.text())
      return NextResponse.json({ place_type: null })
    }
    const data = await res.json()
    const displayText: string | null = data.primaryTypeDisplayName?.text ?? null
    const primaryType: string | null = data.primaryType ?? null
    const place_type = resolveZh(displayText, primaryType)
    return NextResponse.json({ place_type })
  } catch (err) {
    console.error('[place-type] unexpected error', err)
    return NextResponse.json({ place_type: null })
  }
}
