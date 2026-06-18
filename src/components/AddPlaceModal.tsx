/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// 階段 2 再做 trip 選擇，先用固定 UUID 佔位
const PLACEHOLDER_TRIP_ID = '00000000-0000-0000-0000-000000000001'

const DEFAULT_CATEGORIES = ['景點', '餐廳', '住宿', '活動']

interface SelectedPlaceData {
  name: string
  address: string
  lat: number | null
  lng: number | null
  googlePlaceId: string
}

// initialData：從地圖 click + reverse geocoding 帶入的預填資料
interface InitialData {
  name: string
  address: string
  lat: number
  lng: number
}

interface AddPlaceModalProps {
  onClose: () => void
  onSuccess: () => void
  initialData?: InitialData // 有值表示從地圖點擊開啟
}

export default function AddPlaceModal({ onClose, onSuccess, initialData }: AddPlaceModalProps) {
  // 從 initialData 初始化 state（只在 mount 時使用一次，故直接當 useState 初始值）
  const [input, setInput] = useState(initialData?.name ?? '')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  // 若有 initialData（來自 reverse geocoding）則預先建立 selectedPlace
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlaceData | null>(
    initialData
      ? {
          name: initialData.name,
          address: initialData.address,
          lat: initialData.lat,
          lng: initialData.lng,
          googlePlaceId: '', // reverse geocoding 沒有 Place ID
        }
      : null
  )

  const [category, setCategory] = useState('景點')
  const [customCategory, setCustomCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sessionTokenRef = useRef<any>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // 點搜尋框外側就關閉下拉清單
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  // 取得或建立本次 session token（從輸入開始到點選結果為一個 billing session）
  const getOrCreateSessionToken = useCallback(async () => {
    if (!sessionTokenRef.current) {
      const lib = await (window as any).google.maps.importLibrary('places')
      sessionTokenRef.current = new lib.AutocompleteSessionToken()
    }
    return sessionTokenRef.current
  }, [])

  // 呼叫 Google Places AutocompleteSuggestion API
  const fetchSuggestions = useCallback(async (value: string) => {
    if (!value.trim() || value.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    if (!(window as any).google?.maps) return
    try {
      const token = await getOrCreateSessionToken()
      const { AutocompleteSuggestion } = await (window as any).google.maps.importLibrary('places')
      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: value,
        sessionToken: token,
        locationBias: { south: -9.0, west: 114.4, north: -7.9, east: 115.7 }, // 偏向峇里島
        language: 'zh-TW',
      })
      setSuggestions(results ?? [])
      setShowDropdown(true)
    } catch (err) {
      console.error('Places Autocomplete error:', err)
    }
  }, [getOrCreateSessionToken])

  // 輸入框變更：觸發 Autocomplete 搜尋，但不清除 selectedPlace（讓名稱可獨立編輯）
  // 若使用者想換地點，透過點選新建議或按 ✕ 清除
  function handleInputChange(value: string) {
    setInput(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  // 使用者點選某個建議：呼叫 Place Details 結束 session，取得完整地點資料
  async function handleSelectSuggestion(suggestion: any) {
    try {
      const place = suggestion.placePrediction.toPlace()
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'id'] })

      setSelectedPlace({
        name: place.displayName ?? '',
        address: place.formattedAddress ?? '',
        lat: place.location?.lat() ?? null,
        lng: place.location?.lng() ?? null,
        googlePlaceId: place.id ?? '',
      })
      setInput(place.displayName ?? suggestion.placePrediction.text.toString())
      setSuggestions([])
      setShowDropdown(false)
      sessionTokenRef.current = null // session 結束，下次搜尋重新建立
    } catch (err) {
      console.error('Place Details fetch error:', err)
    }
  }

  // 清除搜尋框和已選地點，重置 session
  function clearSearch() {
    setInput('')
    setSelectedPlace(null)
    setSuggestions([])
    setShowDropdown(false)
    sessionTokenRef.current = null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nameToSave = input.trim()
    if (!nameToSave) return

    const finalCategory = category === '其他' ? customCategory.trim() : category
    if (category === '其他' && !finalCategory) return

    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('places').insert({
      trip_id: PLACEHOLDER_TRIP_ID,
      name: nameToSave,             // 永遠以輸入框文字為準，允許使用者自訂名稱
      category: finalCategory,
      my_notes: notes.trim() || null,
      lat: selectedPlace?.lat ?? null,
      lng: selectedPlace?.lng ?? null,
      address: selectedPlace?.address || null,
      google_place_id: selectedPlace?.googlePlaceId || null,
    })

    setLoading(false)
    if (insertError) { setError(insertError.message); return }
    onSuccess()
    onClose()
  }

  const canSubmit =
    input.trim() &&
    (category !== '其他' || customCategory.trim())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-lg p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          {initialData ? '新增地點（點擊地圖）' : '新增地點'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* ── 搜尋 / 名稱輸入框 + 自動完成下拉 ── */}
          <div className="flex flex-col gap-1" ref={searchContainerRef}>
            <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              地點名稱 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder={initialData ? '確認或修改地點名稱' : '輸入地點名稱或地址搜尋…'}
                autoComplete="off"
                autoFocus={!initialData} // 從 + 按鈕開啟時自動 focus
                className="w-full rounded-lg px-3 py-2 pr-8 text-sm outline-none"
                style={{
                  border: `1px solid ${selectedPlace ? 'var(--color-primary-light)' : 'var(--color-border)'}`,
                  color: 'var(--color-text)',
                  background: 'var(--color-bg)',
                }}
              />
              {input && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label="清除"
                >✕</button>
              )}

              {/* Autocomplete 下拉建議清單 */}
              {showDropdown && suggestions.length > 0 && (
                <ul
                  className="absolute z-20 w-full mt-1 rounded-lg shadow-xl overflow-hidden"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    maxHeight: '240px',
                    overflowY: 'auto',
                  }}
                >
                  {suggestions.map((s: any, i: number) => {
                    const pred = s.placePrediction
                    const main = pred.mainText?.toString() ?? pred.text.toString()
                    const secondary = pred.secondaryText?.toString() ?? ''
                    return (
                      <li
                        key={i}
                        onMouseDown={() => handleSelectSuggestion(s)} // mousedown：在 blur 之前觸發
                        className="px-3 py-2.5 cursor-pointer text-sm"
                        style={{ borderBottom: i < suggestions.length - 1 ? `1px solid var(--color-border)` : 'none' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <div className="font-medium" style={{ color: 'var(--color-text)' }}>{main}</div>
                        {secondary && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{secondary}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* 已選地點的地址與座標確認卡 */}
            {selectedPlace && (selectedPlace.address || selectedPlace.lat != null) && (
              <div
                className="mt-1 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'var(--color-primary-pale)', color: 'var(--color-primary)' }}
              >
                {selectedPlace.address && (
                  <div className="font-medium">{selectedPlace.address}</div>
                )}
                {selectedPlace.lat != null && (
                  <div className="mt-0.5" style={{ opacity: 0.75 }}>
                    📍 {selectedPlace.lat.toFixed(5)}, {selectedPlace.lng?.toFixed(5)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 分類：預設選項 + 自訂 ── */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>分類</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
            >
              {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="其他">其他（自訂）</option>
            </select>
            {category === '其他' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="輸入自訂分類，例：咖啡廳、SPA"
                className="rounded-lg px-3 py-2 text-sm outline-none mt-1"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
              />
            )}
          </div>

          {/* ── 筆記 ── */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>筆記（選填）</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="備忘、心得、開放時間…"
              rows={3}
              className="rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#ef4444' }}>錯誤：{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}
            >取消</button>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >{loading ? '新增中…' : '新增地點'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
