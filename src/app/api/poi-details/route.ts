import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const placeId = request.nextUrl.searchParams.get('place_id')
  if (!placeId) return NextResponse.json(null, { status: 400 })

  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY?.trim()
  if (!key) return NextResponse.json(null, { status: 500 })

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=zh-TW`,
      {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,primaryTypeDisplayName',
        },
        signal: AbortSignal.timeout(6000),
      }
    )
    if (!res.ok) {
      console.error('[poi-details] API error', res.status, await res.text())
      return NextResponse.json(null, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({
      id: data.id ?? placeId,
      name: data.displayName?.text ?? '',
      address: data.formattedAddress ?? '',
      lat: data.location?.latitude ?? 0,
      lng: data.location?.longitude ?? 0,
      placeType: data.primaryTypeDisplayName?.text ?? '',
    })
  } catch (err) {
    console.error('[poi-details] unexpected error', err)
    return NextResponse.json(null, { status: 502 })
  }
}
