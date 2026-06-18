'use client'
import { useState, useEffect } from 'react'
import { ArrowLeft, Pencil, Trash2, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── 型別 ─────────────────────────────────────────────────
interface Note {
  text: string
  created_at: string
}

interface FlightEntry {
  id: string
  flightNo: string
  date: string
  direction: string
  departTime: string
  arriveTime: string
  confirmCode: string
}

interface AccomEntry {
  id: string
  hotelName: string
  checkin: string
  checkout: string
  confirmCode: string
  address: string
}

const EMPTY_FLIGHT: Omit<FlightEntry, 'id'> = {
  flightNo: '', date: '', direction: '去程', departTime: '', arriveTime: '', confirmCode: '',
}
const EMPTY_ACCOM: Omit<AccomEntry, 'id'> = {
  hotelName: '', checkin: '', checkout: '', confirmCode: '', address: '',
}

// ─── 折疊區塊容器 ─────────────────────────────────────────
function Section({
  title, count, children, defaultOpen = false,
}: {
  title: string; count: number; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', background: 'var(--color-bg)',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {open ? <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
               : <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{title}</span>
        {count > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: 'var(--color-primary)',
            background: 'var(--color-primary-pale)', borderRadius: 99, padding: '1px 7px',
          }}>{count}</span>
        )}
      </button>
      {open && <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--color-border)' }}>{children}</div>}
    </div>
  )
}

// ─── 輸入欄位輔助 ─────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  width: '100%', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none',
  border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)',
}
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3, display: 'block' }

// ─── Props ────────────────────────────────────────────────
interface TripNotesPanelProps {
  tripId: string
  onClose: () => void
}

export default function TripNotesPanel({ tripId, onClose }: TripNotesPanelProps) {
  const [notes,   setNotes]   = useState<Note[]>([])
  const [flights, setFlights] = useState<FlightEntry[]>([])
  const [accoms,  setAccoms]  = useState<AccomEntry[]>([])

  const [newNote, setNewNote]   = useState('')
  const [adding,  setAdding]    = useState(false)
  const [editingIdx,  setEditingIdx]  = useState<number | null>(null)
  const [editValue,   setEditValue]   = useState('')

  const [addingFlight, setAddingFlight] = useState(false)
  const [flightForm,   setFlightForm]   = useState<Omit<FlightEntry, 'id'>>(EMPTY_FLIGHT)

  const [addingAccom, setAddingAccom] = useState(false)
  const [accomForm,   setAccomForm]   = useState<Omit<AccomEntry, 'id'>>(EMPTY_ACCOM)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data } = await supabase
      .from('trips')
      .select('trip_notes, flight_info, accommodation')
      .eq('id', tripId)
      .single()
    setNotes((data?.trip_notes as Note[])        ?? [])
    setFlights((data?.flight_info as FlightEntry[]) ?? [])
    setAccoms((data?.accommodation as AccomEntry[]) ?? [])
  }

  // ── Notes ──────────────────────────────────────────────
  async function persistNotes(updated: Note[]) {
    await supabase.from('trips').update({ trip_notes: updated }).eq('id', tripId)
    setNotes(updated)
  }
  async function handleAdd() {
    if (!newNote.trim() || adding) return
    setAdding(true)
    await persistNotes([...notes, { text: newNote.trim(), created_at: new Date().toISOString() }])
    setNewNote('')
    setAdding(false)
  }
  async function handleDelete(idx: number) {
    await persistNotes(notes.filter((_, i) => i !== idx))
    if (editingIdx === idx) setEditingIdx(null)
  }
  async function handleSaveEdit(idx: number) {
    if (!editValue.trim()) return
    await persistNotes(notes.map((n, i) => i === idx ? { ...n, text: editValue.trim() } : n))
    setEditingIdx(null)
  }

  // ── Flights ────────────────────────────────────────────
  async function persistFlights(updated: FlightEntry[]) {
    await supabase.from('trips').update({ flight_info: updated }).eq('id', tripId)
    setFlights(updated)
  }
  async function handleAddFlight() {
    if (!flightForm.flightNo.trim() && !flightForm.date) return
    await persistFlights([...flights, { ...flightForm, id: Date.now().toString() }])
    setFlightForm(EMPTY_FLIGHT)
    setAddingFlight(false)
  }
  async function handleDeleteFlight(id: string) {
    await persistFlights(flights.filter(f => f.id !== id))
  }

  // ── Accoms ─────────────────────────────────────────────
  async function persistAccoms(updated: AccomEntry[]) {
    await supabase.from('trips').update({ accommodation: updated }).eq('id', tripId)
    setAccoms(updated)
  }
  async function handleAddAccom() {
    if (!accomForm.hotelName.trim()) return
    await persistAccoms([...accoms, { ...accomForm, id: Date.now().toString() }])
    setAccomForm(EMPTY_ACCOM)
    setAddingAccom(false)
  }
  async function handleDeleteAccom(id: string) {
    await persistAccoms(accoms.filter(a => a.id !== id))
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const entryCard: React.CSSProperties = {
    borderRadius: 10, padding: '10px 12px', marginTop: 8,
    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
    position: 'relative',
  }
  const delBtn: React.CSSProperties = {
    position: 'absolute', top: 8, right: 8, padding: 4, background: 'transparent', border: 'none',
    cursor: 'pointer', color: '#ef4444', borderRadius: 6,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={onClose} className="rounded-lg p-1.5"
          style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none' }}>
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>行程筆記</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ── 航班資訊 ── */}
        <Section title="✈ 航班資訊" count={flights.length}>
          {flights.map(f => (
            <div key={f.id} style={entryCard}>
              <button style={delBtn} onClick={() => handleDeleteFlight(f.id)}><Trash2 size={12} /></button>
              <div style={{ paddingRight: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{f.flightNo || '—'}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 99, fontWeight: 600,
                    background: f.direction === '去程' ? '#D8F3DC' : '#FEF2F2',
                    color: f.direction === '去程' ? '#2D6A4F' : '#B91C1C',
                  }}>{f.direction}</span>
                  {f.date && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{f.date}</span>}
                </div>
                {(f.departTime || f.arriveTime) && (
                  <p style={{ fontSize: 12, color: 'var(--color-text)' }}>
                    {f.departTime} {f.departTime && f.arriveTime ? '→' : ''} {f.arriveTime}
                  </p>
                )}
                {f.confirmCode && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>確認碼：{f.confirmCode}</p>
                )}
              </div>
            </div>
          ))}

          {addingFlight ? (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <label style={labelStyle}>航班號</label>
                  <input style={fieldStyle} placeholder="AA123" value={flightForm.flightNo}
                    onChange={e => setFlightForm(f => ({ ...f, flightNo: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>日期</label>
                  <input type="date" style={fieldStyle} value={flightForm.date}
                    onChange={e => setFlightForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>方向</label>
                  <select style={fieldStyle} value={flightForm.direction}
                    onChange={e => setFlightForm(f => ({ ...f, direction: e.target.value }))}>
                    <option>去程</option><option>回程</option><option>中轉</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>確認碼</label>
                  <input style={fieldStyle} placeholder="ABC123" value={flightForm.confirmCode}
                    onChange={e => setFlightForm(f => ({ ...f, confirmCode: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>出發時間</label>
                  <input type="time" style={fieldStyle} value={flightForm.departTime}
                    onChange={e => setFlightForm(f => ({ ...f, departTime: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>抵達時間</label>
                  <input type="time" style={fieldStyle} value={flightForm.arriveTime}
                    onChange={e => setFlightForm(f => ({ ...f, arriveTime: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <button onClick={() => { setAddingFlight(false); setFlightForm(EMPTY_FLIGHT) }}
                  style={{ flex: 1, borderRadius: 8, padding: '6px 0', fontSize: 12, fontWeight: 500, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer' }}>
                  取消
                </button>
                <button onClick={handleAddFlight}
                  style={{ flex: 1, borderRadius: 8, padding: '6px 0', fontSize: 12, fontWeight: 600, background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}>
                  儲存
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingFlight(true)}
              style={{
                marginTop: 8, width: '100%', borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 500,
                border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
              <Plus size={13} /> 新增航班
            </button>
          )}
        </Section>

        {/* ── 住宿資訊 ── */}
        <Section title="🏨 住宿資訊" count={accoms.length}>
          {accoms.map(a => (
            <div key={a.id} style={entryCard}>
              <button style={delBtn} onClick={() => handleDeleteAccom(a.id)}><Trash2 size={12} /></button>
              <div style={{ paddingRight: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3 }}>{a.hotelName || '—'}</p>
                {(a.checkin || a.checkout) && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {a.checkin} {a.checkin && a.checkout ? '～' : ''} {a.checkout}
                  </p>
                )}
                {a.confirmCode && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>確認碼：{a.confirmCode}</p>
                )}
                {a.address && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{a.address}</p>
                )}
              </div>
            </div>
          ))}

          {addingAccom ? (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div>
                <label style={labelStyle}>飯店名稱</label>
                <input style={fieldStyle} placeholder="大倉飯店" value={accomForm.hotelName}
                  onChange={e => setAccomForm(a => ({ ...a, hotelName: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <label style={labelStyle}>Check-in</label>
                  <input type="date" style={fieldStyle} value={accomForm.checkin}
                    onChange={e => setAccomForm(a => ({ ...a, checkin: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Check-out</label>
                  <input type="date" style={fieldStyle} value={accomForm.checkout}
                    onChange={e => setAccomForm(a => ({ ...a, checkout: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>確認碼</label>
                <input style={fieldStyle} placeholder="DEF456" value={accomForm.confirmCode}
                  onChange={e => setAccomForm(a => ({ ...a, confirmCode: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>地址</label>
                <input style={fieldStyle} placeholder="地址（選填）" value={accomForm.address}
                  onChange={e => setAccomForm(a => ({ ...a, address: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <button onClick={() => { setAddingAccom(false); setAccomForm(EMPTY_ACCOM) }}
                  style={{ flex: 1, borderRadius: 8, padding: '6px 0', fontSize: 12, fontWeight: 500, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer' }}>
                  取消
                </button>
                <button onClick={handleAddAccom}
                  style={{ flex: 1, borderRadius: 8, padding: '6px 0', fontSize: 12, fontWeight: 600, background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}>
                  儲存
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingAccom(true)}
              style={{
                marginTop: 8, width: '100%', borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 500,
                border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
              <Plus size={13} /> 新增住宿
            </button>
          )}
        </Section>

        {/* ── 旅行筆記 ── */}
        <Section title="📝 旅行筆記" count={notes.length} defaultOpen>
          {notes.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '12px 0', textAlign: 'center' }}>
              還沒有行程筆記
            </p>
          )}
          {notes.map((note, idx) => (
            <div key={idx} style={entryCard}>
              {editingIdx === idx ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    rows={3} autoFocus
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                    style={{ border: '1px solid var(--color-primary-light)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditingIdx(null)}
                      style={{ flex: 1, borderRadius: 8, padding: '6px 0', fontSize: 12, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer' }}>
                      取消
                    </button>
                    <button onClick={() => handleSaveEdit(idx)}
                      style={{ flex: 1, borderRadius: 8, padding: '6px 0', fontSize: 12, fontWeight: 600, background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}>
                      儲存
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text)' }}>{note.text}</p>
                    <p style={{ fontSize: 10, marginTop: 4, color: 'var(--color-text-muted)' }}>{formatDate(note.created_at)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => { setEditingIdx(idx); setEditValue(note.text) }}
                      style={{ padding: 5, borderRadius: 6, color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(idx)}
                      style={{ padding: 5, borderRadius: 6, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add note inline */}
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)}
              placeholder="記錄行程備忘、訂位提醒、交通建議…"
              rows={2}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd() }}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
            <button onClick={handleAdd} disabled={!newNote.trim() || adding}
              style={{ width: '100%', borderRadius: 10, padding: '7px 0', fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer', opacity: (!newNote.trim() || adding) ? 0.4 : 1 }}>
              {adding ? '新增中…' : '＋ 新增筆記'}
            </button>
          </div>
        </Section>

      </div>
    </div>
  )
}
