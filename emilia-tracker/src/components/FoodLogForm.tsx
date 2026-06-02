import React, { useState } from 'react'
import { supabase, FoodLog } from '@/lib/supabase'
import { format } from 'date-fns'

const MEAL_TYPES = [
  { value: 'desayuno', label: 'Desayuno', emoji: '🌅' },
  { value: 'almuerzo', label: 'Almuerzo', emoji: '☀️' },
  { value: 'merienda', label: 'Merienda', emoji: '🍎' },
  { value: 'cena', label: 'Cena', emoji: '🌙' },
  { value: 'snack', label: 'Snack', emoji: '🥜' },
]

interface FoodLogFormProps {
  onAdded: () => void
  date: string
}

export default function FoodLogForm({ onAdded, date }: FoodLogFormProps) {
  const [mealType, setMealType] = useState<FoodLog['meal_type']>('desayuno')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<null | { calories: number; protein: number; carbs: number; fat: number; description: string }>(null)

  async function analyze() {
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodDescription: input, mealType }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPreview(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al analizar')
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!preview) return
    setLoading(true)
    try {
      await supabase.from('food_logs').insert({
        date,
        meal_type: mealType,
        description: preview.description,
        calories: preview.calories,
        protein: preview.protein,
        carbs: preview.carbs,
        fat: preview.fat,
        raw_input: input,
      })
      setInput('')
      setPreview(null)
      onAdded()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', margin: '0 0 16px', color: 'var(--text-dark)' }}>
        ¿Qué comiste?
      </h3>

      {/* Meal type selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {MEAL_TYPES.map(m => (
          <button
            key={m.value}
            onClick={() => setMealType(m.value as FoodLog['meal_type'])}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: mealType === m.value ? '2px solid var(--green-dark)' : '1.5px solid var(--green-pale)',
              background: mealType === m.value ? 'var(--green-dark)' : 'white',
              color: mealType === m.value ? 'white' : 'var(--text-mid)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.15s',
            }}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          className="input-field"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyze()}
          placeholder="ej: 2 huevos revueltos con tostada integral y café con leche"
          disabled={loading}
        />
        <button
          className="btn-primary"
          onClick={analyze}
          disabled={loading || !input.trim()}
          style={{ whiteSpace: 'nowrap', minWidth: 90 }}
        >
          {loading ? (
            <span className="loading-dots"><span/><span/><span/></span>
          ) : '✦ Analizar'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: '8px', fontSize: '13px', color: '#dc2626', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="fade-in" style={{
          background: 'var(--warm)',
          borderRadius: '12px',
          padding: '14px',
          border: '1px solid var(--green-pale)',
        }}>
          <p style={{ fontSize: '14px', color: 'var(--text-mid)', margin: '0 0 10px', fontWeight: 500 }}>
            📝 {preview.description}
          </p>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <Macro label="Calorías" value={preview.calories} unit="kcal" color="var(--terracotta)" />
            <Macro label="Proteínas" value={preview.protein} unit="g" color="#1d6fa8" />
            <Macro label="Carbos" value={preview.carbs} unit="g" color="#b07d1a" />
            <Macro label="Grasas" value={preview.fat} unit="g" color="var(--green-sage)" />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={save} disabled={loading} style={{ flex: 1 }}>
              {loading ? '...' : '✓ Guardar'}
            </button>
            <button className="btn-secondary" onClick={() => setPreview(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Macro({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '18px', fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>
        {unit === 'kcal' ? Math.round(value) : value.toFixed(1)}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{label} {unit !== 'kcal' ? `(${unit})` : ''}</div>
    </div>
  )
}
