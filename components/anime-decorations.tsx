'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type MascotVariant = 'reader' | 'wink' | 'star'


export function AnimeMascot({
  className,
  variant = 'reader',
}: {
  className?: string
  variant?: MascotVariant
}) {
  return (
    <svg
      viewBox="0 0 150 160"
      fill="none"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id="anime-hair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <radialGradient id="anime-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="75" cy="70" rx="74" ry="74" fill="url(#anime-glow)" />

      <path d="M40 44 L30 8 L66 34 Z" fill="url(#anime-hair)" />
      <path d="M110 44 L120 8 L84 34 Z" fill="url(#anime-hair)" />
      <path d="M44 40 L39 19 L58 33 Z" fill="#ffd9e6" />
      <path d="M106 40 L111 19 L92 33 Z" fill="#ffd9e6" />

      <ellipse cx="75" cy="64" rx="42" ry="40" fill="url(#anime-hair)" />

      <ellipse cx="75" cy="68" rx="35" ry="33" fill="#ffe7da" />

      <path
        d="M40 60 C40 30 110 30 110 60 C104 50 96 56 92 46 C88 58 80 50 75 60 C70 50 62 58 58 46 C54 56 46 50 40 60 Z"
        fill="url(#anime-hair)"
      />
      <path d="M40 58 C34 74 36 92 44 100 C40 84 42 70 48 62 Z" fill="url(#anime-hair)" />
      <path d="M110 58 C116 74 114 92 106 100 C110 84 108 70 102 62 Z" fill="url(#anime-hair)" />

      <path d="M50 62 q8 -4 16 0" stroke="#b96" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M84 62 q8 -4 16 0" stroke="#b96" strokeWidth="2" strokeLinecap="round" fill="none" />

      {variant === 'star' ? (
        <>
          <StarEye cx={58} cy={76} />
          <StarEye cx={92} cy={76} />
        </>
      ) : variant === 'wink' ? (
        <>
          <ellipse cx="58" cy="76" rx="10" ry="13" fill="#2a2140" />
          <ellipse cx="58" cy="78" rx="7" ry="9" fill="var(--primary)" />
          <circle cx="54" cy="72" r="3.4" fill="#ffffff" />
          <circle cx="61" cy="81" r="1.8" fill="#ffffff" opacity="0.85" />
          <path d="M83 80 q9 -9 18 0" stroke="#2a2140" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="58" cy="76" rx="10" ry="13" fill="#2a2140" />
          <ellipse cx="92" cy="76" rx="10" ry="13" fill="#2a2140" />
          <ellipse cx="58" cy="78" rx="7" ry="9" fill="var(--primary)" />
          <ellipse cx="92" cy="78" rx="7" ry="9" fill="var(--primary)" />
          <circle cx="54" cy="72" r="3.4" fill="#ffffff" />
          <circle cx="88" cy="72" r="3.4" fill="#ffffff" />
          <circle cx="61" cy="81" r="1.8" fill="#ffffff" opacity="0.85" />
          <circle cx="95" cy="81" r="1.8" fill="#ffffff" opacity="0.85" />
        </>
      )}

      <ellipse cx="44" cy="86" rx="7" ry="4.5" fill="var(--primary)" opacity="0.45" />
      <ellipse cx="106" cy="86" rx="7" ry="4.5" fill="var(--primary)" opacity="0.45" />

      {variant === 'reader' ? (
        <path d="M68 90 q3.5 4 7 0 q3.5 4 7 0" stroke="#c46" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M67 89 q8 9 16 0 Z" fill="#c2456a" stroke="#c2456a" strokeWidth="2" strokeLinejoin="round" />
      )}

      {variant === 'reader' ? (
        <g>
          <path d="M75 118 L48 112 C44 111 42 113 42 116 L42 138 C42 141 44 142 48 143 L75 149 Z" fill="#fdfdfd" />
          <path d="M75 118 L102 112 C106 111 108 113 108 116 L108 138 C108 141 106 142 102 143 L75 149 Z" fill="#eef0f7" />
          <path d="M75 118 L75 149" stroke="var(--accent)" strokeWidth="2.5" />
          <path d="M52 121 L68 124 M52 127 L68 130 M52 133 L66 136" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
          <path d="M98 121 L82 124 M98 127 L82 130 M98 133 L84 136" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        </g>
      ) : variant === 'wink' ? (
        <g>
          <circle cx="108" cy="112" r="11" fill="#ffe7da" />
          <path d="M104 108 v-9 a3 3 0 0 1 6 0 v8" fill="#ffe7da" stroke="#e7b9a6" strokeWidth="1.5" />
        </g>
      ) : null}
    </svg>
  )
}


export function AnimeChibiReader({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 200"
      fill="none"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id="chibi-hair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <linearGradient id="chibi-iris" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <radialGradient id="chibi-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="110" cy="100" rx="104" ry="96" fill="url(#chibi-glow)" />

      <path d="M76 54 L68 22 L104 40 Z" fill="url(#chibi-hair)" />
      <path d="M144 54 L152 22 L116 40 Z" fill="url(#chibi-hair)" />
      <path d="M79 48 L74 29 L95 40 Z" fill="#ffd9e6" />
      <path d="M141 48 L146 29 L125 40 Z" fill="#ffd9e6" />

      <path d="M103 33 q9 -19 22 -11 q-12 1 -14 14 Z" fill="url(#chibi-hair)" />

      <circle cx="110" cy="90" r="52" fill="url(#chibi-hair)" />

      <ellipse cx="110" cy="98" rx="40" ry="36" fill="#ffe7da" />

      <path d="M70 94 C70 48 150 48 150 94 Q144 80 133 86 Q127 76 110 84 Q93 76 87 86 Q76 80 70 94 Z" fill="url(#chibi-hair)" />
      <path d="M70 88 C64 100 65 114 71 122 C68 108 70 97 77 90 Z" fill="url(#chibi-hair)" />
      <path d="M150 88 C156 100 155 114 149 122 C152 108 150 97 143 90 Z" fill="url(#chibi-hair)" />
      <path d="M82 58 C93 50 122 49 138 56" stroke="#ffffff" strokeOpacity="0.38" strokeWidth="4.5" strokeLinecap="round" />

      <ellipse cx="90" cy="104" rx="11.5" ry="14.5" fill="#2a2140" />
      <ellipse cx="130" cy="104" rx="11.5" ry="14.5" fill="#2a2140" />
      <ellipse cx="90" cy="106" rx="8.5" ry="11" fill="url(#chibi-iris)" />
      <ellipse cx="130" cy="106" rx="8.5" ry="11" fill="url(#chibi-iris)" />
      <circle cx="86" cy="99" r="4" fill="#fff" />
      <circle cx="126" cy="99" r="4" fill="#fff" />
      <circle cx="94" cy="111" r="2" fill="#fff" opacity="0.9" />
      <circle cx="134" cy="111" r="2" fill="#fff" opacity="0.9" />

      <ellipse cx="73" cy="117" rx="7" ry="4.6" fill="var(--primary)" opacity="0.4" />
      <ellipse cx="147" cy="117" rx="7" ry="4.6" fill="var(--primary)" opacity="0.4" />

      <path d="M103 121 q7 7 14 0" stroke="#c46" strokeWidth="2.4" strokeLinecap="round" />

      <g>
        <path d="M110 146 L40 134 C34 133 31 136 31 141 L31 168 C31 173 34 176 40 177 L110 189 L180 177 C186 176 189 173 189 168 L189 141 C189 136 186 133 180 134 Z" fill="#3a2f5c" />
        <path d="M110 142 L46 131 C41 130 39 132 39 136 L39 162 C39 166 41 168 46 169 L110 180 Z" fill="#fdfdfd" />
        <path d="M110 142 L174 131 C179 130 181 132 181 136 L181 162 C181 166 179 168 174 169 L110 180 Z" fill="#eef0f7" />
        <path d="M110 142 L110 180" stroke="var(--accent)" strokeWidth="3" />
        <path d="M48 138 L70 142 L70 154 L48 150 Z" stroke="var(--primary)" strokeWidth="1.6" opacity="0.5" />
        <path d="M78 147 L100 151 M78 153 L100 157 M78 159 L96 162" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
        <path d="M150 142 L172 138 L172 150 L150 154 Z" stroke="var(--accent)" strokeWidth="1.6" opacity="0.5" />
        <path d="M120 151 L142 147 M120 157 L142 153 M120 163 L138 159" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      </g>

      <g>
        <path d="M56 141 a9 9 0 0 1 18 0 l0 4 a9 4 0 0 1 -18 0 Z" fill="#ffe7da" />
        <path d="M146 141 a9 9 0 0 1 18 0 l0 4 a9 4 0 0 1 -18 0 Z" fill="#ffe7da" />
        <path d="M61 136 v6 M65 135 v7 M69 136 v6" stroke="#e7b9a6" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M151 136 v6 M155 135 v7 M159 136 v6" stroke="#e7b9a6" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      <path d="M34 66 c1.5 5.4 4.3 8.2 9.7 9.7 c-5.4 1.5 -8.2 4.3 -9.7 9.7 c-1.5 -5.4 -4.3 -8.2 -9.7 -9.7 c5.4 -1.5 8.2 -4.3 9.7 -9.7 Z" fill="var(--accent)" opacity="0.85" />
      <path d="M188 58 c1.2 4.2 3.4 6.4 7.6 7.6 c-4.2 1.2 -6.4 3.4 -7.6 7.6 c-1.2 -4.2 -3.4 -6.4 -7.6 -7.6 c4.2 -1.2 6.4 -3.4 7.6 -7.6 Z" fill="var(--primary)" opacity="0.8" />
      <circle cx="46" cy="106" r="2.4" fill="var(--primary)" opacity="0.6" />
      <circle cx="178" cy="102" r="2.6" fill="var(--accent)" opacity="0.6" />
    </svg>
  )
}

function StarEye({ cx, cy }: { cx: number; cy: number }) {
  const points = Array.from({ length: 5 }, (_, i) => {
    const outer = i / 5
    const inner = (i + 0.5) / 5
    const ao = outer * Math.PI * 2 - Math.PI / 2
    const ai = inner * Math.PI * 2 - Math.PI / 2
    const ox = cx + Math.cos(ao) * 12
    const oy = cy + Math.sin(ao) * 12
    const ix = cx + Math.cos(ai) * 5
    const iy = cy + Math.sin(ai) * 5
    return `${ox.toFixed(1)},${oy.toFixed(1)} ${ix.toFixed(1)},${iy.toFixed(1)}`
  }).join(' ')
  return (
    <>
      <ellipse cx={cx} cy={cy} rx="11" ry="13" fill="#2a2140" />
      <polygon points={points} fill="var(--primary)" />
      <circle cx={cx - 3} cy={cy - 4} r="2.2" fill="#ffffff" />
    </>
  )
}


export function KiraSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" role="presentation">
      <defs>
        <linearGradient id="kira-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <path
        d="M12 0 C13 7.5 16.5 11 24 12 C16.5 13 13 16.5 12 24 C11 16.5 7.5 13 0 12 C7.5 11 11 7.5 12 0 Z"
        fill="url(#kira-grad)"
      />
    </svg>
  )
}

type Petal = {
  left: string
  size: number
  fall: string
  spin: string
  delay: string
  sway: string
  opacity: number
  accent?: boolean
}

const PETALS: Petal[] = [
  { left: '4%', size: 12, fall: '9s', spin: '3.6s', delay: '0s', sway: '18px', opacity: 0.75 },
  { left: '12%', size: 8, fall: '12s', spin: '5s', delay: '1.4s', sway: '12px', opacity: 0.6, accent: true },
  { left: '21%', size: 14, fall: '8s', spin: '4.2s', delay: '3.1s', sway: '22px', opacity: 0.85 },
  { left: '30%', size: 9, fall: '11s', spin: '3.2s', delay: '0.6s', sway: '14px', opacity: 0.55 },
  { left: '39%', size: 11, fall: '10s', spin: '4.8s', delay: '2.3s', sway: '20px', opacity: 0.7, accent: true },
  { left: '48%', size: 7, fall: '13.5s', spin: '5.4s', delay: '4.2s', sway: '10px', opacity: 0.5 },
  { left: '56%', size: 13, fall: '8.5s', spin: '3.8s', delay: '1.1s', sway: '24px', opacity: 0.8 },
  { left: '64%', size: 9, fall: '11.5s', spin: '4.4s', delay: '3.6s', sway: '15px', opacity: 0.6, accent: true },
  { left: '72%', size: 10, fall: '9.5s', spin: '3.4s', delay: '0.3s', sway: '18px', opacity: 0.72 },
  { left: '80%', size: 8, fall: '12.5s', spin: '5.2s', delay: '2.8s', sway: '12px', opacity: 0.55 },
  { left: '88%', size: 12, fall: '8.8s', spin: '4s', delay: '1.8s', sway: '21px', opacity: 0.8, accent: true },
  { left: '95%', size: 9, fall: '10.5s', spin: '4.6s', delay: '3.9s', sway: '14px', opacity: 0.6 },
]


export function SakuraPetals({ className, count }: { className?: string; count?: number }) {
  const petals = typeof count === 'number' ? PETALS.slice(0, Math.max(0, count)) : PETALS
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden perspective-[600px]', className)}
      aria-hidden="true"
    >
      {petals.map((petal, index) => (
        <span
          key={index}
          className="anime-petal"
          style={
            {
              left: petal.left,
              '--petal-size': `${petal.size}px`,
              '--petal-opacity': petal.opacity,
              '--petal-fall': petal.fall,
              '--petal-spin': petal.spin,
              '--petal-delay': petal.delay,
              '--petal-sway': petal.sway,
              '--petal-color': petal.accent ? 'var(--accent)' : 'var(--primary)',
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
