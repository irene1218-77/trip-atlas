'use client'
import { useState, useEffect } from 'react'
import { Sparkles, ArrowLeft, X, Plus, Check, ChevronDown, ChevronUp, Star, MapPin, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AnalysisRecords, { type HistoryItem } from './AnalysisRecords'

interface PlaceResult {
  name: string
  suggestion: string
  pros: string[]
  cons: string[]
  price_info: string | null
  is_approximate?: boolean
}

interface ExtractResult {
  places: PlaceResult[]
  other_notes: string[]
}

interface PlaceDetail {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  placeType: string
  rating: number | null
  openingHours: string[] | null
}

interface TripRegion {
  country: string
  countryEn: string
  region: string
  regionEn: string
  lat?: number
  lng?: number
}

interface TripInfoExtractorProps {
  tripId: string
  tripRegion?: TripRegion
  onPlaceAdded?: () => void
  onAddNote: (text: string) => void
  onPreviewLocation?: (lat: number, lng: number, name: string) => void
  onClosePanel?: () => void
  openTrigger?: number
}

function getTodayHours(hours: string[]): string | null {
  const jsDay = new Date().getDay()
  const mondayIdx = (jsDay + 6) % 7
  return hours[mondayIdx] ?? null
}

function inferCategory(placeType?: string): string {
  if (!placeType) return '景點'
  const t = placeType.toLowerCase()
  if (t.includes('restaurant') || t.includes('food') || t.includes('dining')) return '餐廳'
  if (t.includes('cafe') || t.includes('coffee') || t.includes('bakery')) return '咖啡廳'
  if (t.includes('hotel') || t.includes('lodging') || t.includes('resort') || t.includes('inn')) return '飯店'
  if (t.includes('beach') || t.includes('bay') || t.includes('coast')) return '海邊'
  if (t.includes('temple') || t.includes('shrine') || t.includes('wat')) return '寺廟'
  return '景點'
}

export default function TripInfoExtractor({ tripId, tripRegion, onPlaceAdded, onAddNote, onPreviewLocation, onClosePanel, openTrigger }: TripInfoExtractorProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (openTrigger && openTrigger > 0) setIsOpen(true)
  }, [openTrigger])

  const [showRecords, setShowRecords] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<ExtractResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addedPlaces, setAddedPlaces] = useState<Set<string>>(new Set())
  const [addingPlaces, setAddingPlaces] = useState<Set<string>>(new Set())
  const [addedNotes, setAddedNotes] = useState<Set<number>>(new Set())

  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null)
  const [currentAnalysisName, setCurrentAnalysisName] = useState<string | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [expandedPlace, setExpandedPlace] = useState<string | null>(null)
  const [placeDetails, setPlaceDetails] = useState<Record<string, PlaceDetail | null>>({})
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [showAllHours, setShowAllHours] = useState<string | null>(null)

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [fetchingTranscript, setFetchingTranscript] = useState(false)
  const [youtubeError, setYoutubeError] = useState<string | null>(null)

  const [blogUrl, setBlogUrl] = useState('')
  const [fetchingBlog, setFetchingBlog] = useState(false)
  const [blogError, setBlogError] = useState<string | null>(null)

  async function handleFetchBlog() {
    if (!blogUrl.trim() || fetchingBlog || analyzing) return
    setFetchingBlog(true)
    setBlogError(null)
    try {
      const res = await fetch('/api/extract-blog-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blogUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBlogError(data.error ?? '無法擷取網頁，請改用手動貼上文字稿')
        return
      }
      setTranscript(data.text)
      setBlogUrl('')
    } catch {
      setBlogError('網路錯誤，請稍後再試')
    } finally {
      setFetchingBlog(false)
    }
  }

  function autoAnalysisName(): string {
    const now = new Date()
    const m = now.getMonth() + 1
    const d = now.getDate()
    const h = now.getHours().toString().padStart(2, '0')
    const min = now.getMinutes().toString().padStart(2, '0')
    return `${m}/${d} ${h}:${min} 分析`
  }

  async function saveAnalysis(t: string, r: ExtractResult, name: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('transcript_analyses')
      .insert({ trip_id: tripId, transcript: t, result: r, name })
      .select('id')
      .single()
    if (error) { console.error('[analysis] save error:', error); return null }
    return data?.id ?? null
  }

  async function handleFetchAndAnalyze() {
    if (!youtubeUrl.trim() || fetchingTranscript || analyzing) return
    setFetchingTranscript(true)
    setYoutubeError(null)
    setError(null)

    try {
      const tRes = await fetch('/api/youtube-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      })
      const tData = await tRes.json()
      if (!tRes.ok) {
        setYoutubeError(tData.error ?? '無法取得字幕，請改用手動貼上文字稿')
        return
      }
      const fetchedTranscript: string = tData.transcript
      setYoutubeUrl('')

      const aRes = await fetch('/api/extract-trip-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fetchedTranscript, tripRegion }),
      })
      if (!aRes.ok) {
        const d = await aRes.json().catch(() => ({}))
        setError(d.error ?? '分析失敗，請稍後再試')
        return
      }
      const data: ExtractResult = await aRes.json()
      setResults(data)
      setAddedPlaces(new Set())
      setAddingPlaces(new Set())
      setAddedNotes(new Set())
      setExpandedPlace(null)
      setPlaceDetails({})
      setCurrentAnalysisName(null)
      const autoName = autoAnalysisName()
      const id = await saveAnalysis(fetchedTranscript, data, autoName)
      setCurrentAnalysisId(id)
      setCurrentAnalysisName(autoName)
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setFetchingTranscript(false)
    }
  }

  async function handleAnalyze() {
    if (!transcript.trim() || analyzing) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/extract-trip-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, tripRegion }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? '分析失敗，請稍後再試')
        return
      }
      const data: ExtractResult = await res.json()
      setResults(data)
      setAddedPlaces(new Set())
      setAddingPlaces(new Set())
      setAddedNotes(new Set())
      setExpandedPlace(null)
      setPlaceDetails({})
      setCurrentAnalysisName(null)
      const autoName = autoAnalysisName()
      const id = await saveAnalysis(transcript, data, autoName)
      setCurrentAnalysisId(id)
      setCurrentAnalysisName(autoName)
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSaveName() {
    if (!currentAnalysisId || !saveName.trim()) return
    setSavingName(true)
    const { error } = await supabase
      .from('transcript_analyses')
      .update({ name: saveName.trim() })
      .eq('id', currentAnalysisId)
    setSavingName(false)
    if (error) { alert(`儲存失敗：${error.message}`); return }
    setCurrentAnalysisName(saveName.trim())
    setShowSaveDialog(false)
    setSaveName('')
  }

  function handleLoadFromRecords(item: HistoryItem) {
    setTranscript(item.transcript)
    setResults(item.result)
    setCurrentAnalysisId(item.id)
    setCurrentAnalysisName(item.name ?? null)
    setAddedPlaces(new Set())
    setAddingPlaces(new Set())
    setAddedNotes(new Set())
    setExpandedPlace(null)
    setPlaceDetails({})
    setShowRecords(false)
    setIsOpen(true)
  }

  async function handleCardClick(name: string) {
    if (expandedPlace === name) { setExpandedPlace(null); return }
    setExpandedPlace(name)
    setShowAllHours(null)
    if (name in placeDetails) {
      const cached = placeDetails[name]
      if (cached?.lat && cached?.lng) onPreviewLocation?.(cached.lat, cached.lng, cached.name)
      return
    }
    setLoadingDetail(name)
    try {
      const query = tripRegion?.regionEn ? `${name} ${tripRegion.regionEn}` : name
      let url = `/api/place-search?query=${encodeURIComponent(query)}`
      if (tripRegion?.lat && tripRegion?.lng) url += `&lat=${tripRegion.lat}&lng=${tripRegion.lng}`
      const res = await fetch(url)
      const data: PlaceDetail | null = res.ok ? await res.json() : null
      setPlaceDetails(prev => ({ ...prev, [name]: data }))
      if (data?.lat && data?.lng) onPreviewLocation?.(data.lat, data.lng, data.name)
    } catch {
      setPlaceDetails(prev => ({ ...prev, [name]: null }))
    } finally {
      setLoadingDetail(null)
    }
  }

  async function handleDirectAdd(place: PlaceResult) {
    if (addedPlaces.has(place.name) || addingPlaces.has(place.name)) return
    setAddingPlaces(prev => { const s = new Set(prev); s.add(place.name); return s })
    try {
      let detail = placeDetails[place.name]
      if (!detail) {
        try {
          const query = tripRegion?.regionEn ? `${place.name} ${tripRegion.regionEn}` : place.name
          let url = `/api/place-search?query=${encodeURIComponent(query)}`
          if (tripRegion?.lat && tripRegion?.lng) url += `&lat=${tripRegion.lat}&lng=${tripRegion.lng}`
          const res = await fetch(url)
          detail = res.ok ? await res.json() : null
          setPlaceDetails(prev => ({ ...prev, [place.name]: detail }))
        } catch {
          detail = null
        }
      }

      const hasCoords = detail?.lat && detail?.lng
      const { error } = await supabase.from('places').insert({
        trip_id: tripId,
        name: hasCoords ? (detail!.name || place.name) : place.name,
        lat: hasCoords ? detail!.lat : (tripRegion?.lat ?? 0),
        lng: hasCoords ? detail!.lng : (tripRegion?.lng ?? 0),
        google_place_id: hasCoords ? detail!.id : null,
        address: hasCoords ? detail!.address : null,
        category: inferCategory(detail?.placeType),
        tips_pros: place.pros.length ? place.pros : null,
        tips_cons: place.cons.length ? place.cons : null,
        price_info: place.price_info ?? null,
        interest_rating: 0,
      })
      if (error) throw error
      setAddedPlaces(prev => { const s = new Set(prev); s.add(place.name); return s })
      onPlaceAdded?.()
    } catch (err) {
      console.error('[directAdd] error:', err)
    } finally {
      setAddingPlaces(prev => { const s = new Set(prev); s.delete(place.name); return s })
    }
  }

  function handleAddNoteClick(text: string, idx: number) {
    onAddNote(text)
    setAddedNotes(prev => { const s = new Set(prev); s.add(idx); return s })
  }

  function handleReset() {
    setResults(null)
    setTranscript('')
    setError(null)
    setAddedPlaces(new Set())
    setAddingPlaces(new Set())
    setAddedNotes(new Set())
    setExpandedPlace(null)
    setPlaceDetails({})
    setCurrentAnalysisId(null)
    setCurrentAnalysisName(null)
  }

  return (
    <>
      {/* Main panel */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5,
        background: 'var(--color-surface)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          {results && (
            <button onClick={handleReset} className="rounded-lg p-1.5"
              style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              title="返回輸入畫面">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Sparkles size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
              {results ? '分析結果' : '旅行小助手'}
            </span>
          </div>
          <button onClick={() => setShowRecords(true)} className="rounded-lg p-1.5"
            style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            title="歷史紀錄">
            <History size={16} />
          </button>
          <button onClick={() => { setIsOpen(false); onClosePanel?.() }} className="rounded-lg p-1.5"
            style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            title="關閉">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {!results ? (
            <div className="flex flex-col gap-4 p-4">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                貼入 YouTube 連結，AI 會自動抓取字幕並萃取地點與行程建議。
              </p>

              {/* YouTube section */}
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <input
                    value={youtubeUrl}
                    onChange={e => { setYoutubeUrl(e.target.value); setYoutubeError(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetchAndAnalyze() } }}
                    placeholder="貼 YouTube 連結…"
                    className="flex-1 min-w-0 rounded-lg px-3 py-2 text-xs outline-none"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
                  />
                  <button
                    onClick={handleFetchAndAnalyze}
                    disabled={!youtubeUrl.trim() || fetchingTranscript || analyzing}
                    className="rounded-lg px-3 py-2 text-xs font-medium flex-shrink-0 disabled:opacity-40"
                    style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)', background: 'transparent', cursor: 'pointer' }}>
                    {fetchingTranscript ? '分析中…' : '抓取並分析'}
                  </button>
                </div>
                {youtubeError && (
                  <p className="text-xs px-1" style={{ color: '#B91C1C' }}>{youtubeError}</p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>或貼部落格網址</span>
                <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
              </div>

              {/* Blog URL section */}
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <input
                    value={blogUrl}
                    onChange={e => { setBlogUrl(e.target.value); setBlogError(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetchBlog() } }}
                    placeholder="貼部落格文章網址…"
                    className="flex-1 min-w-0 rounded-lg px-3 py-2 text-xs outline-none"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
                  />
                  <button
                    onClick={handleFetchBlog}
                    disabled={!blogUrl.trim() || fetchingBlog || analyzing}
                    className="rounded-lg px-3 py-2 text-xs font-medium flex-shrink-0 disabled:opacity-40"
                    style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)', background: 'transparent', cursor: 'pointer' }}>
                    {fetchingBlog ? '擷取中…' : '擷取文章'}
                  </button>
                </div>
                {blogError && (
                  <p className="text-xs px-1" style={{ color: '#B91C1C' }}>{blogError}</p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>或手動貼入文字稿</span>
                <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
              </div>

              {/* Manual textarea */}
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="在此貼入旅遊文字稿…"
                rows={7}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)', lineHeight: 1.6 }}
              />
              {error && (
                <p className="text-xs rounded-lg px-3 py-2" style={{ background: '#FEF2F2', color: '#B91C1C' }}>{error}</p>
              )}
              <button onClick={handleAnalyze} disabled={!transcript.trim() || analyzing}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: 'var(--color-primary)', border: 'none', cursor: 'pointer' }}>
                {analyzing ? '分析中…' : '✨ 開始分析'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-4">
              {/* Save bar — 每次分析自動命名，顯示名稱 + 重新命名 */}
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-1"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <Star size={12} fill="var(--color-primary)" stroke="var(--color-primary)" style={{ flexShrink: 0 }} />
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-text)' }}>
                  {currentAnalysisName ?? '儲存中…'}
                </span>
                {currentAnalysisId && (
                  <button
                    onClick={() => { setSaveName(currentAnalysisName ?? ''); setShowSaveDialog(true) }}
                    className="text-xs flex-shrink-0"
                    style={{ color: 'var(--color-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    重新命名
                  </button>
                )}
              </div>

              {results.places.length === 0 && results.other_notes.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>沒有找到可新增的地點</p>
              )}

              {results.places.length > 0 && (
                <>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    地點（{results.places.length}）
                  </p>
                  {results.places.map(place => {
                    const added = addedPlaces.has(place.name)
                    const adding = addingPlaces.has(place.name)
                    const isExpanded = expandedPlace === place.name
                    const detail = placeDetails[place.name]
                    const isLoadingThis = loadingDetail === place.name

                    return (
                      <div key={place.name}
                        className="rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${added ? 'var(--color-primary-light)' : 'var(--color-border)'}`, background: added ? 'var(--color-primary-pale)' : 'var(--color-surface)' }}>

                        <div className="p-3 cursor-pointer flex items-start gap-2"
                          onClick={() => handleCardClick(place.name)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{place.name}</p>
                              {added && <Check size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                              {place.is_approximate && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                                  style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                                  📍 大略地點
                                </span>
                              )}
                            </div>
                            {place.suggestion && (
                              <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{place.suggestion}</p>
                            )}
                            {(place.pros.length > 0 || place.cons.length > 0) && (
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                                {place.pros.slice(0, 2).map((p, i) => (
                                  <span key={`p${i}`} className="flex items-center gap-1 text-xs" style={{ color: '#16a34a' }}>
                                    <span style={{ fontSize: 8 }}>●</span>{p}
                                  </span>
                                ))}
                                {place.cons.slice(0, 1).map((c, i) => (
                                  <span key={`c${i}`} className="flex items-center gap-1 text-xs" style={{ color: '#ea580c' }}>
                                    <span style={{ fontSize: 8 }}>●</span>{c}
                                  </span>
                                ))}
                              </div>
                            )}
                            {place.price_info && (
                              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>💰 {place.price_info}</p>
                            )}
                          </div>
                          {/* 快速加入按鈕 + 展開箭頭 */}
                          <div className="flex-shrink-0 flex flex-col items-end gap-1.5 ml-1">
                            <button
                              onClick={e => { e.stopPropagation(); void handleDirectAdd(place) }}
                              disabled={added || adding}
                              className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                              style={{
                                background: added ? 'var(--color-primary-pale)' : 'var(--color-primary)',
                                color: added ? 'var(--color-primary)' : 'white',
                                border: added ? '1px solid var(--color-primary-light)' : 'none',
                                cursor: added ? 'default' : 'pointer',
                                opacity: adding ? 0.6 : 1,
                                minWidth: 52,
                                textAlign: 'center',
                              }}>
                              {added ? '✓ 已加入' : adding ? '加入中' : '＋ 加入'}
                            </button>
                            {isExpanded
                              ? <ChevronUp size={15} style={{ color: 'var(--color-text-muted)' }} />
                              : <ChevronDown size={15} style={{ color: 'var(--color-text-muted)' }} />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3 pb-3 flex flex-col gap-2.5"
                            style={{ borderTop: '1px solid var(--color-border)' }}>
                            {isLoadingThis ? (
                              <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>搜尋 Google 資訊中…</p>
                            ) : detail ? (
                              <>
                                <div className="rounded-lg overflow-hidden mt-2" style={{ height: 120 }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`/api/place-photo?place_id=${detail.id}`}
                                    alt={detail.name}
                                    className="w-full h-full object-cover"
                                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                  />
                                </div>
                                {detail.address && (
                                  <p className="text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>📍 {detail.address}</p>
                                )}
                                {detail.rating != null && (
                                  <div className="flex items-center gap-1">
                                    <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                                    <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{detail.rating.toFixed(1)}</span>
                                  </div>
                                )}
                                {detail.openingHours && detail.openingHours.length > 0 && (
                                  <div>
                                    <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                                      🕐 {getTodayHours(detail.openingHours) ?? detail.openingHours[0]}
                                    </p>
                                    <button
                                      onClick={e => { e.stopPropagation(); setShowAllHours(showAllHours === place.name ? null : place.name) }}
                                      className="text-xs mt-0.5"
                                      style={{ color: 'var(--color-primary)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
                                      {showAllHours === place.name ? '收合 ▲' : '查看全週 ▼'}
                                    </button>
                                    {showAllHours === place.name && (
                                      <div className="mt-1.5 flex flex-col gap-0.5">
                                        {detail.openingHours.map((h, i) => (
                                          <p key={i} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{h}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {place.pros.length > 0 && (
                                  <div className="flex flex-col gap-0.5">
                                    {place.pros.map((p, i) => (
                                      <div key={i} className="flex items-start gap-1.5 text-xs leading-snug">
                                        <span style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }}>●</span>
                                        <span style={{ color: 'var(--color-text)' }}>{p}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {place.cons.length > 0 && (
                                  <div className="flex flex-col gap-0.5">
                                    {place.cons.map((c, i) => (
                                      <div key={i} className="flex items-start gap-1.5 text-xs leading-snug">
                                        <span style={{ color: '#ea580c', flexShrink: 0, marginTop: 1 }}>●</span>
                                        <span style={{ color: 'var(--color-text)' }}>{c}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-xs py-1" style={{ color: 'var(--color-text-muted)' }}>找不到 Google 資訊</p>
                            )}

                            <div className="flex gap-2">
                              <a
                                href={detail?.id
                                  ? `https://www.google.com/maps/place/?q=place_id:${detail.id}`
                                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium"
                                style={{ flex: '0 0 auto', paddingLeft: 16, paddingRight: 16, border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'transparent', textDecoration: 'none' }}>
                                <MapPin size={14} />
                                地圖
                              </a>
                              <button
                                onClick={() => void handleDirectAdd(place)}
                                disabled={added || adding}
                                className="flex-1 rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-60"
                                style={{ background: 'var(--color-primary)', color: 'white', border: 'none', cursor: added ? 'default' : 'pointer' }}>
                                {added ? <><Check size={14} />已加入清單</> : adding ? '加入中…' : <><Plus size={14} />加入清單</>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}

              {results.other_notes.length > 0 && (
                <>
                  <p className="text-xs font-semibold mt-2"
                    style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                    行程筆記（{results.other_notes.length}）
                  </p>
                  {results.other_notes.map((note, idx) => {
                    const added = addedNotes.has(idx)
                    return (
                      <div key={idx} className="rounded-xl p-3 flex items-start justify-between gap-2"
                        style={{ border: '1px solid var(--color-border)', background: added ? 'var(--color-primary-pale)' : 'var(--color-surface)' }}>
                        <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--color-text)' }}>{note}</p>
                        <button onClick={() => !added && handleAddNoteClick(note, idx)} disabled={added}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium flex-shrink-0"
                          style={{ background: added ? 'var(--color-primary)' : 'var(--color-primary-pale)', color: added ? 'white' : 'var(--color-primary)', border: 'none', cursor: added ? 'default' : 'pointer' }}>
                          {added ? '已加入' : '＋ 加入筆記'}
                        </button>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Save name dialog */}
        {showSaveDialog && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 30,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="mx-4 rounded-2xl p-5 w-full"
              style={{ maxWidth: 320, background: 'var(--color-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>重新命名分析</p>
              <input
                autoFocus
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setShowSaveDialog(false) }}
                placeholder="為此分析命名…"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-3"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 rounded-lg py-2 text-sm font-medium"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent', cursor: 'pointer' }}>
                  取消
                </button>
                <button
                  onClick={handleSaveName}
                  disabled={!saveName.trim() || savingName}
                  className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'var(--color-primary)', border: 'none', cursor: 'pointer' }}>
                  {savingName ? '儲存中…' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AnalysisRecords panel — 放在 Main panel 之後，同 zIndex 時後者蓋前者 */}
      <AnalysisRecords
        isOpen={showRecords}
        tripId={tripId}
        onClose={() => setShowRecords(false)}
        onLoadAnalysis={handleLoadFromRecords}
      />
    </>
  )
}
