import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY?.trim()
  if (!apiKey) return NextResponse.json({ error: 'no key' }, { status: 500 })

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
