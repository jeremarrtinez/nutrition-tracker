import React, { useEffect, useState } from 'react'
import { supabase, FoodLog } from '@/lib/supabase'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, parseISO, subWeeks, addWeeks, subMonths, addMonths
} from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { DAILY_PLAN } from '@/lib/plan'

interface DayData {
  date: string
  label: string
  calories: number
  protein: number
  carbs: number
  fat: number
  trained: boolean
  steps: number
  hasData: boolean
}

type Period = 'week' | 'month'
type View = 'dias' | 'semanas'

const MEAL_CONFIG: Record<string, { label: string; emoji: string; bg: string; color: string }> = {
  desayuno: { label: 'Desayuno', emoji: '🌅', bg: '#fef3c7', color: '#92400e' },
  almuerzo: { label: 'Almuerzo', emoji: '☀️',  bg: '#d1fae5', color: '#065f46' },
  merienda: { label: 'Merienda', emoji: '🍎', bg: '#ede9fe', color: '#5b21b6' },
  cena:     { label: 'Cena',     emoji: '🌙', bg: '#e0e7ff', color: '#3730a3' },
  snack:    { label: 'Snack',    emoji: '🥜', bg: '#fce7f3', color: '#9d174d' },
}

export default function SummaryView() {
  const [period, setPeriod] = useState<Period>('week')
  const [view, setView] = useState<View>('dias')
  const [data, setData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [dayLogs, setDayLogs] = useState<FoodLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [referenceDate, setReferenceDate] = useState(new Date())

  useEffect(() => { loadData() }, [period, referenceDate])

  async function loadData() {
    setLoading(true)
    setSelectedDay(null)
    setDayLogs([])

    const from = period === 'week'
      ? format(startOfWeek(referenceDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(startOfMonth(referenceDate), 'yyyy-MM-dd')
    const to = period === 'week'
      ? format(endOfWeek(referenceDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(endOfMonth(referenceDate), 'yyyy-MM-dd')

    const [logsRes, summaryRes] = await Promise.all([
      supabase.from('food_logs').select('*').gte('date', from).lte('date', to),
      supabase.from('daily_summary').select('*').gte('date', from).lte('date', to),
    ])

    const logs: FoodLog[] = logsRes.data || []
    const summaries: { date: string; trained: boolean; steps: number }[] = summaryRes.data || []

    const byDate: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {}
    logs.forEach(l => {
      if (!byDate[l.date]) byDate[l.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 }
      byDate[l.date].calories += l.calories
      byDate[l.date].protein += l.protein
      byDate[l.date].carbs += l.carbs
      byDate[l.date].fat += l.fat
    })

    const days = eachDayOfInterval({
      start: parseISO(from + 'T12:00:00'),
      end: parseISO(to + 'T12:00:00'),
    })

    const result: DayData[] = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const s = summaries.find(x => x.date === dateStr)
      const fd = byDate[dateStr]
      return {
        date: dateStr,
        label: format(day, period === 'week' ? 'EEE d' : 'dd/MM', { locale: es }),
        calories: fd?.calories || 0,
        protein: fd?.protein || 0,
        carbs: fd?.carbs || 0,
        fat: fd?.fat || 0,
        trained: s?.trained || false,
        steps: s?.steps || 0,
        hasData: !!(fd || s),
      }
    })

    setData(result)
    setLoading(false)
  }

  async function openDay(day: DayData) {
    setSelectedDay(day)
    setDayLogs([])
    if (!day.hasData) return
    setLoadingLogs(true)
    const { data } = await supabase
      .from('food_logs').select('*').eq('date', day.date).order('created_at')
    setDayLogs(data || [])
    setLoadingLogs(false)
  }

  function navigate(dir: 1 | -1) {
    setReferenceDate(prev =>
      period === 'week'
        ? dir === -1 ? subWeeks(prev, 1) : addWeeks(prev, 1)
        : dir === -1 ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const isCurrentPeriod = (() => {
    const now = new Date()
    if (period === 'week') {
      return format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') ===
             format(startOfWeek(referenceDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    }
    return format(now, 'yyyy-MM') === format(referenceDate, 'yyyy-MM')
  })()

  const periodLabel = period === 'week'
    ? `${format(startOfWeek(referenceDate, { weekStartsOn: 1 }), "d 'de' MMM", { locale: es })} — ${format(endOfWeek(referenceDate, { weekStartsOn: 1 }), "d 'de' MMM", { locale: es })}`
    : format(referenceDate, "MMMM yyyy", { locale: es })

  const weeklyData = (() => {
    if (period !== 'month') return []
    const weeks: Record<string, DayData[]> = {}
    data.forEach(d => {
      const wk = format(startOfWeek(parseISO(d.date + 'T12:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      if (!weeks[wk]) weeks[wk] = []
      weeks[wk].push(d)
    })
    return Object.entries(weeks).map(([, days], i) => {
      const withData = days.filter(d => d.hasData)
      const n = Math.max(withData.length, 1)
      return {
        label: `Sem ${i + 1}`,
        calories: days.reduce((a, d) => a + d.calories, 0) / n,
        protein:  days.reduce((a, d) => a + d.protein, 0) / n,
        carbs:    days.reduce((a, d) => a + d.carbs, 0) / n,
        fat:      days.reduce((a, d) => a + d.fat, 0) / n,
        trainings: days.filter(d => d.trained).length,
        totalSteps: days.reduce((a, d) => a + d.steps, 0),
        days: days.length,
        daysWithData: withData.length,
      }
    })
  })()

  const chartData = view === 'semanas' && period === 'month' ? weeklyData : data
  const daysWithData = data.filter(d => d.hasData)
  const totals = daysWithData.reduce((acc, d) => ({
    calories: acc.calories + d.calories,
    protein:  acc.protein  + d.protein,
    carbs:    acc.carbs    + d.carbs,
    fat:      acc.fat      + d.fat,
    trainings: acc.trainings + (d.trained ? 1 : 0),
    steps:    acc.steps    + d.steps,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, trainings: 0, steps: 0 })

  const avgCal  = daysWithData.length > 0 ? totals.calories / daysWithData.length : 0
  const avgProt = daysWithData.length > 0 ? totals.protein  / daysWithData.length : 0

  // Macro filter toggles
  const [showCal,  setShowCal]  = useState(true)
  const [showProt, setShowProt] = useState(true)
  const [showCarb, setShowCarb] = useState(true)
  const [showFat,  setShowFat]  = useState(true)

  const MacroToggle = ({ label, active, color, bg, onClick }: {
    label: string; active: boolean; color: string; bg: string; onClick: () => void
  }) => (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${active ? color : 'var(--green-pale)'}`,
      background: active ? bg : 'white', color: active ? color : 'var(--text-light)',
      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
      transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: active ? color : 'var(--green-pale)',
        display: 'inline-block', flexShrink: 0,
      }} />
      {label}
    </button>
  )

  const StatCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) => (
    <div className="card" style={{ padding: '14px', textAlign: 'center', flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: '10px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: 3 }}>{sub}</div>}
    </div>
  )

  // ── Day detail modal ──────────────────────────────────────────
  const DayDetail = () => {
    if (!selectedDay) return null
    const grouped = dayLogs.reduce((acc, l) => {
      if (!acc[l.meal_type]) acc[l.meal_type] = []
      acc[l.meal_type].push(l)
      return acc
    }, {} as Record<string, FoodLog[]>)
    const order = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack']

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)', display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center',
      }} onClick={() => setSelectedDay(null)}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--cream)', borderRadius: '20px 20px 0 0',
          width: '100%', maxWidth: 640, maxHeight: '85vh',
          overflowY: 'auto', padding: '24px 20px 32px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, textTransform: 'capitalize' }}>
                {format(parseISO(selectedDay.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
              </div>
              {selectedDay.trained && <div style={{ fontSize: '12px', color: 'var(--green-sage)', marginTop: 2 }}>💪 Entrenó · {selectedDay.steps > 0 ? `${selectedDay.steps.toLocaleString()} pasos` : ''}</div>}
            </div>
            <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--text-light)' }}>×</button>
          </div>

          {/* Macro summary */}
          {selectedDay.hasData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { l: 'Kcal',  v: Math.round(selectedDay.calories),       t: DAILY_PLAN.calories,  c: 'var(--terracotta)', u: '' },
                { l: 'Prot',  v: selectedDay.protein.toFixed(1),          t: DAILY_PLAN.protein,   c: '#1d6fa8',           u: 'g' },
                { l: 'Carbs', v: selectedDay.carbs.toFixed(1),            t: DAILY_PLAN.carbs,     c: '#b07d1a',           u: 'g' },
                { l: 'Grasas',v: selectedDay.fat.toFixed(1),              t: DAILY_PLAN.fat,       c: 'var(--green-sage)', u: 'g' },
              ].map(m => (
                <div key={m.l} style={{ background: 'white', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid var(--green-pale)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-light)', marginBottom: 3 }}>{m.l}</div>
                  <div style={{ fontWeight: 700, color: m.c, fontSize: 15 }}>{m.v}{m.u}</div>
                  <div style={{ fontSize: 10, color: 'var(--green-light)' }}>/{m.t}{m.u}</div>
                </div>
              ))}
            </div>
          )}

          {/* Logs */}
          {loadingLogs ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <span className="loading-dots"><span/><span/><span/></span>
            </div>
          ) : !selectedDay.hasData ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-light)', fontSize: 14 }}>
              Sin registros este día.
            </div>
          ) : dayLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-light)', fontSize: 14 }}>
              No hay comidas registradas.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {order.filter(m => grouped[m]).map(mealType => {
                const cfg = MEAL_CONFIG[mealType]
                const items = grouped[mealType]
                const mTotal = items.reduce((a, i) => ({ cal: a.cal + i.calories, prot: a.prot + i.protein }), { cal: 0, prot: 0 })
                return (
                  <div key={mealType} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--green-pale)' }}>
                    <div style={{ padding: '10px 14px', background: cfg.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: cfg.color, fontSize: 13 }}>{cfg.emoji} {cfg.label}</span>
                      <span style={{ fontSize: 11, color: cfg.color, opacity: 0.8 }}>{Math.round(mTotal.cal)} kcal · P: {mTotal.prot.toFixed(1)}g</span>
                    </div>
                    {items.map(log => (
                      <div key={log.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--warm)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dark)' }}>{log.description}</div>
                          {log.raw_input && log.raw_input !== log.description && (
                            <div style={{ fontSize: 11, color: 'var(--text-light)', fontStyle: 'italic' }}>"{log.raw_input}"</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--terracotta)' }}>{Math.round(log.calories)} kcal</div>
                          <div style={{ fontSize: 11, color: 'var(--text-light)' }}>P{log.protein.toFixed(0)} C{log.carbs.toFixed(0)} G{log.fat.toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Period tabs + navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`nav-tab ${period === 'week' ? 'active' : ''}`} onClick={() => { setPeriod('week'); setView('dias') }}>
            📅 Semana
          </button>
          <button className={`nav-tab ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>
            🗓️ Mes
          </button>
        </div>
        {period === 'month' && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={`nav-tab ${view === 'dias' ? 'active' : ''}`} onClick={() => setView('dias')}>Por día</button>
            <button className={`nav-tab ${view === 'semanas' ? 'active' : ''}`} onClick={() => setView('semanas')}>Por semana</button>
          </div>
        )}
      </div>

      {/* Period navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'white', border: '1.5px solid var(--green-pale)', borderRadius: 8,
          width: 34, height: 34, cursor: 'pointer', fontSize: 18, display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)',
        }}>‹</button>
        <div style={{
          flex: 1, textAlign: 'center', fontFamily: 'var(--font-display)',
          fontSize: 16, fontWeight: 600, color: 'var(--text-dark)', textTransform: 'capitalize',
        }}>
          {isCurrentPeriod ? '🌟 ' : ''}{periodLabel}
        </div>
        <button onClick={() => navigate(1)} disabled={isCurrentPeriod} style={{
          background: 'white', border: '1.5px solid var(--green-pale)', borderRadius: 8,
          width: 34, height: 34, cursor: isCurrentPeriod ? 'not-allowed' : 'pointer',
          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isCurrentPeriod ? 'var(--green-pale)' : 'var(--text-mid)',
        }}>›</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-light)' }}>
          <span className="loading-dots"><span/><span/><span/></span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <StatCard label="Kcal prom/día" value={Math.round(avgCal).toString()} sub={`meta: ${DAILY_PLAN.calories}`} color="var(--terracotta)" />
            <StatCard label="Prot prom/día" value={`${Math.round(avgProt)}g`} sub={`meta: ${DAILY_PLAN.protein}g`} color="#1d6fa8" />
            <StatCard label="Días reg." value={daysWithData.length.toString()} sub={`de ${data.length}`} color="var(--green-sage)" />
            <StatCard label="Entrenos" value={totals.trainings.toString()} color="var(--green-dark)" />
            <StatCard label="Pasos" value={(totals.steps / 1000).toFixed(1) + 'k'} color="#7c3aed" />
          </div>

          {/* Calories chart */}
          <div className="card" style={{ padding: '20px', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: '0 0 4px', color: 'var(--text-dark)' }}>
              Calorías {view === 'semanas' ? '(promedio por semana)' : 'por día'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '0 0 14px' }}>
              {period === 'week' ? 'Tocá una barra para ver el detalle del día 👇' : 'Línea verde = meta diaria'}
            </p>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={chartData}
                margin={{ top: 16, right: 4, left: -20, bottom: 4 }}
                onClick={e => {
                  if (view === 'dias' && e?.activePayload) {
                    const d = data.find(x => x.label === e.activePayload![0].payload.label)
                    if (d) openDay(d)
                  }
                }}
                style={{ cursor: view === 'dias' ? 'pointer' : 'default' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--green-pale)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, Math.max(DAILY_PLAN.calories * 1.3, 100)]} />
                <Tooltip
                  contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 8 }}
                  formatter={(v: number) => [`${Math.round(v)} kcal`, 'Calorías']}
                />
                <ReferenceLine y={DAILY_PLAN.calories} stroke="var(--green-sage)" strokeDasharray="6 3" strokeWidth={2} />
                <Bar dataKey="calories" fill="var(--terracotta)" radius={[4, 4, 0, 0]}
                  label={{ position: 'top', fontSize: 10, formatter: (v: number) => v > 0 ? Math.round(v) : '' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Macros chart with filters */}
          <div className="card" style={{ padding: '20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: 0, color: 'var(--text-dark)' }}>
                Macronutrientes {view === 'semanas' ? '(promedio/semana)' : 'por día'}
              </h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <MacroToggle label="Calorías" active={showCal}  color="var(--terracotta)" bg="#fee2e2" onClick={() => setShowCal(p => !p)} />
                <MacroToggle label="Proteínas" active={showProt} color="#1d6fa8"           bg="#dbeafe" onClick={() => setShowProt(p => !p)} />
                <MacroToggle label="Carbos"    active={showCarb} color="#b07d1a"           bg="#fef9c3" onClick={() => setShowCarb(p => !p)} />
                <MacroToggle label="Grasas"    active={showFat}  color="var(--green-sage)" bg="#d1fae5" onClick={() => setShowFat(p => !p)} />
              </div>
            </div>

            {!showCal && !showProt && !showCarb && !showFat ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-light)', fontSize: 13 }}>
                Seleccioná al menos un macro para ver el gráfico
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={chartData} margin={{ top: 16, right: 4, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--green-pale)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 8 }}
                    formatter={(v: number, n: string) => [
                      n === 'Calorías' ? `${Math.round(v)} kcal` : `${v.toFixed(1)}g`, n
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {showCal  && <Bar dataKey="calories" name="Calorías"  fill="var(--terracotta)" radius={[2,2,0,0]} label={{ position: 'top', fontSize: 9, formatter: (v: number) => v > 0 ? Math.round(v) : '' }} />}
                  {showProt && <Bar dataKey="protein"  name="Proteínas" fill="#1d6fa8"            radius={[2,2,0,0]} label={{ position: 'top', fontSize: 9, formatter: (v: number) => v > 0 ? `${v.toFixed(0)}g` : '' }} />}
                  {showCarb && <Bar dataKey="carbs"    name="Carbos"    fill="#f59e0b"            radius={[2,2,0,0]} label={{ position: 'top', fontSize: 9, formatter: (v: number) => v > 0 ? `${v.toFixed(0)}g` : '' }} />}
                  {showFat  && <Bar dataKey="fat"      name="Grasas"    fill="var(--green-sage)"  radius={[2,2,0,0]} label={{ position: 'top', fontSize: 9, formatter: (v: number) => v > 0 ? `${v.toFixed(0)}g` : '' }} />}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Table */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: '0 0 14px', color: 'var(--text-dark)' }}>
              {period === 'month' ? 'Resumen por semana' : 'Detalle por día'}
            </h3>
            <div style={{ overflowX: 'auto' }}>
              {period === 'week' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--green-pale)' }}>
                      {['Día', 'Calorías', 'Proteínas', 'Carbos', 'Grasas', 'Entrenó', 'Pasos'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-light)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d, i) => (
                      <tr key={i}
                        onClick={() => openDay(d)}
                        style={{
                          borderBottom: '1px solid var(--warm)',
                          background: !d.hasData ? 'var(--warm)' : 'white',
                          opacity: !d.hasData ? 0.5 : 1,
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f7f0')}
                        onMouseLeave={e => (e.currentTarget.style.background = !d.hasData ? 'var(--warm)' : 'white')}
                      >
                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-dark)', textTransform: 'capitalize' }}>
                          {d.label} <span style={{ fontSize: 10, color: 'var(--green-light)' }}>→</span>
                        </td>
                        <td style={{ padding: '10px', color: d.calories > DAILY_PLAN.calories ? '#dc2626' : 'var(--terracotta)', fontWeight: 600 }}>
                          {d.hasData ? Math.round(d.calories) : '—'}
                          {d.calories > DAILY_PLAN.calories && <span style={{ fontSize: 10, marginLeft: 3 }}>↑</span>}
                        </td>
                        <td style={{ padding: '10px', color: '#1d6fa8', fontWeight: d.hasData ? 600 : 400 }}>{d.hasData ? `${d.protein.toFixed(1)}g` : '—'}</td>
                        <td style={{ padding: '10px', color: '#b07d1a', fontWeight: d.hasData ? 600 : 400 }}>{d.hasData ? `${d.carbs.toFixed(1)}g` : '—'}</td>
                        <td style={{ padding: '10px', color: 'var(--green-sage)', fontWeight: d.hasData ? 600 : 400 }}>{d.hasData ? `${d.fat.toFixed(1)}g` : '—'}</td>
                        <td style={{ padding: '10px' }}>{d.trained ? '💪' : d.hasData ? '✗' : '—'}</td>
                        <td style={{ padding: '10px', color: '#7c3aed' }}>{d.steps > 0 ? d.steps.toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--warm)', fontWeight: 700, borderTop: '2px solid var(--green-pale)' }}>
                      <td style={{ padding: '10px', color: 'var(--text-dark)' }}>Promedio</td>
                      <td style={{ padding: '10px', color: 'var(--terracotta)' }}>{Math.round(avgCal)}</td>
                      <td style={{ padding: '10px', color: '#1d6fa8' }}>{Math.round(avgProt)}g</td>
                      <td style={{ padding: '10px', color: '#b07d1a' }}>{daysWithData.length > 0 ? Math.round(totals.carbs / daysWithData.length) : 0}g</td>
                      <td style={{ padding: '10px', color: 'var(--green-sage)' }}>{daysWithData.length > 0 ? Math.round(totals.fat / daysWithData.length) : 0}g</td>
                      <td style={{ padding: '10px', color: 'var(--green-sage)' }}>{totals.trainings} 💪</td>
                      <td style={{ padding: '10px', color: '#7c3aed' }}>{daysWithData.length > 0 ? Math.round(totals.steps / daysWithData.length).toLocaleString() : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--green-pale)' }}>
                      {['Semana', 'Días reg.', 'Kcal prom', 'Prot prom', 'Carbos prom', 'Entrenos', 'Pasos'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-light)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.map((w, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--warm)' }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-dark)' }}>{w.label}</td>
                        <td style={{ padding: '10px', color: 'var(--text-mid)' }}>{w.daysWithData}/{w.days}</td>
                        <td style={{ padding: '10px', color: w.calories > DAILY_PLAN.calories ? '#dc2626' : 'var(--terracotta)', fontWeight: 600 }}>{Math.round(w.calories)}</td>
                        <td style={{ padding: '10px', color: '#1d6fa8', fontWeight: 600 }}>{Math.round(w.protein)}g</td>
                        <td style={{ padding: '10px', color: '#b07d1a', fontWeight: 600 }}>{Math.round(w.carbs)}g</td>
                        <td style={{ padding: '10px', color: 'var(--green-sage)', fontWeight: 600 }}>{w.trainings} 💪</td>
                        <td style={{ padding: '10px', color: '#7c3aed' }}>{(w.totalSteps / 1000).toFixed(1)}k</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--warm)', fontWeight: 700, borderTop: '2px solid var(--green-pale)' }}>
                      <td style={{ padding: '10px', color: 'var(--text-dark)' }}>Total mes</td>
                      <td style={{ padding: '10px', color: 'var(--text-mid)' }}>{daysWithData.length}</td>
                      <td style={{ padding: '10px', color: 'var(--terracotta)' }}>{Math.round(avgCal)} prom</td>
                      <td style={{ padding: '10px', color: '#1d6fa8' }}>{Math.round(avgProt)}g prom</td>
                      <td style={{ padding: '10px', color: '#b07d1a' }}>{daysWithData.length > 0 ? Math.round(totals.carbs / daysWithData.length) : 0}g prom</td>
                      <td style={{ padding: '10px', color: 'var(--green-sage)' }}>{totals.trainings} 💪</td>
                      <td style={{ padding: '10px', color: '#7c3aed' }}>{(totals.steps / 1000).toFixed(1)}k</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Day detail modal */}
      {selectedDay && <DayDetail />}
    </div>
  )
}
