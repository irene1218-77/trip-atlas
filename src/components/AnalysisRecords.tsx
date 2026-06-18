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
}

interface Props {
  isOpen: boolean
  tripId: string
  onClose: () => void
  onLoadAnalysis: (item: HistoryItem) => void
}

export default function AnalysisRecords({ isOpen, tripId, onClose, onLoadAnalysis }: Props) {
  const [records, setRecords] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && tripId) fetchRecords()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tripId])

  async function fetchRecords() {
    setLoading(true)
    const { data, error } = await supabase
      .from('transcript_analyses')
      .select('id, name, transcript, result, created_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
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

  const named = records.filter(r => r.name)
  const unnamed = records.filter(r => !r.name)

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'var(--color-surface)',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.25s ease',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <BookOpen size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <span className="text-sm font-semibold flex-1" style={{ color: 'var(--color-text)' }}>我的分析紀錄</span>
        <button onClick={onClose}
          style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-5 text-xs" style={{ color: 'var(--color-text-muted)' }}>載入中…</p>
        ) : records.length === 0 ? (
          <p className="p-5 text-xs" style={{ color: 'var(--color-text-muted)' }}>還沒有分析紀錄</p>
        ) : (
          <div className="p-4 flex flex-col gap-2">
            {named.length > 0 && (
              <>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>已儲存</p>
                {named.map(item => (
                  <RecordRow key={item.id} item={item}
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

function RecordRow({ item, onLoad, onDelete, formatDate }: {
  item: HistoryItem
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
            <Star size={11} fill="var(--color-primary)" stroke="var(--color-primary)"
              style={{ flexShrink: 0 }} />
          )}
          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
            {item.name ?? `${item.transcript.slice(0, 28).trim()}${item.transcript.length > 28 ? '…' : ''}`}
          </p>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {formatDate(item.created_at)} · {item.result.places.length} 個地點
        </p>
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
