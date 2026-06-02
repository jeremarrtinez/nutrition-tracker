import React, { useEffect, useState } from 'react'
import { supabase, FoodLog } from '@/lib/supabase'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns'
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

export default function SummaryView() {
  const [period, setPeriod] = useState<Period>('week')
  const [view, setView] = useState<View>('dias')
  const [data, setData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    setLoading(true)
    setSelectedDay(null)
    const today = new Date()
    const from = period === 'week'
      ? format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(startOfMonth(today), 'yyyy-MM-dd')
    const to = period === 'week'
      ? format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(endOfMonth(today), 'yyyy-MM-dd')

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

    const fromDate = parseISO(from + 'T12:00:00')
    const toDate = parseISO(to + 'T12:00:00')
    const days = eachDayOfInterval({ start: fromDate, end: toDate })

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

  const weeklyData = (() => {
    if (period !== 'month') return []
    const weeks: Record<string, DayData[]> = {}
    data.forEach(d => {
      const weekStart = format(startOfWeek(parseISO(d.date + 'T12:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      if (!weeks[weekStart]) weeks[weekStart] = []
      weeks[weekStart].push(d)
    })
    return Object.entries(weeks).map(([, days], i) => ({
      label: `Semana ${i + 1}`,
      calories: days.reduce((a, d) => a + d.calories, 0) / Math.max(days.filter(d => d.hasData).length, 1),
      protein: days.reduce((a, d) => a + d.protein, 0) / Math.max(days.filter(d => d.hasData).length, 1),
      carbs: days.reduce((a, d) => a + d.carbs, 0) / Math.max(days.filter(d => d.hasData).length, 1),
      fat: days.reduce((a, d) => a + d.fat, 0) / Math.max(days.filter(d => d.hasData).length, 1),
      trainings: days.filter(d => d.trained).length,
      totalSteps: days.reduce((a, d) => a + d.steps, 0),
      days: days.length,
      daysWithData: days.filter(d => d.hasData).length,
    }))
  })()

  const chartData = view === 'semanas' && period === 'month' ? weeklyData : data
  const daysWithData = data.filter(d => d.hasData)
  const totals = daysWithData.reduce((acc, d) => ({
    calories: acc.calories + d.calories,
    protein: acc.protein + d.protein,
    carbs: acc.carbs + d.carbs,
    fat: acc.fat + d.fat,
    trainings: acc.trainings + (d.trained ? 1 : 0),
    steps: acc.steps + d.steps,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, trainings: 0, steps: 0 })

  const avgCalories = daysWithData.length > 0 ? totals.calories / daysWithData.length : 0
  const avgProtein = daysWithData.length > 0 ? totals.protein / daysWithData.length : 0

  const StatCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) => (
    <div className="card" style={{ padding: '16px', textAlign: 'center', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={`nav-tab ${period === 'week' ? 'active' : ''}`} onClick={() => { setPeriod('week'); setView('dias') }}>
            📅 Esta semana
          </button>
          <button className={`nav-tab ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>
            🗓️ Este mes
          </button>
        </div>
        {period === 'month' && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className={`nav-tab ${view === 'dias' ? 'active' : ''}`} onClick={() => setView('dias')}>Por día</button>
            <button className={`nav-tab ${view === 'semanas' ? 'active' : ''}`} onClick={() => setView('semanas')}>Por semana</button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-light)' }}>
          <span className="loading-dots"><span /><span /><span /></span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <StatCard label="Kcal prom/día" value={Math.round(avgCalories).toString()} sub={`meta: ${DAILY_PLAN.calories}`} color="var(--terracotta)" />
            <StatCard label="Prot prom/día" value={`${Math.round(avgProtein)}g`} sub={`meta: ${DAILY_PLAN.protein}g`} color="#1d6fa8" />
            <StatCard label="Días registrados" value={daysWithData.length.toString()} sub={`de ${data.length} días`} color="var(--green-sage)" />
            <StatCard label="Entrenamientos" value={totals.trainings.toString()} sub="en el período" color="var(--green-dark)" />
            <StatCard label="Pasos totales" value={(totals.steps / 1000).toFixed(1) + 'k'} sub="en el período" color="#7c3aed" />
          </div>

          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', margin: '0 0 4px', color: 'var(--text-dark)' }}>
              Calorías {view === 'semanas' ? '(promedio por semana)' : 'por día'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '0 0 16px' }}>
              Línea verde = meta diaria ({DAILY_PLAN.calories} kcal)
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 4 }}
                onClick={(e) => {
                  if (view === 'dias' && e?.activePayload) {
                    const d = data.find(x => x.label === e.activePayload![0].payload.label)
                    setSelectedDay(d || null)
                  }
                }}
                style={{ cursor: view === 'dias' ? 'pointer' : 'default' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--green-pale)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'var(--font-body)' }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, Math.max(DAILY_PLAN.calories * 1.3, 100)]} />
                <Tooltip
                  contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 8, border: '1px solid var(--green-pale)' }}
                  formatter={(val: number) => [`${Math.round(val)} kcal`, 'Calorías']}
                />
                <ReferenceLine y={DAILY_PLAN.calories} stroke="var(--green-sage)" strokeDasharray="6 3" strokeWidth={2} />
                <Bar dataKey="calories" name="Calorías" fill="var(--terracotta)" radius={[4, 4, 0, 0]}
                  label={{ position: 'top', fontSize: 10, formatter: (v: number) => v > 0 ? Math.round(v) : '' }}
                />
              </BarChart>
            </ResponsiveContainer>
            {view === 'dias' && (
              <p style={{ fontSize: '11px', color: 'var(--text-light)', textAlign: 'center', marginTop: 8 }}>
                Tocá una barra para ver el detalle del día
              </p>
            )}
          </div>

          {selectedDay && (
            <div className="card fade-in" style={{ padding: '16px', marginBottom: '16px', border: '1.5px solid var(--green-pale)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '16px', textTransform: 'capitalize' }}>
                  📋 {format(parseISO(selectedDay.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                </h4>
                <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-light)' }}>×</button>
              </div>
              {!selectedDay.hasData ? (
                <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0 }}>Sin datos registrados ese día.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                  {[
                    { label: 'Calorías', value: `${Math.round(selectedDay.calories)} kcal`, target: `${DAILY_PLAN.calories}`, color: 'var(--terracotta)' },
                    { label: 'Proteínas', value: `${selectedDay.protein.toFixed(1)}g`, target: `${DAILY_PLAN.protein}g`, color: '#1d6fa8' },
                    { label: 'Carbos', value: `${selectedDay.carbs.toFixed(1)}g`, target: `${DAILY_PLAN.carbs}g`, color: '#b07d1a' },
                    { label: 'Grasas', value: `${selectedDay.fat.toFixed(1)}g`, target: `${DAILY_PLAN.fat}g`, color: 'var(--green-sage)' },
                    { label: 'Pasos', value: selectedDay.steps.toLocaleString(), target: '', color: '#7c3aed' },
                    { label: 'Entrenó', value: selectedDay.trained ? '✓ Sí' : '✗ No', target: '', color: selectedDay.trained ? 'var(--green-sage)' : 'var(--text-light)' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'var(--warm)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ fontWeight: 700, color: item.color, fontSize: '16px' }}>{item.value}</div>
                      {item.target && <div style={{ fontSize: '10px', color: 'var(--green-light)' }}>meta: {item.target}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', margin: '0 0 16px', color: 'var(--text-dark)' }}>
              Macronutrientes {view === 'semanas' ? '(promedio por semana)' : 'por día'}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--green-pale)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 8 }}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)}g`, name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="protein" name="Proteínas" fill="#1d6fa8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="carbs" name="Carbos" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="fat" name="Grasas" fill="var(--green-sage)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {period === 'month' && (
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', margin: '0 0 16px', color: 'var(--text-dark)' }}>
                Resumen por semana
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
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
                        <td style={{ padding: '10px' }}>
                          <span style={{ color: w.calories > DAILY_PLAN.calories ? '#dc2626' : 'var(--terracotta)', fontWeight: 600 }}>
                            {Math.round(w.calories)}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#1d6fa8', fontWeight: 600 }}>{Math.round(w.protein)}g</td>
                        <td style={{ padding: '10px', color: '#b07d1a', fontWeight: 600 }}>{Math.round(w.carbs)}g</td>
                        <td style={{ padding: '10px', color: 'var(--green-sage)', fontWeight: 600 }}>{w.trainings} 💪</td>
                        <td style={{ padding: '10px', color: '#7c3aed' }}>{(w.totalSteps / 1000).toFixed(1)}k</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--warm)', fontWeight: 700, borderTop: '2px solid var(--green-pale)' }}>
                      <td style={{ padding: '10px', color: 'var(--text-dark)' }}>Total mes</td>
                      <td style={{ padding: '10px', color: 'var(--text-mid)' }}>{daysWithData.length}</td>
                      <td style={{ padding: '10px', color: 'var(--terracotta)' }}>{Math.round(avgCalories)} prom</td>
                      <td style={{ padding: '10px', color: '#1d6fa8' }}>{Math.round(avgProtein)}g prom</td>
                      <td style={{ padding: '10px', color: '#b07d1a' }}>{daysWithData.length > 0 ? Math.round(totals.carbs / daysWithData.length) : 0}g prom</td>
                      <td style={{ padding: '10px', color: 'var(--green-sage)' }}>{totals.trainings} 💪</td>
                      <td style={{ padding: '10px', color: '#7c3aed' }}>{(totals.steps / 1000).toFixed(1)}k</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {period === 'week' && (
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', margin: '0 0 16px', color: 'var(--text-dark)' }}>
                Detalle por día
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--green-pale)' }}>
                      {['Día', 'Calorías', 'Proteínas', 'Carbos', 'Grasas', 'Entrenó', 'Pasos'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-light)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--warm)', background: !d.hasData ? 'var(--warm)' : 'white', opacity: !d.hasData ? 0.5 : 1 }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-dark)', textTransform: 'capitalize' }}>{d.label}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ color: d.calories > DAILY_PLAN.calories ? '#dc2626' : 'var(--terracotta)', fontWeight: 600 }}>
                            {d.hasData ? Math.round(d.calories) : '—'}
                          </span>
                          {d.calories > DAILY_PLAN.calories && <span style={{ fontSize: '10px', color: '#dc2626', marginLeft: 4 }}>↑</span>}
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
                      <td style={{ padding: '10px', color: 'var(--terracotta)' }}>{Math.round(avgCalories)}</td>
                      <td style={{ padding: '10px', color: '#1d6fa8' }}>{Math.round(avgProtein)}g</td>
                      <td style={{ padding: '10px', color: '#b07d1a' }}>{daysWithData.length > 0 ? Math.round(totals.carbs / daysWithData.length) : 0}g</td>
                      <td style={{ padding: '10px', color: 'var(--green-sage)' }}>{daysWithData.length > 0 ? Math.round(totals.fat / daysWithData.length) : 0}g</td>
                      <td style={{ padding: '10px', color: 'var(--green-sage)' }}>{totals.trainings} 💪</td>
                      <td style={{ padding: '10px', color: '#7c3aed' }}>{daysWithData.length > 0 ? Math.round(totals.steps / daysWithData.length).toLocaleString() : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
