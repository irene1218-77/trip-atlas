'use client'

import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Place } from '@/types'

const CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  '餐廳':         { text: '#B91C1C', bg: '#FEF2F2' },
  '咖啡廳':       { text: '#92400E', bg: '#FEF3C7' },
  '海邊':         { text: '#0369A1', bg: '#F0F9FF' },
  '景點':         { text: '#15803D', bg: '#F0FDF4' },
  '寺廟':         { text: '#7C3AED', bg: '#F5F3FF' },
  '小店':         { text: '#BE185D', bg: '#FDF2F8' },
  '小吃':         { text: '#A16207', bg: '#FFFBEB' },
  '飯店':         { text: '#1D4ED8', bg: '#EFF6FF' },
}
function getCategoryStyle(raw: string) {
  return CATEGORY_COLORS[raw.trim()] ?? { text: '#2D6A4F', bg: '#D8F3DC' }
}

interface TripMeta {
  name: string
  start_date?: string
  end_date?: string
}

export default function SharePage({ params }: { params: { tripId: string } }) {
  const { tripId } = params
  const [places, setPlaces] = useState<Place[]>([])
  const [tripMeta, setTripMeta] = useState<TripMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: trip }, { data: placesData }] = await Promise.all([
        supabase.from('trips').select('name, start_date, end_date').eq('id', tripId).single(),
        supabase.from('places').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
      ])
      if (!trip) { setNotFound(true); setLoading(false); return }
      setTripMeta(trip)
      setPlaces((placesData ?? []) as Place[])
      setLoading(false)
    }
    load()
  }, [tripId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAF8' }}>
        <p style={{ color: '#6B7280', fontSize: 14 }}>載入中…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAF8' }}>
        <p style={{ color: '#6B7280', fontSize: 14 }}>找不到此行程</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAF8', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8E4', padding: '20px 20px 16px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2D6A4F' }}>Trip Atlas</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>唯讀分享</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1B1B1B', letterSpacing: '-0.3px', margin: 0 }}>
            {tripMeta?.name ?? '行程'}
          </h1>
          {tripMeta?.start_date && tripMeta?.end_date && (
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
              {tripMeta.start_date} ～ {tripMeta.end_date}
            </p>
          )}
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
            共 {places.length} 個地點
          </p>
        </div>
      </div>

      {/* Places list */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '12px 12px' }}>
        {places.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: '40px 0' }}>這個行程還沒有地點</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {places.map((place) => (
              <div
                key={place.id}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #E2E8E4',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <MapPin size={15} style={{ color: '#2D6A4F', flexShrink: 0, marginTop: 3 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#1B1B1B' }}>{place.name}</span>
                      {place.category.split(',').map((raw, i) => {
                        const { text, bg } = getCategoryStyle(raw)
                        return (
                          <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: bg, color: text, fontWeight: 500 }}>
                            {raw.trim()}
                          </span>
                        )
                      })}
                    </div>
                    {place.address && (
                      <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0' }}>{place.address}</p>
                    )}
                    {place.my_notes && (
                      <p style={{ fontSize: 12, color: '#374151', marginTop: 6, lineHeight: 1.5 }}>{place.my_notes}</p>
                    )}
                    {place.price_info && (
                      <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>💰 {place.price_info}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '32px 0 24px', color: '#9ca3af', fontSize: 11 }}>
        由 Trip Atlas 建立 · 唯讀檢視
      </div>
    </div>
  )
}
