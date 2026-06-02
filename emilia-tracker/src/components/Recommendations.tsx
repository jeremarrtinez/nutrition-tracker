import React, { useState } from 'react'
import { FoodLog, DailySummary } from '@/lib/supabase'

interface RecommendationsProps {
  logs: FoodLog[]
  summary: DailySummary | null
  totals: { calories: number; protein: number; carbs: number; fat: number }
}

export default function Recommendations({ logs, summary, totals }: RecommendationsProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    setText('')
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumed: { ...totals, logs },
          trained: summary?.trained ?? false,
          steps: summary?.steps ?? 0,
        }),
      })
      const data = await res.json()
      setText(data.recommendations || 'No se pudieron obtener recomendaciones.')
    } catch {
      setText('Error al cargar recomendaciones.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', margin: 0, color: 'var(--text-dark)' }}>
          ✨ ¿Qué más podés comer?
        </h3>
        <button className="btn-primary" onClick={load} disabled={loading} style={{ fontSize: '13px', padding: '8px 14px' }}>
          {loading ? <span className="loading-dots"><span/><span/><span/></span> : '↻ Actualizar'}
        </button>
      </div>

      {!text && !loading && (
        <div style={{
          textAlign: 'center', padding: '24px',
          background: 'var(--warm)', borderRadius: '12px',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🥗</div>
          <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: 0 }}>
            Hacé click en "Actualizar" para obtener recomendaciones personalizadas según lo que ya comiste hoy.
          </p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <span className="loading-dots"><span/><span/><span/></span>
          <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: '8px 0 0' }}>
            Analizando tu día...
          </p>
        </div>
      )}

      {text && (
        <div
          className="fade-in"
          style={{
            fontSize: '14px',
            lineHeight: 1.7,
            color: 'var(--text-mid)',
            whiteSpace: 'pre-wrap',
            background: 'var(--warm)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid var(--green-pale)',
          }}
        >
          {text}
        </div>
      )}
    </div>
  )
}
