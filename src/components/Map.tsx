/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef } from 'react'
import type { Place, ItineraryItem, List, PlaceList } from '@/types'

export interface MapClickData {
  lat: number
  lng: number
  name: string
  address: string
  googlePlaceId?: string
  placeType?: string
}

export interface PoiAddData extends MapClickData {
  category: string
}

interface MapProps {
  places: Place[]
  placeLists?: PlaceList[]
  lists?: List[]
  activeId?: string | null
  onMapClick?: (data: MapClickData) => void
  onPoiAdd?: (data: PoiAddData) => void
  onMarkerClick?: (place: Place) => void
  selectedDay?: number | null
  itineraryItems?: ItineraryItem[]
  activePlaceId?: string | null
  panTo?: { lat: number; lng: number; zoom?: number } | null
}

// Plus Code 格式：字母+數字組合後接 + 號，例如 X87H+VH、9C3Q+RH
function isPlusCode(s: string): boolean {
  return /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}/i.test(s.trim())
}

async function reverseGeocode(lat: number, lng: number): Promise<{ name: string; address: string }> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY?.trim()
  if (!key) return { name: '未命名地點', address: '' }
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=zh-TW`
    )
    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.length) return { name: '未命名地點', address: '' }

    // 過濾掉 plus_code 類型的結果
    const meaningful = (data.results as any[]).filter(
      (r: any) => !r.types?.includes('plus_code')
    )
    const base = meaningful[0] ?? data.results[0]
    const address = base.formatted_address ?? ''

    // 1. 優先：POI / 地標 / 設施
    const poi = meaningful.find((r: any) =>
      r.types?.some((t: string) =>
        ['point_of_interest', 'establishment', 'premise', 'natural_feature', 'park'].includes(t)
      )
    )
    if (poi) {
      const comp = poi.address_components?.[0]?.long_name ?? ''
      if (comp && !isPlusCode(comp)) return { name: comp, address }
    }

    // 2. 街道地址
    const street = meaningful.find((r: any) =>
      r.types?.some((t: string) => ['street_address', 'route', 'intersection'].includes(t))
    )
    if (street) {
      const comp = street.address_components?.[0]?.long_name ?? ''
      if (comp && !isPlusCode(comp)) return { name: comp, address }
    }

    // 3. formatted_address 逗號前第一段
    const firstPart = address.split(',')[0].trim()
    if (firstPart && !isPlusCode(firstPart)) return { name: firstPart, address }

    // 4. 完全取不到有意義名稱
    return { name: '未命名地點', address }
  } catch {
    return { name: '未命名地點', address: '' }
  }
}

const POI_CATEGORIES = ['餐廳', '咖啡廳', '景點', '海邊', '寺廟', '小店', '小吃', '飯店']

export default function Map({ places, placeLists = [], lists = [], activeId, onMapClick, onPoiAdd, onMarkerClick, selectedDay, itineraryItems = [],
  activePlaceId, panTo,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const routePolylineRef = useRef<google.maps.Polyline | null>(null)
  const onMapClickRef = useRef(onMapClick)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onPoiAddRef = useRef(onPoiAdd)
  const placeListsRef = useRef(placeLists)
  const listsRef = useRef(lists)
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])
  useEffect(() => { onMarkerClickRef.current = onMarkerClick }, [onMarkerClick])
  useEffect(() => { onPoiAddRef.current = onPoiAdd }, [onPoiAdd])
  useEffect(() => { placeListsRef.current = placeLists }, [placeLists])
  useEffect(() => { listsRef.current = lists }, [lists])

  useEffect(() => {
    if (!panTo || !mapRef.current) return
    mapRef.current.panTo({ lat: panTo.lat, lng: panTo.lng })
    if (panTo.zoom !== undefined) {
      mapRef.current.setZoom(panTo.zoom)
    } else if ((mapRef.current.getZoom() ?? 0) < 15) {
      mapRef.current.setZoom(15)
    }
  }, [panTo])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    async function initMap() {
      const { Map: GMap } = await (window as any).google.maps.importLibrary('maps') as google.maps.MapsLibrary

      const map = new GMap(containerRef.current!, {
        center: { lat: -8.4095, lng: 115.1889 },
        zoom: 10,
        mapId: 'trip-atlas-map',
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })

      mapRef.current = map
      infoWindowRef.current = new (window as any).google.maps.InfoWindow()


      const locationBtn = document.createElement('button')
      locationBtn.title = '定位到我的位置'
      locationBtn.style.cssText = `
        background: white; border: none; border-radius: 8px;
        width: 40px; height: 40px; cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        display: flex; align-items: center; justify-content: center;
        margin: 8px; font-size: 18px;
      `
      locationBtn.innerHTML = '📍'
      locationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords
            map.panTo({ lat, lng })
            map.setZoom(15)
            new (window as any).google.maps.Marker({
              position: { lat, lng },
              map,
              icon: {
                path: (window as any).google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
              },
              title: '你在這裡',
            })
          },
          () => alert('無法取得位置，請確認已允許瀏覽器存取位置')
        )
      })
      map.controls[(window as any).google.maps.ControlPosition.RIGHT_BOTTOM].push(locationBtn)

      // Custom map type toggle (layers icon → popup with 地圖/衛星)
      const layersWrapper = document.createElement('div')
      layersWrapper.style.cssText = 'position:relative;margin:0 8px 4px 8px;'

      const layersPopup = document.createElement('div')
      layersPopup.style.cssText = [
        'position:absolute;bottom:48px;right:0;',
        'background:white;border-radius:10px;',
        'box-shadow:0 4px 16px rgba(0,0,0,0.18);',
        'padding:6px;display:none;flex-direction:column;gap:4px;min-width:88px;z-index:10;',
      ].join('')

      function makeMapTypeBtn(label: string, typeId: string) {
        const btn = document.createElement('button')
        btn.textContent = label
        btn.dataset.typeId = typeId
        btn.style.cssText = 'padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:13px;text-align:left;background:transparent;color:#333;font-family:system-ui;width:100%;'
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          map.setMapTypeId(typeId)
          layersPopup.style.display = 'none'
          layersPopup.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
            const active = b.dataset.typeId === typeId
            b.style.background = active ? '#e8f5e9' : 'transparent'
            b.style.color = active ? '#2d6a4f' : '#333'
          })
        })
        return btn
      }

      const roadmapBtn = makeMapTypeBtn('地圖', 'roadmap')
      roadmapBtn.style.background = '#e8f5e9'
      roadmapBtn.style.color = '#2d6a4f'
      const satelliteBtn = makeMapTypeBtn('衛星', 'satellite')
      layersPopup.appendChild(roadmapBtn)
      layersPopup.appendChild(satelliteBtn)

      const layersBtn = document.createElement('button')
      layersBtn.title = '切換地圖類型'
      layersBtn.style.cssText = [
        'background:white;border:none;border-radius:8px;',
        'width:40px;height:40px;cursor:pointer;',
        'box-shadow:0 2px 6px rgba(0,0,0,0.15);',
        'display:flex;align-items:center;justify-content:center;color:#555;',
      ].join('')
      layersBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`
      layersBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const isOpen = layersPopup.style.display === 'flex'
        layersPopup.style.display = isOpen ? 'none' : 'flex'
        if (!isOpen) {
          const cur = map.getMapTypeId()
          layersPopup.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
            const active = b.dataset.typeId === cur
            b.style.background = active ? '#e8f5e9' : 'transparent'
            b.style.color = active ? '#2d6a4f' : '#333'
          })
        }
      })

      document.addEventListener('click', () => { layersPopup.style.display = 'none' })

      layersWrapper.appendChild(layersPopup)
      layersWrapper.appendChild(layersBtn)
      map.controls[(window as any).google.maps.ControlPosition.RIGHT_BOTTOM].push(layersWrapper)

      map.addListener('click', async (e: any) => {
        if (e.placeId) {
          e.stop()  // 阻止 Google 原生 InfoWindow 彈出

          // 立即顯示 loading
          infoWindowRef.current?.setContent(
            `<div style="padding:10px 4px;font-family:system-ui;font-size:13px;color:#888;">正在載入…</div>`
          )
          infoWindowRef.current?.setPosition(e.latLng)
          infoWindowRef.current?.open(mapRef.current!)

          try {
            const res = await fetch(`/api/poi-details?place_id=${encodeURIComponent(e.placeId)}`)
            if (!res.ok) return
            const poi = await res.json()
            if (!poi) return

            const { name, address, lat, lng, placeType, id: googlePlaceId } = poi as {
              name: string; address: string; lat: number; lng: number; placeType: string; id: string
            }

            const ts = Date.now()
            const selectId = `poi-cat-${ts}`
            const btnId = `poi-add-${ts}`
            const catOptions = POI_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')

            infoWindowRef.current?.setContent(`
              <div style="min-width:210px;max-width:260px;padding:2px 2px 6px;font-family:system-ui,sans-serif;">
                <div style="font-weight:600;font-size:14px;color:#1a1a1a;margin-bottom:${placeType ? '2' : '8'}px;line-height:1.35;">${name}</div>
                ${placeType ? `<div style="font-size:11px;color:#888;margin-bottom:4px;">${placeType}</div>` : ''}
                ${address ? `<div style="font-size:11px;color:#888;line-height:1.45;margin-bottom:10px;">${address}</div>` : ''}
                <select id="${selectId}" style="
                  width:100%;box-sizing:border-box;padding:6px 8px;
                  border-radius:7px;border:1px solid #d1d5db;
                  font-size:13px;color:#1a1a1a;background:white;
                  margin-bottom:8px;outline:none;cursor:pointer;
                ">
                  ${catOptions}
                </select>
                <button id="${btnId}" style="
                  display:flex;align-items:center;justify-content:center;gap:5px;
                  background:#2D6A4F;color:white;border:none;border-radius:8px;
                  padding:8px 12px;font-size:13px;font-weight:500;
                  cursor:pointer;width:100%;box-sizing:border-box;
                ">確認加入</button>
              </div>
            `)

            ;(window as any).google.maps.event.addListenerOnce(
              infoWindowRef.current!,
              'domready',
              () => {
                const btn = document.getElementById(btnId)
                const sel = document.getElementById(selectId) as HTMLSelectElement | null
                btn?.addEventListener('click', () => {
                  const category = sel?.value ?? '餐廳'
                  infoWindowRef.current?.close()
                  onPoiAddRef.current?.({ lat, lng, name, address, googlePlaceId, placeType, category })
                })
              }
            )

            infoWindowRef.current?.open(mapRef.current!)
          } catch (err) {
            console.error('POI fetch error:', err)
          }
          return
        }

        if (!onMapClickRef.current || !e.latLng) return
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        const { name, address } = await reverseGeocode(lat, lng)
        onMapClickRef.current({ lat, lng, name, address })
      })
    }

    if ((window as any).google?.maps) {
      initMap()
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.maps) {
          clearInterval(interval)
          initMap()
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [])

  // 重繪 markers
  useEffect(() => {
    if (!mapRef.current) return

    function getPlaceColor(placeId: string): string {
      const pl = placeListsRef.current.find((x) => x.place_id === placeId)
      if (!pl) return '#4a7c59'
      const list = listsRef.current.find((l) => l.id === pl.list_id)
      return list?.color ?? '#4a7c59'
    }

    async function updateMarkers() {
      const { AdvancedMarkerElement } = await (window as any).google.maps.importLibrary('marker') as google.maps.MarkerLibrary

      markersRef.current.forEach((m) => { m.map = null })
      markersRef.current = []

      places
        .filter((p) => p.lat != null && p.lng != null)
        .forEach((p, index) => {
          const pinEl = document.createElement('div')
          pinEl.style.lineHeight = '0'
          const dayItems = itineraryItems.filter((i) => i.day_number === selectedDay)
          const orderInDay = dayItems.findIndex((i) => i.place_id === p.id)
          const showNumber = selectedDay !== null && orderInDay !== -1
          const isHighlighted = activePlaceId === p.id
          const color = (p.id === '__pending__' || p.id === '__preview__') ? '#4a7c59' : getPlaceColor(p.id)

          if (isHighlighted) {
            // 選中：質感水滴圖標，同心圓設計
            pinEl.innerHTML = `
              <svg width="32" height="44" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 5px 12px rgba(0,0,0,0.38))">
                <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 44 16 44C16 44 32 28 32 16C32 7.163 24.837 0 16 0Z" fill="${color}"/>
                <circle cx="16" cy="16" r="7.5" fill="white" fill-opacity="0.96"/>
                <circle cx="16" cy="16" r="3.2" fill="${color}" fill-opacity="0.75"/>
              </svg>`
          } else if (showNumber) {
            // 行程順序：編號水滴
            pinEl.innerHTML = `
              <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.28))">
                <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 38 14 38C14 38 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${color}"/>
                <text x="14" y="19" text-anchor="middle" font-size="11" font-weight="700" font-family="system-ui,sans-serif" fill="white">${orderInDay + 1}</text>
              </svg>`
          } else {
            // 預設：小點（外層透明圓擴大點擊區）
            pinEl.style.cssText = 'line-height:0;cursor:pointer;'
            pinEl.innerHTML = `
              <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="14" fill="transparent"/>
                <circle cx="14" cy="14" r="5" fill="${color}" stroke="white" stroke-width="2.5" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.28))"/>
              </svg>`
          }

          const marker = new AdvancedMarkerElement({
            map: mapRef.current!,
            position: { lat: p.lat!, lng: p.lng! },
            content: pinEl,
            title: p.name,
            zIndex: isHighlighted ? 999 : showNumber ? 100 : undefined,
          })

          marker.addListener('gmp-click', () => {
            if (p.id === '__pending__' || p.id === '__preview__') return
            infoWindowRef.current?.close()
            onMarkerClickRef.current?.(p)
          })

          markersRef.current.push(marker)
          void index // 避免 unused variable 警告
        })
    }

    updateMarkers()
  }, [places, placeLists, lists, selectedDay, itineraryItems, activePlaceId])

  useEffect(() => {
    if (!mapRef.current) return
    if (routePolylineRef.current) { routePolylineRef.current.setMap(null); routePolylineRef.current = null }
    if (selectedDay === null) return
    const dayItems = itineraryItems.filter((i) => i.day_number === selectedDay).sort((a, b) => a.order_index - b.order_index)
    const waypoints = dayItems.map((i) => i.place).filter((p) => p?.lat && p?.lng).map((p) => ({ lat: p.lat!, lng: p.lng! }))
    if (waypoints.length < 2) return
    const origin = waypoints[0]
    const destination = waypoints[waypoints.length - 1]
    const intermediates = waypoints.slice(1, -1).map((p) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } }))
    fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } }, destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } }, intermediates, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE' }),
    }).then((r) => r.json()).then((data) => {
      const encoded = data.routes?.[0]?.polyline?.encodedPolyline
      if (!encoded || !mapRef.current) return
      const points: { lat: number; lng: number }[] = []
      let idx = 0, lat = 0, lng = 0
      while (idx < encoded.length) {
        let shift = 0, result = 0, byte: number
        do { byte = encoded.charCodeAt(idx++) - 63; result |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
        lat += (result & 1) ? ~(result >> 1) : result >> 1
        shift = 0; result = 0
        do { byte = encoded.charCodeAt(idx++) - 63; result |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
        lng += (result & 1) ? ~(result >> 1) : result >> 1
        points.push({ lat: lat / 1e5, lng: lng / 1e5 })
      }
      routePolylineRef.current = new (window as any).google.maps.Polyline({ path: points, map: mapRef.current, strokeColor: '#4a7c59', strokeWeight: 3, strokeOpacity: 0.75, geodesic: true })
    }).catch(() => {})
  }, [selectedDay, itineraryItems])

  useEffect(() => {
    if (!activeId || !mapRef.current) return
    const place = places.find((p) => p.id === activeId)
    if (!place?.lat || !place?.lng) return
    mapRef.current.panTo({ lat: place.lat, lng: place.lng })
    mapRef.current.setZoom(15)
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activePlaceId || !mapRef.current) return
    const place = places.find((p) => p.id === activePlaceId)
    if (!place?.lat || !place?.lng) return
    mapRef.current.panTo({ lat: place.lat, lng: place.lng })
    mapRef.current.setZoom(15)
  }, [activePlaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
