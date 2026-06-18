'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, Link2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PlaceLink } from '@/types'

// 從 URL 自動判斷平台
function detectPlatform(url: string): 'ig' | 'youtube' | 'other' {
  const u = url.toLowerCase()
  if (u.includes('instagram.com')) return 'ig'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  return 'other'
}

// 平台品牌色（IG / YouTube 可 hardcode 品牌色）
const PLATFORM_COLOR: Record<string, string> = {
  ig: '#E1306C',
  youtube: '#FF0000',
  other: 'var(--color-text-muted)',
}

const PLATFORM_LABEL: Record<string, string> = {
  ig: 'Instagram',
  youtube: 'YouTube',
  other: '連結',
}

// 無縮圖時的平台圖示佔位（帶品牌色的色塊）
function PlatformIconFallback({ platform }: { platform: PlaceLink['platform'] }) {
  if (platform === 'ig') {
    return (
      <div
        style={{
          width: 48, height: 48, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 12, fontWeight: 700,
        }}
      >IG</div>
    )
  }
  if (platform === 'youtube') {
    return (
      <div
        style={{
          width: 48, height: 48, borderRadius: 8, flexShrink: 0,
          background: '#FF0000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 16,
        }}
      >▶</div>
    )
  }
  // other：用系統主色
  return (
    <div
      style={{
        width: 48, height: 48, borderRadius: 8, flexShrink: 0,
        background: 'var(--color-primary-pale)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Link2 size={18} style={{ color: 'var(--color-primary)' }} />
    </div>
  )
}

interface PlaceLinksProps {
  placeId: string // 由 page.tsx 傳入，使用 key={placeId} 保證切換地點時元件重置
}

export default function PlaceLinks({ placeId }: PlaceLinksProps) {
  const [links, setLinks] = useState<PlaceLink[]>([])
  const [inputUrl, setInputUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const addingRef = useRef(false) // 同步 guard，防止 Enter + onClick 雙重觸發
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 讀取此地點的所有社群連結
  async function fetchLinks() {
    const { data } = await supabase
      .from('place_links')
      .select('*')
      .eq('place_id', placeId)
      .order('created_at', { ascending: true })
    if (data) setLinks(data as PlaceLink[])
  }

  // 開啟詳情面板時（placeId 變更）立即讀取
  useEffect(() => { fetchLinks() }, [placeId])

  // 新增連結：判斷平台 → 後端抓 OG → 寫入 Supabase
  async function handleAdd() {
    const url = inputUrl.trim()
    if (!url || addingRef.current) return

    addingRef.current = true
    setAdding(true)

    const platform = detectPlatform(url) // 從 URL 判斷平台

    // 呼叫 /api/og 在後端抓 OpenGraph，避免前端直接 fetch 被 CORS 擋
    let title = ''
    let thumbnail_url = ''
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`)
      if (res.ok) {
        const og = await res.json()
        title = og.title ?? ''
        thumbnail_url = og.thumbnail_url ?? ''
      }
    } catch {
      // OG 抓取失敗不阻止新增，UI 改用平台圖示 fallback
    }

    const { error } = await supabase.from('place_links').insert({
      place_id: placeId,
      url,
      platform,
      title: title || null,
      thumbnail_url: thumbnail_url || null,
    })

    if (error) {
      alert(`新增失敗：${error.message}`)
    } else {
      setInputUrl('')
      await fetchLinks()
    }

    addingRef.current = false
    setAdding(false)
  }

  // 刪除連結
  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('place_links').delete().eq('id', id)
    setDeletingId(null)
    fetchLinks() // 刪除後重新讀取
  }

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
        社群連結
      </p>

      {/* 新增連結輸入框 */}
      <div className="flex gap-2 mb-3">
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="貼上 IG / YouTube / 其他連結…"
          disabled={adding}
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            background: 'var(--color-bg)',
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !inputUrl.trim()}
          className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50 whitespace-nowrap"
          style={{ background: 'var(--color-primary)' }}
        >
          {adding ? '抓取中…' : '新增'}
        </button>
      </div>

      {/* 連結清單 */}
      {links.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              {/* 點整列在新分頁開啟連結 */}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 flex-1 min-w-0 p-2.5"
                style={{ textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                {/* 縮圖（有就顯示），載入失敗自動隱藏，改用平台圖示 */}
                {link.thumbnail_url ? (
                  <img
                    src={link.thumbnail_url}
                    alt={link.title ?? ''}
                    style={{
                      width: 48, height: 48,
                      objectFit: 'cover',
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      // 圖片載入失敗時隱藏，讓父層 fallback 顯示
                      (e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <PlatformIconFallback platform={link.platform} />
                )}

                {/* 標題 + 平台標籤 */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {link.title || link.url} {/* 沒有 title 時直接顯示 URL */}
                  </p>
                  <span
                    className="text-xs font-medium"
                    style={{ color: PLATFORM_COLOR[link.platform] ?? PLATFORM_COLOR.other }}
                  >
                    {PLATFORM_LABEL[link.platform] ?? '連結'}
                  </span>
                </div>
              </a>

              {/* 刪除按鈕：stopPropagation 避免觸發 <a> 的點擊 */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(link.id) }}
                disabled={deletingId === link.id}
                className="p-2.5 flex-shrink-0 transition-colors disabled:opacity-40"
                style={{
                  color: 'var(--color-text-muted)',
                  borderLeft: '1px solid var(--color-border)',
                }}
                title="刪除連結"
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = '#fee2e2'
                  ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'
                }}
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        // 沒有連結時的空狀態提示
        !adding && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            還沒有社群連結，貼上網址新增
          </p>
        )
      )}
    </div>
  )
}
