'use client'
import { useState, useRef, useEffect } from 'react'
import { DESTINATIONS, type Destination } from '@/data/destinations'

interface Props {
  onSelect: (country: string, countryEn: string, region: string, regionEn: string) => void
  defaultCountry?: string
  defaultCountryEn?: string
  defaultRegion?: string
}

export default function DestinationPicker({ onSelect, defaultCountry, defaultCountryEn, defaultRegion }: Props) {
  const [countryInput, setCountryInput] = useState(defaultCountry ?? '')
  const [regionInput, setRegionInput] = useState(defaultRegion ?? '')
  const [selectedDest, setSelectedDest] = useState<Destination | null>(() =>
    defaultCountryEn ? (DESTINATIONS.find(d => d.countryEn === defaultCountryEn) ?? null) : null
  )
  const [showCountryDrop, setShowCountryDrop] = useState(false)
  const [showRegionDrop, setShowRegionDrop] = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)
  const regionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setShowCountryDrop(false)
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) setShowRegionDrop(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const filteredCountries = DESTINATIONS.filter(d => {
    const q = countryInput.toLowerCase()
    if (!q) return true
    return d.country.includes(q) || d.countryEn.toLowerCase().includes(q)
  })

  const filteredCities = selectedDest
    ? selectedDest.cities.filter(c => {
        const q = regionInput.toLowerCase()
        if (!q) return true
        return c.name.includes(q) || c.nameEn.toLowerCase().includes(q)
      })
    : []

  function selectCountry(dest: Destination) {
    setSelectedDest(dest)
    setCountryInput(dest.country)
    setRegionInput('')
    setShowCountryDrop(false)
    onSelect(dest.country, dest.countryEn, '', '')
  }

  function selectCity(city: { name: string; nameEn: string }) {
    if (!selectedDest) return
    setRegionInput(city.name)
    setShowRegionDrop(false)
    onSelect(selectedDest.country, selectedDest.countryEn, city.name, city.nameEn)
  }

  const dropStyle = {
    position: 'absolute' as const,
    left: 0, right: 0, top: 'calc(100% + 4px)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    zIndex: 100,
    maxHeight: 180,
    overflowY: 'auto' as const,
  }

  return (
    <div className="flex gap-2">
      {/* 國家 */}
      <div className="relative flex-1" ref={countryRef}>
        <input
          value={countryInput}
          onChange={e => {
            setCountryInput(e.target.value)
            setSelectedDest(null)
            setRegionInput('')
            setShowCountryDrop(true)
            onSelect('', '', '', '')
          }}
          onFocus={() => setShowCountryDrop(true)}
          placeholder="國家"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
        />
        {showCountryDrop && filteredCountries.length > 0 && (
          <div style={dropStyle}>
            {filteredCountries.map(d => (
              <div
                key={d.countryEn}
                onClick={() => selectCountry(d)}
                className="px-3 py-2 text-sm cursor-pointer"
                style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                {d.country} ({d.countryEn})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 城市 / 地區 */}
      <div className="relative flex-1" ref={regionRef}>
        <input
          value={regionInput}
          onChange={e => { setRegionInput(e.target.value); setShowRegionDrop(true) }}
          onFocus={() => { if (selectedDest) setShowRegionDrop(true) }}
          disabled={!selectedDest}
          placeholder={selectedDest ? '城市 / 地區' : '請先選國家'}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-40"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
        />
        {showRegionDrop && selectedDest && filteredCities.length > 0 && (
          <div style={dropStyle}>
            {filteredCities.map(c => (
              <div
                key={c.nameEn}
                onClick={() => selectCity(c)}
                className="px-3 py-2 text-sm cursor-pointer"
                style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-pale)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                {c.name} ({c.nameEn})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
