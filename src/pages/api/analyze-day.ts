import { NextApiRequest, NextApiResponse } from 'next'
import { DAILY_PLAN, PLAN_CONTEXT } from '@/lib/plan'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { logs, totals, summary } = req.body
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  if (!logs || logs.length === 0) return res.json({ analysis: null })

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

Totales:
- Calorías: ${Math.round(totals.calories)} / ${DAILY_PLAN.calories} kcal
- Proteínas: ${totals.protein.toFixed(1)} / ${DAILY_PLAN.protein}g
- Carbohidratos: ${totals.carbs.toFixed(1)} / ${DAILY_PLAN.carbs}g
- Grasas: ${totals.fat.toFixed(1)} / ${DAILY_PLAN.fat}g
- Entrenó: ${summary?.trained ? 'Sí' : 'No'}
- Pasos: ${summary?.steps || 0}

Hacé un análisis nutricional completo y honesto. NO te centres solo en calorías.

Analizá:
1. **PROTEÍNAS** — ¿Llegó al objetivo? ¿Bien distribuida a lo largo del día?
2. **CARBOHIDRATOS** — ¿Fueron de calidad? ¿Bien distribuidos?
3. **GRASAS** — ¿Principalmente saludables? ¿Respetó el límite de aceite?
4. **VARIEDAD** — ¿Cubrió los grupos del plan? ¿Qué faltó?
5. **DISTRIBUCIÓN** — ¿Comió bien distribuido o hubo salteos?
6. **FIBRA** — ¿Tuvo suficiente (verduras, frutas, integrales)?
7. **RESUMEN** — Valoración general honesta: qué estuvo bien y qué mejorar mañana.

Tono amigable, honesto, rioplatense. Específico con los datos reales. Máximo 400 palabras.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Anthropic error:', response.status, errBody)
      return res.status(500).json({ error: `Error ${response.status}: ${errBody}` })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text

    if (!text) {
      console.error('Empty response:', JSON.stringify(data))
      return res.status(500).json({ error: 'Respuesta vacía' })
    }

    res.json({ analysis: text })
  } catch (err) {
    console.error('Analyze day error:', err)
    res.status(500).json({ error: String(err) })
  }
}
