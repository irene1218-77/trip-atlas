/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, MapPin, ChevronDown, ChevronRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Place, ItineraryItem } from '@/types'

// ─── 常數 ────────────────────────────────────────────────
const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const m = 360 + i * 30
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
})

const DURATION_OPTIONS = [
  { label: '不設', value: '' },
  { label: '15分', value: '15' },
  { label: '30分', value: '30' },
  { label: '45分', value: '45' },
  { label: '1小時', value: '60' },
  { label: '1.5時', value: '90' },
  { label: '2小時', value: '120' },
  { label: '3小時', value: '180' },
  { label: '4小時', value: '240' },
]

const TRANSPORT_TYPES = ['—', '開車', '機車', '步行', '大眾運輸']

const TRANSPORT_MODE: Record<string, string> = {
  '開車': 'DRIVE',
  '機車': 'TWO_WHEELER',
  '步行': 'WALK',
  '大眾運輸': 'TRANSIT',
}

const CATEGORY_COLORS: Record<string, string> = {
  '餐廳': '#ef4444',
  '咖啡廳': '#f59e0b',
  '景點': '#3b82f6',
  '海邊': '#06b6d4',
  '寺廟': '#8b5cf6',
  '小店': '#ec4899',
  '小吃': '#f97316',
  '飯店': '#6366f1',
}

function getCatColor(cat: string): string {
  const first = cat.split(',')[0].trim()
  return CATEGORY_COLORS[first] ?? '#9ca3af'
}

const selectCss: CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-muted)',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 5,
  padding: '2px 4px',
  outline: 'none',
  cursor: 'pointer',
}

// ─── 工具函式 ─────────────────────────────────────────────
function parseTransport(note?: string | null): { type: string; mins: string } {
  if (!note) return { type: '', mins: '' }
  const [type = '', rest = ''] = note.split(' · ')
  return { type, mins: rest.replace('分鐘', '') }
}

function getDayDate(startDate: string | undefined, dayNum: number): string {
  if (!startDate) return ''
  const [y, mo, d] = startDate.split('-').map(Number)
  const dt = new Date(y, mo - 1, d + dayNum - 1)
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

function timeToMins(time?: string | null): number {
  if (!time) return -1
  const parts = time.split(':')
  if (parts.length < 2) return -1
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function minsToTime(mins: number): string {
  if (mins < 0) return ''
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── 天氣 ─────────────────────────────────────────────────
interface WeatherDay {
  date: string
  max_temp: number
  min_temp: number
  precipitation: number
  emoji: string
  desc: string
}

function getDayFullDate(startDate: string | undefined, dayNum: number): string {
  if (!startDate) return ''
  const [y, mo, d] = startDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d + dayNum - 1))
  return dt.toISOString().slice(0, 10)
}

// ─── Props ────────────────────────────────────────────────
interface ItineraryPanelProps {
  totalDays: number
  items: ItineraryItem[]
  places: Place[]
  selectedDay: number | null
  selectedPlaceId: string | null
  startDate?: string
  currency?: string
  tripLat?: number
  tripLng?: number
  onSelectDay: (day: number | null) => void
  onSelectPlace: (placeId: string | null) => void
  onAddToDay: (placeId: string, dayNumber: number) => void
  onRemoveFromDay: (itineraryId: string) => void
  onReorder: (dayNumber: number, orderedIds: string[]) => void
  onUpdateTime: (itineraryId: string, time: string) => void
  onUpdateTransport: (itineraryId: string, note: string) => void
  onUpdateDuration: (itineraryId: string, minutes: number | null) => void
  onAdjustDays: (delta: number) => void
  onPlaceClick: (place: Place) => void
}

// ─── TransportRow：兩地點間的交通段 ──────────────────────
function TransportRow({
  item,
  prevPlace,
  hasWarning,
  onUpdateTransport,
}: {
  item: ItineraryItem
  prevPlace?: Place | null
  hasWarning?: boolean
  onUpdateTransport: (id: string, note: string) => void
}) {
  const { type, mins } = parseTransport(item.transport_note)
  const [localMins, setLocalMins] = useState(mins)
  const [fetchingRoute, setFetchingRoute] = useState(false)

  useEffect(() => {
    setLocalMins(parseTransport(item.transport_note).mins)
  }, [item.transport_note])

  function save(newType: string, newMins: string) {
    const t = newType === '—' ? '' : newType
    const note =
      t && newMins ? `${t} · ${newMins}分鐘`
      : t ? t
      : newMins ? `${newMins}分鐘`
      : ''
    onUpdateTransport(item.id, note)
  }

  async function handleTypeChange(newType: string) {
    save(newType, localMins)
    const travelMode = TRANSPORT_MODE[newType]
    if (!travelMode) return
    const origin = prevPlace
    const dest = item.place
    if (!origin?.lat || !origin?.lng || !dest?.lat || !dest?.lng) return

    setFetchingRoute(true)
    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
          travelMode,
          routingPreference: 'TRAFFIC_UNAWARE',
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      const durationStr: string = data.routes?.[0]?.duration ?? ''
      const secs = parseInt(durationStr.replace('s', ''))
      if (!secs || isNaN(secs)) return
      const newMins = String(Math.max(1, Math.round(secs / 60)))
      setLocalMins(newMins)
      save(newType, newMins)
    } catch {
      // silent failure
    } finally {
      setFetchingRoute(false)
    }
  }

  return (
    <div
      className="flex items-center gap-1.5 flex-wrap"
      style={{ padding: '2px 6px 2px 26px', marginTop: -2, marginBottom: -2 }}
    >
      <span style={{ fontSize: 10, color: 'var(--color-border)' }}>╎</span>
      <select
        value={type || '—'}
        onChange={e => handleTypeChange(e.target.value)}
        onClick={e => e.stopPropagation()}
        style={selectCss}
      >
        {TRANSPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {fetchingRoute ? (
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>計算中…</span>
      ) : (
        <>
          <input
            type="text"
            inputMode="numeric"
            value={localMins}
            onChange={e => {
              if (/^\d*$/.test(e.target.value)) {
                setLocalMins(e.target.value)
                save(type, e.target.value)
              }
            }}
            onClick={e => e.stopPropagation()}
            placeholder="分鐘"
            style={{ ...selectCss, width: 44, textAlign: 'right' }}
          />
          {localMins && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>分</span>
          )}
        </>
      )}
      {hasWarning && (
        <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 500 }}>⚠ 時間可能不夠</span>
      )}
    </div>
  )
}

// ─── SortableItem：單一行程地點卡 ────────────────────────
function SortableItem({
  item,
  isActive,
  departTime,
  onRemove,
  onUpdateTime,
  onUpdateDuration,
  onSelect,
  onPlaceClick,
}: {
  item: ItineraryItem
  isActive: boolean
  departTime?: string | null
  onRemove: (id: string) => void
  onUpdateTime: (id: string, time: string) => void
  onUpdateDuration: (id: string, minutes: number | null) => void
  onSelect: (placeId: string) => void
  onPlaceClick: (place: Place) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    background: isActive ? 'var(--color-primary-pale)' : 'transparent',
    borderRadius: 8,
    border: isActive ? '1px solid var(--color-primary-light)' : '1px solid transparent',
  }

  const hasTimeline = !!item.planned_time

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 px-2 py-2 mb-0.5 min-w-0 overflow-hidden"
      onClick={() => onSelect(item.place_id)}
      {...attributes}
    >
      {/* 拖拉把手 */}
      <div
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing pt-0.5"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'}
      >
        <GripVertical size={13} />
      </div>

      {/* 時間軸標籤（有 planned_time 才顯示） */}
      {hasTimeline && (
        <div className="flex-shrink-0 text-right" style={{ minWidth: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', display: 'block', lineHeight: 1.3 }}>
            {item.planned_time}
          </span>
          {departTime && (
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'block', lineHeight: 1.3 }}>
              ↓{departTime}
            </span>
          )}
        </div>
      )}

      {/* 地點資訊 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <MapPin size={10} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span
            className="text-sm font-medium truncate min-w-0"
            style={{
              color: 'var(--color-text)',
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationColor: 'var(--color-primary-light)',
              textUnderlineOffset: 2,
            }}
            onClick={e => { e.stopPropagation(); onPlaceClick(item.place) }}
          >
            {item.place.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {!hasTimeline && (
            <select
              value={item.planned_time ?? ''}
              onChange={e => onUpdateTime(item.id, e.target.value)}
              onClick={e => e.stopPropagation()}
              style={selectCss}
            >
              <option value="">時間</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {hasTimeline && (
            <select
              value={item.planned_time ?? ''}
              onChange={e => onUpdateTime(item.id, e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ ...selectCss, fontSize: 10 }}
            >
              <option value="">時間</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <select
            value={String(item.duration_minutes ?? '')}
            onChange={e => {
              onUpdateDuration(item.id, e.target.value ? parseInt(e.target.value) : null)
            }}
            onClick={e => e.stopPropagation()}
            style={selectCss}
          >
            {DURATION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {item.place.estimated_cost != null && item.place.estimated_cost > 0 && (
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              ~{item.place.estimated_cost.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* 移除按鈕 */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(item.id) }}
        className="flex-shrink-0 p-1 rounded mt-0.5"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = '#fee2e2'
          ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'
        }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ─── DaySection：單天容器 ─────────────────────────────────
function DaySection({
  dayNumber,
  items,
  places,
  isSelected,
  selectedPlaceId,
  startDate,
  currency,
  weatherByDate,
  onSelect,
  onSelectPlace,
  onAddToDay,
  onRemoveFromDay,
  onReorder,
  onUpdateTime,
  onUpdateTransport,
  onUpdateDuration,
  onPlaceClick,
}: {
  dayNumber: number
  items: ItineraryItem[]
  places: Place[]
  isSelected: boolean
  selectedPlaceId: string | null
  startDate?: string
  currency: string
  weatherByDate?: Record<string, WeatherDay>
  onSelect: () => void
  onSelectPlace: (placeId: string | null) => void
  onAddToDay: (placeId: string, day: number) => void
  onRemoveFromDay: (id: string) => void
  onReorder: (day: number, ids: string[]) => void
  onUpdateTime: (id: string, time: string) => void
  onUpdateTransport: (id: string, note: string) => void
  onUpdateDuration: (id: string, minutes: number | null) => void
  onPlaceClick: (place: Place) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const addedPlaceIds = new Set(items.map(i => i.place_id))
  const availablePlaces = places.filter(p => !addedPlaceIds.has(p.id))
  const date = getDayDate(startDate, dayNumber)
  const fullDate = getDayFullDate(startDate, dayNumber)
  const weather = weatherByDate?.[fullDate]

  // Per-day estimated cost
  const dayCost = items.reduce((sum, item) => sum + (item.place.estimated_cost ?? 0), 0)

  // Per-item timeline metadata
  const itemsMeta = items.map((item, idx) => {
    const startMins = timeToMins(item.planned_time)
    const durMins = item.duration_minutes ?? 0
    const departMins = startMins >= 0 && durMins > 0 ? startMins + durMins : -1
    const departTime = departMins >= 0 ? minsToTime(departMins) : null

    const nextItem = items[idx + 1]
    if (!nextItem) return { departTime, hasConflictNext: false }

    const { mins: nxtMins } = parseTransport(nextItem.transport_note)
    const nxtTransportNum = parseInt(nxtMins || '0') || 0
    const nextStartMins = timeToMins(nextItem.planned_time)
    const hasConflictNext =
      departMins >= 0 && nextStartMins >= 0 && nxtTransportNum > 0 &&
      departMins + nxtTransportNum > nextStartMins

    return { departTime, hasConflictNext }
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(i => i.id === active.id)
    const newIdx = items.findIndex(i => i.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = [...items]
    const [moved] = reordered.splice(oldIdx, 1)
    reordered.splice(newIdx, 0, moved)
    onReorder(dayNumber, reordered.map(i => i.id))
  }

  return (
    <div
      className="mb-2 rounded-xl overflow-hidden"
      style={{
        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      {/* 天標題列 */}
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ background: isSelected ? 'var(--color-primary-pale)' : 'transparent' }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        <button
          onClick={() => { onSelect(); onSelectPlace(null) }}
          className="flex-1 text-left"
        >
          <span
            className="text-sm font-semibold"
            style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}
          >
            第 {dayNumber} 天
          </span>
          {date && (
            <span
              className="text-xs ml-1.5"
              style={{ color: isSelected ? 'var(--color-primary-light)' : 'var(--color-text-muted)' }}
            >
              {date}
            </span>
          )}
          {weather && (
            <span
              title={`${weather.desc} · ${weather.max_temp}°/${weather.min_temp}° · 雨量 ${weather.precipitation}mm`}
              style={{ fontSize: 13, cursor: 'default', marginLeft: 2, lineHeight: 1 }}
            >
              {weather.emoji}
            </span>
          )}
          <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
            {items.length} 個地點
          </span>
          {dayCost > 0 && (
            <span className="text-xs ml-2 font-medium" style={{ color: 'var(--color-primary)' }}>
              ~{currency} {dayCost.toLocaleString()}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs px-2 py-1 rounded-lg flex-shrink-0 font-medium"
          style={{ background: 'var(--color-primary)', color: 'white' }}
        >
          ＋
        </button>
      </div>

      {/* 地點選擇器 */}
      {showPicker && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid var(--color-border)' }}>
          {availablePlaces.length === 0 ? (
            <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>
              所有地點都已加入這天
            </p>
          ) : (
            <div
              className="mt-2 rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--color-border)', maxHeight: '180px', overflowY: 'auto' }}
            >
              {availablePlaces.map((p, i) => (
                <div
                  key={p.id}
                  onClick={() => { onAddToDay(p.id, dayNumber); setShowPicker(false) }}
                  className="px-3 py-2 cursor-pointer text-sm"
                  style={{
                    color: 'var(--color-text)',
                    borderBottom: i < availablePlaces.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  {p.name}
                  <span className="text-xs ml-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    {p.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 地點列表（可拖拉） */}
      {expanded && items.length > 0 && (
        <div className="px-2 pt-1 pb-1" style={{ borderTop: '1px solid var(--color-border)' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item, idx) => (
                <div key={item.id}>
                  {idx > 0 && (
                    <TransportRow
                      item={item}
                      prevPlace={items[idx - 1].place}
                      hasWarning={itemsMeta[idx - 1]?.hasConflictNext}
                      onUpdateTransport={onUpdateTransport}
                    />
                  )}
                  <SortableItem
                    item={item}
                    isActive={selectedPlaceId === item.place_id}
                    departTime={itemsMeta[idx]?.departTime}
                    onRemove={onRemoveFromDay}
                    onUpdateTime={onUpdateTime}
                    onUpdateDuration={onUpdateDuration}
                    onSelect={onSelectPlace}
                    onPlaceClick={onPlaceClick}
                  />
                </div>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {expanded && items.length === 0 && (
        <div className="px-3 pb-3 pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            點 ＋ 把地點加進這天
          </p>
        </div>
      )}
    </div>
  )
}

// ─── 主元件 ───────────────────────────────────────────────
export default function ItineraryPanel({
  totalDays,
  items,
  places,
  selectedDay,
  selectedPlaceId,
  startDate,
  currency = 'THB',
  tripLat,
  tripLng,
  onSelectDay,
  onSelectPlace,
  onAddToDay,
  onRemoveFromDay,
  onReorder,
  onUpdateTime,
  onUpdateTransport,
  onUpdateDuration,
  onAdjustDays,
  onPlaceClick,
}: ItineraryPanelProps) {
  const days = Array.from({ length: totalDays }, (_, i) => i + 1)
  const [addingUnscheduled, setAddingUnscheduled] = useState<string | null>(null)
  const [weatherByDate, setWeatherByDate] = useState<Record<string, WeatherDay>>({})

  useEffect(() => {
    if (!tripLat || !tripLng) return
    fetch(`/api/weather?lat=${tripLat}&lng=${tripLng}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.days) return
        const map: Record<string, WeatherDay> = {}
        for (const d of data.days as WeatherDay[]) map[d.date] = d
        setWeatherByDate(map)
      })
      .catch(() => {})
  }, [tripLat, tripLng])

  const scheduledIds = new Set(items.map(i => i.place_id))
  const unscheduled = places.filter(p => !scheduledIds.has(p.id))

  // 全程預估費用
  const totalCost = items.reduce((sum, item) => sum + (item.place.estimated_cost ?? 0), 0)

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {/* 全程費用 */}
      {totalCost > 0 && (
        <div className="mb-2 px-3 py-2 rounded-xl flex items-center justify-between"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>全程預估費用</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
            {currency} {totalCost.toLocaleString()}
          </span>
        </div>
      )}

      {/* 未排入地點 */}
      {unscheduled.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
            未排入行程（{unscheduled.length}）
          </p>
          <div
            className="flex gap-2 pb-1"
            style={{ overflowX: 'auto', scrollbarWidth: 'none' }}
          >
            {unscheduled.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium"
                style={{
                  background: addingUnscheduled === p.id ? 'var(--color-primary-pale)' : 'var(--color-bg)',
                  border: `1px solid ${addingUnscheduled === p.id ? 'var(--color-primary-light)' : 'var(--color-border)'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: getCatColor(p.category),
                  flexShrink: 0, display: 'inline-block',
                }} />
                <span style={{ color: 'var(--color-text)' }}>{p.name}</span>
                <button
                  onClick={() => setAddingUnscheduled(addingUnscheduled === p.id ? null : p.id)}
                  style={{
                    color: 'var(--color-primary)', background: 'transparent', border: 'none',
                    padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, lineHeight: 1,
                  }}
                >
                  ＋
                </button>
              </div>
            ))}
          </div>
          {addingUnscheduled && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>加入第幾天：</span>
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => { onAddToDay(addingUnscheduled, day); setAddingUnscheduled(null) }}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  第 {day} 天
                </button>
              ))}
              <button
                onClick={() => setAddingUnscheduled(null)}
                className="text-xs px-2 py-1 rounded-full"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer' }}
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}

      {/* 頂部控制列 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onSelectDay(null)}
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{
            background: selectedDay === null ? 'var(--color-primary)' : 'var(--color-primary-pale)',
            color: selectedDay === null ? 'white' : 'var(--color-primary)',
          }}
        >
          顯示全部
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onAdjustDays(-1)}
            disabled={totalDays <= 1}
            className="w-6 h-6 rounded flex items-center justify-center text-sm font-medium disabled:opacity-30"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              background: 'transparent',
            }}
          >
            －
          </button>
          <span className="text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
            共 {totalDays} 天
          </span>
          <button
            onClick={() => onAdjustDays(1)}
            className="w-6 h-6 rounded flex items-center justify-center text-sm font-medium"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              background: 'transparent',
            }}
          >
            ＋
          </button>
        </div>
      </div>

      {days.map(day => (
        <DaySection
          key={day}
          dayNumber={day}
          items={items
            .filter(i => i.day_number === day)
            .sort((a, b) => a.order_index - b.order_index)}
          places={places}
          isSelected={selectedDay === day}
          selectedPlaceId={selectedPlaceId}
          startDate={startDate}
          currency={currency}
          weatherByDate={weatherByDate}
          onSelect={() => onSelectDay(selectedDay === day ? null : day)}
          onSelectPlace={onSelectPlace}
          onAddToDay={onAddToDay}
          onRemoveFromDay={onRemoveFromDay}
          onReorder={onReorder}
          onUpdateTime={onUpdateTime}
          onUpdateTransport={onUpdateTransport}
          onUpdateDuration={onUpdateDuration}
          onPlaceClick={onPlaceClick}
        />
      ))}
    </div>
  )
}
