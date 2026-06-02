import React, { useState } from 'react'
import { FoodLog, DailySummary } from '@/lib/supabase'

interface DayAnalysisProps {
  logs: FoodLog[]
  totals: { calories: number; protein: number; carbs: number; fat: number }
  summary: DailySummary | null
}

export default function DayAnalysis({ logs, totals, summary }: DayAnalysisProps) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function analyze() {
    if (logs.length === 0) return
    setLoading(true)
    setAnalysis('')
    try {
      const res = await fetch('/api/analyze-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs, totals, summary }),
      })
      const data = await res.json()
      setAnalysis(data.analysis || 'No se pudo generar el análisis.')
      setLoaded(true)
    } catch {
      setAnalysis('Error al generar el análisis.')
    } finally {
      setLoading(false)
    }
  }

  if (logs.length === 0) return null

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '14px'
      }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: '18px',
            margin: '0 0 2px', color: 'var(--text-dark)'
          }}>
            🔬 Análisis del día
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: 0 }}>
            Evaluación nutricional completa, no solo calorías
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={analyze}
          disabled={loading}
          style={{ fontSize: '13px', padding: '8px 14px', flexShrink: 0 }}
        >
          {loading
            ? <span className="loading-dots"><span /><span /><span /></span>
            : loaded ? '↻ Re-analizar' : '✦ Analizar'}
        </button>
      </div>

      {!analysis && !loading && (
        <div style={{
          textAlign: 'center', padding: '28px',
          background: 'var(--warm)', borderRadius: '12px',
          border: '1px dashed var(--green-pale)'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🧬</div>
          <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: 0, lineHeight: 1.5 }}>
            Cuando termines de cargar tus comidas del día,<br />
            analizá cómo cerraste nutricionalmente.
          </p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '28px' }}>
          <span className="loading-dots"><span /><span /><span /></span>
          <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: '10px 0 0' }}>
            Analizando tu día completo...
          </p>
        </div>
      )}

      {analysis && !loading && (
        <div className="fade-in" style={{
          fontSize: '14px', lineHeight: 1.75,
          color: 'var(--text-mid)',
        }}>
          {analysis.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) {
              return (
                <div key={i} style={{
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                  marginTop: i > 0 ? '16px' : 0,
                  marginBottom: '4px',
                  color: 'var(--green-dark)',
                }}>
                  {line.replace(/\*\*/g, '')}
                </div>
              )
            }
            if (line.includes('**')) {
              const parts = line.split(/\*\*/)
              return (
                <p key={i} style={{ margin: '4px 0' }}>
                  {parts.map((p, j) =>
                    j % 2 === 1
                      ? <strong key={j} style={{ color: 'var(--text-dark)' }}>{p}</strong>
                      : p
                  )}
                </p>
              )
            }
            if (line.trim() === '') return <div key={i} style={{ height: '6px' }} />
            return <p key={i} style={{ margin: '3px 0' }}>{line}</p>
          })}
        </div>
      )}
    </div>
  )
}
