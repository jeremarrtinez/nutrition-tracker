import React from 'react'
import { FoodLog, supabase } from '@/lib/supabase'

const MEAL_CONFIG: Record<string, { label: string; emoji: string; bg: string; color: string }> = {
  desayuno: { label: 'Desayuno', emoji: '🌅', bg: '#fef3c7', color: '#92400e' },
  almuerzo: { label: 'Almuerzo', emoji: '☀️', bg: '#d1fae5', color: '#065f46' },
  merienda: { label: 'Merienda', emoji: '🍎', bg: '#ede9fe', color: '#5b21b6' },
  cena:     { label: 'Cena',     emoji: '🌙', bg: '#e0e7ff', color: '#3730a3' },
  snack:    { label: 'Snack',    emoji: '🥜', bg: '#fce7f3', color: '#9d174d' },
}

interface FoodLogListProps {
  logs: FoodLog[]
  onDeleted: () => void
}

export default function FoodLogList({ logs, onDeleted }: FoodLogListProps) {
  if (logs.length === 0) {
    return (
      <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🍽️</div>
        <p style={{ color: 'var(--text-light)', fontSize: '14px', margin: 0 }}>
          Todavía no registraste nada hoy. ¡Empezá cargando tu desayuno!
        </p>
      </div>
    )
  }

  // Group by meal type
  const grouped = logs.reduce((acc, log) => {
    if (!acc[log.meal_type]) acc[log.meal_type] = []
    acc[log.meal_type].push(log)
    return acc
  }, {} as Record<string, FoodLog[]>)

  const order = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack']

  async function deleteLog(id: string) {
    if (!confirm('¿Eliminás este registro?')) return
    await supabase.from('food_logs').delete().eq('id', id)
    onDeleted()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {order.filter(m => grouped[m]).map(mealType => {
        const cfg = MEAL_CONFIG[mealType]
        const items = grouped[mealType]
        const total = items.reduce((acc, i) => ({
          calories: acc.calories + i.calories,
          protein: acc.protein + i.protein,
          carbs: acc.carbs + i.carbs,
          fat: acc.fat + i.fat,
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

        return (
          <div key={mealType} className="card fade-in" style={{ overflow: 'hidden' }}>
            {/* Meal header */}
            <div style={{
              padding: '12px 16px',
              background: cfg.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600, color: cfg.color, fontSize: '14px' }}>
                {cfg.emoji} {cfg.label}
              </span>
              <span style={{ fontSize: '12px', color: cfg.color, opacity: 0.8 }}>
                {Math.round(total.calories)} kcal · P: {total.protein.toFixed(1)}g · C: {total.carbs.toFixed(1)}g · G: {total.fat.toFixed(1)}g
              </span>
            </div>

            {/* Items */}
            <div style={{ padding: '8px 0' }}>
              {items.map(log => (
                <div key={log.id} style={{
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--warm)',
                  gap: '12px',
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-dark)', fontWeight: 500 }}>
                      {log.description}
                    </p>
                    {log.raw_input && log.raw_input !== log.description && (
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-light)', fontStyle: 'italic' }}>
                        "{log.raw_input}"
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--terracotta)' }}>
                        {Math.round(log.calories)} kcal
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                        P{log.protein.toFixed(0)} C{log.carbs.toFixed(0)} G{log.fat.toFixed(0)}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteLog(log.id!)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#fca5a5', fontSize: '16px', padding: '4px',
                        borderRadius: '6px', transition: 'color 0.15s',
                      }}
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
