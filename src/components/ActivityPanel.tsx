import React, { useState } from 'react'
import { supabase, DailySummary } from '@/lib/supabase'

interface ActivityPanelProps {
  summary: DailySummary | null
  date: string
  onUpdated: () => void
}

export default function ActivityPanel({ summary, date, onUpdated }: ActivityPanelProps) {
  const [steps, setSteps] = useState(summary?.steps?.toString() || '')
  const [saving, setSaving] = useState(false)

  async function toggleTraining() {
    setSaving(true)
    const newVal = !(summary?.trained ?? false)
    if (summary?.id) {
      await supabase.from('daily_summary').update({ trained: newVal, updated_at: new Date().toISOString() }).eq('id', summary.id)
    } else {
      await supabase.from('daily_summary').upsert({ date, trained: newVal, steps: 0 })
    }
    setSaving(false)
    onUpdated()
  }

  async function saveSteps() {
    const s = parseInt(steps) || 0
    setSaving(true)
    if (summary?.id) {
      await supabase.from('daily_summary').update({ steps: s, updated_at: new Date().toISOString() }).eq('id', summary.id)
    } else {
      await supabase.from('daily_summary').upsert({ date, trained: false, steps: s })
    }
    setSaving(false)
    onUpdated()
  }

  const trained = summary?.trained ?? false
  const currentSteps = summary?.steps ?? 0
  const stepCalories = Math.max(0, (currentSteps - 2000) * 0.04)
  const trainingCalories = trained ? 300 : 0
  const totalBonus = stepCalories + trainingCalories

  return (
    <div className="card" style={{ padding: '20px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', margin: '0 0 16px', color: 'var(--text-dark)' }}>
        Actividad del día
      </h3>

      {/* Training toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px',
        borderRadius: '12px',
        background: trained ? 'rgba(82, 126, 82, 0.1)' : 'var(--warm)',
        border: `1.5px solid ${trained ? 'var(--green-sage)' : 'var(--green-pale)'}`,
        marginBottom: '14px',
        transition: 'all 0.2s',
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: trained ? 'var(--green-dark)' : 'var(--text-mid)' }}>
            {trained ? '💪 ¡Entrenaste hoy!' : '🛋️ Sin entrenamiento'}
          </div>
          {trained && (
            <div style={{ fontSize: '12px', color: 'var(--green-sage)', marginTop: 2 }}>
              +300 kcal disponibles extra
            </div>
          )}
        </div>
        <button
          onClick={toggleTraining}
          disabled={saving}
          style={{
            width: 48, height: 26,
            borderRadius: 13,
            background: trained ? 'var(--green-sage)' : '#d1d5db',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 3, left: trained ? 26 : 4,
            width: 20, height: 20,
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Steps */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-mid)', display: 'block', marginBottom: '6px' }}>
          👟 Pasos del día
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="input-field"
            type="number"
            value={steps}
            onChange={e => setSteps(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveSteps()}
            placeholder="ej: 8500"
            min={0}
          />
          <button className="btn-primary" onClick={saveSteps} disabled={saving} style={{ minWidth: 80 }}>
            {saving ? '...' : 'Guardar'}
          </button>
        </div>
        {currentSteps > 2000 && (
          <p style={{ fontSize: '12px', color: 'var(--green-sage)', margin: '4px 0 0' }}>
            +{stepCalories.toFixed(0)} kcal por tus {currentSteps.toLocaleString()} pasos 🎉
          </p>
        )}
        {currentSteps > 0 && currentSteps <= 2000 && (
          <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '4px 0 0' }}>
            Con más de 2.000 pasos ganás calorías extra
          </p>
        )}
      </div>

      {/* Bonus summary */}
      {totalBonus > 0 && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(82, 126, 82, 0.08)',
          borderRadius: '10px',
          border: '1px solid var(--green-pale)',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--green-dark)', fontWeight: 600 }}>
            🔥 Total calorías extra: +{totalBonus.toFixed(0)} kcal
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: 2 }}>
            {trained ? `Entreno: +300  ` : ''}{stepCalories > 0 ? `Pasos: +${stepCalories.toFixed(0)}` : ''}
          </div>
        </div>
      )}
    </div>
  )
}
