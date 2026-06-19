'use client'

import { useState } from 'react'
import { ArrowLeft, Trash2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { List, PlaceList } from '@/types'

const PRESET_COLORS = [
  '#E07B54',
  '#C9A84C',
  '#4A9B6F',
  '#5B8DB8',
  '#9B7BB8',
  '#B85B7A',
]

interface ListPanelProps {
  lists: List[]
  placeLists: PlaceList[]
  currentTripId: string
  initialView?: View
  onClose: () => void
  onListsChange: () => void
}

type View = 'main' | 'add' | 'manage'

export default function ListPanel({ lists, placeLists, currentTripId, initialView = 'main', onClose, onListsChange }: ListPanelProps) {
  const [view, setView] = useState<View>(initialView)

  // 新增 view state
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [adding, setAdding] = useState(false)

  // 管理 view state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmList, setConfirmList] = useState<List | null>(null)

  // ── 新增清單 ──
  async function handleAddList(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !currentTripId) return
    setAdding(true)
    const { error } = await supabase.from('lists').insert({
      trip_id: currentTripId,
      name: newName.trim(),
      color: newColor,
    })
    setAdding(false)
    if (error) { alert(`新增失敗：${error.message}`); return }
    setNewName('')
    setNewColor(PRESET_COLORS[0])
    onListsChange()
    setView('main')
  }

  // ── inline 編輯：失去焦點才 update ──
  async function handleBlurEdit(list: List) {
    const trimmed = editingName.trim()
    setEditingId(null)
    if (!trimmed || trimmed === list.name) return
    await supabase.from('lists').update({ name: trimmed }).eq('id', list.id)
    onListsChange()
  }

  // ── 刪除 ──
  async function executeDelete(list: List) {
    setConfirmList(null)
    setDeletingId(list.id)
    await supabase.from('place_lists').delete().eq('list_id', list.id)
    const { error } = await supabase.from('lists').delete().eq('id', list.id)
    setDeletingId(null)
    if (error) { alert(`刪除失敗：${error.message}`); return }
    onListsChange()
  }

  // ── 共用樣式 ──
  const headerStyle: React.CSSProperties = {
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  }
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

  // ══════════════════════════════════════
  // VIEW: main
  // ══════════════════════════════════════
  if (view === 'main') {
    return (
      <>
        <div className="px-5 py-4 flex items-center gap-3" style={headerStyle}>
          <button onClick={onClose} style={iconBtn}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-text-muted)' }}>清單管理</span>
          <button onClick={() => { setNewName(''); setNewColor(PRESET_COLORS[0]); setView('add') }}
            style={iconBtn} title="新增清單"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <Plus size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lists.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              還沒有清單，點右上角 ＋ 新增一個吧！
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lists.map((list) => {
                const count = placeLists.filter(pl => pl.list_id === list.id).length
                return (
                  <li key={list.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid var(--color-border)' }}>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: list.color }} />
                    <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {list.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: 'var(--color-primary-pale)', color: 'var(--color-primary)' }}>
                      {count} 個地點
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </>
    )
  }

  // ══════════════════════════════════════
  // VIEW: add
  // ══════════════════════════════════════
  if (view === 'add') {
    return (
      <>
        <div className="px-5 py-4 flex items-center gap-3" style={headerStyle}>
          <button onClick={onClose} style={iconBtn}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>新增清單</span>
        </div>

        <form onSubmit={handleAddList} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 min-h-0">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>清單名稱</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="必去、備案、美食…"
              autoFocus
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>顏色</label>
            <div className="flex items-center gap-2.5">
              {PRESET_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setNewColor(color)}
                  className="w-7 h-7 rounded-full transition-transform"
                  style={{
                    background: color,
                    transform: newColor === color ? 'scale(1.3)' : 'scale(1)',
                    outline: newColor === color ? `2px solid ${color}` : 'none',
                    outlineOffset: 2,
                  }} />
              ))}
            </div>
          </div>

          <button type="submit" disabled={adding || !newName.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 mt-2"
            style={{ background: 'var(--color-primary)' }}>
            {adding ? '新增中…' : '新增清單'}
          </button>
        </form>
      </>
    )
  }

  // ══════════════════════════════════════
  // VIEW: manage
  // ══════════════════════════════════════
  return (
    <>
      {/* 刪除確認 dialog */}
      {confirmList && (
        <div className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setConfirmList(null)}>
          <div className="rounded-xl shadow-lg p-5 mx-4 max-w-xs w-full"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>確定要刪除？</p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              「{confirmList.name}」將被刪除，清單內的地點不受影響。
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmList(null)}
                className="flex-1 rounded-lg py-2 text-sm font-medium"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent' }}>
                取消
              </button>
              <button onClick={() => executeDelete(confirmList)}
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white"
                style={{ background: '#ef4444' }}>
                刪除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 py-4 flex items-center gap-3" style={headerStyle}>
        <button onClick={() => { setEditingId(null); setView('main') }} style={iconBtn}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>管理清單</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {lists.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>還沒有清單。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lists.map(list => (
              <li key={list.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ border: '1px solid var(--color-border)' }}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: list.color }} />

                {editingId === list.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={() => handleBlurEdit(list)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
                      if (e.key === 'Escape') { setEditingId(null) }
                    }}
                    className="flex-1 text-sm rounded px-1.5 py-0.5 outline-none"
                    style={{ border: '1px solid var(--color-primary-light)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
                  />
                ) : (
                  <span
                    className="flex-1 text-sm font-medium cursor-text"
                    style={{ color: 'var(--color-text)' }}
                    onClick={() => { setEditingId(list.id); setEditingName(list.name) }}
                    title="點擊編輯名稱">
                    {list.name}
                  </span>
                )}

                <button
                  onClick={() => setConfirmList(list)}
                  disabled={deletingId === list.id}
                  className="p-1 rounded flex-shrink-0 disabled:opacity-40"
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
    </>
  )
}
