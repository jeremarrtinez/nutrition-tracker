import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QUICK_MEALS, QuickMeal } from '@/lib/quickmeals'

interface QuickMealButtonsProps {
  date: string
  onAdded: () => void
}

const MEAL_ORDER = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack']
const MEAL_LABELS: Record<string, string> = {
  desayuno: '🌅 Desayuno',
  almuerzo: '☀️ Almuerzo',
  merienda: '🍎 Merienda',
  cena: '🌙 Cena',
  snack: '🥜 Snack',
}

export default function QuickMealButtons({ date, onAdded }: QuickMealButtonsProps) {
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string[]>([])
  const [filter, setFilter] = useState<string>('todos')

  const grouped = QUICK_MEALS.reduce((acc, m) => {
    if (!acc[m.meal_type]) acc[m.meal_type] = []
    acc[m.meal_type].push(m)
    return acc
  }, {} as Record<string, QuickMeal[]>)

  const filtered = filter === 'todos'
    ? QUICK_MEALS
    : QUICK_MEALS.filter(m => m.meal_type === filter)

  async function add(meal: QuickMeal) {
    setSaving(meal.id)
    try {
      await supabase.from('food_logs').insert({
        date,
        meal_type: meal.meal_type,
        description: meal.description,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        raw_input: meal.name,
      })
      setSaved(prev => [...prev, meal.id])
      setTimeout(() => setSaved(prev => prev.filter(id => id !== meal.id)), 2000)
      onAdded()
    } catch (e) {
      console.error('Error saving quick meal:', e)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: 0, color: 'var(--text-dark)' }}>
          ⚡ Acceso rápido
        </h3>
        <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
          Tocá para agregar al día
        </span>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['todos', ...MEAL_ORDER.filter(m => grouped[m])].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: 'none',
              background: filter === f ? 'var(--green-dark)' : 'var(--warm)',
              color: filter === f ? 'white' : 'var(--text-mid)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'all 0.15s',
            }}
          >
            {f === 'todos' ? 'Todos' : MEAL_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Meal buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(meal => {
          const isSaving = saving === meal.id
          const isSaved = saved.includes(meal.id)
          return (
            <button
              key={meal.id}
              onClick={() => add(meal)}
              disabled={!!saving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 10, border: '1.5px solid',
                borderColor: isSaved ? 'var(--green-sage)' : 'var(--green-pale)',
                background: isSaved ? 'rgba(82,126,82,0.06)' : 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', width: '100%',
                fontFamily: 'var(--font-body)',
                opacity: saving && !isSaving ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{meal.emoji}</span>
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>
                    {meal.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meal.description}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 10 }}>
                {/* Macros */}
                <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  <span style={{ color: 'var(--terracotta)', fontWeight: 600 }}>{meal.calories} kcal</span>
                  <span style={{ color: '#1d6fa8' }}>P{meal.protein}</span>
                  <span style={{ color: '#b07d1a' }}>C{meal.carbs}</span>
                  <span style={{ color: 'var(--green-sage)' }}>G{meal.fat}</span>
                </div>

                {/* Action */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: isSaved ? 'var(--green-sage)' : 'var(--green-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 14, transition: 'all 0.2s',
                }}>
                  {isSaving ? '…' : isSaved ? '✓' : '+'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
