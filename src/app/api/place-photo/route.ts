import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const placeId = request.nextUrl.searchParams.get('place_id')
  const photoIndex = Math.min(2, Math.max(0, parseInt(request.nextUrl.searchParams.get('photoIndex') ?? '0') || 0))
  if (!placeId) return new NextResponse(null, { status: 400 })

  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY?.trim()
  if (!key) return new NextResponse(null, { status: 500 })

  try {
    // Step 1: Places API (New) — get photo resource name
    const detailsUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=zh-TW`
    const detailsRes = await fetch(detailsUrl, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'photos',
      },
      signal: AbortSignal.timeout(6000),
    })

    if (!detailsRes.ok) {
      const body = await detailsRes.text()
      console.error('[place-photo] details API error', detailsRes.status, body)
      return new NextResponse(null, { status: 502 })
    }

    const details = await detailsRes.json()
    const photoName: string | undefined = details.photos?.[photoIndex]?.name
    if (!photoName) {
      console.error('[place-photo] no photos in response', JSON.stringify(details))
      return new NextResponse(null, { status: 404 })
    }

    // Step 2: Places API (New) — fetch photo media bytes
    const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${key}`
    const mediaRes = await fetch(mediaUrl, { signal: AbortSignal.timeout(10000) })

    if (!mediaRes.ok) {
      const body = await mediaRes.text()
      console.error('[place-photo] media API error', mediaRes.status, body)
      return new NextResponse(null, { status: 502 })
    }

    const mediaJson = await mediaRes.json()
    const photoUri: string | undefined = mediaJson.photoUri
    if (!photoUri) {
      console.error('[place-photo] no photoUri in media response', JSON.stringify(mediaJson))
      return new NextResponse(null, { status: 502 })
    }

    // Step 3: proxy the actual image
    const imgRes = await fetch(photoUri, { signal: AbortSignal.timeout(10000) })
    if (!imgRes.ok) {
      console.error('[place-photo] image fetch error', imgRes.status)
      return new NextResponse(null, { status: 502 })
    }

    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    return new NextResponse(imgRes.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('[place-photo] unexpected error', err)
    return new NextResponse(null, { status: 502 })
  }
}
