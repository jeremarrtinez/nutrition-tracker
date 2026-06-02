import { NextApiRequest, NextApiResponse } from 'next'
import { DAILY_PLAN, PLAN_CONTEXT } from '@/lib/plan'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { consumed, trained, steps } = req.body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  const remaining = {
    calories: DAILY_PLAN.calories - (consumed.calories || 0),
    protein: DAILY_PLAN.protein - (consumed.protein || 0),
    carbs: DAILY_PLAN.carbs - (consumed.carbs || 0),
    fat: DAILY_PLAN.fat - (consumed.fat || 0),
  }

  // Add activity bonus
  const activityBonus = trained ? 300 : 0
  const stepBonus = Math.max(0, ((steps || 0) - 2000) * 0.04)
  remaining.calories += activityBonus + stepBonus

  const prompt = `${PLAN_CONTEXT}

SITUACIÓN ACTUAL DE HOY:
- Calorías consumidas: ${consumed.calories?.toFixed(0) || 0} de ${DAILY_PLAN.calories} kcal
- Proteínas: ${consumed.protein?.toFixed(1) || 0}g de ${DAILY_PLAN.protein}g
- Carbohidratos: ${consumed.carbs?.toFixed(1) || 0}g de ${DAILY_PLAN.carbs}g
- Grasas: ${consumed.fat?.toFixed(1) || 0}g de ${DAILY_PLAN.fat}g
- Entrenó hoy: ${trained ? 'SÍ (+300 kcal extra)' : 'No'}
- Pasos dados: ${steps || 0}

DISPONIBLE PARA EL RESTO DEL DÍA:
- Calorías: ${remaining.calories.toFixed(0)} kcal
- Proteínas: ${remaining.protein.toFixed(1)}g
- Carbohidratos: ${remaining.carbs.toFixed(1)}g
- Grasas: ${remaining.fat.toFixed(1)}g

Comidas ya registradas hoy:
${consumed.logs?.map((l: { meal_type: string; description: string }) => `- ${l.meal_type}: ${l.description}`).join('\n') || 'Ninguna registrada aún'}

Dá 3-4 recomendaciones concretas para el resto del día. Considerá las restricciones (máx 2 huevos/día si ya comió huevos), los macros disponibles y que sean opciones prácticas y ricas. Sé específica con cantidades. Usá español rioplatense, tono amigable y motivador.`

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
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    res.json({ recommendations: text })
  } catch (err) {
    console.error('Error getting recommendations:', err)
    res.status(500).json({ error: 'Error al obtener recomendaciones' })
  }
}
