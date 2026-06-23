import { NextApiRequest, NextApiResponse } from 'next'
import { DAILY_PLAN, PLAN_CONTEXT, FOOD_LIMITS } from '@/lib/plan'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { consumed, trained, steps } = req.body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  const remaining = {
    calories: DAILY_PLAN.calories - (consumed.calories || 0),
    protein:  DAILY_PLAN.protein  - (consumed.protein  || 0),
    carbs:    DAILY_PLAN.carbs    - (consumed.carbs    || 0),
    fat:      DAILY_PLAN.fat      - (consumed.fat      || 0),
  }

  const logsText = consumed.logs?.map((l: { meal_type: string; description: string }) =>
    `  - [${l.meal_type}] ${l.description}`
  ).join('\n') || '  (ninguna comida registrada aún)'

  const prompt = `${PLAN_CONTEXT}

════════════════════════════════
RESUMEN DEL DÍA HASTA AHORA
════════════════════════════════

Comidas registradas:
${logsText}

Macros consumidos:
- Calorías: ${consumed.calories?.toFixed(0) || 0} / ${DAILY_PLAN.calories} kcal
- Proteínas: ${consumed.protein?.toFixed(1) || 0} / ${DAILY_PLAN.protein}g
- Carbohidratos: ${consumed.carbs?.toFixed(1) || 0} / ${DAILY_PLAN.carbs}g
- Grasas: ${consumed.fat?.toFixed(1) || 0} / ${DAILY_PLAN.fat}g

Disponible para el resto del día:
- Calorías: ~${remaining.calories.toFixed(0)} kcal
- Proteínas: ~${remaining.protein.toFixed(1)}g
- Carbohidratos: ~${remaining.carbs.toFixed(1)}g
- Grasas: ~${remaining.fat.toFixed(1)}g

LÍMITES DIARIOS — verificar contra lo ya consumido:
- Huevos: ${FOOD_LIMITS.huevos.max} max/día
- Aceite: ${FOOD_LIMITS.aceite.max} cucharadas max/día
- Tostadas: ${FOOD_LIMITS.tostadas.max} max/día
- Frutas: ${FOOD_LIMITS.frutas.max} max/día
- Jamón: ${FOOD_LIMITS.jamon.max} fetas max/día

Dá 3-4 recomendaciones concretas para el resto del día con cantidades específicas. Considerá lo que ya comió para no repetir ni exceder límites. Sé práctico y amigable.`

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
        max_tokens: 900,
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

    res.json({ recommendations: text })
  } catch (err) {
    console.error('Recommendations error:', err)
    res.status(500).json({ error: String(err) })
  }
}
