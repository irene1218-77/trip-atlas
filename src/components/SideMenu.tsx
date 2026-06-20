'use client'

import { useState } from 'react'
import { Sparkles, NotebookPen, Share2, Check, ListChecks, ClipboardList, Backpack } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onOpenAI: () => void
  onOpenNotes: () => void
  onOpenManageLists: () => void
  onOpenChecklist: (type: 'checklist' | 'packing') => void
  tripId: string | null
}

export default function SideMenu({ isOpen, onClose, onOpenAI, onOpenNotes, onOpenManageLists, onOpenChecklist, tripId }: Props) {
  const [copied, setCopied] = useState(false)

  function handleOpenAI() {
    onClose()
    setTimeout(onOpenAI, 280)
  }

  function handleOpenNotes() {
    onClose()
    setTimeout(onOpenNotes, 280)
  }

  function handleOpenManageLists() {
    onClose()
    setTimeout(onOpenManageLists, 280)
  }

  function handleOpenChecklist(type: 'checklist' | 'packing') {
    onClose()
    setTimeout(() => onOpenChecklist(type), 280)
  }

  async function handleShare() {
    if (!tripId) return
    const url = `${window.location.origin}/share/${tripId}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const items = [
    {
      label: '探索推薦景點',
      desc: 'AI 分析旅遊影片，快速找到好地方',
      icon: <Sparkles size={18} />,
      onClick: handleOpenAI,
    },
    {
      label: '清單管理',
      desc: '編輯清單名稱、顏色，或刪除清單',
      icon: <ListChecks size={18} />,
      onClick: handleOpenManageLists,
    },
    {
      label: '旅行清單分享',
      desc: copied ? '已複製連結！' : '產生唯讀連結，分享給旅伴',
      icon: copied ? <Check size={18} /> : <Share2 size={18} />,
      onClick: handleShare,
    },
    {
      label: '行程範本',
      desc: '開啟行程筆記，記錄備忘與靈感',
      icon: <NotebookPen size={18} />,
      onClick: handleOpenNotes,
    },
    {
      label: '出發前清單',
      desc: '護照、簽證、保險…逐項確認不漏帶',
      icon: <ClipboardList size={18} />,
      onClick: () => handleOpenChecklist('checklist'),
    },
    {
      label: '打包清單',
      desc: '衣物、藥品、充電器…出發前整理行李',
      icon: <Backpack size={18} />,
      onClick: () => handleOpenChecklist('packing'),
    },
  ]

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 39,
          background: 'rgba(0,0,0,0.35)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* 面板 */}
      <div
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0,
          width: 280, zIndex: 40,
          background: 'var(--color-surface)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.14)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 頂部 logo */}
        <div style={{
          padding: '28px 24px 20px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px',
              color: 'var(--color-primary)',
            }}>Trip Atlas</span>
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>v1.0</span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>你的私人旅行規劃本</p>
        </div>

        {/* 功能選單 */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                borderRadius: 12, padding: '14px 16px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                textAlign: 'left', cursor: 'pointer', width: '100%',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary-light)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
              }}
            >
              <span style={{ color: 'var(--color-primary)', marginTop: 1, flexShrink: 0 }}>
                {item.icon}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  {item.desc}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* 底部版權 */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 11, color: '#d1d5db' }}>© 2026 Trip Atlas</p>
        </div>
      </div>
    </>
  )
}
