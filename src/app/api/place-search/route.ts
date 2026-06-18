import { NextRequest, NextResponse } from 'next/server'

const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName,places.rating,places.regularOpeningHours'

// 移除全形／半形括號及其內容，例如「普吉老城（Phuket Old Town）」→「普吉老城」
function stripBrackets(q: string): string {
  return q.replace(/[（(][^）)]*[）)]/g, '').replace(/\s+/g, ' ').trim()
}

// 取出括號內的文字，例如「普吉老城（Phuket Old Town）」→「Phuket Old Town」
function extractBracketContent(q: string): string | null {
  const m = q.match(/[（(]([^）)]+)[）)]/)
  return m ? m[1].trim() : null
}

async function searchGoogle(
  textQuery: string,
  key: string,
  locationBias?: { lat: number; lng: number },
): Promise<RawPlace | null> {
  const body: Record<string, unknown> = { textQuery, languageCode: 'zh-TW', maxResultCount: 1 }
  if (locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: locationBias.lat, longitude: locationBias.lng },
        radius: 50000,
      },
    }
  }
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    console.error('[place-search] Google error', res.status, textQuery)
    return null
  }
  const data = await res.json()
  return data.places?.[0] ?? null
}

interface RawPlace {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  primaryTypeDisplayName?: { text?: string }
  rating?: number
  regularOpeningHours?: { weekdayDescriptions?: string[] }
}

function formatPlace(place: RawPlace, fallbackName: string) {
  return {
    id: place.id ?? '',
    name: place.displayName?.text ?? fallbackName,
    address: place.formattedAddress ?? '',
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0,
    placeType: place.primaryTypeDisplayName?.text ?? '',
    rating: place.rating ?? null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions ?? null,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get('query')
  if (!query?.trim()) return NextResponse.json(null, { status: 400 })

  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY?.trim()
  if (!key) return NextResponse.json(null, { status: 500 })

  const latParam = request.nextUrl.searchParams.get('lat')
  const lngParam = request.nextUrl.searchParams.get('lng')
  const locationBias = latParam && lngParam
    ? { lat: parseFloat(latParam), lng: parseFloat(lngParam) }
    : undefined

  try {
    const cleaned = stripBrackets(query)
    const fallback = extractBracketContent(query)

    // 1. 清除括號後的名稱（帶 locationBias）
    let place = await searchGoogle(cleaned || query, key, locationBias)

    // 2. 若無結果，用括號內文字再試
    if (!place && fallback) {
      place = await searchGoogle(fallback, key, locationBias)
    }

    // 3. 仍無結果，用原始 query 再試
    if (!place && cleaned !== query) {
      place = await searchGoogle(query, key, locationBias)
    }

    if (!place) {
      console.warn('[place-search] not found:', query)
      return NextResponse.json(null)
    }

    return NextResponse.json(formatPlace(place, cleaned || query))
  } catch (err) {
    console.error('[place-search] unexpected error', err)
    return NextResponse.json(null, { status: 502 })
  }
}
