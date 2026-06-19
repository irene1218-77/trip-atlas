/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Trash2, ArrowLeft, MapPin, ExternalLink, Pencil, Search, NotebookPen, Menu, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ListPanel from '@/components/ListPanel'
import PlaceLinks from '@/components/PlaceLinks'
import ItineraryPanel from '@/components/ItineraryPanel'
import HeartRating from '@/components/HeartRating'
import TripInfoExtractor from '@/components/TripInfoExtractor'
import TripNotesPanel from '@/components/TripNotesPanel'
import TripSwitcher from '@/components/TripSwitcher'
import SplashScreen from '@/components/SplashScreen'
import SideMenu from '@/components/SideMenu'
import { DESTINATIONS } from '@/data/destinations'
import type { Place, List, PlaceList, ItineraryItem } from '@/types'
import type { MapClickData, PoiAddData } from '@/components/Map'

interface TripRegion {
  country: string
  countryEn: string
  region: string
  regionEn: string
  lat?: number
  lng?: number
}

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const DEFAULT_CATEGORIES = ['餐廳', '咖啡廳', '海邊', '景點', '寺廟', '小店', '小吃', '飯店']

const CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  '餐廳':         { text: '#B91C1C', bg: '#FEF2F2' },
  '咖啡廳':       { text: '#92400E', bg: '#FEF3C7' },
  '海邊':         { text: '#0369A1', bg: '#F0F9FF' },
  '景點':         { text: '#15803D', bg: '#F0FDF4' },
  '寺廟':         { text: '#7C3AED', bg: '#F5F3FF' },
  '小店':         { text: '#BE185D', bg: '#FDF2F8' },
  '小吃':         { text: '#A16207', bg: '#FFFBEB' },
  '飯店':         { text: '#1D4ED8', bg: '#EFF6FF' },
  // legacy English keys
  'restaurant':   { text: '#B91C1C', bg: '#FEF2F2' },
  'attraction':   { text: '#15803D', bg: '#F0FDF4' },
  'accommodation':{ text: '#1D4ED8', bg: '#EFF6FF' },
  'activity':     { text: '#0369A1', bg: '#F0F9FF' },
}
function getCategoryStyle(raw: string) {
  return CATEGORY_COLORS[raw.trim()] ?? { text: 'var(--color-primary)', bg: 'var(--color-primary-pale)' }
}

function getCategoryLabel(category: string): string {
  const legacyMap: Record<string, string> = {
    attraction: '景點', restaurant: '餐廳', accommodation: '住宿', activity: '活動',
  }
  return legacyMap[category] ?? category
}

export default function Home() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Place | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [detailPlace, setDetailPlace] = useState<Place | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [placeLists, setPlaceLists] = useState<PlaceList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [showListPanel, setShowListPanel] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
  const [showSearchDrop, setShowSearchDrop] = useState(false)
  const [pendingPlace, setPendingPlace] = useState<{
    name: string; address: string; lat: number; lng: number; googlePlaceId: string; placeType?: string
    tipsPros?: string[]; tipsCons?: string[]; priceInfo?: string | null
  } | null>(null)
  const [pendingCategories, setPendingCategories] = useState<string[]>(['餐廳'])
  const [savingPending, setSavingPending] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [editingCategory, setEditingCategory] = useState(false)
  const [editingCategoryValues, setEditingCategoryValues] = useState<string[]>([])
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')

  // 行程相關 state
  const [leftTab, setLeftTab] = useState<'places' | 'itinerary'>('places') // 左欄 tab 切換
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]) // 所有行程條目
  const [selectedDay, setSelectedDay] = useState<number | null>(null)       // 地圖顯示哪天
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [tripTotalDays, setTripTotalDays] = useState(1)
  const [tripInfo, setTripInfo] = useState<{ name: string; start: string; end: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ msg: string; onConfirm: () => void } | null>(null)

  const [sidebarHeight, setSidebarHeight] = useState(55)
  const sidebarHeightRef = useRef(55)
  const [localSearch, setLocalSearch] = useState('')
  const [showLocalSearch, setShowLocalSearch] = useState(false)
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [mapPanTo, setMapPanTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const [tripRegion, setTripRegion] = useState<TripRegion | null>(null)
  const [previewMarker, setPreviewMarker] = useState<{ lat: number; lng: number; name: string } | null>(null)
  const [editingTips, setEditingTips] = useState(false)
  const [tipsProsValue, setTipsProsValue] = useState('')
  const [tipsConsValue, setTipsConsValue] = useState('')
  const [priceInfoValue, setPriceInfoValue] = useState('')
  const [savingTips, setSavingTips] = useState(false)
  const [editingCost, setEditingCost] = useState(false)
  const [costValue, setCostValue] = useState('')
  const [savingCost, setSavingCost] = useState(false)
  const [currentTripId, setCurrentTripId] = useState<string | null>(null)
  const [showTripSwitcher, setShowTripSwitcher] = useState(false)
  const [showSideMenu, setShowSideMenu] = useState(false)
  const [aiOpenTrigger, setAiOpenTrigger] = useState(0)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  function handleDragStart(e: React.PointerEvent<HTMLDivElement>) {
    // 點到按鈕或連結時不啟動拖拉
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return
    e.preventDefault()
    const startY = e.clientY
    const startH = sidebarHeightRef.current
    const winH = window.innerHeight
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const onPointerMove = (ev: PointerEvent) => {
      const newH = Math.min(85, Math.max(20, startH + ((startY - ev.clientY) / winH) * 100))
      setSidebarHeight(newH)
      sidebarHeightRef.current = newH
    }
    const onPointerUp = () => {
      target.removeEventListener('pointermove', onPointerMove)
      target.removeEventListener('pointerup', onPointerUp)
    }
    target.addEventListener('pointermove', onPointerMove)
    target.addEventListener('pointerup', onPointerUp)
  }

  const sessionTokenRef = useRef<any>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchPlaces() {
    if (!currentTripId) return
    setLoading(true)
    console.log('fetchPlaces tripId:', currentTripId)
    const { data, error } = await supabase
      .from('places').select('*')
      .eq('trip_id', currentTripId)
      .order('created_at', { ascending: false })
    console.log('places result:', data, error)
    if (!error && data) setPlaces(data as Place[])
    setLoading(false)
  }

  async function fetchLists() {
    if (!currentTripId) return
    const { data } = await supabase.from('lists').select('*')
      .eq('trip_id', currentTripId).order('created_at', { ascending: true })
    if (data) setLists(data as List[])
  }

  async function fetchPlaceLists() {
    const { data } = await supabase.from('place_lists').select('*')
    if (data) setPlaceLists(data as PlaceList[])
  }

  // 撈行程資料：itinerary join places 避免重複查詢
  async function fetchTrip() {
    if (!currentTripId) return
    const { data } = await supabase
      .from('trips')
      .select('name, start_date, end_date, country, country_en, region, region_en')
      .eq('id', currentTripId)
      .single()
    if (data?.start_date && data?.end_date) {
      // 直接拆字串避免 new Date('YYYY-MM-DD') 的 timezone 陷阱
      const [sy, smo, sd2] = data.start_date.split('-').map(Number)
      const [ey, emo, ed2] = data.end_date.split('-').map(Number)
      const startMs = Date.UTC(sy, smo - 1, sd2)
      const endMs   = Date.UTC(ey, emo - 1, ed2)
      const days = Math.round((endMs - startMs) / 86400000) + 1
      setTripTotalDays(Math.max(1, days))
      setTripInfo({ name: data.name ?? 'Trip Atlas', start: data.start_date, end: data.end_date })
    }
    if (data?.region && data?.country) {
      let cityLat: number | undefined
      let cityLng: number | undefined
      for (const dest of DESTINATIONS) {
        const city = dest.cities.find(c => c.name === data.region || c.nameEn === data.region_en)
        if (city) { cityLat = city.lat; cityLng = city.lng; break }
      }
      const region: TripRegion = {
        country: data.country ?? '',
        countryEn: data.country_en ?? '',
        region: data.region ?? '',
        regionEn: data.region_en ?? '',
        lat: cityLat,
        lng: cityLng,
      }
      setTripRegion(region)
      if (cityLat !== undefined && cityLng !== undefined) {
        setMapPanTo({ lat: cityLat, lng: cityLng, zoom: 11 })
      }
    } else {
      setTripRegion(null)
    }
  }

  // "2026-11-10" ~ "2026-11-16" → "11/10–16"（直接拆字串，不走 new Date）
  function formatTripDates(start: string, end: string): string {
    const [, sm, sd] = start.split('-').map(Number)
    const [, em, ed] = end.split('-').map(Number)
    if (sm === em) return `${sm}/${sd}–${ed}`
    return `${sm}/${sd} – ${em}/${ed}`
  }

  async function fetchItinerary() {
    if (!currentTripId) return
    const { data, error } = await supabase
      .from('itinerary')
      .select('*, place:places(*)')
      .eq('trip_id', currentTripId)
      .order('day_number', { ascending: true })
      .order('order_index', { ascending: true })
    if (!error && data) {
      // Supabase join 回傳的 place 可能是陣列，統一正規化成物件
      const normalized = data.map((item: any) => ({
        ...item,
        place: Array.isArray(item.place) ? item.place[0] : item.place,
      }))
      setItineraryItems(normalized as ItineraryItem[])
    }
  }

  // 初始化：從 trips 表取得第一筆（或 localStorage 記住的 trip）
  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('trips').select('id').order('created_at', { ascending: true })
      if (!data?.length) return
      const saved = localStorage.getItem('tripAtlas_currentTripId')
      const valid = data.find(t => t.id === saved)
      setCurrentTripId(valid ? (saved as string) : data[0].id)
    }
    init()
  }, [])

  // 切換 trip 時重新撈所有資料
  useEffect(() => {
    if (!currentTripId) return
    setPlaces([]); setLists([]); setPlaceLists([])
    setItineraryItems([]); setTripInfo(null)
    fetchPlaces(); fetchLists(); fetchPlaceLists(); fetchItinerary(); fetchTrip()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTripId])

  // 詳情面板開啟時，若有 google_place_id 但尚無 place_type，自動補抓
  useEffect(() => {
    if (!detailPlace?.google_place_id || detailPlace.place_type) return
    fetch(`/api/place-type?place_id=${encodeURIComponent(detailPlace.google_place_id)}`)
      .then((r) => r.json())
      .then(async ({ place_type }: { place_type: string | null }) => {
        if (!place_type) return
        await supabase.from('places').update({ place_type }).eq('id', detailPlace.id)
        const updated = { ...detailPlace, place_type }
        setDetailPlace(updated)
        setPlaces((prev) => prev.map((p) => p.id === detailPlace.id ? updated : p))
      })
      .catch(() => {})
  }, [detailPlace?.id])

  const displayedPlaces = activeListId
    ? places.filter((p) => placeLists.some((pl) => pl.place_id === p.id && pl.list_id === activeListId))
    : places

  // 地圖顯示的地點：行程 tab 選了某天 → 只顯示那天的地點；其他情況顯示全部
  const mapPlacesBase = (() => {
    if (leftTab === 'itinerary' && selectedDay !== null) {
      // 只顯示選中天的地點
      const dayPlaceIds = itineraryItems
        .filter((i) => i.day_number === selectedDay)
        .map((i) => i.place_id)
      return places.filter((p) => dayPlaceIds.includes(p.id))
    }
    return displayedPlaces
  })()

  const filteredPlaces = localSearch.trim()
    ? displayedPlaces.filter(p =>
        p.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        p.address?.toLowerCase().includes(localSearch.toLowerCase())
      )
    : displayedPlaces

  const mapPlaces = (() => {
    let result = mapPlacesBase
    if (pendingPlace?.lat && pendingPlace?.lng) {
      result = [...result, {
        id: '__pending__', trip_id: currentTripId ?? '',
        name: pendingPlace.name || '新地點', category: '景點',
        lat: pendingPlace.lat, lng: pendingPlace.lng,
        address: pendingPlace.address, created_at: '',
      } as Place]
    }
    if (previewMarker) {
      result = [...result, {
        id: '__preview__', trip_id: currentTripId ?? '',
        name: previewMarker.name, category: '景點',
        lat: previewMarker.lat, lng: previewMarker.lng,
        created_at: '',
      } as Place]
    }
    return result
  })()

  async function togglePlaceInList(listId: string, placeId: string) {
    const existing = placeLists.find((pl) => pl.place_id === placeId && pl.list_id === listId)
    if (existing) {
      await supabase.from('place_lists').delete().eq('id', existing.id)
    } else {
      await supabase.from('place_lists').insert({ place_id: placeId, list_id: listId })
    }
    await fetchPlaceLists()
  }

  async function handleDelete(place: Place) {
    setConfirmDelete(place)
  }

  async function executeDelete(place: Place) {
    setConfirmDelete(null)
    setDeletingId(place.id)
    await supabase.from('place_lists').delete().eq('place_id', place.id)
    await supabase.from('itinerary').delete().eq('place_id', place.id) // 刪地點同時清行程
    const { error } = await supabase.from('places').delete().eq('id', place.id)
    setDeletingId(null)
    if (error) { alert(`刪除失敗：${error.message}`); return }
    if (activeId === place.id) setActiveId(null)
    if (detailPlace?.id === place.id) { setDetailPlace(null); setSelectedPlaceId(null) }
    fetchPlaces(); fetchPlaceLists(); fetchItinerary()
  }

  function handlePlaceClick(place: Place) {
    setDetailPlace(place)
    setActiveId(place.id)
    setSelectedPlaceId(place.id)
    setShowListPanel(false)
    setEditingNotes(false)
    setNotesValue(place.my_notes ?? '')
    setEditingCategory(false)
    setEditingCategoryValues([])
    setEditingName(false)
    setNameValue('')
    setEditingTips(false)
    setPreviewMarker(null)
  }

  const [listPanelInitialView, setListPanelInitialView] = useState<'main' | 'add' | 'manage'>('main')

  function openListPanel(view: 'main' | 'add' | 'manage' = 'main') {
    setListPanelInitialView(view)
    setShowListPanel(true)
    setDetailPlace(null)
    setActiveId(null)
    setSelectedPlaceId(null)
  }


  function getGoogleMapsViewUrl(place: Place): string {
    if (place.google_place_id) {
      return `https://www.google.com/maps/place/?q=place_id:${place.google_place_id}`
    }
    if (place.lat && place.lng) {
      return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`
  }

  async function fetchSearchSuggestions(value: string) {
    if (!value.trim() || value.length < 2) {
      setSearchSuggestions([]); setShowSearchDrop(false); return
    }
    if (!(window as any).google?.maps) return
    try {
      if (!sessionTokenRef.current) {
        const lib = await (window as any).google.maps.importLibrary('places')
        sessionTokenRef.current = new lib.AutocompleteSessionToken()
      }
      const { AutocompleteSuggestion } = await (window as any).google.maps.importLibrary('places')
      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: value,
        sessionToken: sessionTokenRef.current,
        locationBias: { south: -9.0, west: 114.4, north: -7.9, east: 115.7 },
        language: 'zh-TW',
      })
      setSearchSuggestions(results ?? [])
      setShowSearchDrop(true)
    } catch (err) {
      console.error('Autocomplete error:', err)
    }
  }

  function handleSearchInput(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSearchSuggestions(value), 300)
  }

  async function handleSelectSuggestion(suggestion: any) {
    try {
      const prediction = suggestion.placePrediction
      if (!prediction) return
      const place = prediction.toPlace()
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'id', 'primaryTypeDisplayName'] })
      const lat = place.location?.lat() ?? null
      const lng = place.location?.lng() ?? null
      setPendingPlace({
        name: place.displayName ?? prediction.mainText?.toString() ?? '',
        address: place.formattedAddress ?? '',
        lat, lng,
        googlePlaceId: place.id ?? '',
        placeType: (place as any).primaryTypeDisplayName?.text ?? '',
      })
      setPendingCategories(['餐廳'])
      setSearchInput(place.displayName ?? prediction.mainText?.toString() ?? '')
      setSearchSuggestions([])
      setShowSearchDrop(false)
      sessionTokenRef.current = null
      setActiveId('__pending__')
    } catch (err) {
      console.error('Place fetch error:', err)
    }
  }

  async function handleSavePending() {
    if (!pendingPlace || !currentTripId) return
    const finalCategory = pendingCategories.length > 0 ? pendingCategories.join(',') : DEFAULT_CATEGORIES[0]
    setSavingPending(true)
    const { error } = await supabase.from('places').insert({
      trip_id: currentTripId,
      name: pendingPlace.name,
      category: finalCategory,
      lat: pendingPlace.lat,
      lng: pendingPlace.lng,
      address: pendingPlace.address || null,
      google_place_id: pendingPlace.googlePlaceId || null,
      place_type: pendingPlace.placeType || null,
      tips_pros: pendingPlace.tipsPros?.length ? pendingPlace.tipsPros : null,
      tips_cons: pendingPlace.tipsCons?.length ? pendingPlace.tipsCons : null,
      price_info: pendingPlace.priceInfo ?? null,
      interest_rating: 0,
    })
    setSavingPending(false)
    if (error) { alert(`新增失敗：${error.message}`); return }
    setPendingPlace(null)
    setSearchInput('')
    setActiveId(null)
    fetchPlaces()
  }

  async function handleSaveNotes() {
    if (!detailPlace) return
    setSavingNotes(true)
    const { error } = await supabase.from('places')
      .update({ my_notes: notesValue.trim() || null }).eq('id', detailPlace.id)
    setSavingNotes(false)
    if (error) { alert(`儲存失敗：${error.message}`); return }
    setEditingNotes(false)
    const updated = { ...detailPlace, my_notes: notesValue.trim() || undefined }
    setDetailPlace(updated)
    setPlaces((prev) => prev.map((p) => p.id === detailPlace.id ? updated : p))
  }

  async function handleSaveName() {
    if (!detailPlace || !nameValue.trim()) return
    const { error } = await supabase.from('places')
      .update({ name: nameValue.trim() }).eq('id', detailPlace.id)
    if (error) return
    const updated = { ...detailPlace, name: nameValue.trim() }
    setDetailPlace(updated)
    setPlaces(prev => prev.map(p => p.id === detailPlace.id ? updated : p))
    setEditingName(false)
  }

  async function handleSaveCategory() {
    if (!detailPlace) return
    const newCategory = editingCategoryValues.length > 0
      ? editingCategoryValues.join(',')
      : detailPlace.category
    const { error } = await supabase.from('places')
      .update({ category: newCategory }).eq('id', detailPlace.id)
    if (error) { alert(`更新失敗：${error.message}`); return }
    const updated = { ...detailPlace, category: newCategory }
    setDetailPlace(updated)
    setPlaces((prev) => prev.map((p) => p.id === detailPlace.id ? updated : p))
    setEditingCategory(false)
  }

  async function handleSaveRating(rating: number) {
    if (!detailPlace) return
    await supabase.from('places').update({ interest_rating: rating }).eq('id', detailPlace.id)
    const updated = { ...detailPlace, interest_rating: rating }
    setDetailPlace(updated)
    setPlaces((prev) => prev.map((p) => p.id === detailPlace.id ? updated : p))
  }

  async function handleSaveTips() {
    if (!detailPlace) return
    setSavingTips(true)
    const pros = tipsProsValue.split('\n').map((s) => s.trim()).filter(Boolean)
    const cons = tipsConsValue.split('\n').map((s) => s.trim()).filter(Boolean)
    const price = priceInfoValue.trim() || null
    const { error } = await supabase.from('places').update({
      tips_pros: pros.length ? pros : null,
      tips_cons: cons.length ? cons : null,
      price_info: price,
    }).eq('id', detailPlace.id)
    setSavingTips(false)
    if (error) { alert(`儲存失敗：${error.message}`); return }
    const updated = { ...detailPlace, tips_pros: pros.length ? pros : undefined, tips_cons: cons.length ? cons : undefined, price_info: price ?? undefined }
    setDetailPlace(updated)
    setPlaces((prev) => prev.map((p) => p.id === detailPlace.id ? updated : p))
    setEditingTips(false)
  }

  async function handleSaveCost() {
    if (!detailPlace) return
    setSavingCost(true)
    const cost = costValue.trim() === '' ? null : parseFloat(costValue)
    const { error } = await supabase.from('places').update({ estimated_cost: cost }).eq('id', detailPlace.id)
    setSavingCost(false)
    if (error) { alert(`儲存失敗：${error.message}`); return }
    const updated = { ...detailPlace, estimated_cost: cost ?? undefined }
    setDetailPlace(updated)
    setPlaces((prev) => prev.map((p) => p.id === detailPlace.id ? updated : p))
    setEditingCost(false)
  }

  async function handleAddNote(text: string) {
    if (!currentTripId) return
    const { data: tripData } = await supabase
      .from('trips').select('trip_notes').eq('id', currentTripId).single()
    const current = (tripData?.trip_notes as { text: string; created_at: string }[]) ?? []
    await supabase.from('trips').update({
      trip_notes: [...current, { text, created_at: new Date().toISOString() }],
    }).eq('id', currentTripId)
  }

  function handleRefreshCurrentTrip() {
    setDetailPlace(null); setActiveId(null); setSelectedPlaceId(null)
    setPlaces([]); setLists([]); setPlaceLists([])
    setItineraryItems([]); setTripInfo(null)
    fetchPlaces(); fetchLists(); fetchPlaceLists(); fetchItinerary(); fetchTrip()
  }

  function handleSwitchTrip(tripId: string) {
    localStorage.setItem('tripAtlas_currentTripId', tripId)
    setCurrentTripId(tripId)
    setDetailPlace(null); setActiveId(null); setSelectedPlaceId(null)
    setShowListPanel(false); setShowNotesPanel(false); setShowTripSwitcher(false)
    setActiveListId(null); setLeftTab('places'); setSelectedDay(null)
    setPendingPlace(null); setSearchInput(''); setPreviewMarker(null)
    setTripRegion(null); setMapPanTo(null)
  }

  function handleMapClick(data: MapClickData) {
    setPendingPlace({
      name: data.name,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      googlePlaceId: data.googlePlaceId ?? '',
      placeType: data.placeType ?? '',
    })
    setPendingCategories(['餐廳'])
    setSearchInput(data.name)
    setActiveId('__pending__')
  }

  async function handlePoiAdd(data: PoiAddData) {
    if (!currentTripId) return
    const { error } = await supabase.from('places').insert({
      trip_id: currentTripId,
      name: data.name,
      category: data.category,
      lat: data.lat,
      lng: data.lng,
      address: data.address || null,
      google_place_id: data.googlePlaceId || null,
      place_type: data.placeType || null,
      interest_rating: 0,
    })
    if (error) { console.error('handlePoiAdd error', error); return }
    fetchPlaces()
  }

  // 把地點加進某天行程
  async function handleAddToDay(placeId: string, dayNumber: number) {
    if (!currentTripId) return
    const dayItems = itineraryItems.filter((i) => i.day_number === dayNumber)
    const maxOrder = dayItems.length > 0
      ? Math.max(...dayItems.map((i) => i.order_index))
      : -1
    const { error } = await supabase.from('itinerary').insert({
      trip_id: currentTripId,
      place_id: placeId,
      day_number: dayNumber,
      order_index: maxOrder + 1,
    })
    if (error) { alert(`新增失敗：${error.message}`); return }
    fetchItinerary()
  }

  // 從行程移除
  async function handleRemoveFromDay(itineraryId: string) {
    await supabase.from('itinerary').delete().eq('id', itineraryId)
    fetchItinerary()
  }

  // 拖拉後批次更新 order_index
  async function handleReorder(dayNumber: number, orderedIds: string[]) {
    // 樂觀更新 UI（不等 DB 回應，感覺更流暢）
    setItineraryItems((prev) => {
      const updated = [...prev]
      orderedIds.forEach((id, idx) => {
        const item = updated.find((i) => i.id === id)
        if (item) item.order_index = idx
      })
      return updated
    })
    // 批次寫入 DB
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('itinerary').update({ order_index: idx }).eq('id', id)
      )
    )
  }

  // 更新預計時間
  async function handleUpdateTime(itineraryId: string, time: string) {
    setItineraryItems((prev) =>
      prev.map((i) => i.id === itineraryId ? { ...i, planned_time: time } : i)
    )
    await supabase.from('itinerary').update({ planned_time: time || null }).eq('id', itineraryId)
  }

  // 更新交通備註
  async function handleUpdateTransport(itineraryId: string, note: string) {
    setItineraryItems((prev) =>
      prev.map((i) => i.id === itineraryId ? { ...i, transport_note: note || undefined } : i)
    )
    await supabase.from('itinerary').update({ transport_note: note || null }).eq('id', itineraryId)
  }

  // 更新停留時間
  async function handleUpdateDuration(itineraryId: string, minutes: number | null) {
    setItineraryItems((prev) =>
      prev.map((i) => i.id === itineraryId ? { ...i, duration_minutes: minutes ?? undefined } : i)
    )
    await supabase.from('itinerary').update({ duration_minutes: minutes }).eq('id', itineraryId)
  }

  // 實際執行天數變更
  async function doAdjustDays(newTotal: number) {
    if (!tripInfo || !currentTripId) return
    const [y, mo, d] = tripInfo.start.split('-').map(Number)
    const newEnd = new Date(y, mo - 1, d + newTotal - 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    const newEndStr = `${newEnd.getFullYear()}-${pad(newEnd.getMonth() + 1)}-${pad(newEnd.getDate())}`
    const { error } = await supabase.from('trips').update({ end_date: newEndStr }).eq('id', currentTripId)
    if (error) { alert(`更新失敗：${error.message}`); return }
    setTripTotalDays(newTotal)
    setTripInfo({ ...tripInfo, end: newEndStr })
  }

  // 增減天數（縮短時若有行程地點則先提示）
  function handleAdjustDays(delta: number) {
    if (!tripInfo) return
    const newTotal = Math.max(1, tripTotalDays + delta)
    if (newTotal === tripTotalDays) return
    if (delta < 0) {
      const removedCount = itineraryItems.filter(i => i.day_number > newTotal).length
      if (removedCount > 0) {
        setConfirmDialog({
          msg: `第 ${newTotal + 1} 天以後共有 ${removedCount} 個行程地點，縮短天數後這些資料仍保留在資料庫，但不會顯示。確定縮短嗎？`,
          onConfirm: () => doAdjustDays(newTotal),
        })
        return
      }
    }
    doAdjustDays(newTotal)
  }

  return (
    <div className="trip-layout h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <SplashScreen />
      <SideMenu
        isOpen={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        onOpenAI={() => setAiOpenTrigger(t => t + 1)}
        onOpenNotes={() => { setShowNotesPanel(true); setDetailPlace(null); setShowListPanel(false) }}
        onOpenManageLists={() => openListPanel('manage')}
        tripId={currentTripId}
      />

      {/* 確認對話框（縮短天數警示等） */}
      {confirmDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="rounded-2xl p-5 mx-4 max-w-xs w-full"
            style={{ background: 'var(--color-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
              {confirmDialog.msg}
            </p>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                取消
              </button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null) }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: '#ef4444', color: 'white' }}
              >
                確定縮短
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 左側欄：trip-sidebar 讓 CSS media query 可控制手機版面 */}
      <aside className="trip-sidebar flex flex-col relative"
        style={{ '--sidebar-mobile-height': `${sidebarHeight}vh`, width: '400px', minWidth: '400px', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)', boxShadow: '2px 0 8px rgba(0,0,0,0.04)', isolation: 'isolate', overflow: 'hidden' } as React.CSSProperties}>

        {/* 拖拉手把（手機版專用） */}
        <div
          className="mobile-drag-handle"
          onPointerDown={handleDragStart}
          style={{ touchAction: 'none' }}
        >
          <div className="mobile-drag-pill" />
        </div>

        {/* 頂部標頭 — 手機版整個 header 都可以拖拉 */}
        <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
          onPointerDown={handleDragStart}
          style={{ borderBottom: '1px solid var(--color-border)', touchAction: 'none' }}>
          {/* 桌機版漢堡，手機版隱藏（手機版在地圖搜尋欄旁） */}
          <button
            onClick={() => setShowSideMenu(true)}
            title="選單"
            className="p-1.5 rounded-lg flex-shrink-0 hidden md:flex items-center justify-center"
            style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}
          ><Menu size={22} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate" style={{ color: 'var(--color-text)' }}>
              {tripInfo?.name ?? 'Trip Atlas'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {tripInfo
                ? `${formatTripDates(tripInfo.start, tripInfo.end)} · ${places.length} 個地點`
                : `${places.length} 個地點`}
            </p>
          </div>
          <button
            onClick={() => setShowTripSwitcher(true)}
            className="rounded-lg px-3 py-2 text-sm font-medium transition-colors flex-shrink-0"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}
          >我的旅程</button>
          <button onClick={() => { setShowNotesPanel(true); setDetailPlace(null); setShowListPanel(false) }}
            title="行程筆記"
            className="rounded-lg p-2 transition-colors"
            style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}
          ><NotebookPen size={16} /></button>
        </div>

        {/* 地點 / 行程 tab 切換 */}
        <div className="flex flex-shrink-0 items-stretch" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {(['places', 'itinerary'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setLeftTab(tab); if (tab !== 'places') { setShowLocalSearch(false); setLocalSearch('') } }}
              className="flex-1 py-2.5 text-sm font-medium"
              style={{
                color: leftTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: leftTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {tab === 'places' ? '地點' : '行程'}
            </button>
          ))}
          {/* 清單搜尋圖示（僅地點 tab 顯示） */}
          {leftTab === 'places' && (
            <button
              type="button"
              onClick={() => {
                const next = !showLocalSearch
                setShowLocalSearch(next)
                if (!next) setLocalSearch('')
              }}
              className="px-3 flex items-center justify-center"
              style={{
                color: showLocalSearch || localSearch ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: showLocalSearch || localSearch ? '2px solid var(--color-primary)' : '2px solid transparent',
                background: 'transparent',
              }}
              title="搜尋清單"
            >
              <Search size={15} />
            </button>
          )}
        </div>

        {/* 地點 tab 內容 */}
        {leftTab === 'places' && (
          <>
            {/* 清單內搜尋篩選（收合式） */}
            {showLocalSearch && (
              <div className="px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="relative">
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="篩選清單中的地點…"
                    autoFocus
                    className="w-full rounded-lg px-3 py-2 pr-8 text-sm outline-none"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
                  />
                  {localSearch && (
                    <button onClick={() => setLocalSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: 'var(--color-text-muted)' }}>✕</button>
                  )}
                </div>
              </div>
            )}

            {/* 清單篩選 tab + 新增清單按鈕 */}
            <div className="flex items-center px-4 py-2.5 gap-2 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex gap-1.5 overflow-x-auto flex-1 min-w-0">
                {lists.length > 0 && (
                  <>
                    <button onClick={() => setActiveListId(null)}
                      className="px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0"
                      style={{ background: activeListId === null ? 'var(--color-primary)' : 'var(--color-primary-pale)', color: activeListId === null ? 'white' : 'var(--color-primary)' }}>
                      全部
                    </button>
                    {lists.map((list) => (
                      <button key={list.id} onClick={() => setActiveListId(list.id)}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0"
                        style={{ background: activeListId === list.id ? list.color : 'transparent', color: activeListId === list.id ? 'white' : 'var(--color-text-muted)', border: activeListId === list.id ? 'none' : '1px solid var(--color-border)' }}>
                        <span className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                          style={{ background: activeListId === list.id ? 'white' : list.color }} />
                        {list.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
              <button
                onClick={() => openListPanel('add')}
                title="新增清單"
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-base font-medium leading-none"
                style={{ background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              >＋</button>
            </div>

            {/* 地點清單 */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>載入中…</p>
              ) : filteredPlaces.length === 0 ? (
                localSearch ? (
                  <p className="p-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>找不到「{localSearch}」相關地點</p>
                ) : activeListId ? (
                  <p className="p-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>這個清單還沒有地點</p>
                ) : (
                  <p className="p-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>還沒有地點，用上方搜尋列或點地圖新增</p>
                )
              ) : (
                <ul>
                  {filteredPlaces.map((place) => {
                    const isActive = activeId === place.id
                    const placeListIds = placeLists.filter((pl) => pl.place_id === place.id).map((pl) => pl.list_id)
                    const belongingLists = lists.filter((l) => placeListIds.includes(l.id))
                    return (
                      <li key={place.id}
                        className="px-5 py-4 flex items-start gap-3 cursor-pointer"
                        style={{ borderBottom: '1px solid var(--color-border)', background: isActive ? 'var(--color-primary-pale)' : 'transparent' }}
                        onClick={() => handlePlaceClick(place)}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm inline-flex items-baseline gap-1.5"
                              style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text)' }}>
                              {place.name}
                              {place.place_type && (
                                <span className="font-normal text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  · {place.place_type}
                                </span>
                              )}
                            </span>
                            {place.category.split(',').map((raw, i) => {
                              const { text, bg } = getCategoryStyle(raw)
                              return (
                                <span key={i} className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                                  style={{ background: bg, color: text }}>
                                  {getCategoryLabel(raw.trim())}
                                </span>
                              )
                            })}
                          </div>
                          {place.address && <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>{place.address}</p>}
                          {place.my_notes && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{place.my_notes.slice(0, 50)}{place.my_notes.length > 50 ? '…' : ''}</p>}
                          {belongingLists.length > 0 && (
                            <div className="flex gap-1 mt-1.5">
                              {belongingLists.map((l) => <span key={l.id} className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} title={l.name} />)}
                            </div>
                          )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(place) }}
                          disabled={deletingId === place.id}
                          className="mt-0.5 p-1.5 rounded flex-shrink-0 disabled:opacity-40"
                          style={{ color: 'var(--color-text-muted)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#ef4444' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)' }}>
                          <Trash2 size={14} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {/* 行程 tab 內容 */}
        {leftTab === 'itinerary' && (
          <ItineraryPanel
            totalDays={tripTotalDays}
            items={itineraryItems}
            places={places}
            selectedDay={selectedDay}
            selectedPlaceId={selectedPlaceId}
            startDate={tripInfo?.start}
            currency="THB"
            tripLat={tripRegion?.lat}
            tripLng={tripRegion?.lng}
            onSelectDay={setSelectedDay}
            onSelectPlace={setSelectedPlaceId}
            onAddToDay={handleAddToDay}
            onRemoveFromDay={handleRemoveFromDay}
            onReorder={handleReorder}
            onUpdateTime={handleUpdateTime}
            onUpdateTransport={handleUpdateTransport}
            onUpdateDuration={handleUpdateDuration}
            onAdjustDays={handleAdjustDays}
            onPlaceClick={handlePlaceClick}
          />
        )}

        {/* 詳情面板（地點 tab 用）— height:100% + overflow:hidden 確保手機版完全覆蓋 aside */}
        <div className="absolute inset-0 flex flex-col"
          style={{ background: 'var(--color-surface)', transform: detailPlace ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease', zIndex: detailPlace ? 10 : -1, top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
          {detailPlace && (
            <>
              <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--color-border)' }}>
                <button onClick={() => { setDetailPlace(null); setActiveId(null); setSelectedPlaceId(null) }}
                  className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <ArrowLeft size={18} />
                </button>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>返回清單</span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4 min-h-0" style={{ background: 'var(--color-surface)' }}>
                {/* 地點縮圖（有 Google Place ID 才顯示）：負邊距突破 px-5 py-5 */}
                {detailPlace.google_place_id && (
                  <div
                    data-photo-container
                    className="-mx-5 -mt-5 flex-shrink-0"
                    style={{ height: 180, background: 'var(--color-border)', overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', height: '100%', overflowX: 'auto', scrollbarWidth: 'none' }}>
                      {[0, 1, 2].map(idx => {
                        const src = `/api/place-photo?place_id=${encodeURIComponent(detailPlace.google_place_id!)}&photoIndex=${idx}`
                        return (
                          <div key={`${detailPlace.google_place_id}-${idx}`} style={{ flexShrink: 0, height: '100%' }}>
                            <img
                              src={src}
                              alt={detailPlace.name}
                              style={{ height: '100%', width: 'auto', minWidth: 160, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                              onClick={() => setLightboxSrc(src)}
                              onError={(e) => {
                                const wrap = e.currentTarget.parentElement as HTMLElement
                                wrap.style.display = 'none'
                                if (idx === 0) {
                                  const container = e.currentTarget.closest('[data-photo-container]') as HTMLElement | null
                                  if (container) container.style.display = 'none'
                                }
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  {editingName ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        autoFocus
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                        className="flex-1 text-xl font-bold rounded-lg px-2 py-1 outline-none"
                        style={{ border: '1px solid var(--color-primary-light)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
                      />
                      <button onClick={handleSaveName} className="p-1 rounded" style={{ color: 'var(--color-primary)' }}><Check size={16} /></button>
                      <button onClick={() => setEditingName(false)} className="p-1 rounded" style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{detailPlace.name}</h2>
                      <button
                        onClick={() => { setNameValue(detailPlace.name); setEditingName(true) }}
                        className="p-0.5 rounded flex-shrink-0"
                        style={{ color: 'var(--color-text-muted)' }}
                        title="編輯名稱"
                      ><Pencil size={11} /></button>
                      {detailPlace.place_type && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{detailPlace.place_type}</span>
                      )}
                    </div>
                  )}

                  {editingCategory ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {DEFAULT_CATEGORIES.map((cat) => {
                          const selected = editingCategoryValues.includes(cat)
                          const { text: catText, bg: catBg } = getCategoryStyle(cat)
                          return (
                            <button type="button" key={cat}
                              onClick={() => setEditingCategoryValues(prev =>
                                prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                              )}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{
                                background: selected ? catBg : 'transparent',
                                color: selected ? catText : 'var(--color-text-muted)',
                                border: `1px solid ${selected ? catText : 'var(--color-border)'}`,
                              }}
                            >
                              {selected && <span style={{ fontSize: 10 }}>✓</span>}
                              {cat}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditingCategory(false)}
                          className="flex-1 rounded-lg py-1.5 text-xs font-medium"
                          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent' }}>取消</button>
                        <button type="button" onClick={handleSaveCategory}
                          className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white"
                          style={{ background: 'var(--color-primary)' }}>儲存</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {detailPlace.category.split(',').map((raw, i) => {
                        const { text, bg } = getCategoryStyle(raw)
                        return (
                          <span key={i} className="inline-block text-xs px-2.5 py-1 rounded-full"
                            style={{ background: bg, color: text }}>
                            {getCategoryLabel(raw.trim())}
                          </span>
                        )
                      })}
                      <button type="button"
                        onClick={() => {
                          setEditingCategoryValues(detailPlace.category.split(',').map(c => c.trim()))
                          setEditingCategory(true)
                        }}
                        className="p-1 rounded"
                        style={{ color: 'var(--color-text-muted)' }}
                        title="編輯分類"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                </div>

                {detailPlace.address && (
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>地址</p>
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{detailPlace.address}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <a href={getGoogleMapsViewUrl(detailPlace)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:opacity-90"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent' }}>
                    <ExternalLink size={12} />前往 Google 查看
                  </a>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--color-text-muted)' }}>興趣程度</p>
                  <HeartRating
                    value={detailPlace.interest_rating ?? 0}
                    onChange={handleSaveRating}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>筆記</p>
                    {!editingNotes && (
                      <button onClick={() => { setEditingNotes(true); setNotesValue(detailPlace.my_notes ?? '') }}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ color: 'var(--color-primary)', background: 'var(--color-primary-pale)' }}>
                        {detailPlace.my_notes ? '編輯' : '新增'}
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="flex flex-col gap-2">
                      <textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)}
                        placeholder="備忘、心得、開放時間…" rows={4} autoFocus
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                        style={{ border: '1px solid var(--color-primary-light)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingNotes(false)}
                          className="flex-1 rounded-lg py-1.5 text-sm font-medium"
                          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent' }}>取消</button>
                        <button onClick={handleSaveNotes} disabled={savingNotes}
                          className="flex-1 rounded-lg py-1.5 text-sm font-medium text-white disabled:opacity-50"
                          style={{ background: 'var(--color-primary)' }}>{savingNotes ? '儲存中…' : '儲存'}</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed"
                      style={{ color: detailPlace.my_notes ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                      {detailPlace.my_notes || '還沒有筆記'}
                    </p>
                  )}
                </div>

                {/* Tips 區塊 */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Tips</p>
                      {!editingTips && (
                        <button
                          onClick={() => {
                            setTipsProsValue((detailPlace.tips_pros ?? []).join('\n'))
                            setTipsConsValue((detailPlace.tips_cons ?? []).join('\n'))
                            setPriceInfoValue(detailPlace.price_info ?? '')
                            setEditingTips(true)
                          }}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ color: 'var(--color-primary)', background: 'var(--color-primary-pale)' }}>
                          {(detailPlace.tips_pros?.length || detailPlace.tips_cons?.length || detailPlace.price_info) ? '編輯' : '新增'}
                        </button>
                      )}
                    </div>
                    {editingTips ? (
                      <div className="flex flex-col gap-2">
                        <div>
                          <p className="text-xs mb-1" style={{ color: '#16a34a' }}>優點（每行一條）</p>
                          <textarea value={tipsProsValue} onChange={(e) => setTipsProsValue(e.target.value)}
                            placeholder="環境寬敞&#10;價格實惠" rows={3} autoFocus
                            className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-none"
                            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: '#ea580c' }}>缺點（每行一條）</p>
                          <textarea value={tipsConsValue} onChange={(e) => setTipsConsValue(e.target.value)}
                            placeholder="停車不便" rows={2}
                            className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-none"
                            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>💰 價格資訊</p>
                          <input value={priceInfoValue} onChange={(e) => setPriceInfoValue(e.target.value)}
                            placeholder="NT$200–400/人"
                            className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingTips(false)}
                            className="flex-1 rounded-lg py-1.5 text-xs font-medium"
                            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent' }}>取消</button>
                          <button onClick={handleSaveTips} disabled={savingTips}
                            className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white disabled:opacity-50"
                            style={{ background: 'var(--color-primary)' }}>{savingTips ? '儲存中…' : '儲存'}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {detailPlace.tips_pros?.map((p, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs leading-snug">
                            <span style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }}>●</span>
                            <span style={{ color: 'var(--color-text)' }}>{p}</span>
                          </div>
                        ))}
                        {detailPlace.tips_cons?.map((c, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs leading-snug">
                            <span style={{ color: '#ea580c', flexShrink: 0, marginTop: 1 }}>●</span>
                            <span style={{ color: 'var(--color-text)' }}>{c}</span>
                          </div>
                        ))}
                        {detailPlace.price_info && (
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            💰 {detailPlace.price_info}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                {/* 預估費用 */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>預估費用</p>
                    {!editingCost && (
                      <button onClick={() => { setCostValue(detailPlace.estimated_cost != null ? String(detailPlace.estimated_cost) : ''); setEditingCost(true) }}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ color: 'var(--color-primary)', background: 'var(--color-primary-pale)' }}>
                        {detailPlace.estimated_cost != null ? '編輯' : '新增'}
                      </button>
                    )}
                  </div>
                  {editingCost ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input type="number" value={costValue} onChange={e => setCostValue(e.target.value)}
                          placeholder="0" min="0" autoFocus
                          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                          style={{ border: '1px solid var(--color-primary-light)', color: 'var(--color-text)', background: 'var(--color-bg)' }} />
                        <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>THB</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingCost(false)}
                          className="flex-1 rounded-lg py-1.5 text-xs font-medium"
                          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent' }}>取消</button>
                        <button onClick={handleSaveCost} disabled={savingCost}
                          className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          style={{ background: 'var(--color-primary)' }}>{savingCost ? '儲存中…' : '儲存'}</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: detailPlace.estimated_cost != null ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                      {detailPlace.estimated_cost != null ? `THB ${detailPlace.estimated_cost.toLocaleString()}` : '未設定'}
                    </p>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>加入清單</p>
                  {lists.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>還沒有清單，點左上角「清單」按鈕先建立</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {lists.map((list) => {
                        const inList = placeLists.some((pl) => pl.place_id === detailPlace.id && pl.list_id === list.id)
                        return (
                          <label key={list.id}
                            className="flex items-center gap-3 cursor-pointer py-1 rounded-lg px-2 -mx-2"
                            style={{ userSelect: 'none' }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
                            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                            <input type="checkbox" checked={inList}
                              onChange={() => togglePlaceInList(list.id, detailPlace.id)}
                              className="w-4 h-4 rounded" style={{ accentColor: list.color }} />
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: list.color }} />
                            <span className="text-sm" style={{ color: 'var(--color-text)' }}>{list.name}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <PlaceLinks key={detailPlace.id} placeId={detailPlace.id} />

                <button onClick={() => handleDelete(detailPlace)} disabled={deletingId === detailPlace.id}
                  className="mt-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-40"
                  style={{ color: '#ef4444', border: '1px solid #fecaca', background: 'transparent' }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#fff1f2'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <Trash2 size={14} />刪除這個地點
                </button>
              </div>
            </>
          )}
        </div>

        {/* 清單管理面板 */}
        <div className="absolute inset-0 flex flex-col"
          style={{ background: 'var(--color-surface)', transform: showListPanel ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease', zIndex: 10, height: '100%', overflow: 'hidden' }}>
          {showListPanel && (
            <ListPanel lists={lists} placeLists={placeLists}
              currentTripId={currentTripId ?? ''}
              initialView={listPanelInitialView}
              onClose={() => setShowListPanel(false)}
              onListsChange={() => { fetchLists(); fetchPlaceLists() }} />
          )}
        </div>

        {/* 行程筆記面板 */}
        <div className="absolute inset-0 flex flex-col"
          style={{ background: 'var(--color-surface)', transform: showNotesPanel ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease', zIndex: 10, height: '100%', overflow: 'hidden' }}>
          {showNotesPanel && (
            <TripNotesPanel tripId={currentTripId ?? ''} onClose={() => setShowNotesPanel(false)} />
          )}
        </div>

        <TripSwitcher
          isOpen={showTripSwitcher}
          currentTripId={currentTripId}
          onClose={() => setShowTripSwitcher(false)}
          onSwitch={handleSwitchTrip}
          onRefreshCurrent={handleRefreshCurrentTrip}
        />

        <TripInfoExtractor
          tripId={currentTripId ?? ''}
          tripRegion={tripRegion ?? undefined}
          onPlaceAdded={fetchPlaces}
          onAddNote={handleAddNote}
          onPreviewLocation={(lat, lng, name) => {
            setMapPanTo({ lat, lng })
            setPreviewMarker({ lat, lng, name })
          }}
          onClosePanel={() => setPreviewMarker(null)}
          openTrigger={aiOpenTrigger}
        />
      </aside>

      {/* 地圖區：trip-map 讓 CSS media query 可控制手機版面 */}
      <main className="trip-map flex-1 relative">

        {/* ── 浮動搜尋列（浮在地圖上）── */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, maxWidth: 440, zIndex: 20 }}>
          <div className="rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>

            {/* 輸入列 */}
            <div className="flex items-center gap-2 px-4 py-2.5">
              {/* 手機版漢堡，桌機隱藏 */}
              <button
                onClick={() => setShowSideMenu(true)}
                title="選單"
                className="flex md:hidden items-center justify-center flex-shrink-0 p-1 -ml-1 rounded-lg"
                style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none' }}
              ><Menu size={20} /></button>
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => { if (searchSuggestions.length > 0) setShowSearchDrop(true) }}
                placeholder="搜尋地點以新增到行程…"
                autoComplete="off"
                className="flex-1 text-sm outline-none"
                style={{ color: 'var(--color-text)', background: 'transparent' }}
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); setSearchSuggestions([]); setShowSearchDrop(false); setPendingPlace(null); setActiveId(null) }}
                  className="text-xs flex-shrink-0"
                  style={{ color: 'var(--color-text-muted)' }}
                >✕</button>
              )}
            </div>

            {/* 搜尋下拉 */}
            {showSearchDrop && searchSuggestions.length > 0 && (
              <>
                <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setShowSearchDrop(false)} />
                <div className="absolute left-0 right-0 rounded-2xl shadow-xl overflow-hidden"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', maxHeight: '240px', overflowY: 'auto', zIndex: 9999, top: 'calc(100% + 6px)' }}>
                  {searchSuggestions.map((s: any, i: number) => {
                    const pred = s.placePrediction
                    const main = pred.mainText?.toString() ?? pred.text.toString()
                    const secondary = pred.secondaryText?.toString() ?? ''
                    return (
                      <div key={i} onClick={() => handleSelectSuggestion(s)}
                        style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: i < searchSuggestions.length - 1 ? '1px solid var(--color-border)' : 'none', background: 'var(--color-surface)', position: 'relative', zIndex: 9999 }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'}>
                        <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--color-text)' }}>{main}</div>
                        {secondary && <div style={{ fontSize: '11px', marginTop: 2, color: 'var(--color-text-muted)' }}>{secondary}</div>}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* 確認新增卡片 */}
            {pendingPlace && (() => {
              const dupPlace = places.find(p =>
                (pendingPlace.googlePlaceId && p.google_place_id === pendingPlace.googlePlaceId) ||
                p.name === pendingPlace.name
              ) ?? null
              return (
                <div className="px-4 pb-4 pt-3 flex flex-col gap-2"
                  style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} style={{ color: 'var(--color-primary)', marginTop: 2, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{pendingPlace.name}</div>
                      {pendingPlace.address && <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{pendingPlace.address}</div>}
                    </div>
                  </div>
                  {dupPlace && (
                    <div className="flex items-start gap-1.5 rounded-xl px-2.5 py-2 text-xs leading-snug"
                      style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>
                      ⚠️ 清單裡已有「{dupPlace.name}」，確定要重複新增嗎？
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_CATEGORIES.map((cat) => {
                      const selected = pendingCategories.includes(cat)
                      const { text: catText, bg: catBg } = getCategoryStyle(cat)
                      return (
                        <button type="button" key={cat}
                          onClick={() => setPendingCategories(prev =>
                            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                          )}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: selected ? catBg : 'transparent',
                            color: selected ? catText : 'var(--color-text-muted)',
                            border: `1px solid ${selected ? catText : 'var(--color-border)'}`,
                          }}
                        >
                          {selected && <span style={{ fontSize: 10 }}>✓</span>}
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setPendingPlace(null); setSearchInput(''); setActiveId(null) }}
                      className="flex-1 rounded-xl py-1.5 text-sm font-medium"
                      style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent' }}>取消</button>
                    <button onClick={handleSavePending} disabled={savingPending}
                      className="flex-1 rounded-xl py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: 'var(--color-primary)' }}>{savingPending ? '新增中…' : '＋ 加入'}</button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        <Map
          places={mapPlaces}
          placeLists={placeLists}
          lists={lists}
          activeId={activeId}
          onMapClick={handleMapClick}
          onPoiAdd={handlePoiAdd}
          onMarkerClick={handlePlaceClick}
          selectedDay={selectedDay}
          itineraryItems={itineraryItems}
          activePlaceId={selectedPlaceId ?? (previewMarker ? '__preview__' : null)}
          panTo={mapPanTo}
        />
      </main>

      {/* 刪除確認 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setConfirmDelete(null)}>
          <div className="rounded-xl shadow-lg p-6 w-80"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>確定要刪除？</p>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>「{confirmDelete.name}」將會被永久刪除。</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-lg py-2 text-sm font-medium"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'transparent' }}>
                取消
              </button>
              <button onClick={() => executeDelete(confirmDelete)}
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white"
                style={{ background: '#ef4444' }}>
                刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="放大檢視"
            style={{ maxWidth: '92vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
