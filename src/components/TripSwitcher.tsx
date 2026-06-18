'use client'
import { useState, useEffect } from 'react'
import { X, Plus, Check, ChevronRight, ArrowLeft, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import DestinationPicker from './DestinationPicker'

interface Trip {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  country: string | null
  country_en: string | null
  region: string | null
  region_en: string | null
}

interface Props {
  isOpen: boolean
  currentTripId: string | null
  onClose: () => void
  onSwitch: (tripId: string) => void
  onRefreshCurrent: () => void
}

type View = 'list' | 'addForm' | 'editForm'

export default function TripSwitcher({ isOpen, currentTripId, onClose, onSwitch, onRefreshCurrent }: Props) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<View>('list')
  const [saving, setSaving] = useState(false)

  // New trip form
  const [newName, setNewName] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newCountryEn, setNewCountryEn] = useState('')
  const [newRegion, setNewRegion] = useState('')
  const [newRegionEn, setNewRegionEn] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')

  // Edit trip form
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [editName, setEditName] = useState('')
  const [editCountry, setEditCountry] = useState('')
  const [editCountryEn, setEditCountryEn] = useState('')
  const [editRegion, setEditRegion] = useState('')
  const [editRegionEn, setEditRegionEn] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  // Confirm dialog after edit save
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (isOpen) { fetchTrips(); setView('list') }
  }, [isOpen])

  async function fetchTrips() {
    setLoading(true)
    const { data } = await supabase
      .from('trips')
      .select('id, name, start_date, end_date, country, country_en, region, region_en')
      .order('created_at', { ascending: true })
    if (data) setTrips(data as Trip[])
    setLoading(false)
  }

  function formatDateRange(start: string | null, end: string | null): string {
    if (!start) return '尚未設定日期'
    const [sy, sm, sd] = start.split('-').map(Number)
    if (!end) return `${sy} · ${sm}/${sd} 起`
    const [, em, ed] = end.split('-').map(Number)
    if (sm === em) return `${sy} · ${sm}/${sd}–${ed}`
    return `${sy} · ${sm}/${sd} – ${em}/${ed}`
  }

  // ─── Add trip ───────────────────────────────────────────
  function resetNewForm() {
    setNewName(''); setNewCountry(''); setNewCountryEn('')
    setNewRegion(''); setNewRegionEn(''); setNewStart(''); setNewEnd('')
  }

  async function handleSaveNewTrip() {
    if (!newName.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('trips')
      .insert({
        name: newName.trim(),
        country: newCountry || null, country_en: newCountryEn || null,
        region: newRegion || null, region_en: newRegionEn || null,
        start_date: newStart || null, end_date: newEnd || null,
      })
      .select('id').single()
    setSaving(false)
    if (error || !data) { alert(`建立失敗：${error?.message}`); return }
    resetNewForm()
    setView('list')
    onSwitch(data.id)
    onClose()
  }

  // ─── Edit trip ──────────────────────────────────────────
  function openEdit(trip: Trip, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingTrip(trip)
    setEditName(trip.name)
    setEditCountry(trip.country ?? '')
    setEditCountryEn(trip.country_en ?? '')
    setEditRegion(trip.region ?? '')
    setEditRegionEn(trip.region_en ?? '')
    setEditStart(trip.start_date ?? '')
    setEditEnd(trip.end_date ?? '')
    setView('editForm')
  }

  async function handleSaveEdit() {
    if (!editingTrip) return
    setSaving(true)
    const { error } = await supabase.from('trips').update({
      name: editName.trim() || editingTrip.name,
      country: editCountry || null, country_en: editCountryEn || null,
      region: editRegion || null, region_en: editRegionEn || null,
      start_date: editStart || null, end_date: editEnd || null,
    }).eq('id', editingTrip.id)
    setSaving(false)
    if (error) { alert(`更新失敗：${error.message}`); return }
    await fetchTrips()
    setShowClearDialog(true)
  }

  async function handleKeepPlaces() {
    setShowClearDialog(false)
    if (editingTrip?.id === currentTripId) onRefreshCurrent()
    setView('list')
    setEditingTrip(null)
  }

  async function handleClearPlaces() {
    if (!editingTrip) return
    setClearing(true)
    await supabase.from('itinerary').delete().eq('trip_id', editingTrip.id)
    const { data: placeRows } = await supabase
      .from('places').select('id').eq('trip_id', editingTrip.id)
    if (placeRows?.length) {
      const ids = placeRows.map(p => p.id)
      await supabase.from('place_lists').delete().in('place_id', ids)
      await supabase.from('places').delete().eq('trip_id', editingTrip.id)
    }
    setClearing(false)
    setShowClearDialog(false)
    if (editingTrip.id === currentTripId) onRefreshCurrent()
    setView('list')
    setEditingTrip(null)
  }

  // ─── Header text / back action per view ─────────────────
  const headerTitle = view === 'addForm' ? '新增旅程' : view === 'editForm' ? '編輯旅程' : '切換旅程'
  const headerLeft = view !== 'list'
    ? (
      <button onClick={() => { setView('list'); setEditingTrip(null) }}
        className="p-1.5 rounded-lg"
        style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
        <ArrowLeft size={18} />
      </button>
    ) : (
      <button onClick={onClose}
        className="p-1.5 rounded-lg"
        style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
        <X size={18} />
      </button>
    )

  return (
    <div className="absolute inset-0 flex flex-col"
      style={{
        background: 'var(--color-surface)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        zIndex: isOpen ? 20 : -1,
        overflow: 'hidden',
      }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        {headerLeft}
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{headerTitle}</span>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>載入中…</p>
            ) : (
              <ul>
                {trips.map(trip => {
                  const isCurrent = trip.id === currentTripId
                  return (
                    <li key={trip.id}
                      onClick={() => { if (!isCurrent) { onSwitch(trip.id); onClose() } }}
                      className="px-5 py-4 flex items-center gap-3"
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isCurrent ? 'var(--color-primary-pale)' : 'transparent',
                        cursor: isCurrent ? 'default' : 'pointer',
                      }}
                      onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)' }}
                      onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate"
                            style={{ color: isCurrent ? 'var(--color-primary)' : 'var(--color-text)' }}>
                            {trip.name}
                          </p>
                          {isCurrent && <Check size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                        </div>
                        {(trip.country || trip.region) && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {[trip.region, trip.country].filter(Boolean).join('・')}
                          </p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {formatDateRange(trip.start_date, trip.end_date)}
                        </p>
                      </div>
                      <button
                        onClick={e => openEdit(trip, e)}
                        className="p-1.5 rounded-lg flex-shrink-0"
                        style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        title="編輯旅程資訊"
                        onMouseEnter={e => { e.stopPropagation(); (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}
                      >
                        <Pencil size={13} />
                      </button>
                      {!isCurrent && <ChevronRight size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setView('addForm')}
              className="w-full rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2"
              style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)', background: 'transparent', cursor: 'pointer' }}>
              <Plus size={15} />新增旅程
            </button>
          </div>
        </>
      )}

      {/* ── ADD FORM VIEW ── */}
      {view === 'addForm' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="旅程名稱（必填）" autoFocus
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
          />
          <DestinationPicker
            onSelect={(c, ce, r, re) => { setNewCountry(c); setNewCountryEn(ce); setNewRegion(r); setNewRegionEn(re) }}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>開始日期</p>
              <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
            </div>
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>結束日期</p>
              <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
            </div>
          </div>
          <div className="flex gap-2 mt-auto pt-2">
            <button onClick={() => { setView('list'); resetNewForm() }}
              className="flex-1 rounded-lg py-2 text-sm font-medium"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer' }}>取消</button>
            <button onClick={handleSaveNewTrip} disabled={!newName.trim() || saving}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)', cursor: 'pointer' }}>
              {saving ? '建立中…' : '建立旅程'}
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT FORM VIEW ── */}
      {view === 'editForm' && editingTrip && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>旅程名稱</p>
            <input
              value={editName} onChange={e => setEditName(e.target.value)}
              placeholder="旅程名稱" autoFocus
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
            />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>國家 / 地區</p>
            <DestinationPicker
              key={editingTrip.id}
              defaultCountry={editingTrip.country ?? ''}
              defaultCountryEn={editingTrip.country_en ?? ''}
              defaultRegion={editingTrip.region ?? ''}
              onSelect={(c, ce, r, re) => { setEditCountry(c); setEditCountryEn(ce); setEditRegion(r); setEditRegionEn(re) }}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>開始日期</p>
              <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
            </div>
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>結束日期</p>
              <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
            </div>
          </div>
          <div className="flex gap-2 mt-auto pt-2">
            <button onClick={() => { setView('list'); setEditingTrip(null) }}
              className="flex-1 rounded-lg py-2 text-sm font-medium"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer' }}>取消</button>
            <button onClick={handleSaveEdit} disabled={saving}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)', cursor: 'pointer' }}>
              {saving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </div>
      )}

      {/* ── CLEAR DIALOG overlay ── */}
      {showClearDialog && (
        <div className="absolute inset-0 flex items-end justify-center z-10"
          style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="w-full rounded-t-2xl p-5 flex flex-col gap-3"
            style={{ background: 'var(--color-surface)', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              是否保留原有的地點及行程？
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              旅程資訊已更新。原有的地點清單與行程紀錄可以保留，或一併清除以重新規劃。
            </p>
            <button
              onClick={handleKeepPlaces}
              className="w-full rounded-xl py-2.5 text-sm font-medium"
              style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)', background: 'transparent', cursor: 'pointer' }}>
              保留地點及行程
            </button>
            <button
              onClick={handleClearPlaces}
              disabled={clearing}
              className="w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
              style={{ background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer' }}>
              {clearing ? '清除中…' : '清除所有地點及行程'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
