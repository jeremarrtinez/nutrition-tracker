import React, { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase, FoodLog, DailySummary } from '@/lib/supabase'
import { DAILY_PLAN, ACTIVITY_CALORIES } from '@/lib/plan'
import MacroRing from '@/components/MacroRing'
import MacroBar from '@/components/MacroBar'
import FoodLogForm from '@/components/FoodLogForm'
import FoodLogList from '@/components/FoodLogList'
import ActivityPanel from '@/components/ActivityPanel'
import Recommendations from '@/components/Recommendations'
import ChatPanel from '@/components/ChatPanel'
import SummaryView from '@/components/SummaryView'
import DayAnalysis from '@/components/DayAnalysis'

type Tab = 'hoy' | 'resumen' | 'chat'

export default function Home() {
  const [tab, setTab] = useState<Tab>('hoy')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [logsRes, summaryRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('date', date).order('created_at'),
      supabase.from('daily_summary').select('*').eq('date', date).maybeSingle(),
    ])
    setLogs(logsRes.data || [])
    setSummary(summaryRes.data)
    setLoading(false)
  }, [date])

  useEffect(() => { loadData() }, [loadData])

  const totals = logs.reduce((acc, l) => ({
    calories: acc.calories + l.calories,
    protein: acc.protein + l.protein,
    carbs: acc.carbs + l.carbs,
    fat: acc.fat + l.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const activityBonus = (summary?.trained ? ACTIVITY_CALORIES.training : 0)
    + Math.max(0, ((summary?.steps || 0) - ACTIVITY_CALORIES.stepsBase) * ACTIVITY_CALORIES.caloriesPerStep)

  const effectiveCalTarget = DAILY_PLAN.calories + activityBonus

  const pctCalories = totals.calories / effectiveCalTarget

  const dateLabel = format(parseISO(date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })

  function changeDate(offset: number) {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    setDate(format(d, 'yyyy-MM-dd'))
  }

  const isToday = date === format(new Date(), 'yyyy-MM-dd')

  const dailyContext = {
  ...totals,
  trained: summary?.trained || false,
  steps: summary?.steps || 0,
  logs: logs,   // ← agregar esta línea
}

  return (
    <>
      <Head>
        <title>Tracker Nutricional</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
        {/* Header */}
        <header style={{
          background: 'var(--green-dark)',
          color: 'white',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>🌿</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Jere
              </span>
            </div>

            {/* Navigation */}
            <nav style={{ display: 'flex', gap: '4px' }}>
              {([
                { id: 'hoy', label: 'Hoy', emoji: '🍽️' },
                { id: 'resumen', label: 'Resumen', emoji: '📊' },
                { id: 'chat', label: 'Chat IA', emoji: '💬' },
              ] as { id: Tab; label: string; emoji: string }[]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: tab === t.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: tab === t.id ? 'white' : 'rgba(255,255,255,0.65)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span>{t.emoji}</span>
                  <span style={{ display: 'none' }} className="sm-show">{t.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>

          {/* Tab: Hoy */}
          {tab === 'hoy' && (
            <div>
              {/* Date navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button
                  onClick={() => changeDate(-1)}
                  style={{ background: 'none', border: '1.5px solid var(--green-pale)', borderRadius: '8px', width: 34, height: 34, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)', transition: 'all 0.15s' }}
                >
                  ‹
                </button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)', textTransform: 'capitalize' }}>
                    {isToday ? '🌟 Hoy, ' : ''}{dateLabel}
                  </div>
                </div>
                <button
                  onClick={() => changeDate(1)}
                  disabled={isToday}
                  style={{ background: 'none', border: '1.5px solid var(--green-pale)', borderRadius: '8px', width: 34, height: 34, cursor: isToday ? 'not-allowed' : 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isToday ? 'var(--green-pale)' : 'var(--text-mid)', transition: 'all 0.15s' }}
                >
                  ›
                </button>
              </div>

              {/* Daily overview card */}
              <div className="card fade-in" style={{ padding: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <MacroRing {...totals} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600 }}>
                        Plan diario
                      </span>
                      {activityBonus > 0 && (
                        <span style={{ fontSize: '12px', background: 'rgba(82,126,82,0.1)', color: 'var(--green-sage)', padding: '2px 8px', borderRadius: '10px', fontWeight: 500 }}>
                          +{activityBonus.toFixed(0)} kcal actividad
                        </span>
                      )}
                    </div>
                    <MacroBar label="Calorías" value={totals.calories} target={effectiveCalTarget} unit="kcal" colorClass="macro-cal" fillClass="fill-cal" />
                    <MacroBar label="Proteínas" value={totals.protein} target={DAILY_PLAN.protein} colorClass="macro-prot" fillClass="fill-prot" />
                    <MacroBar label="Carbohidratos" value={totals.carbs} target={DAILY_PLAN.carbs} colorClass="macro-carb" fillClass="fill-carb" />
                    <MacroBar label="Grasas" value={totals.fat} target={DAILY_PLAN.fat} colorClass="macro-fat" fillClass="fill-fat" />
                  </div>
                </div>

                {/* Progress status */}
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'var(--warm)', textAlign: 'center' }}>
                  {pctCalories < 0.3 && (
                    <span style={{ fontSize: '13px', color: 'var(--text-mid)' }}>
                      🌱 Empezando el día — ¡mucho por comer todavía!
                    </span>
                  )}
                  {pctCalories >= 0.3 && pctCalories < 0.7 && (
                    <span style={{ fontSize: '13px', color: 'var(--text-mid)' }}>
                      ⚡ Buen progreso — {(effectiveCalTarget - totals.calories).toFixed(0)} kcal disponibles
                    </span>
                  )}
                  {pctCalories >= 0.7 && pctCalories < 1 && (
                    <span style={{ fontSize: '13px', color: '#b07d1a' }}>
                      🎯 Casi al límite — quedan {(effectiveCalTarget - totals.calories).toFixed(0)} kcal
                    </span>
                  )}
                  {pctCalories >= 1 && (
                    <span style={{ fontSize: '13px', color: '#dc2626' }}>
                      ⚠️ Superaste las calorías del día en {(totals.calories - effectiveCalTarget).toFixed(0)} kcal
                    </span>
                  )}
                </div>
              </div>

              {/* Two-column layout for lg screens */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <ActivityPanel summary={summary} date={date} onUpdated={loadData} />
                <Recommendations logs={logs} summary={summary} totals={totals} />
              </div>

              {/* Food input */}
              <div style={{ marginBottom: '16px' }}>
                <FoodLogForm date={date} onAdded={loadData} />
              </div>

              {/* Food log list */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-light)' }}>
                  <span className="loading-dots"><span/><span/><span/></span>
                </div>
              ) : (
                <FoodLogList logs={logs} onDeleted={loadData} />
              )}

              {/* Análisis del día */}
              <div style={{ marginTop: '16px' }}>
                <DayAnalysis logs={logs} totals={totals} summary={summary} />
              </div>
            </div>
          )}

          {/* Tab: Resumen */}
          {tab === 'resumen' && <SummaryView />}

          {/* Tab: Chat */}
          {tab === 'chat' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', margin: 0, color: 'var(--text-dark)' }}>
                  Chat con tu asistente
                </h2>
                <p style={{ color: 'var(--text-light)', fontSize: '14px', margin: '4px 0 0' }}>
                  Recetas, dudas del plan, ideas para comer... preguntá lo que quieras.
                </p>
              </div>
              <ChatPanel date={date} dailyContext={dailyContext} />
            </div>
          )}

        </main>

        {/* Mobile nav */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'white',
          borderTop: '1px solid var(--green-pale)',
          display: 'flex',
          padding: '8px 0 12px',
          zIndex: 99,
        }} className="mobile-nav">
          {([
            { id: 'hoy', label: 'Hoy', emoji: '🍽️' },
            { id: 'resumen', label: 'Resumen', emoji: '📊' },
            { id: 'chat', label: 'Chat', emoji: '💬' },
          ] as { id: Tab; label: string; emoji: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                color: tab === t.id ? 'var(--green-dark)' : 'var(--text-light)',
              }}
            >
              <span style={{ fontSize: '22px' }}>{t.emoji}</span>
              <span style={{ fontSize: '10px', fontWeight: tab === t.id ? 600 : 400 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Footer spacer for mobile nav */}
        <div style={{ height: 70 }} />
      </div>

      <style>{`
        @media (min-width: 640px) {
          .mobile-nav { display: none !important; }
          .sm-show { display: inline !important; }
        }
        @media (max-width: 639px) {
          header nav { display: none !important; }
        }
      `}</style>
    </>
  )
}
