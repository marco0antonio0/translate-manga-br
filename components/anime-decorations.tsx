'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type MascotVariant = 'reader' | 'wink' | 'star'

/**
 * Mascote anime (estilo chibi / neko kawaii) desenhado em SVG.
 * Usa as cores da marca (rosa --primary + roxo --accent) no cabelo.
 * `variant` muda a expressão para dar variedade de "figuras". Decorativo.
 */
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

      {/* Brilho de fundo */}
      <ellipse cx="75" cy="70" rx="74" ry="74" fill="url(#anime-glow)" />

      {/* Orelhas de gato */}
      <path d="M40 44 L30 8 L66 34 Z" fill="url(#anime-hair)" />
      <path d="M110 44 L120 8 L84 34 Z" fill="url(#anime-hair)" />
      <path d="M44 40 L39 19 L58 33 Z" fill="#ffd9e6" />
      <path d="M106 40 L111 19 L92 33 Z" fill="#ffd9e6" />

      {/* Cabelo (atrás do rosto) */}
      <ellipse cx="75" cy="64" rx="42" ry="40" fill="url(#anime-hair)" />

      {/* Rosto */}
      <ellipse cx="75" cy="68" rx="35" ry="33" fill="#ffe7da" />

      {/* Franja (bangs) sobre a testa */}
      <path
        d="M40 60 C40 30 110 30 110 60 C104 50 96 56 92 46 C88 58 80 50 75 60 C70 50 62 58 58 46 C54 56 46 50 40 60 Z"
        fill="url(#anime-hair)"
      />
      {/* Mechas laterais */}
      <path d="M40 58 C34 74 36 92 44 100 C40 84 42 70 48 62 Z" fill="url(#anime-hair)" />
      <path d="M110 58 C116 74 114 92 106 100 C110 84 108 70 102 62 Z" fill="url(#anime-hair)" />

      {/* Sobrancelhas */}
      <path d="M50 62 q8 -4 16 0" stroke="#b96" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M84 62 q8 -4 16 0" stroke="#b96" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* ===== Olhos por expressão ===== */}
      {variant === 'star' ? (
        <>
          <StarEye cx={58} cy={76} />
          <StarEye cx={92} cy={76} />
        </>
      ) : variant === 'wink' ? (
        <>
          {/* Olho esquerdo aberto */}
          <ellipse cx="58" cy="76" rx="10" ry="13" fill="#2a2140" />
          <ellipse cx="58" cy="78" rx="7" ry="9" fill="var(--primary)" />
          <circle cx="54" cy="72" r="3.4" fill="#ffffff" />
          <circle cx="61" cy="81" r="1.8" fill="#ffffff" opacity="0.85" />
          {/* Olho direito piscando */}
          <path d="M83 80 q9 -9 18 0" stroke="#2a2140" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          {/* Reader: dois olhos grandes brilhantes */}
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

      {/* Bochechas coradas */}
      <ellipse cx="44" cy="86" rx="7" ry="4.5" fill="var(--primary)" opacity="0.45" />
      <ellipse cx="106" cy="86" rx="7" ry="4.5" fill="var(--primary)" opacity="0.45" />

      {/* ===== Boca por expressão ===== */}
      {variant === 'reader' ? (
        <path d="M68 90 q3.5 4 7 0 q3.5 4 7 0" stroke="#c46" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : (
        // Sorriso aberto (animado/empolgado) para wink e star
        <path d="M67 89 q8 9 16 0 Z" fill="#c2456a" stroke="#c2456a" strokeWidth="2" strokeLinejoin="round" />
      )}

      {/* ===== Acessório ===== */}
      {variant === 'reader' ? (
        // Livro aberto (leitora de mangá)
        <g>
          <path d="M75 118 L48 112 C44 111 42 113 42 116 L42 138 C42 141 44 142 48 143 L75 149 Z" fill="#fdfdfd" />
          <path d="M75 118 L102 112 C106 111 108 113 108 116 L108 138 C108 141 106 142 102 143 L75 149 Z" fill="#eef0f7" />
          <path d="M75 118 L75 149" stroke="var(--accent)" strokeWidth="2.5" />
          <path d="M52 121 L68 124 M52 127 L68 130 M52 133 L66 136" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
          <path d="M98 121 L82 124 M98 127 L82 130 M98 133 L84 136" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        </g>
      ) : variant === 'wink' ? (
        // Mãozinha fazendo "joinha"/aceno
        <g>
          <circle cx="108" cy="112" r="11" fill="#ffe7da" />
          <path d="M104 108 v-9 a3 3 0 0 1 6 0 v8" fill="#ffe7da" stroke="#e7b9a6" strokeWidth="1.5" />
        </g>
      ) : null}
    </svg>
  )
}

function StarEye({ cx, cy }: { cx: number; cy: number }) {
  // Estrela de 5 pontas centrada em (cx, cy)
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

/**
 * Estrelinha "kira-kira" de 4 pontas. Use com .anime-twinkle para cintilar.
 */
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
  fall: string // duração da queda (vertical)
  spin: string // duração do balanço/giro 3D
  delay: string
  sway: string // amplitude lateral
  opacity: number
  accent?: boolean // pétala em tom de destaque (roxo) p/ variar
}

// Configuração determinística (evita mismatch de hidratação no Next).
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

/**
 * Pétalas de sakura caindo. Posicionar dentro de um container
 * `relative overflow-hidden`. Decorativo / pointer-events-none.
 *
 * @param count limita a quantidade de pétalas (padrão: todas).
 */
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
