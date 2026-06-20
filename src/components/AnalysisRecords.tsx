'use client'
import { useState, useEffect } from 'react'
import { X, Trash2, Star, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PlaceResult {
  name: string
  suggestion: string
  pros: string[]
  cons: string[]
  price_info: string | null
}

interface ExtractResult {
  places: PlaceResult[]
  other_notes: string[]
}

export interface HistoryItem {
  id: string
  name: string | null
  transcript: string
  result: ExtractResult
  created_at: string
  trip_id: string
}

interface Trip {
  id: string
  name: string
}

interface Props {
  isOpen: boolean
  tripId: string
  onClose: () => void
  onLoadAnalysis: (item: HistoryItem) => void
}

export default function AnalysisRecords({ isOpen, onClose, onLoadAnalysis }: Props) {
  const [records, setRecords] = useState<HistoryItem[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [filterTripId, setFilterTripId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    fetchTrips()
    fetchRecords(filterTripId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (isOpen) fetchRecords(filterTripId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTripId])

  async function fetchTrips() {
    const { data } = await supabase.from('trips').select('id, name').order('created_at', { ascending: true })
    if (data) setTrips(data as Trip[])
  }

  async function fetchRecords(tripFilter: string | null) {
    setLoading(true)
    let query = supabase
      .from('transcript_analyses')
      .select('id, name, transcript, result, created_at, trip_id')
      .order('created_at', { ascending: false })
    if (tripFilter !== null) {
      query = query.eq('trip_id', tripFilter)
    }
    const { data, error } = await query
    if (error) console.error('[records] load error:', error)
    setRecords((data as HistoryItem[]) ?? [])
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('transcript_analyses').delete().eq('id', id)
    if (!error) setRecords(prev => prev.filter(r => r.id !== id))
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  function getTripName(tripId: string) {
    return trips.find(t => t.id === tripId)?.name ?? ''
  }

  const named = records.filter(r => r.name)
  const unnamed = records.filter(r => !r.name)

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 500,
    flexShrink: 0, cursor: 'pointer', border: 'none',
    background: active ? 'var(--color-primary)' : 'var(--color-bg)',
    color: active ? 'white' : 'var(--color-text-muted)',
    outline: active ? 'none' : '1px solid var(--color-border)',
  })

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 5,
      background: 'var(--color-surface)',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.25s ease',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      pointerEvents: isOpen ? 'auto' : 'none',
    }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <BookOpen size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <span className="text-sm font-semibold flex-1" style={{ color: 'var(--color-text)' }}>我的分析紀錄</span>
        <button onClick={onClose}
          style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
          <X size={18} />
        </button>
      </div>

      {/* Trip filter */}
      {trips.length > 1 && (
        <div className="flex-shrink-0 px-4 py-2.5 overflow-x-auto"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex gap-1.5" style={{ width: 'max-content' }}>
            <button style={filterBtnStyle(filterTripId === null)} onClick={() => setFilterTripId(null)}>全部</button>
            {trips.map(trip => (
              <button key={trip.id} style={filterBtnStyle(filterTripId === trip.id)} onClick={() => setFilterTripId(trip.id)}>
                {trip.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-5 text-xs" style={{ color: 'var(--color-text-muted)' }}>載入中…</p>
        ) : records.length === 0 ? (
          <p className="p-5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {filterTripId ? '此旅程沒有分析紀錄' : '還沒有分析紀錄'}
          </p>
        ) : (
          <div className="p-4 flex flex-col gap-2">
            {named.length > 0 && (
              <>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>已儲存</p>
                {named.map(item => (
                  <RecordRow key={item.id} item={item}
                    tripName={filterTripId === null ? getTripName(item.trip_id) : ''}
                    onLoad={() => onLoadAnalysis(item)}
                    onDelete={() => handleDelete(item.id)}
                    formatDate={formatDate} />
                ))}
              </>
            )}
            {unnamed.length > 0 && (
              <>
                <p className={`text-xs font-semibold${named.length > 0 ? ' mt-2' : ''}`}
                  style={{ color: 'var(--color-text-muted)' }}>歷史紀錄</p>
                {unnamed.map(item => (
                  <RecordRow key={item.id} item={item}
                    tripName={filterTripId === null ? getTripName(item.trip_id) : ''}
                    onLoad={() => onLoadAnalysis(item)}
                    onDelete={() => handleDelete(item.id)}
                    formatDate={formatDate} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RecordRow({ item, tripName, onLoad, onDelete, formatDate }: {
  item: HistoryItem
  tripName: string
  onLoad: () => void
  onDelete: () => void
  formatDate: (iso: string) => string
}) {
  return (
    <div className="rounded-xl flex items-center"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
      <button onClick={onLoad}
        className="flex-1 min-w-0 text-left px-3 py-2.5"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '12px 0 0 12px' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
        <div className="flex items-center gap-1.5">
          {item.name && (
            <Star size={11} fill="var(--color-primary)" stroke="var(--color-primary)" style={{ flexShrink: 0 }} />
          )}
          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
            {item.name ?? `${item.transcript.slice(0, 28).trim()}${item.transcript.length > 28 ? '…' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {formatDate(item.created_at)} · {item.result.places.length} 個地點
          </p>
          {tripName && (
            <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--color-primary-pale)', color: 'var(--color-primary)', fontSize: 10 }}>
              {tripName}
            </span>
          )}
        </div>
      </button>
      <button onClick={onDelete}
        className="p-2 flex-shrink-0 mr-2"
        style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8 }}
        title="刪除">
        <Trash2 size={13} />
      </button>
    </div>
  )
}
