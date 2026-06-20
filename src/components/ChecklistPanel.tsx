'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Trash2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ChecklistItem {
  id: string
  trip_id: string
  text: string
  is_done: boolean
  order_index: number
  created_at: string
}

const PRESETS = ['護照效期', '簽證', '海外保險', '訂位確認', '換匯', '行動網路']

interface Props {
  tripId: string
  onClose: () => void
}

export default function ChecklistPanel({ tripId, onClose }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    const { data } = await supabase
      .from('trip_checklist')
      .select('*')
      .eq('trip_id', tripId)
      .order('order_index', { ascending: true })
    if (data) setItems(data as ChecklistItem[])
  }

  async function handleAdd(text: string) {
    const t = text.trim()
    if (!t || adding) return
    setAdding(true)
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) : -1
    await supabase.from('trip_checklist').insert({
      trip_id: tripId,
      text: t,
      is_done: false,
      order_index: maxOrder + 1,
    })
    setNewText('')
    await fetchItems()
    setAdding(false)
  }

  async function handleToggle(item: ChecklistItem) {
    await supabase.from('trip_checklist').update({ is_done: !item.is_done }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_done: !i.is_done } : i))
  }

  async function handleDelete(id: string) {
    await supabase.from('trip_checklist').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const doneCount = items.filter(i => i.is_done).length

  const iconBtn: React.CSSProperties = {
    color: 'var(--color-text-muted)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 8,
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={onClose} style={iconBtn}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-semibold flex-1" style={{ color: 'var(--color-text)' }}>出發前清單</span>
        {items.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-primary-pale)', color: 'var(--color-primary)' }}>
            {doneCount}/{items.length}
          </span>
        )}
      </div>

      {/* Add input */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <form onSubmit={e => { e.preventDefault(); handleAdd(newText) }}
          className="flex items-center gap-2">
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="新增待辦項目…"
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
          />
          <button type="submit" disabled={!newText.trim() || adding}
            className="rounded-lg p-2 text-white disabled:opacity-40 flex-shrink-0 flex items-center justify-center"
            style={{ background: 'var(--color-primary)', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} />
          </button>
        </form>
      </div>

      {/* List / empty state */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <div>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>常見項目快速新增：</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p} onClick={() => handleAdd(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary-light)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' }}>
                  + {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map(item => (
              <li key={item.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ border: '1px solid var(--color-border)', background: item.is_done ? 'var(--color-bg)' : 'transparent' }}>
                <input
                  type="checkbox"
                  checked={item.is_done}
                  onChange={() => handleToggle(item)}
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
                <span className="flex-1 text-sm" style={{
                  color: item.is_done ? 'var(--color-text-muted)' : 'var(--color-text)',
                  textDecoration: item.is_done ? 'line-through' : 'none',
                }}>
                  {item.text}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 rounded flex-shrink-0"
                  style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#ef4444' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}>
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
