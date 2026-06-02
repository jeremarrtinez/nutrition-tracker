import React from 'react'
import { DAILY_PLAN } from '@/lib/plan'

interface MacroRingProps {
  calories: number
  protein: number
  carbs: number
  fat: number
  size?: number
}

export default function MacroRing({ calories, protein, carbs, fat, size = 140 }: MacroRingProps) {
  const pct = Math.min(calories / DAILY_PLAN.calories, 1)
  const r = 52
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const dash = pct * circumference
  const gap = circumference - dash

  const color = pct > 1 ? '#ef4444' : pct > 0.85 ? '#f59e0b' : '#527e52'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#c8d9c8" strokeWidth="10" />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        lineHeight: 1.2
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: size < 120 ? '20px' : '26px',
          fontWeight: 700,
          color: color
        }}>
          {Math.round(calories)}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 500 }}>kcal</span>
        <span style={{ fontSize: '10px', color: 'var(--green-light)', marginTop: 2 }}>
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  )
}
