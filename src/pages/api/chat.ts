import { NextApiRequest, NextApiResponse } from 'next'
import { PLAN_CONTEXT, DAILY_PLAN } from '@/lib/plan'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages, dailyContext } = req.body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' })

  // Construir el resumen real del día con los logs exactos
  const logsDetalle = dailyContext?.logs && dailyContext.logs.length > 0
    ? dailyContext.logs.map((l: { meal_type: string; description: string; calories: number; protein: number; carbs: number; fat: number }) =>
        `  • [${l.meal_type}] ${l.description} → ${Math.round(l.calories)} kcal | P: ${l.protein.toFixed(1)}g | C: ${l.carbs.toFixed(1)}g | G: ${l.fat.toFixed(1)}g`
      ).join('\n')
    : '  (ninguna comida registrada aún hoy)'

  const systemPrompt = `${PLAN_CONTEXT}

════════════════════════════════════════
LO QUE JERE COMIÓ HOY (DATOS REALES DE LA APP)
════════════════════════════════════════
${logsDetalle}

TOTALES DEL DÍA:
- Calorías: ${dailyContext?.calories?.toFixed(0) || 0} / ~${DAILY_PLAN.calories} kcal
- Proteínas: ${dailyContext?.protein?.toFixed(1) || 0} / ~${DAILY_PLAN.protein}g
- Carbohidratos: ${dailyContext?.carbs?.toFixed(1) || 0} / ~${DAILY_PLAN.carbs}g
- Grasas: ${dailyContext?.fat?.toFixed(1) || 0} / ~${DAILY_PLAN.fat}g
- Entrenó hoy: ${dailyContext?.trained ? 'Sí' : 'No'}
- Pasos: ${dailyContext?.steps || 0}

INSTRUCCIÓN CRÍTICA: 
Solo podés hacer referencia a comidas que aparezcan EXACTAMENTE en la lista de arriba.
Si no hay datos de alguna comida, decí que no está registrada.
NUNCA inventes ni asumas comidas que no estén en esa lista.
Si te preguntan qué comió hoy, respondé SOLO con lo que aparece arriba.`

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
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || 'No pude generar una respuesta.'
    res.json({ reply: text })
  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ error: 'Error en el chat' })
  }
}
