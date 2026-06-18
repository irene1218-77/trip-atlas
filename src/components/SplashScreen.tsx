'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen() {
  // 先 false 避免 SSR/hydration 不一致，useEffect 後才決定要不要顯示
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem('tripAtlasSplashSeen')
    if (seen) return
    sessionStorage.setItem('tripAtlasSplashSeen', '1')
    setVisible(true)

    // 兩個 timer 各自獨立，cleanup 都能回收
    const t1 = setTimeout(() => setFading(true), 1500)       // 1.5s 開始淡出
    const t2 = setTimeout(() => setVisible(false), 2000)     // 2s unmount
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes swayTree {
          0%   { transform: rotate(-3deg); }
          50%  { transform: rotate(3deg); }
          100% { transform: rotate(-3deg); }
        }
        .splash-tree {
          animation: swayTree 2s ease-in-out infinite;
          transform-origin: 50% 100%;
        }
      `}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'white',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20,
          transition: 'opacity 0.5s ease',
          opacity: fading ? 0 : 1,
          pointerEvents: fading ? 'none' : 'auto',
        }}
      >
        <div className="splash-tree">
          <svg width="120" height="160" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M58 155 Q54 130 56 110 Q58 90 60 70 Q62 90 64 110 Q66 130 62 155 Z" fill="#A0845C" />
            <path d="M60 70 Q80 50 105 42 Q95 58 75 68 Q67 72 60 70Z" fill="#4ADE80" />
            <path d="M60 70 Q40 50 15 42 Q25 58 45 68 Q53 72 60 70Z" fill="#22C55E" />
            <path d="M62 65 Q82 38 108 28 Q100 46 78 58 Q70 62 62 65Z" fill="#16A34A" />
            <path d="M58 65 Q38 38 12 28 Q20 46 42 58 Q50 62 58 65Z" fill="#4ADE80" />
            <path d="M60 68 Q60 44 62 22 Q56 44 60 68Z" fill="#15803D" />
            <circle cx="56" cy="76" r="6" fill="#D97706" />
            <circle cx="65" cy="73" r="5.5" fill="#B45309" />
            <circle cx="60" cy="82" r="5" fill="#D97706" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--color-primary)', lineHeight: 1 }}>
            Trip Atlas
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6, letterSpacing: '0.05em' }}>
            你的私人旅行規劃本
          </p>
        </div>
      </div>
    </>
  )
}
