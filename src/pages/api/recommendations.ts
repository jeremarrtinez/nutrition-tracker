import { NextApiRequest, NextApiResponse } from 'next'
import { DAILY_PLAN, PLAN_CONTEXT, FOOD_LIMITS } from '@/lib/plan'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { consumed, trained, steps } = req.body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  // Calcular macros restantes
  const remaining = {
    calories: DAILY_PLAN.calories - (consumed.calories || 0),
    protein:  DAILY_PLAN.protein  - (consumed.protein  || 0),
    carbs:    DAILY_PLAN.carbs    - (consumed.carbs    || 0),
    fat:      DAILY_PLAN.fat      - (consumed.fat      || 0),
  }

  // Bonus por actividad
  const activityBonus = trained ? 350 : 0
  const stepBonus = Math.max(0, ((steps || 0) - 3000) * 0.04)
  remaining.calories += activityBonus + stepBonus

  // Detectar alimentos específicos ya consumidos en el día
  const logsText = consumed.logs?.map((l: { meal_type: string; description: string }) =>
    `  - [${l.meal_type}] ${l.description}`
  ).join('\n') || '  (ninguna comida registrada aún)'

  // Contar huevos y aceite consumidos (la IA lo inferirá del texto)
  const allDescriptions = consumed.logs?.map((l: { description: string }) => l.description.toLowerCase()).join(' ') || ''
  const huevosConsumidos = (allDescriptions.match(/huevo/g) || []).length
  const aceiteCdas = (allDescriptions.match(/aceite|cda|cucharada/g) || []).length

  const prompt = `${PLAN_CONTEXT}

════════════════════════════════
RESUMEN DEL DÍA HASTA AHORA
════════════════════════════════

Comidas registradas:
${logsText}

Macros consumidos:
- Calorías: ${consumed.calories?.toFixed(0) || 0} / ~${DAILY_PLAN.calories} kcal
- Proteínas: ${consumed.protein?.toFixed(1) || 0} / ~${DAILY_PLAN.protein}g
- Carbohidratos: ${consumed.carbs?.toFixed(1) || 0} / ~${DAILY_PLAN.carbs}g
- Grasas: ${consumed.fat?.toFixed(1) || 0} / ~${DAILY_PLAN.fat}g

Actividad:
- Entrenó hoy: ${trained ? 'SÍ (+350 kcal extra disponibles)' : 'No'}
- Pasos: ${steps || 0}${(steps || 0) > 3000 ? ` (+${stepBonus.toFixed(0)} kcal extra)` : ''}

Disponible para el resto del día:
- Calorías: ~${remaining.calories.toFixed(0)} kcal
- Proteínas: ~${remaining.protein.toFixed(1)}g
- Carbohidratos: ~${remaining.carbs.toFixed(1)}g
- Grasas: ~${remaining.fat.toFixed(1)}g

LÍMITES IMPORTANTES — verificar contra lo ya consumido:
- Huevos: ${FOOD_LIMITS.huevos.max} max/día → revisá cuántos hay en las comidas registradas
- Aceite: ${FOOD_LIMITS.aceite.max} cucharadas max/día → revisá si ya se usó en alguna comida
- Tostadas: ${FOOD_LIMITS.tostadas.max} max/día
- Frutas: ${FOOD_LIMITS.frutas.max} max/día
- Jamón: ${FOOD_LIMITS.jamon.max} fetas max/día

════════════════════════════════
TU TAREA
════════════════════════════════

Dá 3-4 recomendaciones concretas para el resto del día basándote en:
1. Lo que ya comió (para no repetir o exceder límites)
2. Los macros restantes disponibles
3. Los alimentos que aún le faltan cubrir del plan (proteínas, hidratos, etc.)
4. Cantidades específicas (ej: "150g de pechuga a la plancha")

Sé conciso, práctico y amigable. Organizalo de forma legible.`

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

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    res.json({ recommendations: text })
  } catch (err) {
    console.error('Error getting recommendations:', err)
    res.status(500).json({ error: 'Error al obtener recomendaciones' })
  }
}
