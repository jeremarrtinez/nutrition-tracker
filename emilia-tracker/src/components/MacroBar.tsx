import React from 'react'

interface MacroBarProps {
  label: string
  value: number
  target: number
  unit?: string
  colorClass: string
  fillClass: string
}

export default function MacroBar({ label, value, target, unit = 'g', colorClass, fillClass }: MacroBarProps) {
  const pct = Math.min((value / target) * 100, 100)
  const over = value > target

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-mid)' }}>{label}</span>
        <span style={{ fontSize: 12, color: over ? '#ef4444' : 'var(--text-light)' }}>
          <strong className={colorClass}>{value.toFixed(1)}</strong>
          <span style={{ color: 'var(--green-pale)' }}> / </span>
          {target}{unit}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${fillClass}`}
          style={{ width: `${pct}%`, background: over ? '#ef4444' : undefined }}
        />
      </div>
      <div style={{ fontSize: 11, color: over ? '#ef4444' : 'var(--green-light)', marginTop: 3, textAlign: 'right' }}>
        {over
          ? `+${(value - target).toFixed(1)}${unit} sobre el límite`
          : `${(target - value).toFixed(1)}${unit} disponibles`
        }
      </div>
    </div>
  )
}
