import React, { useEffect, useState } from 'react'
import { supabase, FoodLog } from '@/lib/supabase'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { DAILY_PLAN } from '@/lib/plan'

interface SummaryData {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  trained: boolean
  steps: number
}

export default function SummaryView() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [data, setData] = useState<SummaryData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [period])

  async function loadData() {
    setLoading(true)
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

    const logs = logsRes.data || []
    const summaries = summaryRes.data || []

    // Group food logs by date
    const byDate: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {}
    logs.forEach((l: FoodLog) => {
      if (!byDate[l.date]) byDate[l.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 }
      byDate[l.date].calories += l.calories
      byDate[l.date].protein += l.protein
      byDate[l.date].carbs += l.carbs
      byDate[l.date].fat += l.fat
    })

    // Merge with activity summaries
    const allDates = [...new Set([...Object.keys(byDate), ...summaries.map((s: { date: string }) => s.date)])]
    const result: SummaryData[] = allDates.map(date => {
      const s = summaries.find((x: { date: string }) => x.date === date)
      return {
        date,
        calories: byDate[date]?.calories || 0,
        protein: byDate[date]?.protein || 0,
        carbs: byDate[date]?.carbs || 0,
        fat: byDate[date]?.fat || 0,
        trained: s?.trained || false,
        steps: s?.steps || 0,
      }
    }).sort((a, b) => a.date.localeCompare(b.date))

    setData(result)
    setLoading(false)
  }

  const totals = data.reduce((acc, d) => ({
    calories: acc.calories + d.calories,
    protein: acc.protein + d.protein,
    carbs: acc.carbs + d.carbs,
    fat: acc.fat + d.fat,
    trainings: acc.trainings + (d.trained ? 1 : 0),
    steps: acc.steps + d.steps,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, trainings: 0, steps: 0 })

  const days = data.filter(d => d.calories > 0).length || 1
  const avgCalories = totals.calories / days
  const chartData = data.map(d => ({
    name: format(new Date(d.date + 'T12:00:00'), period === 'week' ? 'EEE' : 'dd', { locale: es }),
    Calorías: Math.round(d.calories),
    Proteínas: Math.round(d.protein),
    Carbos: Math.round(d.carbs),
    Grasas: Math.round(d.fat),
    trained: d.trained,
  }))

  const StatCard = ({ label, value, unit, target, color }: { label: string; value: number; unit: string; target?: number; color: string }) => (
    <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color, lineHeight: 1 }}>
        {value % 1 === 0 ? value.toLocaleString() : value.toFixed(1)}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
        {unit}{target ? ` · meta: ${target}` : ''}
      </div>
    </div>
  )

  return (
    <div>
      {/* Period toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['week', 'month'] as const).map(p => (
          <button
            key={p}
            className={`nav-tab ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p === 'week' ? '📅 Esta semana' : '🗓️ Este mes'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-light)' }}>
          <span className="loading-dots"><span/><span/><span/></span>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <StatCard label="Calorías prom/día" value={Math.round(avgCalories)} unit="kcal" target={DAILY_PLAN.calories} color="var(--terracotta)" />
            <StatCard label="Proteínas totales" value={Math.round(totals.protein)} unit="g" color="#1d6fa8" />
            <StatCard label="Carbos totales" value={Math.round(totals.carbs)} unit="g" color="#b07d1a" />
            <StatCard label="Entrenamientos" value={totals.trainings} unit={`de ${data.length} días`} color="var(--green-sage)" />
            <StatCard label="Pasos totales" value={totals.steps} unit="pasos" color="var(--green-dark)" />
          </div>

          {/* Charts */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', margin: '0 0 16px', color: 'var(--text-dark)' }}>
              Calorías diarias vs meta ({DAILY_PLAN.calories} kcal)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--green-pale)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'var(--font-body)' }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 8, border: '1px solid var(--green-pale)' }} />
                <Bar dataKey="Calorías" fill="var(--terracotta)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', margin: '0 0 16px', color: 'var(--text-dark)' }}>
              Macronutrientes diarios
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--green-pale)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Proteínas" fill="#1d6fa8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Carbos" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Grasas" fill="var(--green-sage)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
