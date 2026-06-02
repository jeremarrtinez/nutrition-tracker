import { NextApiRequest, NextApiResponse } from 'next'
import { DAILY_PLAN, PLAN_CONTEXT } from '@/lib/plan'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { logs, totals, summary } = req.body
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  if (!logs || logs.length === 0) {
    return res.json({ analysis: null })
  }

  const logsDetalle = logs.map((l: {
    meal_type: string; description: string
    calories: number; protein: number; carbs: number; fat: number
  }) =>
    `  • [${l.meal_type}] ${l.description} → ${Math.round(l.calories)} kcal | P: ${l.protein.toFixed(1)}g | C: ${l.carbs.toFixed(1)}g | G: ${l.fat.toFixed(1)}g`
  ).join('\n')

  const prompt = `${PLAN_CONTEXT}

════════════════════════════════════════
REGISTRO COMPLETO DEL DÍA
════════════════════════════════════════

Comidas registradas:
${logsDetalle}

Totales del día:
- Calorías: ${Math.round(totals.calories)} kcal (meta: ~${DAILY_PLAN.calories} kcal)
- Proteínas: ${totals.protein.toFixed(1)}g (meta: ~${DAILY_PLAN.protein}g)
- Carbohidratos: ${totals.carbs.toFixed(1)}g (meta: ~${DAILY_PLAN.carbs}g)
- Grasas: ${totals.fat.toFixed(1)}g (meta: ~${DAILY_PLAN.fat}g)
- Entrenó: ${summary?.trained ? 'Sí' : 'No'}
- Pasos: ${summary?.steps || 0}

════════════════════════════════════════
TU TAREA: ANÁLISIS NUTRICIONAL DEL DÍA
════════════════════════════════════════

Hacé un análisis nutricional completo y honesto del día. NO te centres solo en calorías.

Analizá estos aspectos:

1. **PROTEÍNAS** — ¿Llegó al objetivo? ¿Quedó algo pendiente? ¿Estuvo bien distribuida a lo largo del día o concentrada en pocas comidas?

2. **CARBOHIDRATOS** — ¿Fueron de calidad (integrales, legumbres, frutas)? ¿O refinados? ¿Bien distribuidos?

3. **GRASAS** — ¿Fueron principalmente saludables (palta, aceite, frutos secos) o saturadas? ¿Respetó el límite de aceite?

4. **VARIEDAD Y COMPLETITUD** — ¿Cubrió los grupos alimentarios del plan (proteína animal/vegetal, hidrato, verduras, lácteos, fruta)? ¿Qué grupo faltó o estuvo escaso?

5. **DISTRIBUCIÓN DE COMIDAS** — ¿Comió bien distribuido a lo largo del día o hubo salteos? ¿Llegó a la cena con mucha hambre acumulada?

6. **HIDRATACIÓN Y FIBRA** — Basándote en lo que comió, ¿tuvo suficiente fibra (verduras, frutas, integrales)? ¿Mencionó alguna infusión o agua?

7. **ACTIVIDAD FÍSICA** — ¿Cómo impacta el haber entrenado o no en el balance del día?

8. **RESUMEN EJECUTIVO** — Una valoración general honesta: ¿fue un buen día nutricional? ¿Qué estuvo bien y qué mejorar mañana?

Tono: amigable, honesto, sin juzgar. Usá español rioplatense. Sé específico con los datos reales del día, no genérico. Máximo 400 palabras.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    res.json({ analysis: text })
  } catch (err) {
    console.error('Error analyzing day:', err)
    res.status(500).json({ error: 'Error al analizar el día' })
  }
}
