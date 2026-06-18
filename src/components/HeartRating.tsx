'use client'
import { useRef } from 'react'
import { Heart } from 'lucide-react'

interface HeartRatingProps {
  value: number
  onChange: (value: number) => void
}

export default function HeartRating({ value, onChange }: HeartRatingProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  function getHeartFromX(clientX: number): number {
    if (!containerRef.current) return 1
    const rect = containerRef.current.getBoundingClientRect()
    const relX = clientX - rect.left
    const heartW = rect.width / 5
    return Math.min(5, Math.max(1, Math.ceil(relX / heartW)))
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const v = getHeartFromX(e.clientX)
    onChange(v)
    try { navigator.vibrate(10) } catch { /* unsupported */ }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1) return
    onChange(getHeartFromX(e.clientX))
  }

  return (
    <div
      ref={containerRef}
      className="flex gap-1 select-none"
      style={{ cursor: 'pointer', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value
        return (
          <div
            key={i}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}
          >
            {/* remount trick: key changes when filled status flips → CSS animation reruns */}
            {filled && <span key={`ripple-${i}-${value >= i ? 'on' : 'off'}`} className="heart-ripple" />}
            <Heart
              key={`${i}-${filled}`}
              size={20}
              className={filled ? 'heart-animate' : ''}
              style={{ position: 'relative', zIndex: 1 }}
              fill={filled ? 'var(--color-primary)' : 'none'}
              stroke={filled ? 'var(--color-primary)' : 'var(--color-border)'}
              strokeWidth={1.5}
            />
          </div>
        )
      })}
    </div>
  )
}
